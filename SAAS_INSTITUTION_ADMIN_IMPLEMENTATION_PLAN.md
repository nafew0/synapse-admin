# SaaS Institution Administration and Usage-Limit Plan

**Status:** implementation plan based on the current `bdren-prod` code  
**Repositories audited:** `synapse-admin` and `synapse`  
**Audit date:** 2026-07-23

## 1. Executive conclusion

The codebase already contains a substantial part of the isolation foundation, but it is not yet a complete SaaS administration system.

The recommended architecture is:

- Treat an **institution as a tenant**. The existing `tenantId` boundary should protect all institution-owned data.
- Treat the existing LibreChat **Group** model as an optional team, department, class, or ACL group *inside* an institution. Do not use it as the subscription, billing, or primary security boundary.
- Make an **institution admin** a tenant-scoped delegated admin role. The institution admin can manage users and view usage only inside the authenticated user's institution.
- Keep the **platform superadmin** separate from institution roles. Only the platform superadmin can provision institutions, set seat limits, set token policies, suspend an institution, and appoint institution admins.
- Implement hard usage limits with a new, mandatory, atomic quota service. The existing balance and transaction features are useful building blocks, but they are not sufficient for the three requested hard limits.

The current tenant-aware models and middleware save a large amount of work. The main missing pieces are an institution registry and lifecycle, clean platform-versus-tenant administration, complete member-management APIs, usage reporting APIs/UI, and concurrency-safe quota enforcement.

### Current-state summary

| Requirement | Current state | Decision |
|---|---|---|
| Institution data isolation | Strong tenant-aware foundation exists | Reuse `tenantId`; add an Institution registry and trusted resolver |
| Institution/group admin role | Generic capabilities exist, but no target-scoped institution-admin product role | Add a restricted tenant-local role; add explicit group scope only if needed |
| Platform superadmin | Not separated from the globally seeded `ADMIN` role | Add distinct platform identity, middleware, and APIs |
| Member list/search | Backend exists; hidden admin UI is partial | Complete and re-enable after role separation |
| Add/import/suspend/remove members | Mostly missing | Build invitations, lifecycle, CSV jobs, and safe removal |
| Maximum members | No contractual enforcement | Add atomic seat reservation/counting at every entry path |
| Usage history | Transaction and Balance records exist | Normalize and expose a mandatory tenant-scoped usage ledger |
| Usage dashboard/export | Missing | Add `READ_USAGE` APIs and admin UI |
| Member/institution/model token limits | Missing | Add atomic quota policy, buckets, and reservations |
| Config by user/role/group | Exists | Reuse for features; do not store hard contractual quotas there |

## 2. Required product behavior

### 2.1 Roles

| Actor | Permitted scope | Main abilities |
|---|---|---|
| Platform superadmin | All institutions, through explicit platform APIs | Create/suspend institutions, set limits, appoint institution admins, inspect platform and institution health |
| Institution admin | One authenticated institution/tenant | Invite/import/list/suspend/remove members, assign safe institution roles, manage optional internal groups, see institution/member usage |
| Subgroup admin, optional later | Explicit groups inside one institution | Manage and view only members attributed to the assigned groups |
| Member | Own institution and own resources | Use allowed models/features and see own usage |

An institution admin must not be able to:

- select another `tenantId` in a request;
- see another institution's members, usage, chats, files, groups, or configuration;
- increase seat or token limits;
- promote anyone to platform superadmin;
- grant capabilities that the institution-admin template does not allow;
- turn off quota accounting;
- permanently erase users or audit history unless the platform policy explicitly delegates that action.

### 2.2 Limits controlled by the platform superadmin

Each institution needs:

1. a maximum number of billable members/seats;
2. a maximum token usage per member per billing period;
3. a maximum token usage for the institution per billing period;
4. a maximum token usage per model for the institution per billing period.

Recommended initial semantics:

- Limits are nullable; `null` means unlimited.
- The period is a calendar month in the institution's configured timezone.
- Prompt and completion tokens both count. Cached input tokens should be counted according to one documented policy and used consistently.
- Pending invitations reserve seats. Expired/revoked invitations and suspended/removed users do not consume seats. This should be confirmed as a product decision before implementation.
- A request is allowed only when all applicable limits have room. The effective allowance is therefore the most restrictive remaining limit.
- Model limits use a canonical model key, not the raw client-provided model string, to prevent aliases or renamed deployments from bypassing a limit.

