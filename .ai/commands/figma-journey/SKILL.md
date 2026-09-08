---
name: figma-journey
description: >-
  Extract a clickable Figma prototype journey via the Figma REST API (not MCP) and reconstruct it —
  or update an already-built one — as a functional GOV.UK Prototype Kit journey in this repo. Given a
  Figma prototype URL (or fileKey#node-id), it pulls the page's frames, the wired click-flow, and
  rendered PNGs, reconciles them against a manifest of journeys it has already built to decide whether
  this is a NEW journey or an UPDATE, maps each screen to GOV.UK Design System components, and
  scaffolds (or surgically patches) views + routes using the **standard GOV.UK Prototype Kit patterns**
  (auto-routed views, `app/routes.js`, `config.json` service name). Use when asked to turn a Figma
  prototype/frame into a working prototype journey, recreate a Figma flow, add a new User Research
  journey from a design, or refresh/sync/update an existing journey after the designer changed the
  Figma. Requires a read-only FIGMA_TOKEN in the environment.
userInvocable: true
arguments: Figma prototype URL (figma.com/proto/<key>?node-id=<a-b>) or "<fileKey>#<a:b>"
---

# Figma journey → GOV.UK Prototype Kit journey

Turn a clickable Figma prototype into a working GOV.UK Prototype Kit journey. The skill talks to the
**Figma REST API directly** (no Figma MCP): it pulls a page's screen frames, the wired prototype
click-flow, and a rendered PNG per screen, then you map each screen to GOV.UK Design System components
and scaffold the views + routes so the flow actually clicks through at http://localhost:3000. It is a
User Research mock.

> **Build with the Prototype Kit, not around it.** Reconstruct every journey using the **standard
> GOV.UK Prototype Kit 13 patterns** documented in [Build pages the GOV.UK Prototype Kit way](#build-pages-the-govuk-prototype-kit-way).
> That means: views live in `app/views/` and are **auto-served at their URL** (no route needed for a
> static page); logic goes in the single `app/routes.js`; the service name comes from
> `app/config.json`. **Do not** invent a per-journey folder of config files, a route-constants module,
> a journey registry, or any other scaffolding the kit does not ask for — those are not kit features.
> Read the kit's own guidance: <https://prototype-kit.service.gov.uk/docs/create-routes>,
> <https://prototype-kit.service.gov.uk/docs/how-to-use-layouts>.

**New or update?** The skill records every journey it builds in a manifest
(`.ai/commands/figma-journey/journeys.json`): the Figma `fileKey` + `node`, the journey key, and a
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
node .ai/commands/figma-journey/scripts/figma-extract.mjs "<url-or-key#node>"
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
node .ai/commands/figma-journey/scripts/figma-reconcile.mjs "<url-or-key#node>"
```

This compares the frames just extracted (`flow.json`) against the journey manifest
(`.ai/commands/figma-journey/journeys.json`) and prints one of two modes:

- **`MODE: NEW`** — no manifest entry matches this `fileKey` + `node`. Build the whole journey:
  continue to Step 4 and render **all** screens, then Steps 5–6, and finish by **recording the journey
  in the manifest** (Step 6.6).
- **`MODE: UPDATE`** — this Figma location was built before. The script lists each frame as
  **unchanged / changed / added / removed** and names the view files to touch. **Do not rebuild the
  journey.** Jump to [Updating an existing journey](#updating-an-existing-journey) and patch only what
  changed.

The fingerprint ignores a frame's position on the Figma canvas, so moving a frame does not read as a
change — only its text, structure, or prototype wiring does.

## Step 4 — Render screens and capture the source content

```sh
node .ai/commands/figma-journey/scripts/figma-images.mjs "<url-or-key#node>"
node .ai/commands/figma-journey/scripts/figma-text.mjs   "<url-or-key#node>"
```

`figma-images.mjs` downloads one PNG per frame as `screen-<frameName>.png` (it reuses `flow.json`/
`page.json` from Step 2). `figma-text.mjs` writes `text.json` + `text.md` — a **per-frame, verbatim,
reading-ordered inventory** of every visible text string on each screen, with the repeated screen-chrome
(header/footer) filtered out. **Read `text.md`** — it is the authoritative list of _what copy is on each
screen and in what order_. On an **update**, you only need the frames Step 3 flagged as changed or added.

`text.md` also flags three situations that change how you build — act on them **before** Step 6:

- **"Exploration board (no on-page links): YES"** — the frames have no wired prototype flow. Do **not**
  silently invent a click-through. Either confirm the intended order with the user, or build a screen-index
  page (see [Step 6](#step-6--reconstruct-the-journey)) so every screen is still reachable.
- **"Distinct services detected: N ⚠ MORE THAN ONE"** — the board mixes screens from different services
  (e.g. a marine-licensing email inside a levy flow). Ask the user whether to split them into separate
  journeys or mark the outliers reference-only. Do not bury a foreign-service screen inside the flow.
- **"Duplicate frames"** — two or more frames with identical content. Map **all** their frame ids to a
  single view (record every id in `journeys.json`, Step 6.6); do not build one view per copy.

### Two sources, reconciled — neither is enough on its own

The copy and its reading order come from the **text inventory** (`text.md`); the **layout and component
type** of each string (is it a heading, body, inset, panel, warning, hint, a radio label, a table cell…)
come from the **PNG**. You need both, and you must reconcile them before transcribing:

- A string in the inventory that you can **also see** on the PNG → transcribe it, at the component the
  image shows, in the inventory's order.
- A string in the inventory you **cannot see** on the PNG → it is invisible noise (an occluded/alternate
  layer the API still exposed). **Drop it** — do not render it. This is the safe version of the old
  "don't trust the node tree" rule: the inventory proposes, the image disposes.
- Something visible on the PNG that is **not** in the inventory → rare (usually an icon or image); add it.

> **Confirm you can actually see the image — `Read` does not always deliver it.** When you Read a PNG,
> verify the rendered screen really is in your context. Some environments hand the image off to a CDN and
> return only a URL (_"…has been successfully uploaded to CDN…"_) — in that case you have **not** seen the
> screen. Recover it by passing that URL to a vision-capable MCP tool (for example `analyze_image`).
>
> When you do, the vision prompt **must be exhaustive, never "concise"/"summarise"**: ask for _every_
> text element verbatim, in reading order, with the component type of each. Vision tools truncate
> silently; if a response looks cut off, or names fewer elements than the text inventory has for that
> frame, **re-query for the rest before you write the view**. Vision's job here is to confirm layout and
> component type for strings the inventory already gave you — not to discover the copy.
>
> If you cannot make a screen viewable by either route, say so, name the screens you could not visually
> verify, and for those screens transcribe only the inventory strings you can place — omit the rest rather
> than guessing.

## Step 5 — Map each screen to GDS

Use `references/gds-mapping.md`. Map each element you see to a stock `govuk-frontend` macro.

> **Transcribe from the Figma screen, not from a "similar" existing page.** A neighbouring repo journey
> may look close, but its copy differs in wording and order. Your source is that frame's `text.md`
> content list + its PNG, reconciled as in [Step 4](#step-4--render-screens-and-capture-the-source-content).

> **Per-screen fidelity gate — clear it before you write each view.** For the frame you are turning into a
> view, confirm: (1) every content string from its `text.md` list is placed, verbatim, **in the
> inventory's order**; (2) each is at the component type the PNG shows (`govukInsetText` vs body vs
> `govukPanel` vs `govukWarningText` vs a hint are the most-misread — check each); (3) any string you
> could not see on the PNG is dropped, not invented into a component. Do not move to the next view with an
> unresolved string. (Step 7's `figma-fidelity.mjs` then checks this mechanically.)

> **Never invent a component or container to "use" an ambiguous string.** If you extracted a string but
> cannot see — from the PNG — which on-screen element it is (a heading, field, tag, inset…), do not
> fabricate one. Omit it or ask the user. Wrapping an unplaceable string in a `govukInsetText` /
> `govukPanel` / `govukWarningText` is the most common hallucination in this skill.

In the GOV.UK Prototype Kit every `govuk-frontend` macro is **globally available** — call `govukButton`,
`govukRadios`, `govukFileUpload`, `govukTable`, `govukTag`, `govukBackLink`, `govukPhaseBanner`, …
directly in the template; no `{% from %}` import is needed (govuk-frontend is 5.11, so the enhanced file
upload and every `govuk-tag--*` colour class work out of the box). Common mappings: back link →
`govukBackLink`; caption + page heading → `govuk-caption-l` + `govuk-heading-l`; radio group →
`govukRadios`; file upload → `govukFileUpload({ javascript: true })`; primary/secondary buttons →
`govukButton`; tables → `govukTable`; status pills → `govukTag`
(`govuk-tag--green/--yellow/--red/--purple/--light-blue/…`); key/value check → `govukSummaryList`;
confirmation → `govukPanel` with `titleText`.

> **There is no reusable dashboard macro in the Prototype Kit.** Dashboard-like clusters (a results
> table, a "My applications" list) map to **stock GDS** — `govukTable` for rows plus `govukTag` for status
> pills, built from a static data object passed into the view from the route (see
> [Step 6](#step-6--reconstruct-the-journey)). If a screen has true metric / stat **cards or big-number
> tiles** with no GDS equivalent, **flag it to the user** — that needs bespoke markup/CSS agreed first,
> rather than a silent invention.

> **GOV.UK styling conventions** (these are standard Design System practice, not repo-specific): h1
> `govuk-heading-l`; h2 `govuk-heading-m`; h3 `govuk-heading-s`; **confirmation** pages use `govukPanel`
> (not an h1); **email-style** pages use `govuk-link` for actions, never `govuk-button`; reference labels
> are bold (`<strong>Payment reference:</strong>`); multiple actions (submit + delete/cancel) go in **one**
> `<div class="govuk-button-group">` with the `<form>` as the **outer** wrapper; destructive actions use
> `govuk-link--destructive` to a confirm page, then `govuk-button--warning` on the confirm step. Keep
> form options (radios, checkboxes) in the **same order as the Figma design** — do not reorder. British
> English throughout.

Match what you see in the PNG to the closest component, screen by screen.

## Build pages the GOV.UK Prototype Kit way

This is the reference for turning mapped screens into working pages — the standard kit patterns
established above. Official references:
<https://prototype-kit.service.gov.uk/docs/create-routes>,
<https://prototype-kit.service.gov.uk/docs/how-to-use-layouts>. A full distilled summary of the kit's
patterns (auto-routing, layouts/blocks, session data, branching, validation, assets…) lives in
`references/govuk-prototype-kit-guide.md` — consult it rather than reinventing the kit.

### 1. Views are auto-served — you rarely need a route

The kit serves **any** `.html` (or `.njk`) file under `app/views/` at a URL that matches its path, with
no route code at all. Create `app/views/start.html` and open `http://localhost:3000/start`; create
`app/views/apply/name.html` and open `/apply/name`. The kit adds the GOV.UK header, footer and phase
banner for you.

**So: a static screen (start pages, content pages, confirmation pages with no branching) is just a file
in `app/views/` — write nothing in `app/routes.js` for it.** Only add a route when a page must read
submitted form data, branch between screens, or pre-compute data to render.

### 2. One view per screen, extending the standard layout

```nunjucks
{% extends "layouts/main.html" %}

{% set pageName = "What is your address?" %}

{% block beforeContent %}
  {{ govukBackLink({ text: "Back", href: "/apply/name" }) }}
{% endblock %}

{% block content %}
  <div class="govuk-grid-row">
    <div class="govuk-grid-column-two-thirds">
      <h1 class="govuk-heading-l">What is your address?</h1>
      <!-- govuk components mapped from the Figma screen -->
    </div>
  </div>
{% endblock %}
```

- `{% extends "layouts/main.html" %}` — `app/views/layouts/main.html` extends the kit's
  `govuk-prototype-kit/layouts/govuk-branded.njk`, which pulls in the GOV.UK header, footer, styles and
  scripts. You get the full GOV.UK chrome for free.
- `{% set pageName = "..." %}` — feeds the `<title>` automatically (`<pageName> - <serviceName> - GOV.UK`).
- `{% block beforeContent %}` — the back link lives here (above the main column).
- `{% block content %}` — the page body. Standard pages sit in `govuk-grid-row` →
  `govuk-grid-column-two-thirds`; wide tables/dashboards use `govuk-grid-column-full`
  (see [Wide screens](#wide-screens)).

### 3. Service name — `config.json` for the default, `{% set serviceName %}` per page

The prototype-wide default lives in `app/config.json`:

```json
{
  "serviceName": "Nature Restoration Fund Prototypes"
}
```

The standard layout renders that `serviceName` in the GOV.UK header **and** the `<title>` of every page
automatically. This prototype hosts **several distinct services**, and a Figma flow usually carries its
own service name — so give a journey its own name with the kit-sanctioned per-page override, set at the
top of each of that journey's views:

```nunjucks
{% set serviceName %}
  Apply for a Nature Restoration Fund grant
{% endset %}
```

That changes the header **and** title service name for just that page. Do **not** use the heavier
`{% block header %}{{ govukHeader({ serviceName }) }}{% endblock %}` hack — `{% set serviceName %}` is
the kit's intended way to vary the service name per page (see the official
`docs/examples/override-service-name` guide).

### 4. Routes for logic live in `app/routes.js`

Add handlers to the project's single `app/routes.js` (the kit auto-loads it; it already contains the
`setupRouter()` boilerplate). The standard kit pattern for a question that branches:

```nunjucks
{# in the question view — the form POSTs to a dedicated -answer path #}
<form action="/apply-type-answer" method="post" novalidate>
  {{ govukRadios({ idPrefix: "apply-type", name: "apply-type", items: [...] }) }}
  {{ govukButton({ text: "Continue" }) }}
</form>
```

```js
// app/routes.js
const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

router.post('/apply-type-answer', function (req, res) {
  const applyType = req.session.data['apply-type'] // kebab-case field name
  if (applyType === 'grant') {
    res.redirect('/apply/grant-start')
  } else {
    res.redirect('/ineligible')
  }
})
```

- The question form `POST`s to a dedicated `…-answer` path with `novalidate`, and a `router.post` on
  that same path reads the answer and **redirects** to the next URL.
- Read submitted values from `req.session.data['<kebab-case-name>']` — the kit stores all form answers
  there automatically.
- Branch by redirecting to the next page's URL (a view that the kit auto-serves, so there is usually
  nothing else to write).
- Use `res.render('view-name', { ... })` only when a page needs data computed in the route before it
  shows — e.g. a dashboard built from a static object. `view-name` is the path under `app/views/`
  **without** the extension: `res.render('apply/dashboard', { rows })` renders
  `app/views/apply/dashboard.html`.

### 5. Organise, but do not over-scaffold

You **may** group one journey's views in a subfolder — `app/views/<journey>/start.html`,
`app/views/<journey>/check-your-answers.html` — which the kit auto-serves at `/<journey>/start`,
`/<journey>/check-your-answers`, and you may keep that journey's handlers together in `app/routes.js`
under a comment. That is ordinary kit usage.

## Naming conventions

Apply these when turning Figma frames into code — **never copy Figma frame names** (they are often
canvas labels like `1300 - 1280`). Derive a meaningful name from each screen's purpose.

- **Journey key** (kebab-case, e.g. `apply-for-grant`) is used as the view subfolder
  (`app/views/apply-for-grant/`) and URL prefix (`/apply-for-grant/...`). Pick something specific to the
  service/flow.
- **View / route slugs**: lowercase, hyphenated, **descriptive and specific**. Prefer
  `/check-your-answers` over `/summary`, `/confirmation` over `/success`. Avoid generic single words
  (`/confirm`, `/email`, `/details`, `/summary`) that collide across journeys — prepend context
  (`/nrf-reference`, not `/ref`). The slug is both the file name and the URL.
- **Session data keys**: read with the **kebab-case** form matching the field's `name` —
  `req.session.data['apply-type']`, `req.session.data['date-of-birth']`. (Inside the route you may copy
  it to a local `camelCase` variable for readability: `const applyType =
req.session.data['apply-type']`.)
- **Form field `name` attributes**: `kebab-case` — `apply-type`, `date-of-birth`.

## Step 6 — Reconstruct the journey

_(Skip this step in **update** mode — see [Updating an existing journey](#updating-an-existing-journey).)_

Pick a short kebab-case journey key (e.g. `apply-for-grant`) per the [Naming conventions](#naming-conventions)
above — it is the view subfolder and URL prefix. Following [Build pages the GOV.UK Prototype Kit way](#build-pages-the-govuk-prototype-kit-way),
this skill creates/edits exactly these files:

| Artifact       | Path                                                            | When                                      |
| -------------- | --------------------------------------------------------------- | ----------------------------------------- |
| Views          | `app/views/<journey>/*.html`                                    | one per screen (auto-served)              |
| Routes         | `app/routes.js`                                                 | only for screens that branch or need data |
| Service name   | per-view `{% set serviceName %}` (default in `app/config.json`) | give the journey its own name             |
| Homepage link  | `app/views/index.html`                                          | add a launcher link                       |
| Styles         | `app/assets/sass/application.scss`                              | only if the design needs it               |
| Skill manifest | `.ai/commands/figma-journey/journeys.json`                      | record frames                             |

1. **Views** — create `app/views/<journey>/<screen>.html` per screen, each
   `{% extends "layouts/main.html" %}` with `{% set pageName %}`, a `{% block beforeContent %}` back
   link, and a `{% block content %}`. Wire each
   transition from `flow.md`: the element click's destination screen becomes the link `href` (a plain
   `<a href>` to the next auto-served view) or, for a form, the `action` of a `router.post` that
   redirects to the next view. Most screens need **no route at all** — just the view file.
   **One view per render (non-negotiable):** every `res.render('<journey>/<slug>')` must resolve to an
   existing `app/views/<journey>/<slug>.html`, and every link/redirect target must be a view that
   exists — after wiring, enumerate the targets and confirm each file exists, or the page throws
   `template not found` / 404 at runtime.
2. **Service name** — give this journey its own name with a per-page `{% set serviceName %}` at the top
   of each view (see [Build pages §3](#3-service-name--configjson-for-the-default-set-servicename-per-page)).
3. **Routes** — only if a screen branches or needs data, append a handler to `app/routes.js` under a
   clearly-commented block for this journey (the pattern is in Build pages §4).
4. **Styles** — append any custom styles the design needs to `app/assets/sass/application.scss` (guard
   them under a clearly-commented block for this journey). Most screens need none.
5. **Homepage** — add a launcher link to `app/views/index.html` (the standard kit homepage) pointing to
   `/<journey>/start` (**no `.html`** suffix). Keep every link inside this journey — no cross-journey
   linking.
6. **Record the journey** — add an entry to `.ai/commands/figma-journey/journeys.json` so future
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
     "routesFile": "app/routes.js",
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

Populate any dashboards / tables / stats from a **static data object** in the route — do **not** parse
real uploads or call live services.

## Step 7 — Verify

```sh
npm run dev            # serves http://localhost:3000 (PORT=3100 npm run dev for a second instance)
node .ai/commands/figma-journey/scripts/figma-fidelity.mjs "<url-or-key#node>"   # content audit (needs the server)
npm run format:check   # prettier over **/*.{cjs,js,json,md,scss}
```

Start the server, open the homepage, launch the journey, and click through every screen. Confirm each
transition matches `flow.md` and the service name renders in the header and `<title>` of every page. For
any screen you gave a `router.post`/`router.get`, submit the form and confirm it branches/redirects to
the right next view. The kit auto-loads `app/routes.js` and auto-serves every view you created, so a 404
or `template not found` means a view file is missing or a redirect target is misspelled — fix the file
name or the link, not a registry.

**Run the content fidelity audit** (`figma-fidelity.mjs`, with the server up). For every built view it
fetches the rendered page and checks that each of the frame's content strings (from `text.md`, excluding
chrome) is actually present — turning "the screen resembles its PNG" into a pass/fail. A `✗` line names a
string that is on the Figma screen but missing from your view (a dropped heading, missing "Change" links,
a blank panel body — the exact errors a 200/branch smoke test misses). Fix the view and re-run until every
view is `✓`. If a flagged string was genuinely invisible on the screen, drop it from the inventory rather
than adding it — but confirm that against the PNG first.

`npm run format:check` may report pre-existing failures elsewhere — keep only the files you
added/edited clean (`.prettierrc.js`: no semicolons, single quotes); do not reformat unrelated files.

## Wide screens

Most screens use the GOV.UK default width with their content in a `govuk-grid-column-two-thirds`
column. When a screen needs more horizontal space (a wide table or dashboard), the extractor sets
`wide: true` in `flow.json` if the designer added a **`WIDE`** Dev Mode annotation on the frame;
`flow.md` shows it in the `layout` column.

Lay a wide screen out with the **standard GOV.UK full-width pattern**: wrap the wide content in
`govuk-grid-column-full` (inside the usual `govuk-grid-row`) instead of the two-thirds column. The page
container stays at the GOV.UK default width; only the content column widens. Do not add a custom body
class or hand-roll a wider container — `govuk-grid-column-full` is the kit-native way. Record the flag
as `"wide": true` on the frame in `journeys.json` (Step 6.6) so a later run knows the screen was meant
to be wide.

> **Note on annotation access:** Dev Mode annotations require the annotation to be readable by the
> token. If a screen is meant to be wide but its `WIDE` annotation doesn't come through (e.g. seat /
> permission limits), fall back to a plain text layer containing `WIDE` on the frame — the extractor
> also matches annotation text, and a text layer is always readable via `characters`.

## Updating an existing journey

When Step 3 prints **`MODE: UPDATE`**, the designer has changed a Figma journey you already built. The
goal is to apply **only** their delta — never to regenerate the whole journey, because the views hold
hand-written copy (real wording substituted for Figma's placeholder text) and any static dashboard data,
all of which a blind rebuild would destroy. Work surgically:

1. **Read the reconcile report.** It classifies every frame as **unchanged / changed / added /
   removed** and lists the affected view files. Unchanged frames are done — do not touch their views.
2. **Re-render only the changed and added frames** (Step 4) and re-read those PNGs (Step 5). Re-run
   `figma-text.mjs` too (it regenerates the whole inventory) and read the `text.md` content lists for the
   changed/added frames. You do not need to look at unchanged screens again.
3. **Patch, don't replace:**
   - **changed** → open the mapped view and apply just the designer's structural/content change
     (a new field, a reworded heading, a re-pointed link). Preserve the surrounding real copy and any
     static data passed in from the route. If a change is large, regenerate the view to a scratch file
     and diff it in rather than overwriting.
   - **added** → build a new view + wire its transition in (a link `href` or a `router.post` redirect in
     `app/routes.js`), exactly as in Step 6.
   - **removed** → **flag it for the user and ask before deleting** anything; a frame can vanish from a
     flow without the screen being retired. Never auto-delete a route or view.
4. **Re-point wiring if the flow changed** — recheck `flow.md`'s on-page transitions against the view
   links / route redirects and fix any that moved.
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
