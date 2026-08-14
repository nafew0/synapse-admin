# Fable5 Review Reconciliation and Remediation Plan

Date: 2026-07-25

Scope:

- `synapse/` backend and shared packages
- `synapse-admin/` administration panel
- SaaS institution administration through Phase 5

## Executive assessment

The tenancy architecture remains worth building on. Platform authority is separated from tenant
authority, tenant member APIs derive their tenant from the authenticated user, seat transitions are
centralized, and tenant admins cannot assign the platform `ADMIN` role.

The review is nevertheless correct that the current branch is not pilot-ready. Production bundling
succeeds, but strict type-checking does not. More importantly, membership suspension is not enforced
at authentication boundaries, OIDC can reactivate suspended users, the seat lifecycle assumes
transaction-capable MongoDB, and several control-plane mutations lack audit and input-hardening.

The correct response is incremental hardening, not a tenancy rewrite.

## Verification performed for this reconciliation

The findings were checked against the current workspace rather than accepted from the earlier review
unchanged.

- `synapse-admin`: `bun run build` passes.
- `synapse/packages/data-schemas`: `npm run build` passes.
- `synapse/packages/api`: `npm run build` passes.
- `synapse-admin`: `npx tsc --noEmit` fails with 19 errors.
- `synapse/packages/data-schemas`: `npx tsc --noEmit` fails with one `TxData.modelKey` error.
- Tenant-isolation coverage test fails for `InstitutionInvite` and `InstitutionImportJob`.
- The platform-admin upsert regression test added during the latest repair passes.
- The latest institution-admin bootstrap and invitation-acceptance tests pass.

The distinction matters: bundling works because the bundlers transpile without enforcing the complete
TypeScript contract. CI must run both build and type-check.

## Findings already resolved

### R1. PlatformAdmin upsert path conflict

Status: resolved and regression-tested.

`upsertPlatformAdmin` no longer writes `email` through both `$set` and `$setOnInsert`. The current
superadmin registry works, `/api/platform/*` is reachable, and a focused MongoDB-backed regression
test covers create and repeat-upsert behavior.

### R2. Platform-superadmin permission bootstrap failure

Status: resolved functionally.

Platform superadmins now receive the full effective-capability set, their verified admin session
contains `isPlatformSuperadmin`, and the admin panel exposes the Institutions control plane.

The separate implicit-first-admin promotion risk remains open and is tracked as P0-3.

### R3. Empty-institution administrator loop

Status: resolved functionally.

New institutions require an initial admin email in the admin UI and backend API. Existing institutions
have an **Invite admin** action. When SMTP is unavailable, the one-time registration link is displayed
instead of discarded. A tenant-less existing identity can accept the invitation and join the tenant.

Acceptance-time seat safety and compensation still need improvement and are tracked as P0-4.

### R4. `TransactionData.modelKey`

Status: partially resolved.

The exported `TransactionData` type contains `modelKey`, but the internal `TxData` interface used by
`createTransactionMethods` does not. Strict type-checking therefore still fails. This is a one-line
P0 build fix.

### R5. Suspended-institution route protection

Status: the broad review claim is no longer accurate.

`requireJwtAuth` chains into `tenantContextMiddleware`, and that middleware calls
`validateActiveInstitution` for authenticated tenant users. The admin users and usage routes use
`requireJwtAuth`, so suspended institutions are rejected there.

Platform routes intentionally remain available to platform superadmins so an institution can be
reactivated. Tests should be added to prevent regressions, but no new global route mount is required.

## Product-policy clarification

### Pending invitations and seats

Locked product rule: pending invitations do **not** consume active seats.

The review recommends treating pending invitations as seat consumption. That would contradict the
approved Phase 3–4 behavior and should not be implemented silently.

The real defects are:

- acceptance can discover capacity only after onboarding has started;
- a tenant-less existing identity can be left attached but suspended if activation fails;
- concurrent duplicate pending invitations are not prevented by a database constraint;
- large imports can send far more invitations than currently available seats without a clear warning.

