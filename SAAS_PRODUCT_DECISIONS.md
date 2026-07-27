# SaaS Product Decisions

**Status:** Proposed — requires product approval  
**Date:** 2026-07-23  
**Related plan:** [SaaS Institution Administration and Usage-Limit Plan](SAAS_INSTITUTION_ADMIN_IMPLEMENTATION_PLAN.md)

## Purpose

This document freezes the product and security decisions required before implementing institution administration, member management, usage reporting, and quotas.

Items marked **Proposed** are recommended defaults, not approved policy. Once a decision is approved:

1. change its status to **Approved**;
2. record the approval date and decision owner;
3. create an Architecture Decision Record when the choice materially affects data models, tenant isolation, authentication, billing, or quota enforcement;
4. update the related implementation phase if the approved choice differs from the recommendation.

## Decision summary

| # | Decision | Proposed default | Status |
|---|---|---|---|
| 1 | Institution boundary | One institution equals one tenant | Proposed |
| 2 | User membership | One user account belongs to one institution in the first release | Proposed |
| 3 | Administrative roles | Separate platform superadmin and institution admin | Proposed |
| 4 | Seat accounting | Active members and pending invitations consume seats | Proposed |
| 5 | Usage limits | Enforce raw-token and monetary-cost limits per calendar month | Proposed |
| 6 | Model identity | Use an internal canonical model catalog | Proposed |
| 7 | Feature entitlements | Contractual entitlements are separate from ordinary app configuration | Proposed |
| 8 | Tenant routing and identity | Trusted subdomain/identity resolution; never trust client tenant headers | Proposed |
| 9 | Suspension, retention, and deletion | Suspend first; controlled export and deletion workflow | Proposed |
| 10 | Support and audit access | Time-bound, audited support access; no unrestricted impersonation | Proposed |
| 11 | Pilot scope | Institution administration and core AI services, without complex billing or SCIM | Proposed |

---

## Decision 1 — Institution equals tenant

**Status:** Proposed  
**Owner:** Unassigned

### Proposed decision

Each customer institution is represented by one immutable `tenantId`. The tenant is the primary boundary for:

- users and roles;
- chats and messages;
- files and generated documents;
- agents, prompts, skills, and MCP configuration;
- balances, usage, and quotas;
- internal groups;
- configuration overrides;
- logs and exports.

The existing LibreChat `Group` remains an internal team, department, class, cohort, or ACL principal inside a tenant.

### Consequences

- Institution administrators can reuse the existing tenant-aware data layer.
- The current `Group` model is not used as the subscription or billing account.
- An institution may contain many groups.
- Contractual quotas apply to the institution/tenant unless a later decision explicitly introduces non-overlapping billing groups.
- Every tenant-owned cache key, background job, file path, vector namespace, queue message, and usage record must carry tenant context.

### Rejected alternative

Using one shared tenant and treating LibreChat Groups as institutions is rejected because group membership can overlap and current action capabilities do not restrict an administrator's target resources to one group.

### Approval question

Do we approve one institution as one tenant, with groups only inside institutions?

---

## Decision 2 — User membership model

**Status:** Proposed  
**Owner:** Unassigned

### Proposed decision

For the first release, one LibreChat user record belongs to exactly one institution through `User.tenantId`.

The same email address may exist in different tenants as separate accounts. Authentication must resolve the tenant before looking up the user.

### Member lifecycle

```text
invited → active → suspended → removed
              ↘ pending_deletion → deleted
```

- `invited`: an invitation exists but no active user account has been accepted.
- `active`: the member may authenticate and use entitled services.
- `suspended`: authentication and active sessions are blocked, while data and audit history remain.
- `removed`: institution access is revoked and retention policy begins.
- `pending_deletion`: export, legal-hold, and retention checks are underway.
- `deleted`: the approved deletion workflow has completed.

### Deferred alternative

If one person must later switch between multiple institutions using one identity, introduce a global `Account` plus tenant-scoped `InstitutionMembership`. Do not add this complexity before a real customer requirement exists.

### Approval questions

- Can one person have separate accounts in several institutions for the pilot?
- Must users be able to switch institutions in one login session?

---

## Decision 3 — Administrative roles

**Status:** Proposed  
**Owner:** Unassigned

### Proposed roles

#### Platform superadmin

May:

- provision, suspend, reactivate, and close institutions;
- set contractual seats, token limits, cost limits, and feature entitlements;
- appoint or revoke institution administrators;
- view platform health and institution-level usage;
- perform explicitly authorized platform support operations.

Platform authorization must be independent of a tenant's ordinary role name.

#### Institution admin

May, inside one tenant:

- list, search, invite, import, suspend, reactivate, and remove members;
- assign only allowlisted institution roles;
- see member and institution usage;
- manage internal groups if entitled;
- view institution settings that the platform exposes.

