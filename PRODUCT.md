# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: institution admins at BdREN member institutions (universities, colleges, research and government bodies in Bangladesh). Typically registrar / IT office staff, not very technical, who open the panel occasionally — a few times a month — to add or remove people and to answer "who used how much". They are not dashboard power users; they need to find the next action without learning the tool.

Secondary: platform superadmins at BdREN, who use the same panel with platform-only pages (institutions, agents, packages, individuals, configuration, grants). Their workflows must keep working but are not the focus of institution-admin design.

## Product Purpose

The admin console for BdREN Synapse, an AI chat and office-assistant service BdREN provides to institutions. An institution admin uses it to manage who in their institution has access and to understand how the institution is using its allowance. Success: an occasional admin can invite or remove a person, see whether usage is healthy, see how much allowance is left, and pull a report for management, each without help.

## Positioning

Synapse is a national research-and-education network's own AI service: institutions get a seat pool and a money-based allowance (BDT) rather than per-user subscriptions, and BdREN runs the platform. The admin console is where an institution sees its own slice of that shared national service.

## Operating Context

- Jobs, in the admin's priority order: (1) add / remove people — invite by email, import CSV, resend or revoke invites, suspend, reactivate, remove; (2) see usage at a glance — who uses Synapse, how much, trends, which models; (3) track allowance — how much of the institution's and each member's weekly and monthly allowance is used and left; (4) report upward — export numbers for management.
- Usage questions are asked over a date range in the institution's own timezone.
- Admins receive usage-warning emails at 80% and 90% of an allowance (quota plan); the console is where they follow up.
- Support contact for any problem: info@bdren.net.bd.

## Capabilities and Constraints

Available to an institution admin today (tenant-scoped):
- Seats: active members, seat limit (or none), pending invites (pending invites hold a seat).
- Members: name, email, role (Member / Institution admin), status (active, invited, expired, suspended), joined date, email verified, sign-in provider; invites with source (manual / CSV), last sent, expiry. Actions listed above, plus role change and resend verification (superadmin).
- Groups: name, description, member count, a managed "all active members" group that cannot be edited.
- Usage over a date range: totals, requests, members with usage, models used; daily series; per-model and per-member tokens, requests, last used; a single member's usage by model. Per-member CSV export (user id, account created, name, role, total used tokens).
- Not available to an institution admin: cost / spend, institution name or logo (only tenant id), audit log, hourly usage, per-member daily series, agent configuration.

Quota plan (branch `feature/quota-plan`, not yet in production):
- Money-based usage packages: an institution allowance and per-member allowances, each with a weekly and a monthly cap, shown in taka (৳); "Unlimited" packages exist. Meters carry used, limit, remaining, blocked, and reset time. Members hitting a cap are refused with a typed reason (weekly cap, monthly cap, institution cap, image credits low).
- The legacy per-member credit balance and "grant credits" are removed on that branch.
- OPEN: institution admins currently cannot read any allowance — the data exists only behind superadmin endpoints (`/api/platform/institutions/:tenantId/quota`). Showing allowance to institution admins requires a tenant-scoped admin read endpoint over the same data. Package assignment stays with BdREN superadmins.

## Brand Commitments

- Name: BdREN Synapse. Colours and logo follow the Synapse chat app: teal brand with orange accent; light and dark mode, with dark mode following the admin login page palette; the teal Synapse logo in light mode and the white one in dark mode.
- English UI today; Bangla-speaking audience.

## Evidence on Hand

- Real product data comes from the live API; mockups use clearly synthetic sample data (sample names, numbers, model names).
- No customer quotes, benchmarks, or institution names may be invented.

## Product Principles

1. Next action first: the most common jobs (people, then usage, then allowance) are one click from anywhere.
2. Plain words over metrics jargon: say "members using Synapse", "allowance left this week", not internal terms.
3. Show only what the admin can act on or must know; depth is one click away, never on the front page.
4. Never show data the admin cannot get, and never imply control they do not have (package assignment belongs to BdREN).
5. Numbers carry their context: period, comparison, and what happens next (reset date, what to do when low).

## Accessibility & Inclusion

Occasional, non-technical users: large targets, explicit labels, status as icon plus words (never colour alone), keyboard reachable, reduced motion respected, readable in light and dark mode.