The remediation will preserve non-consuming invitations while making acceptance mutation-safe and
showing admins the difference between available seats and outstanding invitations.

## Prioritized remediation plan

## P0-1 — Restore a strict, reproducible build gate

Goal: both repositories bundle, type-check, and pass the tenancy coverage guard in a clean install.

Changes:

1. Define `INSTITUTION_ADMIN_ROLE = 'INSTITUTION_ADMIN'` in the admin panel's local constants.
   Do not runtime-import this simple constant from the unpublished local data-schema build.
2. Keep API DTOs and simple role constants local to `synapse-admin` unless a package publish-and-bump
   workflow is deliberately introduced.
3. Restore or remove the obsolete `AssignmentRef` contracts used by the empty role/group assignment
   server functions.
4. Replace unsupported click-ui icon `chart` with a valid icon such as `bar-chart`.
5. Narrow React Query results explicitly before reading `.data` in `UsagePage` and `UsersPage`.
6. Type the member role query input as `'USER' | 'INSTITUTION_ADMIN' | 'all'`.
7. Guard the optional invitation email passed into `InviteLinkPanel`.
8. Add `modelKey?: string` to the internal `TxData` interface.
9. Add `InstitutionInvite` and `InstitutionImportJob` to the reviewed manual-scoping allowlist,
   because their service methods use `runAsSystem` with explicit `tenantId` filters. Alternatively,
   apply the isolation plugin consistently; do not mix both approaches.
10. Add explicit `typecheck` scripts and require these CI gates:
    - production build;
    - `tsc --noEmit`;
    - focused unit tests;
    - tenant-isolation coverage test.
11. Validate `synapse-admin` once from a clean dependency install to ensure it does not accidentally
    depend on a locally rebuilt unpublished package.

Acceptance:

- All three production builds pass.
- Both strict type-check commands pass.
- Tenant-isolation coverage passes.
- A clean standalone `synapse-admin` install builds and type-checks.

## P0-2 — Enforce membership status at every authentication boundary

Goal: suspended and removed members cannot log in, refresh, or use an existing access token.

Changes:

1. Add a shared membership-access guard with explicit treatment for:
   - no `tenantId`: platform/non-tenant identity, membership check not applicable;
   - `active` or legacy missing status: allowed during migration;
   - `suspended`: deny with a stable inactive-membership error;
   - `removed`: deny with a stable removed-membership error.
2. Apply the guard to:
   - local password strategy;
   - JWT strategy after the DB-authoritative user lookup;
   - OpenID JWT/reuse strategy;
   - OIDC callback before issuing application tokens;
   - admin refresh-token endpoints.
3. Remove the unconditional OIDC call that activates every non-active tenant user. JIT activation is
   allowed only for a new approved tenant mapping or valid invitation. Reactivation of an existing
   suspended/removed member remains an administrator action.
4. On suspend/remove:
   - delete application sessions for the affected user;
   - revoke refresh-token/session records;
   - clear or invalidate reusable OpenID session state where supported.
5. On institution suspension, revoke or invalidate tenant sessions in a bounded background operation.
   JWT requests must still fail immediately through active-institution validation even if revocation
   is delayed.
6. Record denied login/refresh attempts without leaking membership state to unauthenticated callers
   more precisely than necessary.

Tests:

- Suspended and removed users fail local login.
- Existing JWTs for suspended/removed users fail on their next request.
- Refresh attempts fail after suspension.
- OIDC does not reactivate suspended or removed users.
- Explicit administrator reactivation restores access and consumes exactly one seat.

## P0-3 — Remove implicit platform-superadmin promotion

Goal: platform authority is granted only through an explicit operation.

Changes:

1. Remove the "first tenant-less admin becomes SUPERADMIN" branch from
   `ensurePlatformSuperadminForUser`.