May not:

- target another tenant;
- change contractual limits or plan entitlements;
- assign platform-superadmin access;
- grant arbitrary system capabilities;
- disable mandatory usage accounting;
- access unrestricted platform configuration.

#### Member

May use services allowed by the institution plan and the member's role/group policies.

#### Subgroup admin

Deferred unless a pilot institution needs independently administered departments or cohorts. If implemented, it requires explicit server-side target scoping; ordinary group membership and `MANAGE_USERS` are not sufficient.

### Migration rule

Do not assign the current globally empowered `SystemRoles.ADMIN` role to institution administrators. Existing `ADMIN` users must be reviewed and migrated deliberately.

### Approval question

Do we approve three launch roles—platform superadmin, institution admin, and member—with subgroup admin deferred?

---

## Decision 4 — Seat accounting

**Status:** Proposed  
**Owner:** Unassigned

### Proposed seat rules

| Member state | Consumes a seat? | Reason |
|---|---:|---|
| Pending invitation | Yes | Prevents institutions from issuing unlimited invitations beyond contract |
| Active | Yes | Billable member |
| Suspended | No | Access is blocked |
| Removed | No | Institution access has ended |
| Expired/revoked invitation | No | No remaining access path |
| Platform support identity | No | Not an institution member |

### Enforcement

The same atomic seat operation must be used by:

- invitations;
- invitation acceptance;
- direct administrator creation;
- CSV import;
- OIDC/SAML just-in-time provisioning;
- SCIM provisioning when added;
- reactivation of suspended users.

Two concurrent operations competing for the final seat must not both succeed.

### Operational rules

- The platform superadmin may temporarily increase the seat limit.
- Reducing a limit below current occupancy does not automatically remove users.
- When over limit, existing members retain the approved behavior, but new invitations, activations, and reactivations are blocked.
- Seat adjustments require an audit event with before/after values.

### Approval questions

- Should pending invitations consume seats?
- Should suspended accounts consume seats?
- What grace behavior should apply when a limit is reduced below current occupancy?

---

## Decision 5 — Usage metering and limits

**Status:** Proposed  
**Owner:** Unassigned

### Proposed decision

Track both technical consumption and commercial cost.

#### Technical usage

- prompt/input tokens;
- completion/output tokens;
- cached read/write tokens where reported;
- image generations by model, resolution, and quality;
- interpreter execution time, CPU, storage, and job count;
- file/OCR/document operations where they create material provider cost.

#### Financial usage

- provider cost using a versioned price book;
- customer-billed credits;
- manual adjustments and promotional credits;
- optional institutional monetary budget.

### Token limits

Support:

- maximum tokens for the institution per period;
- default maximum tokens per member per period;
- optional member-specific override;
- maximum tokens per canonical model for the institution;
- optional member/model limit later.

The effective request allowance is the most restrictive remaining applicable limit.

### Period

Proposed default:

- calendar month;
- calculated in the institution's configured IANA timezone;
- stored as an unambiguous UTC period boundary;
- no silent carry-over.

### Counting policy

- Count successful provider-reported prompt and completion usage.
- Count usage incurred before a cancellation or provider error when the provider reports it.
- Maintain one documented rule for cached tokens.
- Reserve conservatively before provider execution and settle to actual usage afterward.
- Use exactly-once idempotency keys for retries and reconnects.

### Limit behavior

| Threshold | Proposed behavior |
|---:|---|
| 50% | Visible progress only |
| 80% | Notify institution billing/technical contacts |
| 90% | Strong warning in admin and member UI |
| 100% | Reject new usage covered by the exhausted hard limit |

The platform may configure soft-only limits or a documented grace allowance, but institution admins cannot increase their own limits.

### Why both tokens and money are required

Equal token counts can have very different costs across providers and models. Raw tokens are useful for fair-use policy; monetary cost is necessary for margin and risk management.

### Approval questions

- Are limits calendar-month based?
- Which timezone controls rollover?
- Are both raw-token and monetary hard limits required for the pilot?
- How should cached tokens count?
- Is limited grace usage allowed?

---

## Decision 6 — Canonical model catalog

**Status:** Proposed  
**Owner:** Unassigned

### Proposed decision

Introduce an internal model catalog. Quotas, entitlements, reporting, and pricing reference an immutable canonical `modelKey`, not a raw model string supplied by a client or provider.

Suggested catalog fields:

```ts
interface ModelCatalogEntry {
  modelKey: string;
  providerKey: string;
  providerModelId: string;
  displayName: string;
  aliases: string[];
  usageUnit: 'tokens' | 'images' | 'seconds' | 'operations';
  priceBookKey: string;
  capabilities: string[];
  status: 'active' | 'deprecated' | 'disabled';
}
```