If “per-model maximum” is intended to mean a separate per-user/per-model limit, the proposed schema can support it, but the first release should implement the simpler institution/model limit unless the business requirement says otherwise.

## 3. What already exists

### 3.1 Strong tenant-isolation foundation

The following work can be reused:

- `User` has `tenantId` and tenant-aware unique indexes for email, external identities, and role ([`synapse/packages/data-schemas/src/schema/user.ts:161`](../synapse/packages/data-schemas/src/schema/user.ts#L161)).
- `Group` and `Role` have `tenantId` and tenant-aware indexes ([`synapse/packages/data-schemas/src/schema/group.ts:44`](../synapse/packages/data-schemas/src/schema/group.ts#L44), [`synapse/packages/data-schemas/src/schema/role.ts:86`](../synapse/packages/data-schemas/src/schema/role.ts#L86)).
- Tenant isolation is attached to the user, group, balance, transaction, conversation, message, file, agent, prompt, skill, and many other models. A coverage test fails when a model containing `tenantId` is accidentally left unprotected ([`synapse/packages/data-schemas/src/models/plugins/tenantIsolation.coverage.spec.ts:27`](../synapse/packages/data-schemas/src/models/plugins/tenantIsolation.coverage.spec.ts#L27)).
- Authenticated requests copy `req.user.tenantId` into AsyncLocalStorage. Strict mode can reject authenticated users without a tenant ([`synapse/packages/api/src/middleware/tenant.ts:90`](../synapse/packages/api/src/middleware/tenant.ts#L90)).
- Pre-authentication routes support a tenant header, with the important caveat that the reverse proxy or identity layer must derive and secure it ([`synapse/packages/api/src/middleware/preAuthTenant.ts:5`](../synapse/packages/api/src/middleware/preAuthTenant.ts#L5)).
- The Mongoose plugin scopes normal queries, writes, aggregates, and inserts and can fail closed when tenant context is missing.

This means an institution admin operating as a tenant user can reuse the existing query isolation for most ordinary admin operations.

### 3.2 Existing admin capabilities

The backend already defines capabilities for admin access; user, group, role, and config management; usage reads; content administration; and audit-log reads ([`synapse/packages/data-schemas/src/admin/capabilities.ts:21`](../synapse/packages/data-schemas/src/admin/capabilities.ts#L21)).

Capability checks resolve the user, role, and group principals and look for grants in the current tenant. This is useful for tenant-scoped institution roles.

The admin panel already:

- fetches effective capabilities and hides some navigation/actions accordingly;
- manages roles and groups;
- manages configuration profiles and principal-specific overrides;
- exposes grants and an audit log;
- proxies all operations through the LibreChat Admin API instead of accessing MongoDB directly.

### 3.3 Existing group management

The backend and admin BFF already support:

- group list, read, create, update, and delete;
- paginated member reads;
- add-member and remove-member operations.

The route is protected by `ACCESS_ADMIN` plus `READ_GROUPS` or `MANAGE_GROUPS` ([`synapse/api/server/routes/admin/groups.js:29`](../synapse/api/server/routes/admin/groups.js#L29)). The admin panel BFF is wired to those routes ([`src/server/groups.ts:52`](src/server/groups.ts#L52)).

### 3.4 Existing config override system

The application configuration can be merged for user, role, and group principals in priority order ([`synapse/packages/api/src/app/service.ts:148`](../synapse/packages/api/src/app/service.ts#L148), [`synapse/packages/data-schemas/src/methods/config.ts:112`](../synapse/packages/data-schemas/src/methods/config.ts#L112)).

This can be reused for institution defaults and optional group/user feature configuration, such as:

- enabled providers and models;
- run-code and web-search permissions;
- UI features;
- balance defaults;
- agent, skill, MCP, and file behavior.

It should **not** be the source of truth for contractual quotas. Config resolution is cached and deliberately falls back to base config on some errors. A hard quota must fail closed and must not be alterable through a higher-priority user or group override.

### 3.5 Existing usage and cost records

`Transaction` records already contain:

- user;
- prompt/completion/credit type;
- model;
- raw token amount and calculated credit value;
- input, read, and write token fields;
- timestamps;
- `tenantId`.

See [`synapse/packages/data-schemas/src/schema/transaction.ts:4`](../synapse/packages/data-schemas/src/schema/transaction.ts#L4).

The existing `Balance` is tenant-isolated and stores a per-user credit balance plus optional refill settings ([`synapse/packages/data-schemas/src/schema/balance.ts:5`](../synapse/packages/data-schemas/src/schema/balance.ts#L5)). Per-user/group config overrides can affect balance initialization because the balance middleware resolves user, role, and group-aware app config ([`synapse/packages/api/src/middleware/balance.ts:114`](../synapse/packages/api/src/middleware/balance.ts#L114)).

These records provide a useful starting point for usage history and cost reporting.

## 4. What is partial or missing

### 4.1 There is no institution/tenant registry

Many records contain a tenant string, but there is no first-class `Institution`/`Tenant` model containing:

- name, slug, domain, and status;
- plan and contract metadata;
- seat limit;
- token policies;
- institution timezone;
- institution-admin appointments;
- provisioning and suspension state.

The pre-auth middleware accepts a syntactically valid tenant header but does not resolve it against an institution registry. Its own documentation delegates resolution to the deployment layer ([`synapse/packages/api/src/middleware/preAuthTenant.ts:19`](../synapse/packages/api/src/middleware/preAuthTenant.ts#L19)).

### 4.2 Platform superadmin and institution admin are not separated

At startup, every capability is seeded as a platform-level grant to `SystemRoles.ADMIN` ([`synapse/packages/data-schemas/src/methods/systemGrant.ts:447`](../synapse/packages/data-schemas/src/methods/systemGrant.ts#L447)). When a tenant user is checked, the grant query considers both that tenant's grants and platform-level grants ([`synapse/packages/data-schemas/src/methods/systemGrant.ts:131`](../synapse/packages/data-schemas/src/methods/systemGrant.ts#L131)).

Consequences:

- any tenant user assigned the plain `ADMIN` role inherits all seeded admin capabilities;
- `ADMIN` cannot safely mean both platform superadmin and restricted institution admin;
- the current registration flow assigns `ADMIN` to the first user counted inside a tenant ([`synapse/api/server/services/AuthService.js:371`](../synapse/api/server/services/AuthService.js#L371));
- several non-admin-panel code paths still contain direct `SystemRoles.ADMIN` bypasses and must be included in the authorization audit.

This global capability inheritance does not by itself bypass the tenant filters on protected models. It does, however, make a tenant user with the `ADMIN` role far more powerful inside that tenant than the proposed institution-admin role and leaves no clean authenticated platform-management surface.

The grants API is also deliberately role-only today; user and group principal grants are not enabled on that surface ([`synapse/packages/api/src/admin/grants.ts:125`](../synapse/packages/api/src/admin/grants.ts#L125)).

### 4.3 User management is not production-ready

The backend currently exposes only list and search. The delete route and `MANAGE_USERS` middleware are commented out ([`synapse/api/server/routes/admin/users.js:10`](../synapse/api/server/routes/admin/users.js#L10)).

The admin panel:

- hides the Users navigation item ([`src/components/Sidebar.tsx:20`](src/components/Sidebar.tsx#L20));
- redirects `/users` to the dashboard ([`src/routes/_app/users.tsx:3`](src/routes/_app/users.tsx#L3));
- has a create-user server function that throws “Not implemented” ([`src/server/users.ts:35`](src/server/users.ts#L35));
- calls the disabled backend delete endpoint and treats `404` as success ([`src/server/users.ts:47`](src/server/users.ts#L47));
- fetches only the backend's first page and discards the returned total;
- has no invite, CSV import, suspend/reactivate, password-reset, identity-provider sync, or bulk operation flow.

The existing delete handler is incomplete even if re-enabled: it deletes the User record and cascades only Config and ACL entries. Its own interface notes that a shared full-cascade service is still needed ([`synapse/packages/api/src/admin/users.ts:20`](../synapse/packages/api/src/admin/users.ts#L20)).

### 4.4 Current groups are not SaaS accounts

`Group.memberIds` is an embedded string array ([`synapse/packages/data-schemas/src/schema/group.ts:24`](../synapse/packages/data-schemas/src/schema/group.ts#L24)). Adding a member uses `$addToSet`, with no contractual seat check ([`synapse/packages/data-schemas/src/methods/userGroup.ts:293`](../synapse/packages/data-schemas/src/methods/userGroup.ts#L293)).

The hardcoded maximum of 500 member IDs applies only to one create-group request; it is input validation, not an institution entitlement ([`synapse/packages/api/src/admin/groups.ts:20`](../synapse/packages/api/src/admin/groups.ts#L20)).

Because a user can belong to multiple groups, group totals can double count usage and can change retrospectively when membership changes. A group needs explicit usage attribution if it is ever used as a billing/quota scope.

### 4.5 Usage reporting is missing from the admin product

`READ_USAGE` exists, but there is no `/api/admin/usage` route/controller and no usage page in `synapse-admin`. The admin dashboard contains only navigation links ([`src/components/dashboard/DashboardPage.tsx:8`](src/components/dashboard/DashboardPage.tsx#L8)).

`src/server/metrics.ts` is Prometheus monitoring for the admin web process and HTTP requests; it is not customer token usage ([`src/server/metrics.ts:53`](src/server/metrics.ts#L53)).

### 4.6 Existing balance is not a hard raw-token quota

Balance is a per-user cost-credit system. In the schema, 1,000 token credits represent USD 0.001 ([`synapse/packages/data-schemas/src/schema/balance.ts:12`](../synapse/packages/data-schemas/src/schema/balance.ts#L12)). It is not a raw-token count, a tenant aggregate, or a per-model counter.

The current preflight compares an estimated prompt cost against the user's current balance ([`synapse/packages/api/src/middleware/checkBalance.ts:47`](../synapse/packages/api/src/middleware/checkBalance.ts#L47)). Actual transactions are saved and the balance is reduced afterward, clamped at zero ([`synapse/packages/data-schemas/src/methods/transaction.ts:201`](../synapse/packages/data-schemas/src/methods/transaction.ts#L201)).

This means it cannot by itself guarantee all requested limits under concurrent requests:

- there is no institution-level balance;
- there is no per-model balance;
- two simultaneous requests can both pass a read-only preflight;
- actual completion/tool usage is known only after execution;
- the balance can reach zero after usage has already been incurred;
- transaction recording can be disabled by configuration, while contractual quota accounting must be mandatory.

## 5. Target architecture

### 5.1 Institution is the hard boundary

Create a manually scoped `Institution` model. It must be queryable by the platform service across tenants, so it should not blindly use the normal ambient tenant plugin.

Suggested fields:

```ts
interface Institution {
  tenantId: string;              // immutable, unique security key
  slug: string;                  // unique public routing key
  name: string;
  status: 'provisioning' | 'active' | 'suspended' | 'closed';
  timezone: string;
  planKey?: string;
  limits: {
    maxMembers: number | null;
    memberTokensPerPeriod: number | null;
    institutionTokensPerPeriod: number | null;
    modelTokensPerPeriod: Array<{
      modelKey: string;
      maxTokens: number | null;
    }>;
  };
  policyVersion: number;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

Use an immutable opaque `tenantId`; do not use the mutable institution name as a security key.

For the first release, `User.tenantId` can represent one institution membership. Add member lifecycle fields such as `status`, `suspendedAt`, and `suspendedBy`, plus a separate tenant-scoped `InstitutionInvite` collection. If one human account must later join multiple institutions, split identity from membership with `Account` and `InstitutionMembership` models in a later migration.

### 5.2 Separate platform and tenant authorization

Recommended minimum-risk approach:

- Keep `SystemRoles.ADMIN` temporarily as a platform-only compatibility role.
- Never assign `ADMIN` to an institution admin.
- Create a tenant-local `INSTITUTION_ADMIN` role and tenant-scoped grants for only:
  - `ACCESS_ADMIN`;
  - `READ_USERS` and `MANAGE_USERS`;
  - `READ_USAGE`;
  - optionally `READ_GROUPS` and `MANAGE_GROUPS`;
  - optionally selected safe config-read capabilities.
- Do not grant institution admins `MANAGE_ROLES`, `MANAGE_CONFIGS`, `ASSIGN_CONFIGS`, or grant-management access in the first release.
- Stop auto-promoting the first self-registered tenant user to `ADMIN`. Institution admins should be appointed during provisioning or through an audited platform action.
- Create a distinct platform authorization check, such as a `platformRole: SUPERADMIN` claim backed by a platform-admin record. Do not infer superadmin status from a tenant role name.
- Add `/api/platform/*` routes. Only those routes may enter `runAsSystem()`/system tenant context, and only after explicit platform authorization.
- Never let a platform route accept a target tenant from an untrusted tenant header. The target is a validated institution route parameter, and every cross-tenant operation is audited.

Before changing the role names, search and test every direct `SystemRoles.ADMIN` bypass in the full backend, not only `/api/admin`.

### 5.3 Optional subgroup administration

If “group admin” only means “the administrator of one institution,” tenant isolation is sufficient and this feature can wait.

If an institution can have several independently administered groups, the existing action-only grants are insufficient. Granting `MANAGE_USERS` through a group makes group members capable administrators; it does not constrain their API target to that group.

Add an explicit assignment:

```ts
interface AdminScopeAssignment {
  tenantId: string;
  adminUserId: ObjectId;
  scopeType: 'tenant' | 'group';
  scopeId: string;
  capabilities: Array<'read_members' | 'manage_members' | 'read_usage'>;
}
```

Every list, mutation, export, and usage query must intersect its normal tenant filter with the allowed `scopeId` set. Do not rely on frontend filtering.

For quota accounting, either:

- make billing groups non-overlapping and store one immutable `billingGroupId` on each usage event; or
- keep contractual quotas at institution level and use groups only for reporting/access.

The second option is recommended for the first release.

### 5.4 Mandatory usage and quota service

Create a provider-neutral quota service separate from optional `transactions.enabled`.

Suggested collections:

```ts
interface UsagePolicy {
  tenantId: string;
  version: number;
  timezone: string;
  period: 'calendar_month';
  memberLimit: number | null;
  institutionLimit: number | null;
  modelLimits: Record<string, number | null>;
}

interface UsageBucket {
  tenantId: string;
  periodStart: Date;
  subjectType: 'institution' | 'user' | 'model' | 'user_model';
  subjectId: string;             // tenantId, userId, or canonical modelKey
  usedTokens: number;
  reservedTokens: number;
  version: number;
}

interface UsageReservation {
  reservationId: string;         // idempotency key
  tenantId: string;
  userId: ObjectId;
  modelKey: string;
  periodStart: Date;
  reservedTokens: number;
  status: 'reserved' | 'settled' | 'released' | 'expired';
  actualTokens?: number;
  requestId: string;
  expiresAt: Date;
}
```

Add unique indexes for one bucket per subject and period and one reservation per request/idempotency key.

The multi-bucket reservation design requires an atomic backend. Prefer MongoDB transactions only when production Mongo runs as a replica set and transaction support is verified. Otherwise use an atomic Redis/Lua quota service or another store that can reserve all applicable counters as one operation; do not fall back to sequential read/check/write calls.

The request lifecycle should be:

1. Resolve tenant and user only from authenticated server state.
2. Resolve the canonical provider/model key.
3. Calculate a conservative reservation:
   - known input tokens;
   - requested maximum completion tokens;
   - explicit allowances for agent/sub-agent calls when applicable.
4. In one MongoDB transaction, conditionally reserve against:
   - institution remaining tokens;
   - user remaining tokens;
   - institution/model remaining tokens;
   - optional user/model remaining tokens.
5. Reject before calling the provider if any bucket would exceed its limit.
6. On success, atomically settle the reservation to actual usage and release unused tokens.
7. On provider error or cancellation, settle any incurred usage and release the remainder.
8. Expire abandoned reservations with a reconciliation job.

Agents, Responses API, assistants, standard chat, code-related model calls, and image/tool paths must go through a coverage audit. The quota layer should sit at the lowest shared provider-call boundary possible. Recording only at the outer chat controller will miss multi-step agents and tool-generated model calls.

The existing Transaction ledger may remain the detailed cost/history ledger. Add canonical `providerKey`, `modelKey`, `usageKind`, and an idempotency/request key, or create a mandatory `UsageEvent` ledger if changing Transaction would be too risky. Quota settlement must never silently fail open.

Image generation and other non-token services should use separate count or cost-credit policies. Do not pretend an image is equivalent to an arbitrary number of text tokens; the common ledger can share attribution and reporting while retaining distinct usage units.

### 5.5 Usage reporting

Add tenant-scoped reporting endpoints protected by `READ_USAGE`:

- summary for the current period;
- time series;
- usage by member;
- usage by canonical model;
- member/model drill-down;
- CSV export;
- current quota, used, reserved, remaining, and percentage.

For moderate volume, start with indexed Transaction/UsageEvent aggregations. Add compound indexes led by `tenantId` and time, then user/model according to query shape. At higher volume, write immutable events and maintain daily rollups with a reconciliation job.

Never calculate historical group usage by joining to current group membership. Store the applicable attribution on the event at usage time.

## 6. API surface

### 6.1 Platform-only APIs

Suggested routes:

```text
GET    /api/platform/institutions
POST   /api/platform/institutions
GET    /api/platform/institutions/:tenantId
PATCH  /api/platform/institutions/:tenantId
PUT    /api/platform/institutions/:tenantId/limits
POST   /api/platform/institutions/:tenantId/admins
DELETE /api/platform/institutions/:tenantId/admins/:userId
POST   /api/platform/institutions/:tenantId/suspend
POST   /api/platform/institutions/:tenantId/reactivate
GET    /api/platform/institutions/:tenantId/usage
```

All changes require an append-only audit event containing actor, target tenant, before/after policy, request ID, IP, and timestamp.

### 6.2 Institution-admin APIs

Expand or replace the current admin-user routes:

```text
GET    /api/admin/members
GET    /api/admin/members/:userId
POST   /api/admin/invitations
POST   /api/admin/member-imports/validate
POST   /api/admin/member-imports
GET    /api/admin/member-imports/:jobId
PATCH  /api/admin/members/:userId
POST   /api/admin/members/:userId/suspend
POST   /api/admin/members/:userId/reactivate
DELETE /api/admin/members/:userId
GET    /api/admin/usage/summary
GET    /api/admin/usage/members
GET    /api/admin/usage/models
GET    /api/admin/usage/timeseries
GET    /api/admin/usage/export.csv
```

Requirements:

- The backend derives `tenantId` from `req.user`; it ignores/rejects tenant IDs in the body or query.
- List/search/export use server-side pagination and bounded filters.
- Invitation acceptance and import rows perform the same atomic seat check.
- Import supports dry-run validation, idempotency, per-row errors, and a final summary.
- Institution admins can assign only an allowlisted set of tenant roles.
- “Remove” should normally revoke/suspend access while preserving usage and audit records. Permanent erasure should use the consolidated deletion service and retention policy.

## 7. Admin-panel product changes

Use one codebase with capability-driven navigation, but make the two surfaces visually clear:

### Platform superadmin

- Institutions list and health
- Create/provision institution
- Institution details and status
- Seat and token policies
- Model-limit editor using canonical available models
- Institution-admin appointments
- Cross-institution usage summaries
- Audit trail

### Institution admin

- Overview: seats used, invites pending, tokens used/remaining, top members/models
- Members: paginated list/search, invite, CSV import, suspend/reactivate/remove
- Roles: safe tenant role assignments only
- Internal groups, if enabled
- Usage: summary, member/model breakdown, trends, export
- Institution settings that the platform explicitly delegates

The Users page already contains useful table/dialog components, but it should be reconnected only after the backend member APIs and authorization tests exist. Remove the `ADMIN` option from the institution-admin create/invite flow.

## 8. Phase-by-phase implementation

Each phase should be a separately reviewable change with migrations, tests, and an acceptance gate.

### Phase 0 — Lock the product and security invariants

**Work**

- Confirm that institution equals tenant.
- Confirm whether a person can belong to more than one institution.
- Confirm seat-count rules for pending, active, and suspended members.
- Confirm quota period, timezone, token definition, and model-limit meaning.
- Decide whether subgroup administration is needed in the first release.
- Inventory every `SystemRoles.ADMIN` bypass and every model/provider usage-recording path.
- Define feature flags:
  - `SAAS_INSTITUTIONS_ENABLED`;
  - `TENANT_ISOLATION_STRICT`;
  - `USAGE_QUOTAS_MODE=off|shadow|enforce`.

**Acceptance gate**

- A written authorization matrix and quota semantics are approved.
- No implementation depends on “group” and “tenant” meaning the same thing.

### Phase 1 — Institution registry, resolver, and data migration

**Work**

- Add the `Institution` schema/model and platform-only data methods.
- Add institution create/provision/suspend/reactivate lifecycle.
- Resolve subdomain/path/OIDC claims to an active registered institution.
- Strip any client-supplied `X-Tenant-Id` at the public edge and set a trusted value.
- Validate JWT tenant against the active institution.
- Backfill a valid `tenantId` on all tenant-owned data.
- Run duplicate/orphan reports before creating or tightening tenant compound indexes.
- Enable strict tenant isolation only after backfill verification.

**Tests**

- Resolver tests for unknown, malformed, suspended, and valid tenants.
- Migration dry-run and rerun/idempotency tests.
- Cross-tenant query tests for every admin resource.

**Acceptance gate**

- No authenticated tenant request succeeds without a registered active institution.
- Tenant A cannot read or mutate Tenant B data in an automated route matrix.

### Phase 2 — Separate platform superadmin from institution admin

**Work**

- Add explicit platform-superadmin identity/claim and middleware.
- Add `/api/platform` routing that enters system context only after platform authorization.
- Stop assigning `ADMIN` to a tenant's first self-registered user.
- Provision a tenant-local `INSTITUTION_ADMIN` role and minimal tenant-scoped grants.
- Decide how to migrate existing `ADMIN` users safely.
- Remove institution access to Grants, unrestricted Roles, and unrestricted Configuration screens.
- Audit and replace unsafe direct `ADMIN` bypasses.

**Tests**

- Platform superadmin can explicitly target a registered tenant.
- Institution admin cannot use platform routes or appoint a superadmin.
- Institution admin has only the capability template.
- A role name collision in two tenants does not cross grant scope.

**Acceptance gate**

- Platform and institution authorization are distinct in data, middleware, API, and UI.

### Phase 3 — Seat policy and member-management backend

**Work**

- Add member state and `InstitutionInvite`.
- Add atomic seat reservation/check shared by invite, invite acceptance, direct creation, SSO just-in-time provisioning, and import.
- Implement paginated member list/search/detail.
- Implement invite, resend, revoke, suspend, reactivate, safe role assignment, and remove.
- Build a shared full user-deletion/retention service; keep permanent erase platform-only initially.
- Implement CSV dry-run/import as an idempotent background job.
- Audit every member lifecycle mutation.

**Concurrency requirement**

Two concurrent final-seat operations must not both succeed. Use a conditional atomic counter or a transaction; a `countUsers()` followed by `createUser()` is not sufficient.

**Acceptance gate**

- All account-entry paths enforce the same seat policy.
- Bulk import cannot exceed the limit and reports deterministic row-level results.

### Phase 4 — Institution member-management UI

**Work**

- Re-enable the Users/Members route and navigation.
- Replace client-only filtering with server pagination/search.
- Wire invite, import, status, role, suspend, and remove actions.
- Show used/maximum seats and pending invitations.
- Remove platform `ADMIN` from tenant-admin forms.
- Add capability gates and friendly 403/409 error handling.

**Acceptance gate**

- An institution admin can complete the normal member lifecycle without database or CLI access and cannot discover another tenant in the UI or network responses.

### Phase 5 — Mandatory usage ledger and reporting

**Work**

- Add canonical provider/model normalization.
- Audit and instrument every inference path.
- Add idempotent mandatory UsageEvent writes or strengthen Transaction accordingly.
- Add indexes and tenant/member/model/time aggregations.
- Add `/api/admin/usage` endpoints and CSV export.
- Add the institution usage dashboard.
- Add daily rollups and reconciliation if performance tests require them.

**Acceptance gate**

- Test fixtures for standard chat, Responses API, agents, assistants, cancellation, retries, and supported image/tool paths produce exactly-once attributable usage.
- Institution admins see only their institution; members see only themselves.

### Phase 6 — Hard token quota enforcement

**Work**

- Add `UsagePolicy`, `UsageBucket`, and `UsageReservation`.
- Implement atomic reserve, settle, release, expiry, and reconciliation.
- Enforce institution, member, and institution/model limits together.
- Return a stable machine-readable quota error with the limiting scope, reset time, and remaining allowance.
- Add warning thresholds and notifications.
- Run in shadow mode first and compare decisions against recorded actual usage.

**Tests**

- High-concurrency boundary tests.
- Reservation idempotency and retry tests.
- Provider failure, timeout, stream abort, tool loop, and stale reservation tests.
- Month/timezone rollover tests.
- Model alias bypass tests.
- Policy-reduction tests when current usage already exceeds the new limit.

**Acceptance gate**

- Shadow-mode variance is understood and acceptable.
- Enforce mode never permits concurrent requests to exceed configured reservation policy except for an explicitly documented estimation tolerance.

### Phase 7 — Platform institution console

**Work**

- Add institution list/create/detail/status UI.
- Add seat, member, total, and per-model token policy editor.
- Add effective-policy preview and validation.
- Add institution-admin appointment/revocation.
- Add institution usage and limit-health views.
- Add policy version history and audit before/after views.

**Acceptance gate**

- A platform superadmin can provision and administer an institution end to end without tenant impersonation or direct database changes.

#### Implementation status — 2026-07-26

- Phase 5 closure is implemented: tenant accounting ignores the legacy
  `transactions.enabled` switch, missing attribution fails closed, ledger
  failures propagate, member-self usage is available, institution-local
  calendar months are used, and existing institutions migrate to
  `Asia/Dhaka`.
- Phase 6 is installed in shadow mode with immutable policy versions,
  institution/member/model buckets, idempotent reservations, transactional
  reserve/settle/release, output caps, stable 429 responses, warning
  deduplication/email, expiry and bucket reconciliation, and a readiness
  report. Enforce-mode policy creation is blocked until the 7-day/1,000-call
  gate passes.
- Readiness now compares unique ledger model calls with reservations. Any
  uncovered agent/tool, image, assistant, retry, or cancellation path keeps
  reservation coverage below 100% and prevents enforcement approval.
- Development and deployment Compose definitions now run MongoDB as a
  single-node replica set. Existing installations must restart through the
  updated Compose topology before enforce mode can be selected.
- Phase 7 is implemented with a server-paginated institution directory and
  detail tabs for overview, institution-filtered members, quota health,
  policy preview/editing, and version history. All APIs remain protected by
  platform-superadmin middleware and policy mutations are audited.
- The local data migration completed for one existing institution with an
  unlimited version-1 shadow policy; the duplicate-key report was clean.

**Rollout state**

- Shadow collection may begin after the API is restarted on the replica-set
  Compose topology.
- Hard enforcement is intentionally not enabled by this implementation.
  Review the institution’s “Shadow rollout gate” after at least seven days and
  1,000 attributable calls, then pilot internally before enabling a client.

### Phase 8 — Optional subgroup admins

Implement only if independently administered internal groups are a confirmed requirement.

**Work**

- Add `AdminScopeAssignment`.
- Scope member, import, usage, and export queries by assigned groups.
- Decide and enforce one immutable billing attribution per usage event.
- Add group-admin UI and assignment management.

**Acceptance gate**

- A group admin cannot enumerate, infer, export, or mutate users outside assigned groups, including through search counts, error messages, config selectors, and usage aggregates.

### Phase 9 — Production hardening and rollout

**Work**

- Security review of tenant resolution, platform system-context entry, exports, and authorization.
- Load tests for member imports and usage aggregation.
- Backup/restore and reconciliation drills.
- Audit-log retention and privacy/data-erasure policy.
- Metrics and alerts for quota denials, reservation leaks, tenant-context failures, and cross-tenant rejection.
- Rollout: internal tenant → pilot institution → selected institutions → general availability.

**Acceptance gate**

- Runbooks, dashboards, alerts, rollback flags, and data-reconciliation jobs are proven in staging and pilot.

## 9. Recommended implementation order by repository

### `synapse`

1. Institution/platform models and platform authorization.
2. Tenant resolver validation and migration tooling.
3. Restricted institution-admin role provisioning.
4. Member/invitation/import APIs and shared lifecycle services.
5. Usage ledger/reporting.
6. Quota reservation/enforcement.
7. Optional subgroup authorization.

### `synapse-admin`

1. Platform/institution session context and navigation split.
2. Institution console.
3. Re-enabled Members page backed by completed APIs.
4. Import and lifecycle dialogs.
5. Usage dashboards.
6. Quota policy editor.
7. Optional group-admin views.

Do not begin by merely exposing the existing hidden Users page. The backend create/delete behavior and role separation must be completed first.

## 10. Test strategy that blocks release

The release suite should include:

- a generated cross-tenant matrix for every read/write admin route;
- attempts to inject another tenant through headers, body, query, route IDs, CSV rows, and object references;
- platform-route tests proving system context cannot be entered by a tenant admin;
- seat-limit concurrency tests across invite, registration, SSO, and import;
- usage exact-once/idempotency tests across retries and stream reconnects;
- quota concurrency tests at institution, member, and model boundaries;
- authorization tests for hidden counts and indirect disclosures;
- migration tests on a production-like anonymized dataset;
- admin-panel browser tests for platform, institution-admin, read-only, and denied roles;
- audit tests ensuring every privileged mutation records actor, tenant, target, and before/after state.

## 11. Immediate next implementation slice

The safest first code milestone is **Phases 0–2**, ending with:

- a first-class Institution record;
- a trusted institution resolver;
- strict tenant isolation after backfill;
- a distinct platform-superadmin authorization path;
- a restricted tenant-local institution-admin role;
- no first-user `ADMIN` promotion.

Only then should member creation/import and the hidden Users page be enabled. This prevents building account-management features on top of an authorization model that currently gives the `ADMIN` role every platform-seeded capability.