2. Allow bootstrap only from:
   - an explicitly configured `PLATFORM_SUPERADMIN_EMAILS` seed; or
   - a one-shot administrative CLI/migration command.
3. Make seeding idempotent and log the identities seeded without logging secrets.
4. Add platform-admin APIs to list, grant, deactivate, and reactivate platform administrators.
5. Protect the last active superadmin from deactivation.
6. Require recent authentication or a comparable high-assurance control for platform-admin changes.
7. Audit every grant, revoke, failed attempt, and last-admin rejection.

Migration:

- Confirm the existing superadmin registry record is active before removing implicit bootstrap.
- Document recovery through the CLI for a locked-out deployment.

## P0-4 — Make seat lifecycle safe on the deployed MongoDB topology

Goal: seat transitions work predictably and cannot corrupt the counter.

Recommended deployment decision:

- Require transaction-capable MongoDB for production and pilot.
- Convert local/pilot MongoDB to a single-node replica set.
- Add a startup capability check with a clear fatal configuration error when SaaS membership features
  are enabled but transactions are unavailable.

Reasoning:

Seat transitions update both `Institution.stats.activeMembers` and `User.membershipStatus`. A
single-document counter guard alone does not make that two-document invariant atomic. A standalone
fallback can be offered later only with compensation and reconciliation; it should not silently claim
the same guarantee.

Changes:

1. Reuse the existing `getTransactionSupport` probe.
2. Fail fast in production when membership lifecycle transactions are unsupported.
3. Add deployment documentation for a single-node replica set.
4. Keep the conditional counter guard inside the transaction so concurrent final-seat activation has
   a database-enforced predicate.
5. Add a reconciliation command that compares active tenant users with `stats.activeMembers` and can
   report or repair drift.
6. Before invite acceptance mutates an existing tenant-less identity, perform capacity validation
   inside the same transaction that attaches and activates it.
7. Ensure failed acceptance leaves no new account, tenant attachment, role change, or accepted invite.

Tests:

- Startup detects standalone MongoDB when SaaS membership is enabled.
- Two concurrent final-seat activations cannot both succeed.
- All suspend/remove/reactivate operations keep user status and seat count consistent.
- Failed invitation acceptance leaves the identity and invitation unchanged.

## P1-1 — Add complete platform audit coverage

Audit these mutations with actor, tenant, target, before/after, request context, outcome, and reason:

- institution create/update/suspend/reactivate;
- seat-limit changes and rejected changes;
- initial-admin invitation;
- institution-admin promotion/demotion;
- platform-admin grant/deactivation/reactivation;
- bulk import start/completion/failure.

Audit writes for security-sensitive platform mutations should fail closed or use a durable outbox,
based on the existing audit policy.

## P1-2 — Harden institution mutation contracts

1. Replace `PATCH /api/platform/institutions/:tenantId` mass assignment with a schema and allowlist.
2. Initially allow only:
   - `name`;
   - `slug`;
   - `authDomains`;
   - `timezone`;
   - approved `limits` fields.
3. Reject writes to `tenantId`, `stats`, `status`, `createdBy`, suspension metadata, and timestamps.
4. Keep suspend/reactivate as dedicated lifecycle endpoints.
5. Add optimistic concurrency or version checks where simultaneous platform edits matter.

## P1-3 — Make usage attribution and charging idempotent

1. Add explicit `tenantId` to transaction metadata derived from the DB-authoritative user or job
   payload. Do not rely only on request AsyncLocalStorage.
2. Carry tenant context explicitly into workers, event handlers, subagents, and deferred usage writes.
3. Set `TENANT_ISOLATION_STRICT=true` for the pilot after existing unscoped rows are audited.
4. Alert on attempted tenant usage writes without a tenant.
5. Define the ledger idempotency key at database level. Because one request may create prompt,
   completion, and structured-value rows, use a natural unique key such as:
   `tenantId + requestKey + tokenType + valueKey`, with a partial index for rows containing
   `requestKey`.