### Required behavior

- All aliases resolve to one canonical key before entitlement and quota checks.
- An institution receives an explicit model allowlist.
- A model can be disabled platform-wide during an incident.
- Historical usage keeps the canonical model and the price snapshot used at execution time.
- Model renames do not rewrite historical usage.
- Fallback routing must remain inside the institution's allowlist and budget.

### Approval question

Do we approve a platform-managed canonical model catalog as the only source for quota and entitlement model IDs?

---

## Decision 7 — Feature entitlements

**Status:** Proposed  
**Owner:** Unassigned

### Proposed decision

Contractual entitlements live in a plan/institution policy separate from the general configuration editor.

General configuration may make an entitled feature more restrictive for a role, group, or user. It may never enable a feature that the institution has not been entitled to use.

### Proposed pilot entitlement matrix

| Capability | Pilot default | Additional controls |
|---|---:|---|
| Standard chat | Enabled | Model allowlist and quotas |
| File upload and document analysis | Enabled | File type, size, storage, and retention |
| Code interpreter | Enabled for approved roles | CPU/RAM/time/disk/concurrency/network policy |
| Document generation | Enabled | File retention and download controls |
| Image generation | Enabled when provider integration is production-ready | Model, resolution, safety, cost, and concurrency |
| Web search | Institution choice | Provider cost and domain policy |
| Agents | Enabled for selected roles | Creation/share permissions |
| Skills | Enabled for selected roles | Authoring/share permissions |
| Public sharing | Disabled by default | Institution security choice |
| MCP servers | Disabled by default | Domain allowlist, secrets, approval, and audit |
| Custom providers/API keys | Disabled by default | Platform approval and secret-vault integration |

### Code-interpreter baseline

- Tenant-aware job and file attribution.
- CPU, memory, execution-time, disk, and concurrency limits.
- Outbound network disabled by default or allowlisted.
- Automatic sandbox and generated-file cleanup.
- Signed, expiring download URLs.
- Upload validation and malware scanning where practical.
- Execution metadata in the audit/usage trail without logging sensitive file contents.

### Image-generation baseline

- Separate generation/cost quota; do not convert images into arbitrary text tokens.
- Model, quality, resolution, and concurrency controls.
- Safety policy and provider error handling.
- Configurable media retention.
- Provider and generation metadata preserved for reconciliation.

### Approval questions

- Which pilot roles may run code?
- Is outbound interpreter network access required?
- Which features are enabled by default for new institutions?
- Is public sharing allowed for any pilot institution?

---

## Decision 8 — Tenant routing and institutional identity

**Status:** Proposed  
**Owner:** Unassigned

### Proposed routing

Use an institution slug resolved through a trusted deployment layer, preferably:

```text
https://{institution-slug}.{service-domain}
```

The reverse proxy or authentication gateway:

1. resolves the slug to an active Institution;
2. removes any client-provided tenant header;
3. sets trusted internal tenant context;
4. binds the resolved tenant to the login flow and authenticated session.

The application still validates the resolved tenant and the user's `tenantId`. A syntactically valid tenant ID is not sufficient.

### Pilot identity options

1. invitation plus local account;
2. CSV import;
3. tenant-specific OIDC or SAML where required.

### Later enterprise option

Expose a tenant-scoped SCIM 2.0 service provider for automated user/group creation, updates, and deprovisioning. SCIM is deferred until member lifecycle and seat enforcement are shared by every provisioning path.

### Secret handling

- Per-tenant IdP and provider secrets belong in a secret manager.
- Database configuration stores secret references, not plaintext credentials.
- Secret reads and rotations are audited.

### Approval questions

- What production service domain will institutions use?
- Are custom institution domains required?
- Which pilot institutions require OIDC or SAML?

---

## Decision 9 — Suspension, retention, export, and deletion

**Status:** Proposed  
**Owner:** Unassigned

### Institution suspension

Proposed behavior:

- block member login and new AI/provider execution;
- revoke active sessions;
- retain institution data during suspension;
- permit platform-superadmin access;
- optionally permit a restricted institution-admin export/billing page;
- keep audit and usage reconciliation active.

### Member suspension

- Revoke active sessions promptly.
- Block new authentication and API use.
- Preserve owned data and usage history.
- Allow an institution admin to reactivate the user subject to seat limits.

### Retention defaults

Proposed starting points requiring legal/product approval:

| Data | Proposed default |
|---|---|
| Sandbox workspace | Delete when the job finishes, subject to a short failure-debug window |
| Generated download files | 30 days |
| Uploads | Institution-configurable retention |
| Chats and messages | Retain until user/institution deletion policy applies |
| Usage and financial records | Retain for the required accounting period |
| Security and privileged audit records | Append-only retention defined by security/legal policy |

