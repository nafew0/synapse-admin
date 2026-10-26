---
version: 1
slug: "src-components-dashboard-overview-tsx"
primary_target: "src/components/dashboard/Overview.tsx"
related_targets: []
---

# Surface: institution admin Dashboard

Mode: operate. Audience: institution admins (occasional, non-technical office staff). Job: see at a glance whether the institution is healthy this week — seats, who is using Synapse, how many requests, how much allowance is left — and spot who needs follow-up. Constraint: show only data the admin can get; allowance cards fall back to token figures until a tenant-scoped allowance endpoint exists. Week = ISO Monday–Sunday, matching the quota engine.

## Direction contract

THESIS: The dashboard is this week, read against its own limit — daily use set beside an even pace to the reset day — instead of the category's anonymous 30-day KPI wall.
OWN-WORLD: The Synapse app world as built: teal brand (#186569/#008f88), orange accent (#f5871f) for the primary action and "ahead of pace", light ground #f7f7f8 / dark #06161a, white or #0f1f24 cards, system UI sans, lucide icons, status as icon + word.
STORY: The admin lands, reads four figures (seats used, active users, requests, allowance or tokens this week), sees whether this week is ahead of pace, flips to Busiest days to learn the pattern, then follows up invites or heavy members.
FIRST VIEWPORT: Sidebar left. Title row with period switch (This week / This month / 30 days) and Invite people on the right. Row of four figures. Main card, two-thirds width, with tabs This week | Busiest days: Mon–Sun daily bars, today marked, future days hatched, last-week ghost (fallback) or pace line (allowance). Right column: month figure, people to follow up. Bottom row: top members, models, tokens.
FORM: Dealt structure "This week at a glance" from re-roll round 1, lead of three, revised to the user's steer. seed:115adf60132d735b
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
