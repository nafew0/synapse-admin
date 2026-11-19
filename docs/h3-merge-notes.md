# H3 merge notes: bdren-prod into feature/quota-plan

KB checked: related Synapse entries (quota/credit metering, individuals usage account, usage-policy audit, quota notice) concern the Synapse backend; nothing on admin-panel merge conflicts.

The worktree was on `feature/institution-kb`, and `feature/quota-plan` is checked out in the main checkout, so the merge was made on `h3/quota-plan-merge` (cut from `feature/quota-plan`, 7 ahead / 42 behind `bdren-prod`).

## Conflicted files

- `src/components/institutions/InstitutionDetailPage.tsx`: Overview tab. Production replaced the inline `Overview` with the new `InstitutionOverview` (attention card, 30-day usage). quota-plan wrapped the old one and added `InstitutionPackageCard`. Kept production's `InstitutionOverview` and kept quota-plan's `InstitutionPackageCard` below it. The old `policy` prop is no longer passed (production's component does not take it).
- `src/locales/en/translation.json`: both sides appended keys at the same spot. Kept all keys from both. `com_dash_weekday_note` existed on both with different text; kept production's ("last 30 days"), which matches production's dashboard.
- `src/utils/index.ts`: both added a barrel export. Kept `./packages` and `./attention`.

## Pre-existing problems (identical on both parents, not caused by the merge)

- `tsc --noEmit`: 8 errors (`@testing-library/user-event` missing from package.json, `access.test.ts` user fixtures lack `name`, `agentsCatalog.ts` zod `z.record` arity).
- `npm run lint` crashes on the `import-x/no-cycle` rule (legacy "node" resolver not installed). With that rule off: 0 errors, 4 warnings.
- 2 test files fail to import `@testing-library/user-event` (not declared in package.json). Not added: needs `bun add -d @testing-library/user-event`.
