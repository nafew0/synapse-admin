---
version: 1
slug: "src-routes-login-tsx"
primary_target: "src/routes/login.tsx"
related_targets: ["src/components/AuthCard.tsx"]
---

# Surface: admin sign-in

Mode: operate. Audience: institution admins and BdREN superadmins, signing in a few times a month. Job: get into the console with email and password, SSO, or a 2FA code, and know who to ask when that fails. Constraint: keep the sign-in flow, errors, SSO auto-redirect and 2FA exactly as they are; all copy through useLocalize; light and dark.

## Direction contract

THESIS: The sign-in names what it is before it asks for anything: a teal-wash half says "Synapse Admin" and the three jobs it does, the other half is a plain form.
OWN-WORLD: Synapse admin tokens only: Teal Wash field with Deep Teal Ink type, Card White pills, Card White form half, Action Orange sign-in with dark ink text; dark mode swaps to the dark tint and surface.
STORY: The admin sees which console this is and what it manages, signs in (password, SSO or 2FA), and finds the support address at the foot of the teal field.
FIRST VIEWPORT: Two equal columns. Left: logo top, 40px title, one line, three job pills, support line at the foot. Right: 384px form column centred. Theme toggle top-right. Phones stack teal block over form.
FORM: Chosen by the user from three samples made with the design-taste-frontend skill ("B: Teal tint split", accent-ladder app style); replaces the earlier teal-band build. seed: none (unavailable)
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
