---
name: BdREN Synapse Admin
description: The institution admin console for BdREN Synapse; this week read against its own limit, in the Synapse teal-and-orange world.
colors:
  brand-teal: "#186569"
  brand-teal-ink: "#134f54"
  brand-teal-tint: "#e2f0ee"
  chart-teal: "#008f88"
  chart-orange: "#e8730c"
  action-orange: "#f5871f"
  on-accent-ink: "#132321"
  ground: "#f7f7f8"
  surface: "#ffffff"
  ink: "#132321"
  ink-muted: "#595959"
  stroke: "#e3e3e3"
  stroke-muted: "#ededed"
  stroke-intense: "#cdcdcd"
  track: "#ededed"
  ghost: "#8a8a8a"
  hover-wash: "#f2f4f4"
  success-fg: "#047857"
  warning-fg: "#b45309"
  warning-bg: "#fffbeb"
  danger-fg: "#b91c1c"
  danger-bg: "#fef2f2"
  danger-border: "#fecaca"
  dark-ground: "#06161a"
  dark-surface: "#0f1f24"
  dark-ink: "#f2f4f4"
  dark-ink-muted: "#9aa5a7"
  dark-stroke: "#23363b"
  dark-brand-teal: "#4fb6ba"
  dark-brand-teal-ink: "#7fd0d3"
  dark-brand-teal-tint: "#133a3d"
  dark-chart-teal: "#12a7a3"
  dark-chart-orange: "#d97418"
  dark-action-orange: "#f0a857"
typography:
  headline:
    fontFamily: "Inter, 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.025em"
  figure:
    fontFamily: "Inter, 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.025em"
  page-title:
    fontFamily: "Inter, 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
    fontSize: "20px"
    fontWeight: 700
  title:
    fontFamily: "Inter, 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
    fontSize: "15px"
    fontWeight: 600
  body:
    fontFamily: "Inter, 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
    fontSize: "14px"
    fontWeight: 500
  body-small:
    fontFamily: "Inter, 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
    fontSize: "13px"
    fontWeight: 400
  label:
    fontFamily: "Inter, 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
    fontSize: "12px"
    fontWeight: 500
  micro:
    fontFamily: "Inter, 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
    fontSize: "11px"
    fontWeight: 700
    fontFeature: "tnum"
rounded:
  xs: "2px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "2.5": "10px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
components:
  button-primary:
    backgroundColor: "{colors.action-orange}"
    textColor: "{colors.on-accent-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "40px"
  button-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "32px"
  button-row-hover:
    backgroundColor: "{colors.hover-wash}"
  range-picker:
    backgroundColor: "{colors.ground}"
    rounded: "{rounded.lg}"
    padding: "2px"
  range-picker-option-selected:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.brand-teal-ink}"
    typography: "{typography.body-small}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "20px"
  stat-tile:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "16px"
  stat-tile-icon:
    backgroundColor: "{colors.brand-teal-tint}"
    textColor: "{colors.brand-teal-ink}"
    rounded: "{rounded.lg}"
    size: "28px"
  nav-item:
    textColor: "{colors.ink-muted}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "40px"
  nav-item-active:
    backgroundColor: "{colors.brand-teal-tint}"
    textColor: "{colors.brand-teal-ink}"
  tab:
    textColor: "{colors.ink-muted}"
    typography: "{typography.body}"
    padding: "0 12px"
    height: "40px"
  tab-active:
    textColor: "{colors.ink}"
  share-bar:
    backgroundColor: "{colors.track}"
    rounded: "{rounded.full}"
    height: "6px"
  alert-danger:
    backgroundColor: "{colors.danger-bg}"
    textColor: "{colors.danger-fg}"
    rounded: "{rounded.lg}"
    padding: "12px"
---

# Design System: BdREN Synapse Admin

## Overview

**Creative North Star: "The Office Ledger"**

