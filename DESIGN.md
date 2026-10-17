# Design

Overwatch is an Operate surface: a working incident dashboard that an on-call
engineer reads under pressure, usually on a laptop in a lit room, sometimes on
a phone. Light ground was chosen for that scene and confirmed by the brief.

The twelve reference mockups pin the world: a cool, quiet light UI where the
only loud thing on screen is severity. Everything below is the committed
system; the mockups are direction, not authority, where they contradict it.

## Color strategy

Restrained with a committed severity vocabulary. The shell and content are
near-neutral; color is spent on severity, status, data series, selection and
the primary action, and nowhere else. State tints are fields (a whole stat
card ground), never scattered accents.

### Tokens (Tailwind v4 `@theme` in `src/styles.css`)

| Role | Token | Value |
|---|---|---|
| App ground | `--color-ground` | `#f5f6f8` |
| Surface (cards, tables, sidebar) | `--color-surface` | `#ffffff` |
| Surface sunken (inputs, code, table head) | `--color-sunken` | `#f8f9fb` |
| Border | `--color-line` | `#e4e7ec` |
| Border strong (focused/hovered rows) | `--color-line-strong` | `#cfd4dc` |
| Text primary | `--color-ink` | `#111827` |
| Text secondary | `--color-ink-2` | `#4b5563` |
| Text muted (labels, timestamps) | `--color-ink-3` | `#6b7280` |
| Primary / selection | `--color-primary` | `#2563eb` |
| Primary hover | `--color-primary-hover` | `#1d4ed8` |
| Primary soft (selected nav, info chips) | `--color-primary-soft` | `#eaf1ff` |
| Critical | `--color-critical` | `#dc2626` |
| Critical soft | `--color-critical-soft` | `#fdecec` |
| Error | `--color-error` | `#ea580c` |
| Error soft | `--color-error-soft` | `#fff1e7` |
| Warning | `--color-warning` | `#d97706` |
| Warning soft | `--color-warning-soft` | `#fff6e0` |
| Info | `--color-info` | `#64748b` |
| Info soft | `--color-info-soft` | `#eef2f6` |
| Success | `--color-success` | `#16a34a` |
| Success soft | `--color-success-soft` | `#e9f8ee` |
| Series: requests | `--color-series-requests` | `#93b4f5` |
| Series: latency | `--color-series-latency` | `#2563eb` |
| Series: web vitals | `--color-series-vitals` | `#7c5cd6` |

Severity scale: Critical red, Error orange, Warning amber, Info slate. Status
scale: Investigating = critical tint, Monitoring = warning tint, Resolved =
success tint, New = critical soft, Grouped = primary soft, Ignored = info soft.
A severity pill is a dot + label on the soft tint; a status pill is label-only
on its tint. These are the only two pill kinds.

Secondary text on a tinted surface is tinted from that hue (e.g. on
`critical-soft`, muted copy is `#991b1b`), never gray.

## Typography

One family. Inter Variable for everything; JetBrains Mono Variable only for
code, stack traces, endpoints, IDs and tabular figures where alignment
matters. Fixed rem scale, ratio ~1.2:

| Step | Size / line | Use |
|---|---|---|
| display | 28px / 34px, 600, -0.02em | page title |
| title | 20px / 28px, 600, -0.015em | section title, incident headline |
| stat | 26px / 32px, 600, -0.02em, tabular | stat card value |
| heading | 15px / 22px, 600 | card heading |
| body | 14px / 20px, 400 | default |
| small | 13px / 18px, 400 | table cells, secondary |
| caption | 12px / 16px, 500 | labels, column heads, timestamps |

Column heads are caption weight 500 in `ink-3`, sentence case, never uppercase
tracking. Numbers in tables and stats use `font-variant-numeric: tabular-nums`.

## Shape, depth, spacing

- Radius: 10px cards and panels, 8px controls and inputs, 999px pills.
- Elevation is declared once: cards are `surface` + 1px `line`, no shadow.
  Only floating things (menus, popovers, dialogs) get a shadow:
  `0 8px 24px -8px rgb(17 24 39 / .18), 0 2px 6px -2px rgb(17 24 39 / .08)`.
- Spacing base 4px. Card padding 20px; dense table cell 12px 16px; page
  gutter 24px; card gap 16px. More space above a heading than below.
- Sidebar 232px, collapses to icons under 1024px and to a top bar under 768px.
  Top bar height 56px.

## Shell

Left sidebar on `surface` with a right `line` border: wordmark, primary nav
(Overview, Incidents with count badge, Error Reports, Telemetry,
Verification, Reports, Settings), bottom "Overwatch · mock telemetry" note
with the active scenario. Top bar: environment select, time-range select,
search, notifications, user menu. The current nav item gets `primary-soft`
ground and `ink` text; no left accent bar.

## Signature move

Severity is a field, not a badge. Where a stat card or a row represents a
critical or degraded condition, the card's whole ground takes the soft tint
and its headline number sets in the severity color, with the recent history
drawn inside the card as a small bar/area series and the onset marked. The
rest of the page stays neutral, so the eye lands on what is wrong first.

## Charts (hand-rolled SVG)

- Area/line: 1.5px stroke, 12% fill of the series color to baseline, 4 light
  horizontal grid lines, no vertical grid, axis labels in caption `ink-3`.
- Stacked bars: severity stack order Critical bottom, then Error, Warning,
  Info; 2px gap between bars; bar radius 2px on top.
- Donut: 12px ring, center value in `stat` style.
- Sparkline inside stat cards: 36px tall, no axes, series color = card state.
- Every chart has an accessible `<title>` and a text summary for screen
  readers; hover shows a tooltip with the time and value.

## Components

Pill (severity | status), StatCard (neutral | critical | warning | success
tint), Card with header (icon, title, description, right-side control),
DataTable (sortable headers, row hover `sunken`, checkbox column optional,
pagination footer), Select, SearchInput, Button (primary, secondary, ghost,
danger), Tabs (underline), Toggle, Progress ring (setup only), Timeline,
Checklist, Avatar, EmptyState, Skeleton. Every interactive component ships
default, hover, focus-visible (2px `primary` ring, 2px offset), active,
disabled.

## Motion

150-200ms, ease-out, only for state: hover grounds, menu open, tooltip,
toggle. No page-load choreography.

## Browser surfaces

Selection `primary-soft`; focus ring `primary`; scrollbars thin and `line`
colored; caret `primary`; underline offset 3px on text links.

## Copy

Sentence case throughout. Buttons name the action ("Resolve incident", "Run
all tests"). Empty states say what would appear and how. Synthetic data is
labeled "Mock telemetry" in the shell footer and on the Settings page.
