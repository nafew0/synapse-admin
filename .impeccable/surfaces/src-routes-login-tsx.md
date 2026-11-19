---
version: 1
slug: "src-routes-login-tsx"
primary_target: "src/routes/login.tsx"
related_targets: ["src/components/AuthCard.tsx"]
---

# Surface: admin sign-in

Mode: operate. Audience: institution admins and BdREN superadmins, signing in a few times a month. Job: get into the console with email and password, SSO, or a 2FA code, and know who to ask when that fails. Constraint: keep the sign-in flow, errors, SSO auto-redirect and 2FA exactly as they are; all copy through useLocalize; light and dark.

## Direction contract

THESIS: The admin door is the same door as the chat app: one card on the network, brand on one side, form on the other, plus what the console is for.
OWN-WORLD: The app login's palette and proportions in admin tokens: network image, white or teal-black card, tone-step brand panel, deep teal or light orange submit, 48px controls.
STORY: The admin recognises Synapse, sees what the console manages, signs in, and finds the support address under the form.
FIRST VIEWPORT: Centred 1024px card. Left logo, headline, three jobs. Right heading, lead, fields, submit, support line. Below lg the card narrows, the brand becomes a short header, the jobs drop. Theme toggle bottom-left.
FORM: Pinned by the user's brief: use the app login as the reference, with the left side chosen as "Logo, line, three jobs". seed: none (pinned)
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
