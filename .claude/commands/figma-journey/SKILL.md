---
name: figma-journey
description: >-
  Extract a clickable Figma prototype journey via the Figma REST API (not MCP) and reconstruct it —
  or update an already-built one — as a functional GOV.UK Prototype Kit journey in this repo. Given a
  Figma prototype URL (or fileKey#node-id), it pulls the page's frames, the wired click-flow, and
  rendered PNGs, reconciles them against a manifest of journeys it has already built to decide whether
  this is a NEW journey or an UPDATE, maps each screen to GOV.UK Design System components, and
  scaffolds (or surgically patches) routes + views + a homepage link. Use when asked to turn a Figma
  prototype/frame into a working prototype journey, recreate a Figma flow, add a new User Research
  journey from a design, or refresh/sync/update an existing journey after the designer changed the
  Figma. Requires a read-only FIGMA_TOKEN in the environment.
userInvocable: true
arguments: Figma prototype URL (figma.com/proto/<key>?node-id=<a-b>) or "<fileKey>#<a:b>"
---

# Figma journey → GOV.UK Prototype Kit journey

Turn a clickable Figma prototype into a working GOV.UK Prototype Kit journey in this repo. The skill
talks to the **Figma REST API directly** (no Figma MCP): it pulls a page's screen frames, the wired
prototype click-flow, and a rendered PNG per screen, then you map each screen to GOV.UK Design System
components and scaffold the routes + views so the flow actually clicks through at http://localhost:3000.
It is a User Research mock — screens are populated from static config, not real file parsing.

**New or update?** The skill records every journey it builds in a manifest
(`.claude/skills/figma-journey/journeys.json`): the Figma `fileKey` + `node`, the journey key, and a
content fingerprint of each frame. On a re-run it **reconciles** the freshly-extracted flow against
that manifest (Step 3) to decide whether you are building a **new** journey or **updating** an existing
one — and, for an update, exactly which frames the designer changed. This means you never rebuild a
journey from scratch just because one screen moved: see [Updating an existing journey](#updating-an-existing-journey).

## Step 0 — Token gate

Confirm a read-only Figma token is on the environment before doing anything else:

```sh
printf '%s' "${FIGMA_TOKEN:-}" | wc -c
```

If that prints `0`, stop and show the user `references/setup.md` (how to create and export a token).
Do **not** proceed without a token, and never print or echo the token itself. Verify the token works:

```sh
curl -s -o /dev/null -w "%{http_code}\n" -H "X-Figma-Token: $FIGMA_TOKEN" https://api.figma.com/v1/me
```

Expect `200`. `401` = bad/expired token, `403` = missing File-content read scope — see the
troubleshooting table in `references/setup.md`.

## Step 1 — Parse the Figma location

Accept either a prototype/file URL (`https://www.figma.com/proto/<KEY>?node-id=<A-B>`, also `/file/`
and `/design/`) or the compact `"<fileKey>#<A:B>"` form. Derive the **fileKey** and the **nodeId**,
converting the URL's hyphen node id (`3452-31002`) to the API's colon form (`3452:31002`). The scripts
below do this parsing for you — you can pass the raw URL straight through. If no node id is supplied,
the extractor falls back to the file's first page.

## Step 2 — Extract the flow

```sh
node .claude/skills/figma-journey/scripts/figma-extract.mjs "<url-or-key#node>"
```

Writes `.tmp/figma-journey/<fileKey>/`:

- `page.json` — the raw Figma node tree (for reference / re-use).
- `flow.json` — machine-readable: `{ fileKey, nodeId, startNodeId, screens[], transitions{ onPage, offPage } }`.
  Each screen carries `{ id, name, width, height, annotations, wide, hash }` — `annotations` is the
  screen's Dev Mode annotation labels and `wide` is `true` when one of them says `WIDE` (see
  [Wide screens](#wide-screens)).
- `flow.md` — human-readable: a table of screens (id / name / size / layout / annotations), the flow
  starting point, the on-page transitions as `"<fromName>" (fromId) → <toScreenName> (toId)`, and a
  separate "Off-page / library links (ignore)" list (destinations that point at shared library
  components, not screens on this page).

**Read `flow.md`.** It is your map of the journey — which screens exist and which element clicks lead
where. Ignore the off-page/library links; they are not part of this journey.

## Step 3 — Reconcile: new journey or update?

```sh
node .claude/skills/figma-journey/scripts/figma-reconcile.mjs "<url-or-key#node>"
```

This compares the frames just extracted (`flow.json`) against the journey manifest
(`.claude/skills/figma-journey/journeys.json`) and prints one of two modes:

- **`MODE: NEW`** — no manifest entry matches this `fileKey` + `node`. Build the whole journey:
  continue to Step 4 and render **all** screens, then Steps 5–6, and finish by **recording the journey
  in the manifest** (Step 6.6).
- **`MODE: UPDATE`** — this Figma location was built before. The script lists each frame as
  **unchanged / changed / added / removed** and names the view files to touch. **Do not rebuild the
  journey.** Jump to [Updating an existing journey](#updating-an-existing-journey) and patch only what
  changed.

The fingerprint ignores a frame's position on the Figma canvas, so moving a frame does not read as a
change — only its text, structure, or prototype wiring does.

## Step 4 — Render screens

```sh
node .claude/skills/figma-journey/scripts/figma-images.mjs "<url-or-key#node>"
```

Downloads one PNG per screen frame into the same working dir as `screen-<frameName>.png` (it reuses
`flow.json`/`page.json` from Step 2 rather than re-fetching). **Read each PNG** to inspect the screen
visually — its layout, headings, inputs, tables, tags and buttons drive the component mapping. On an
**update**, you only need to look at the frames Step 3 flagged as changed or added.

## Step 5 — Map each screen to GDS

Use `references/gds-mapping.md`. Standard elements map to stock `govuk-frontend` macros (back link,
caption + heading, radios, file upload, details, buttons, service navigation, table, summary list,
panel, tag, notification banner). Non-standard "dashboard" clusters have **no GDS equivalent** and map
to this repo's reusable dashboard macro:

```njk
{% from "dashboard/macro.njk" import appDashboard, appSideNav %}
```

- metric / stat cards + big-number tiles → `appDashboard`
- left / side sub-navigation → `appSideNav`

> **IMPORTANT — reuse the existing dashboard component; do NOT recreate it.** A reusable,
> accessible, config-driven dashboard already exists in this repo — do not build a new card / stat-tile
> / side-nav component or hand-roll bespoke CSS for dashboards:
>
> - Macros: `app/views/dashboard/macro.njk` → `appDashboard` (metric cards, composite/`wide` cards with
>   summary rows, status pills via stock `govukTag`) and `appSideNav` (accessible `aria-current` sub-nav).
>   Import with `{% from "dashboard/macro.njk" import appDashboard, appSideNav %}`.
> - Styles: already in `app/assets/sass/application.scss` under the "App dashboard" block (GOV.UK
>   palette; no extra CSS needed).
> - Both are driven entirely by a JSON/JS config object. **Worked example to copy:** the `metric-results`
>   journey — see the config objects and `res.render(..., { resultsDashboard, sideNav, ... })` in
>   `app/routes/metric-results.js`, and their use in `app/views/metric-results/{summary,area-habitats}.html`.
> - If the design needs something the macro can't yet express, **extend the macro's params** (and its
>   sass block) rather than forking a new component — keep one dashboard implementation.

Match what you see in the PNG to the closest component, screen by screen.

## Step 6 — Reconstruct the journey

_(Skip this step in **update** mode — see [Updating an existing journey](#updating-an-existing-journey).)_

Pick a short kebab-case journey key (e.g. `dashboard-review`). Then:

1. **Routes** — create `app/routes/<journey>.js` exporting `register<Journey>Routes(router)`. Copy the
   shape of `app/routes/on-site-baseline.js` (CommonJS `require`, `router.get`/`router.post`,
   `res.render('<journey>/<screen>', data)`, `module.exports`). Wire each transition from `flow.md`:
   the element click's destination screen becomes the redirect / link target.
2. **Register** — add `const { register<Journey>Routes } = require('./routes/<journey>')` and the
   matching `register<Journey>Routes(router)` call in `app/routes.js`.
3. **Views** — create `app/views/<journey>/<screen>.html` per screen, each `{% extends "layouts/main.html" %}`
   with a `{% block content %}`. Import only the macros that screen needs. Follow an existing view such
   as `app/views/on-site-baseline/start.html` for structure (`{% set pageName %}`, grid columns, macros).
   If the screen's `flow.json` `wide` flag is `true`, add `{% set bodyClasses = "app-wide" %}` — see
   [Wide screens](#wide-screens).
4. **Styles** — append any custom styles the design needs to `app/assets/sass/application.scss` (guard
   them under a clearly-commented block for this journey).
5. **Homepage** — add a launcher link to the new journey and a short User-Research purpose description
   to `app/views/index.html`.
6. **Record the journey** — add an entry to `.claude/skills/figma-journey/journeys.json` so future
   re-runs recognise this journey (Step 3) instead of rebuilding it. Copy the frame ids, names,
   **hashes and `wide` flag straight from `flow.json`**, and map each frame id to the view file you
   created for it (several frames may map to one view — e.g. an empty and a filled state of the same
   page). Include `"wide": true` only for screens the designer marked WIDE:

   ```json
   {
     "journey": "<journey-key>",
     "fileKey": "<fileKey>",
     "node": "<a:b>",
     "figmaUrl": "<the URL you were given>",
     "viewsDir": "app/views/<journey>",
     "routesFile": "app/routes/<journey>.js",
     "frames": [
       {
         "id": "<frameId>",
         "name": "<short label>",
         "view": "<screen>.html",
         "hash": "<from flow.json>",
         "wide": false
       }
     ]
   }
   ```

This is a UR mock: populate any dashboards / tables / stats from a **static config object** in the
route file — do **not** parse real uploads or call live services. Follow the repo code style: no
semicolons, single quotes, no trailing commas, 2-space indent, brace every `if`/`for` body.

## Step 7 — Verify

```sh
npm run dev            # serves http://localhost:3000
npm run format:check   # prettier over **/*.{cjs,js,json,md}
```

Open the homepage, launch the new journey, and click through every screen. Confirm each transition
matches `flow.md` and each screen resembles its PNG. Fix any route wiring or view that diverges.

## Wide screens

Most screens use the GOV.UK default page width (~960px). When a screen needs to be wider — typically a
dashboard with a wide card grid or table — the designer flags it with a **Dev Mode annotation** on the
frame root whose text is **`WIDE`**. The extractor reads that annotation (`frame.annotations[].label`
via the REST API) and sets `wide: true` on the screen in `flow.json`; `flow.md` shows it in the
`layout` column.

To honour it in the reconstructed view, add one line at the top of that screen's `.html`:

```njk
{% set bodyClasses = "app-wide" %}
```

`.app-wide` (in `app/assets/sass/application.scss`) widens the header, footer and content
`.govuk-width-container` to 1280px. Nothing else changes — the page still uses standard GOV.UK
components and grid columns inside the wider container. Record the flag as `"wide": true` on the
frame in `journeys.json` (Step 6.6) so a later run knows the screen is meant to be wide.

> **Note on annotation access:** Dev Mode annotations require the annotation to be readable by the
> token. If a screen is meant to be wide but its `WIDE` annotation doesn't come through (e.g. seat /
> permission limits), fall back to a plain text layer containing `WIDE` on the frame — the extractor
> also matches annotation text, and a text layer is always readable via `characters`.

## Updating an existing journey

When Step 3 prints **`MODE: UPDATE`**, the designer has changed a Figma journey you already built. The
goal is to apply **only** their delta — never to regenerate the whole journey, because the views hold
hand-written copy (real wording substituted for Figma's placeholder text) and reuse the shared
dashboard macro, all of which a blind rebuild would destroy. Work surgically:

1. **Read the reconcile report.** It classifies every frame as **unchanged / changed / added /
   removed** and lists the affected view files. Unchanged frames are done — do not touch their views.
2. **Re-render only the changed and added frames** (Step 4) and re-read those PNGs (Step 5). You do not
   need to look at unchanged screens again.
3. **Patch, don't replace:**
   - **changed** → open the mapped view and apply just the designer's structural/content change
     (a new field, a reworded heading, a re-pointed link). Preserve the surrounding real copy, the
     dashboard config, and any hand-wiring. If a change is large, regenerate the view to a scratch file
     and diff it in rather than overwriting.
   - **added** → build a new view + wire its transition in, exactly as in Step 6 (steps 1–4).
   - **removed** → **flag it for the user and ask before deleting** anything; a frame can vanish from a
     flow without the screen being retired. Never auto-delete a route or view.
4. **Re-point wiring if the flow changed** — recheck `flow.md`'s on-page transitions against the route
   redirects/links and fix any that moved.
5. **Update the manifest** — for every frame you reconciled, copy its new `hash` from `flow.json` into
   its entry in `journeys.json` (add entries for added frames, remove entries for retired ones once the
   user confirms). This is what makes the _next_ update see a clean baseline.
6. **Verify** (Step 7) — click through, focusing on the changed screens and the transitions around them.

## Reusability

This skill is generic. Point it at **any** Figma prototype location (`figma.com/proto/...` URL or
`<fileKey>#<node>`) and choose **any** journey key — nothing here is specific to one prototype. The
`.tmp/figma-journey/<fileKey>/` working dir is keyed by file, so multiple prototypes coexist, and the
`journeys.json` manifest lets one file back several journeys (different nodes). Re-run Steps 2–3 any
time the Figma design changes: the reconcile step tells you whether you are adding a new journey or
updating an existing one, and exactly which screens moved.