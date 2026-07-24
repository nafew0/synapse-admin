# Branding Overlay — BdREN Synapse Admin Panel

This file tracks every place the "LibreChat Admin Panel" upstream branding was
changed to "BdREN Synapse", so future upstream merges know exactly where
conflicts are likely and why each change exists. See
`repo-management-guide.md` (in the BdREN Synapse planning folder) for the full
update procedure.

Brand palette: **purple** `#9A278E`/`#B054A0` (dark) — identity, from the
Synapse logo — + **orange** `#F5871F`/`#FBA24D` (dark) — interactive accent
(buttons, links, focus/outline).

## New files (zero merge risk)

- `src/components/NetworkBackground.tsx` — animated network-graph canvas +
  watermark shown behind the login page.
- `src/assets/synapse-icon.svg` — icon-only Synapse mark, used for the login
  watermark and the logo shown above the login title.
- `src/theme/brandTheme.ts` — see "click-ui's own component colors" below.

## Same-name asset replacements (zero merge risk)

- `src/assets/librechat.svg` — content replaced with the Synapse network icon
  (import path in `Sidebar.tsx` unchanged, so the diff there is minimal).
- `public/favicon.ico` — replaced with a Synapse favicon (16/32/48/64 multi-res).

## Upstream files touched (small, isolated edits)

| File | What changed |
|---|---|
| `src/locales/en/translation.json` | `com_auth_title` ("Admin Panel" → "BdREN Synapse" — drives both the login card title and sidebar title), `com_a11y_logo_alt`, `com_users_subtitle`, `com_dash_subtitle` |
| `src/routes/__root.tsx` | browser `<title>` |
| `public/manifest.json` | `name`, `short_name`, `theme_color` (→ purple), icon `sizes` string updated to match the regenerated favicon.ico |
| `src/styles.css` | `--cui-color-accent`, `--cui-color-outline`, `--cui-color-text-primary`, `--cui-color-text-link` overridden to orange in `:root`, `.dark`, **and** the `@media (prefers-color-scheme: dark) { :root:not(.light) }` duplicate block (all three must stay in sync) |
| `src/routes/login.tsx` | mounts `<NetworkBackground />`; added `position: 'relative'` to the `Container` and wrapped `AuthCard`/`ThemeSelector` in `relative z-10` so they stack above the new background |
| `src/components/AuthCard.tsx` | added a Synapse icon `<img>` above the title in both the auto-SSO-redirect and normal login card variants |
| `src/routes/__root.tsx` | also adds a side-effect import (`import '../theme/brandTheme';`) — see below |

## click-ui's own component colors (Button, TextField focus ring, etc.)

The `--cui-color-*` CSS variable edits above only affect elements that read
those variables directly (plain text/links). click-ui's own components are
styled from a **separate, bundled design-token tree**
(`themes.dark`/`themes.light`, ~50 color paths) fed through styled-components'
`ThemeProvider` inside `ClickUIProvider` — which only accepts a theme *name*
("dark"/"light"), with no override prop. Nesting a second styled-components
`ThemeProvider` around app content does **not** work either: click-ui bundles
its own nested copy of styled-components
(`node_modules/@clickhouse/click-ui/node_modules/styled-components@6.3.11`,
vs this app's top-level `styled-components@6.4.2`), so it reads from a
different React Context instance than anything the app imports from the
top-level `'styled-components'` package.

`src/theme/brandTheme.ts` works around this the only way that reaches both
instances: `themes.dark`/`themes.light` (exported from `@clickhouse/click-ui`)
are plain, mutable, module-singleton objects — patching every accent-carrying
path **in place, once, at import time** changes the data both
styled-components copies render, since the data itself isn't tied to either
instance. Imported once for its side effect in `__root.tsx`, before
`ClickUIProvider` first renders.

If click-ui ever adds a real theme-override prop to `ClickUIProvider`, or the
nested styled-components duplicate gets resolved (dependency versions align),
this file can likely be replaced with something less unusual — check on any
upstream merge that bumps `@clickhouse/click-ui`.

## Left unchanged (intentional)

- All `librechat-data-provider` / `@librechat/*` package imports and the
  `librechat-admin-panel` package name — internal identifiers.
- Console-log strings (`server.ts` `"Admin panel listening…"`, `[admin-panel]`
  prefix) — not user-visible.
- References to "LibreChat" as the *platform being administered* (e.g. help
  text pointing at librechat.ai docs, `librechat.yaml` mentions) — this panel
  manages a LibreChat backend, so these are accurate as-is unless BdREN stands
  up its own docs/support channel.
- Orphaned unused assets (`public/librechat-logo.svg`,
  `public/clickhouse-{light,dark}.svg`) — left in place, not referenced by any
  code path; harmless.
- `--cui-color-accent-info`, `--cui-color-accent-warning`, and the
  feedback-*-bg/-fg pairs — these are semantic status colors (info/success/
  warning/danger), not brand identity. Deliberately **not** retinted to
  orange to avoid visually colliding with the existing amber "warning" state.

## Known pre-existing issue (unrelated to branding)

`src/server/roles.ts` currently fails `tsc --noEmit` with
`Module '"@librechat/data-schemas"' has no exported member 'INSTITUTION_ADMIN_ROLE'`.
This file was already modified (uncommitted) before this branding work began,
as part of separate in-progress multi-tenant/institution-admin work — not
touched or introduced by the branding changes above.
