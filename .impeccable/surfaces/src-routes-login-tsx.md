---
version: 1
slug: "src-routes-login-tsx"
primary_target: "src/routes/login.tsx"
related_targets: ["src/components/AuthCard.tsx"]
---

# Surface: admin sign-in

Mode: operate. Audience: institution admins and BdREN superadmins, signing in a few times a month. Job: get into the console with email and password, SSO, or a 2FA code, and know who to ask when that fails. Constraint: keep the sign-in flow, errors, SSO auto-redirect and 2FA exactly as they are; all copy through useLocalize; light and dark.

## Direction contract

THESIS: The sign-in is the console's front door: a deep teal band names the product and what it is for, and the sign-in card overlaps its edge on the grey ground, instead of the category's lone card floating on a decorative background.
OWN-WORLD: The Synapse admin world as built: grey ground (#f7f7f8 / #06161a); a full-width band in deep teal (#134f54 light, #0e2c30 dark) carrying the white Synapse mark; one white or #0f1f24 card with a 1px rule, 12px corners, no shadow; Action Orange sign-in button with dark ink text; teal links.
STORY: The admin sees the product name and purpose, signs in (password, SSO or 2FA), and if stuck sees the support address under the card.
FIRST VIEWPORT: Band across the top third: logo and "BdREN Synapse / Admin console" top-left, "Sign in to Synapse Admin" and a one-line purpose centred. A 440px card overlaps the band's lower edge, holding email, password, orange Sign in, an "or" rule and the SSO button. Support line with info@bdren.net.bd beneath. Theme toggle bottom-left. On phones the band shortens and the card fills the width less a 16px gutter.
FORM: Dealt structure "Teal band, card overlap", the dealt lead (index 5 of the grounded list), chosen by the user after first picking the second card. seed:8de88f4b4f5c4976
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
