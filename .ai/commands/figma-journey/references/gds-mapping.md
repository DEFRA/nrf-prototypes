# Figma element → GOV.UK Design System mapping

A cheat-sheet for Step 5. Match each element you see in a screen's PNG to the closest component below,
then render it in `{% block content %}`. For the wider kit patterns (auto-routing, layouts & blocks,
session data, branching, validation, assets), see `govuk-prototype-kit-guide.md` in this folder.

In the GOV.UK Prototype Kit every `govuk-frontend` macro is **globally available** — call it directly in
the template (e.g. `{{ govukButton({ text: "Continue" }) }}`), no `{% from %}` import needed.
govuk-frontend is 5.11, so the enhanced file upload and every `govuk-tag--*` colour class work out of
the box.

**There is no reusable dashboard macro in the Prototype Kit.** Dashboard-like clusters (a results table,
a "My applications" list) map to **stock GDS** — `govukTable` for rows plus `govukTag` for status pills,
built from a static data object passed into the view from the route. True metric / stat **cards or
big-number tiles** with no GDS equivalent have no component: **flag them to the user** for bespoke work
rather than inventing a macro or hand-rolling CSS silently.

| Figma element                                                    | GDS component / macro                                                         | Notes                                                                            |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Back link (top-left "‹ Back")                                    | `govukBackLink`                                                               | in `{% block beforeContent %}`                                                   |
| Page caption + heading                                           | `govuk-caption-l` + `govuk-heading-l` (or fieldset legend `--l` as the h1)  | caption sits above the heading                                                   |
| Radio group (choose one)                                         | `govukRadios`                                                                 | `fieldset.legend.isPageHeading: true` makes the question the h1                  |
| "or" / exclusive divider between options                         | `govukRadios` with a `{ divider: "or" }` item                                 |                                                                                  |
| File upload control                                              | `govukFileUpload` with **`javascript: true`** (enhanced) — see note below     | renders the drop-zone + "Choose file"; falls back to native input without JS     |
| Expandable "What is …?" / "Help with …"                          | `govukDetails`                                                                |                                                                                  |
| Primary action button                                            | `govukButton`                                                                 |                                                                                  |
| Secondary action ("Cancel", "Back")                              | `govukButton` with `classes: "govuk-button--secondary"`                       |                                                                                  |
| Top service navigation bar                                       | rendered by the standard layout (`govukHeader`)                               | default from `app/config.json`; per journey via `{% set serviceName %}` — see SKILL.md |
| Data-grid / table of rows                                        | `govukTable`                                                                  | build `head` + `rows` in the route, pass the whole object to the macro           |
| Key / value pairs ("check your answers")                         | `govukSummaryList`                                                            | rows: key, value, "Change" action                                                |
| Confirmation panel (big green "done")                            | `govukPanel`                                                                  |                                                                                  |
| Status pill / badge                                              | `govukTag` (`--green` done, `--yellow` in progress, `--red` problem,           | also `--purple`, `--light-blue`, `--grey`, `--blue`, `--turquoise`, …            |
|                                                                  | `--light-blue`, `--purple`, …)                                                |                                                                                  |
| Notification / banner message                                    | `govukNotificationBanner`                                                     |                                                                                  |
| **Dashboard table of rows + status pills**                       | **`govukTable` + `govukTag`** (stock GDS)                                     | no dashboard macro exists — populate from a static data object in the route      |
| **Metric / stat card, side sub-nav (no GDS equivalent)**         | **bespoke — flag to the user**, don't invent a macro                          | agree the markup/CSS approach first; don't silently hand-roll a new component    |

## Notes

- The GOV.UK header, footer and phase banner live in the standard layout. A view that
  `{% extends "layouts/main.html" %}` already renders them. The prototype-wide default service name
  lives in `app/config.json`; give an individual journey its own name with `{% set serviceName %}…{%
  endset %}` at the top of its views (the kit-sanctioned per-page override). Do **not** use the
  `{% block header %}` hack. (See the "Service name" guidance in SKILL.md.)
- Set the page title with `{% set pageName = "..." %}`; the standard layout renders it as
  `<pageName> - <serviceName> - GOV.UK`.
- Standard GOV.UK pages sit inside `govuk-grid-row` → `govuk-grid-column-two-thirds`. Dashboards / wide
  tables use `govuk-grid-column-full` (the kit-native way to widen a screen — see "Wide screens" in
  SKILL.md). Do not add a custom body class.
- Colour-code tags to the status word in the design: green = complete/success, yellow/orange = in
  progress/pending, red = error/problem, purple/light-blue/grey as the design dictates.
- Use **only** the components a given screen needs — keep each view lean.
- **File upload — always use the JavaScript-enhanced component.** If a screen shows a "Choose file"
  button, an "or drop file" drop zone, or a chosen-file name (rather than the browser's native input),
  pass **`javascript: true`** to `govukFileUpload`. govuk-frontend 5.11 supports it (works out of the
  box).