### Offboarding

```text
active → suspended → offboarding → deleted
```

Offboarding includes:

- freeze new usage;
- revoke sessions and credentials;
- customer data export;
- verify legal holds and billing reconciliation;
- delete tenant-owned data from active systems;
- apply backup-expiry policy;
- preserve only legally required audit/financial records;
- record completion and responsible actor.

### Approval questions

- What are the legal retention periods for chats, files, usage, audit, and invoices?
- Do institutions receive self-service exports?
- What data remains after account or institution deletion?

---

## Decision 10 — Support access and audit

**Status:** Proposed  
**Owner:** Unassigned

### Proposed decision

Do not create permanent unrestricted “login as customer” access.

Support access must be:

- explicitly authorized;
- time limited;
- tied to a reason and support ticket;
- read-only by default;
- visibly indicated in the UI;
- revocable immediately;
- recorded with platform actor, tenant, target, action, IP, request ID, and expiry;
- excluded from institution seat counts.

Sensitive changes require a fresh privileged-authentication check. High-risk actions may require two-person approval later.

### Audit requirements

- Append-only privileged audit trail.
- Tenant context on every record.
- Separate privileges for reading audit history and performing ordinary administration.
- No institution administrator may modify or delete their own audit history.
- Export access is audited.
- Audit storage failures trigger alerts; selected high-risk operations may fail closed.

### Approval questions

- Is support impersonation required for the pilot?
- Which support actions require customer approval?
- Which actions should fail closed when audit persistence is unavailable?

---

## Decision 11 — Pilot scope

**Status:** Proposed  
**Owner:** Unassigned

### Proposed first-pilot deliverables

- Institution registry and lifecycle.
- Trusted tenant routing.
- Separate platform-superadmin and institution-admin authorization.
- Invitations, CSV import, member status, and atomic seat enforcement.
- Canonical model catalog and per-institution model allowlist.
- Raw-token and monetary usage ledger.
- Institution, member, and model usage dashboards.
- Soft alerts and hard quotas.
- Per-tenant request and concurrency rate limits.
- Code-interpreter security/resource controls.
- Image-generation entitlement and separate usage limits once the provider is ready.
- Audit log, basic export, suspension, and offboarding workflow.

### Explicitly deferred

- One identity with membership in multiple institutions.
- Independently billed overlapping groups.
- Subgroup-admin target scoping unless required by a pilot.
- SCIM.
- Customer-managed encryption keys.
- Regional data residency tiers.
- Automated credit-card billing.
- Complex discounts and invoice automation.
- Customer-facing developer API and webhooks.
- Continuous Access Evaluation/Shared Signals integration.

### Pilot success criteria

- At least one institution can be provisioned without database edits.
- Its administrator can manage members without platform assistance.
- Automated tests prove that a second tenant cannot access its data.
- Seat, member-token, institution-token, model-token, and cost limits are enforceable.
- Usage can be reconciled to provider records.
- Interpreter and image workloads cannot exhaust platform-wide resources.
- Suspension and offboarding are tested.
- Support can diagnose problems without uncontrolled tenant access.

---

## Product decisions still requiring approval

The following choices block implementation or materially change it:

1. Whether a person needs one identity across multiple institutions.
2. Which member states consume seats.
3. Quota period and timezone.
4. Cached-token counting policy.
5. Whether monetary budgets are hard limits in the pilot.
6. Default enabled services for a new institution.
7. Interpreter outbound-network policy.
8. Institution domain/subdomain strategy.
9. Pilot SSO requirements.
10. Data retention and deletion periods.
11. Support-access requirements.
12. Whether subgroup administrators are required in the first pilot.

## Recommended approval sequence

Approve decisions in this order:

1. Decisions 1–3: tenant boundary, membership, and roles.
2. Decisions 4–6: seats, usage, and canonical models.
3. Decisions 7–8: entitlements, routing, and identity.
4. Decisions 9–10: lifecycle, support, and audit.
5. Decision 11: final pilot scope.

Implementation should begin with the Institution model and platform/institution role separation only after Decisions 1–3 are approved.

## Reference guidance

- [OWASP Multi-Tenant Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html)
- [OWASP Authorization Regression Testing Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Regression_Testing_Cheat_Sheet.html)
- [OWASP RAG Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html)
- [Microsoft Entra SCIM support](https://learn.microsoft.com/en-us/entra/identity/app-provisioning/scim-support-in-entra-id)
- [OpenID Shared Signals Working Group](https://openid.net/wg/sharedsignals/)
- [NIST SP 800-171 Revision 3](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/800-171r3/NIST.SP.800-171r3.html)