6. Replace insert-only writes with `$setOnInsert` upserts/bulk upserts.
7. Apply balance charging only when the ledger row was newly inserted. Retry of an already recorded
   row must not change balance.
8. Add a migration/report for duplicate historical request keys before enabling the unique index.

Tests:

- Replaying the same usage event produces no new ledger row and no second charge.
- Distinct prompt/completion/structured rows remain valid.
- Worker/subagent usage retains its tenant.
- Missing tenant attribution fails closed in strict mode.

## P1-4 — Harden invitation and import lifecycle

Preserve the rule that pending invitations do not consume seats.

1. Add a unique partial index on `{ tenantId, email }` where `status = pending`.
2. Convert invitation creation to an upsert or handle duplicate-key races as a friendly conflict.
3. Show outstanding invitations versus currently available seats in dry-run and confirmation UI.
4. Warn when import invitations exceed current free seats, while still allowing the operation if the
   product rule remains unchanged.
5. Move import execution out of the request:
   - create job and return `202`;
   - process rows in a durable worker;
   - persist progress and heartbeat;
   - support safe retry/resume;
   - distinguish completed, partially completed, and failed states.
6. Do not let a failed/crashed job permanently block retry. Reuse the idempotency key to resume or
   explicitly restart a failed job.
7. Rate-limit SMTP and invitation generation.

## P1-5 — Add institution timezone and billing boundaries

1. Add an IANA timezone field to Institution, defaulting deliberately for migrated tenants.
2. Set BdREN to `Asia/Dhaka`.
3. Compute default monthly boundaries in institution local time and convert them to UTC for storage
   queries.
4. Return the effective timezone and UTC boundaries in usage responses and CSV metadata.
5. Test DST and non-DST zones, including `Asia/Dhaka`.

## P1-6 — Add defense-in-depth to admin-panel server functions

1. Add a server-side platform-superadmin guard to every platform-institution BFF function.
2. Retain backend authorization as the ultimate enforcement layer.
3. Avoid using only client navigation visibility as authorization.
4. Add direct server-function invocation tests for unauthorized sessions.

## P2 — Admin-panel completeness and polish

1. Add server-backed pagination to usage-by-member and usage-by-model instead of fixed `limit: 10`.
2. Move new tenant/admin copy into `useLocalize()` translation keys.
3. Replace raw controls with supported click-ui components where the component library provides an
   accessible equivalent.
4. Keep native controls where they are semantically superior, but standardize styling and validation.
5. Add empty, loading, retry, 403, 409, seat-full, invitation-expired, and job-failed states.
6. Add accessibility and responsive tests for institution, member, import, and usage pages.

## Recommended execution sequence

1. P0-1: strict build and CI gates.
2. P0-2: membership enforcement and session revocation.
3. P0-3: explicit superadmin lifecycle.
4. P0-4: MongoDB transaction requirement and seat acceptance safety.
5. P1-1 and P1-2: audit plus platform mutation hardening.
6. P1-3: idempotent usage and explicit tenant attribution.
7. P1-4 and P1-5: durable imports/invitations and timezone-correct reporting.
8. P1-6 and P2: BFF defense-in-depth and UI completion.

## Pilot readiness gate

Do not start an institutional pilot until all of the following are true:

- Production build and strict type-check pass in both repositories.
- Tenant-isolation coverage passes.
- Suspended/removed users fail local, JWT, refresh, and OIDC access.
- OIDC cannot reactivate a member without an administrator action or valid first-time invitation.
- Platform superadmin bootstrap is explicit and recoverable.
- MongoDB transaction support is verified at startup.
- Institution mutation payloads are allowlisted.
- Platform mutations are auditable.
- Usage retries are idempotent and tenant attribution is fail-closed.
- Institution-local billing boundaries are tested.