The admin console is a calm, white-card ledger kept in the Synapse chat app's colours: a teal brand for identity and data, a single orange for the one thing to do next. It is read by occasional office staff, so every surface is a plain card on a soft grey ground, every figure carries its period and comparison in words, and the densest thing on screen is a seven-bar week. Dark mode is a full second world, not an inversion: a deep teal-black ground (the admin login page palette) with brighter teal and a warmer, lighter orange.

The system is flat. Depth comes from a one-pixel stroke and the step from grey ground to white surface, never from shadow. Motion is a short entrance only (icons pop, bars rise, lines draw) and switches off under reduced motion. Status is always an icon or word beside a colour, never colour alone.

The dashboard is time-shaped, not KPI-shaped: the main chart is the current ISO week (Monday to Sunday, matching the quota engine's reset), today marked, future days dimmed, last week as a tinted, dashed ghost behind each bar so the week always has a shape.

**Key Characteristics:**
- Grey ground, white bordered cards, 12px corners, no shadows at rest.
- Teal for data and identity, orange for the primary action and the second data series.
- Big bold tabular figures with a muted word beside them ("98.1K tokens this week so far").
- Monday-first week everywhere a week appears.
- Light and dark defined as paired token sets in `src/styles.css` (`:root`, `.dark`, and `prefers-color-scheme: dark`).

## Colors

A two-hue brand world (teal and orange) on cool neutrals, with semantic tints for success, warning and danger; every role has a light and a dark value under the same CSS variable.

### Primary
- **Synapse Teal** (brand-teal; dark: dark-brand-teal): identity colour. Active tab underline, link text (`--cui-color-text-link`), brand surfaces. Exposed as `--syn-brand`.
- **Deep Teal Ink** (brand-teal-ink; dark: dark-brand-teal-ink): text on teal tint: active nav item, selected range option, the "today" marker, tile icons. `--syn-brand-ink`.
- **Teal Wash** (brand-teal-tint; dark: dark-brand-teal-tint): the tint behind active nav items, stat-tile icon chips and avatar initials. `--syn-brand-tint`.
- **Chart Teal** (chart-teal; dark: dark-chart-teal): the primary data series: this week's bars, busiest-day bars, sparklines, share bars, joined seats. `--syn-chart-1`.

### Secondary
- **Action Orange** (action-orange; dark: dark-action-orange): the primary action ("Invite member"), focus outlines and the unread dot. Text on it is dark ink (on-accent-ink), never white. `--cui-color-accent`.
- **Chart Orange** (chart-orange; dark: dark-chart-orange): the second data series only: pending invites in the seat meter. `--syn-chart-2`.

### Neutral
- **Mist Ground** (ground; dark: dark-ground): page background behind cards (`--syn-bg`), also the range-picker trough.
- **Card White** (surface; dark: dark-surface): every card, tile and the sidebar (`--syn-surface`).
- **Ledger Ink** (ink; dark: dark-ink): primary text and figures.
- **Pencil Grey** (ink-muted; dark: dark-ink-muted): labels, descriptions, axis text, comparison lines.
- **Rule Grey** (stroke; dark: dark-stroke): card borders and chart baselines; stroke-muted for row dividers and tab rails; stroke-intense for scrollbars and the dashed legend swatch.
- **Track Grey** (track): empty part of meters and share bars, (`--syn-track`).
- **Ghost Grey** (ghost): the dashed outline of last week's bar (`--syn-ghost`).

### Semantic
- **Success** (success-fg), **Warning** (warning-fg / warning-bg), **Danger** (danger-fg / danger-bg / danger-border), each with a dark pair in `--syn-*`. Used for up/down deltas, the invite clock icon and the pending-count badge, and the expired-invites alert.

### Named Rules
**The One Orange Rule.** Action Orange marks the single primary action per screen; Chart Orange is reserved for the second data series. Orange is never decoration.

**The Paired Token Rule.** Every colour is a CSS variable with a light value and a dark value, declared in all three blocks of `src/styles.css`. Components reference `var(--syn-*)` or `var(--cui-color-*)`; no hex in components.

**The Login Dark Rule.** Dark mode follows the admin login page: teal-black ground (dark-ground), deep teal-grey cards (dark-surface), lighter teal (dark-brand-teal) and a lighter orange (dark-action-orange) so text on it stays dark.

## Typography

**Display Font:** none distinct; the single sans stack carries everything.
**Body Font:** Inter, then SF Pro Display / -apple-system / Segoe UI / Roboto fallbacks.
**Label/Mono Font:** source-code-pro, Menlo, Monaco, Consolas (code and config fields only).

**Character:** One plain sans at modest sizes, with weight (600 to 700) and tabular numerals doing the hierarchy. Figures are big and bold; the word that explains them sits beside them at 14px in muted ink.

### Hierarchy
- **Headline** (700, 28px, line-height 1, tight tracking): the one hero figure per card ("tokens this week so far", "this month so far").
- **Figure** (700, 24px, line-height 1, tight tracking): stat-tile values.
- **Page Title** (700, 20px): the page name in the top header, one step above card titles.
- **Title** (600, 15px): card titles and the sidebar product name.
- **Body** (500 to 600, 14px): nav items, tabs, buttons, the word beside a hero figure.
- **Body Small** (400 to 600, 13px): card descriptions, comparison lines, table cells, links in card headers.
- **Label** (500, 12px): stat-tile labels, legends, deltas (600), row meta.
- **Micro** (700, 11px, tabular): chart values and day labels; sidebar section labels use 600, 11px, 0.08em tracking, uppercase.

### Named Rules
**The Figure-Plus-Word Rule.** A number never stands alone: it carries its unit or period in muted 13 to 14px text beside or beneath it.

**The Tabular Rule.** Numbers in tables, charts and tooltips use tabular numerals so columns align.

## Layout

A fixed left sidebar (224px, 64px collapsed) beside a scrolling content column on the grey ground with 24px padding and 20px vertical rhythm between rows. The dashboard is three rows: a row of four figure tiles (auto-fit grid, 14rem minimum, 16px gap); a main row where the week card spans two of three columns at `xl` (1280px) with the Busiest days card beside it, both always visible (no tabs); and a bottom row of top members (two columns) beside a right column stacking "This month so far", "Invites to follow up" and tokens by model. Below `xl` every row stacks to one column; below `sm` (640px) tables drop secondary columns. Card internals use 16px gaps and 20px padding; rows inside lists use 10px vertical padding with a muted top rule.

## Elevation & Depth

Flat by default. Depth is tonal: grey ground, white card, 1px Rule Grey border. Shadows appear only on floating layers that sit over content: the selected range option (a small `shadow-sm` lift inside its trough), chart tooltips (`shadow-lg`), dialogs and the command menu (`0 16px 70px var(--cui-color-shadow)`).

### Shadow Vocabulary
- **Pressed-in selection** (`box-shadow: 0 1px 2px rgb(0 0 0 / 0.05)`): the selected segment of the range picker.
- **Floating tooltip** (Tailwind `shadow-lg`): chart crosshair tooltip.
- **Modal** (`box-shadow: 0 16px 70px var(--cui-color-shadow)`): dialogs and command menu.

### Named Rules
**The Flat Card Rule.** Cards and tiles never carry a shadow; a 1px border and the ground-to-surface step are the only separation.

## Shapes

Gently rounded throughout: 12px (rounded.xl) on cards and tiles, 8px (rounded.lg) on buttons, nav items, icon chips and alerts, 6px (rounded.md) on small row buttons, range options and bar tops, 2px on legend swatches, full pills on meters, share bars and badges. Borders are 1px solid; the only dashed stroke is last week's ghost bar and its legend swatch. Last week's ghost fills with Ghost Tint (`--syn-ghost-fill`: #d3e3e0 light, #284349 dark); future days show it at 60% opacity. No stripes or decorative patterns.

## Components

### Buttons
- **Shape:** gently rounded (8px) for the primary, 6px for row actions.
- **Primary:** Action Orange fill, dark ink text, 700 weight 14px, 40px tall, 16px side padding, leading 16px plus icon; hover darkens slightly (`brightness(0.95)`).
- **Row action ("Resend"):** transparent with a 1px Rule Grey border, 32px tall, 12px bold text; hover fills with the hover wash; disabled at 50% opacity.
- **Danger row action ("Resend all"):** card-white fill, danger border and text, inside the danger alert.
- **Focus:** orange outline (`--cui-color-outline`).

### Range Picker (segmented)
- **Style:** grey trough (8px radius, 2px padding) holding 32px options; selected option is a white segment with Deep Teal Ink 600 text and a small lift; others muted, darkening on hover. Uses `aria-pressed`.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** Card White on Mist Ground.
- **Shadow Strategy:** none (see Flat Card Rule).
- **Border:** 1px Rule Grey.
- **Internal Padding:** 20px; header holds a 15px title, optional 13px muted description, and an optional right-aligned 13px teal link.

### Stat Tile
A 16px-padded card with a 28px teal-tint icon chip and 12px muted label on top, a 24px bold figure, and a muted 12px detail line (share, delta, or a seat meter with legend). Optional sparkline (112 by 40, 2px Chart Teal stroke) sits bottom right.

### Tabs
Underline tabs on a muted rail: 40px tall, 14px; active is ink, 600, with a 2px Synapse Teal underline; inactive is muted 500.

### Navigation
Sidebar on Card White with a right border. Section labels 11px uppercase muted; items 40px tall, 8px radius, 18px lucide icon; active item Teal Wash with Deep Teal Ink 600; hover uses the hover wash. A pending-invite count shows as a warning-tinted pill. The logo swaps to the white mark in dark mode.

### Week Chart (signature)
Seven Monday-first columns, 190px plot. Each day: a Ghost Tint bar with a dashed Ghost Grey outline for last week's value, with this week's Chart Teal bar (78% width, 6px top corners) inside it. Today is the bar at 75% opacity with a bold label and a teal "today" tag; future days show only the dimmed ghost and no value; today at zero shows "None yet" ("0" on phones) and a 2px teal baseline. Values sit above bars in 11px bold. A screen-reader table carries every number. Legend: solid teal swatch "This week", dashed swatch "Last week".

### Busiest Days
Seven Monday-first bars of average tokens over 30 days; the busiest day full Chart Teal with a bold value label, the rest at 40% opacity with their values in muted ink (10px on phones, 11px from `sm`). It sits in its own card at the top of the right column.

### Meter and Share Bar
Pill tracks in Track Grey. The seat meter stacks joined (Chart Teal) and invited (Chart Orange) segments with a 2px gap and a square-swatch legend in words. Share bars (6px, 8px for models) compare rows to the largest and grow in from the left.

### Alert (danger)
Danger-tint panel, 8px radius, 12px padding: a circle-x icon, a bold 13px sentence, and its action.

## Do's and Don'ts

### Do:
- **Do** put every colour through a paired `--syn-*` or `--cui-color-*` variable defined in `:root`, `.dark` and `prefers-color-scheme: dark`.
- **Do** keep orange to the single primary action and the second data series.
- **Do** start every week on Monday and end it on Sunday; that is the quota reset week.
- **Do** pair every status colour with an icon or a word, and every chart with a screen-reader table.
- **Do** show token figures where allowance would go until institution admins have a tenant-scoped allowance endpoint; label them as tokens.
- **Do** wrap entrance motion in the `syn-*` classes so `prefers-reduced-motion` turns it off.

### Don't:
- **Don't** put a shadow on a card or tile at rest.
- **Don't** put white text on Action Orange; use dark ink (on-accent-ink).
- **Do** fall back to last week in the member and model lists when this week has no usage yet, and say so in the card description ("Showing last week").
- **Don't** draw a future day as a zero bar; it is a dimmed, unlabelled ghost.
- **Don't** show allowance, credit or taka figures to institution admins from superadmin-only `/api/platform/*` data.
