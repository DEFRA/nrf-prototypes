# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A **GOV.UK Prototype Kit 13** app (Node.js/Express, Nunjucks, govuk-frontend 5.11 with the refreshed brand) for rapidly prototyping **Nature Restoration Fund (NRF) levy** user journeys. It is a User-Research tool — UX and flow matter, production-grade security does not. Maps (red-line boundary drawing + Environmental Delivery Plan overlap) are a first-class feature.

## Read the Cursor rules first

`.cursor/rules/*.mdc` are the authoritative, always-on project conventions (there is a `read-rules-first` rule). Read the relevant ones before touching `app/`. The most important are `project.mdc`, `core-development.mdc`, `journeys-and-routes.mdc`, `views-and-templates.mdc`, `validation-and-errors.mdc`, and `mapping-components.mdc`. The detail below summarises them; defer to the rule files on conflict.

## Commands

```bash
nvm use                 # Node >= v22 (.nvmrc)
npm run dev             # dev server on http://localhost:3000 (PORT=3100 npm run dev to use another port)
npm run test:e2e        # Playwright; auto-starts `npm run dev` on :3000 (reuses one if already running)
npm run format          # prettier --write (cjs,js,json,md,scss)
npm run format:check    # prettier --check
npm run screenshot      # scripts/screenshot-capture.js (puppeteer) — captures journey pages
npm run tiles:convert   # regenerate MBTiles from app/assets/map-layers/*.geojson (needs tippecanoe)
```

Run a single test: `npx playwright test tests/e2e/smoke.spec.js` or by title `npx playwright test -g "start page"`. Tests live in `tests/e2e/` (config in `playwright.config.js`).

> `npm run format:check` currently reports **~55 pre-existing failures** across sibling routes, vendor JS, and `prompts/` (the repo predates the prettier gate). Do **not** reformat those files — keep only your own new code clean. Style is defined in `.prettierrc.js`: **no semicolons, single quotes, no trailing commas, 2-space indent, brace every `if`/`for` body**. `husky` + `lint-staged` run `prettier --check` on staged JS/JSON/MD at commit time.

## Architecture: everything is a "journey"

The app is organised around independent **user journeys**, not a single app. Each journey is three files that follow a strict naming convention:

1. **Config** — `app/config/{journey}/routes.js`: exports `BASE_PATH`, `ROUTES` (every path as a constant, e.g. `START: \`${BASE_PATH}/start\``), and `TEMPLATES` (view names without `.html`). Always reference these constants in handlers — never magic strings.
2. **Route module** — `app/routes/{journey}.js`: `const router = govukPrototypeKit.requests.setupRouter()`, GET/POST handlers, `module.exports = router`.
3. **Views** — `app/views/{journey}/*.html`, one file per page.

**Registration is by convention, not by editing a router.** Add the journey to the `JOURNEYS` array in `app/config/shared/journeys.js` (`{ name, displayName, basePath, hasStartPage, description }`). `app/routes.js` then auto-`require`s `app/routes/<basePathWithoutSlash>.js` and mounts it. **No change to `routes.js` is needed for a new journey** — but if you forget the `JOURNEYS` entry or its `config/{journey}/routes.js`, the whole journey 404s (router never mounts). Verify with `node -e "require('./app/routes/{journey}.js')"` from the repo root.

The `tests/e2e/smoke.spec.js` test iterates `getJourneysWithStartPage()` and GETs `{basePath}/start` — so any `hasStartPage: true` journey must have a working `/start` route + view.

### Where journey content comes from

`prompts/implementation/*.md` are the **source of truth** for each journey's page flow, copy, fields, error messages, and branching. Implement and word pages to match these prompts exactly (British English). Top-level `prompts/*.md` cover exploratory/spike features (EDP search, case management, levy calculation, LPA verify).

## Request/session pattern

All journey + form state lives in `req.session.data` (in-memory, no persistence). Standard handler shape:

- **GET**: `const data = req.session.data || {}`, resolve a `backLink`, `res.render(TEMPLATES.X, { data, backLink, error })`.
- **POST**: validate `req.body`; on failure **re-render the same template** with `error` (never redirect — you'd lose the message); on success write `req.session.data` then `res.redirect(ROUTES.NEXT)`. Branching reads session data (e.g. `journeyType`, `hasRedlineBoundaryFile`).
- Form fields are `kebab-case` (`name="planning-type"`); the matching session key is `camelCase` (`planningType`). Forms `POST` to their own path with `novalidate`.

Reusable validation lives in `app/lib/{journey}/validators.js` (e.g. `app/lib/nrf-estimate-3/validators.js`).

## Views & components

- **Layouts**: standard pages `{% extends "layouts/main.html" %}`; full-screen map pages `{% extends "layouts/map.html" %}`. Blocks: `pageTitle`, `beforeContent` (back link via `govukBackLink`), `content`.
- **GOV.UK macros are global** (`govukButton`, `govukRadios`, `govukTable`, `govukPhaseBanner`, `govukFileUpload`, …) — call them directly without `{% from %}` imports. govuk-frontend 5.11 supports `govukFileUpload({ javascript: true })` (enhanced drop-zone) and all `govuk-tag--*` colour classes (purple/light-blue/green/…).
- **Error pattern**: `govuk-error-summary` titled "There is a problem" linking to `#field-id`, plus `govuk-form-group--error` + `govuk-error-message` on the field. Use the exact error wording from the prompt.
- **Multiple actions** (submit + delete/cancel): wrap in **one** `<div class="govuk-button-group">`, and the `<form>` must be the **outer** wrapper around that group. For destructive actions, use `govuk-link--destructive` to a confirm page, then `govuk-button--warning` on the confirm step.
- **Homepage** `app/views/index.html` is **hand-coded HTML** (not config-driven) — add each journey's launcher link and description there manually.
- **Per-page service name**: the kit renders a bare `<title>GOV.UK</title>` and no service name by default; `{% set serviceName %}` does **not** reach the layout header. To show a per-screen service name, override the block: `{% block header %}{{ govukHeader({ serviceName: "...", serviceUrl:"...", containerClasses:"govuk-width-container", homepageUrl:"/" }) }}{% endblock %}`.

## Maps, vector tiles & EDP checks

- Map pages draw a red-line boundary and check overlap with **EDP** (Environmental Delivery Plan) GeoJSON.
- **Load GeoJSON once at module startup and cache it** (see `nrf-quote-6.js` `loadEdpData()`) — never `readFileSync` per request. Intersect with `turf.booleanIntersects(boundaryPolygon, feature)`.
- Vector tiles are MBTiles (SQLite) in `tileserver/data/mbtiles/`, served by the app itself via `better-sqlite3` at `/tiles/data/{layer}/{z}/{x}/{y}.pbf` (proxied by `app/routes/tileserver-proxy.js` + `map-tiles.js`). No external tileserver. Regenerate with `npm run tiles:convert` (tippecanoe).
- `app/routes/vts-maps.js` and `app/assets/sass/_map-drawing.scss` carry the drawing-tool styles.

## Conventions & gotchas

- **British English** in all copy and comments (colour, behaviour, centre, organise). Conventional commits (`feat:`, `fix:`).
- **Safe redirects only** to internal `ROUTES.*` constants — never to user-controlled URLs.
- **Prototype security posture**: mock auth (stub sign-in pages), placeholders for contact details (`xxxxx@defra.gov.uk`, `00000000000`), basic server-side validation only. Do not commit secrets; local env goes in `.env` (gitignored) — `.env.template` documents the keys. `.env.locale` is used locally for non-committed tokens.
- **`/figma-journey` skill** (`.ai/commands/figma-journey/`) reconstructs a Figma flow as a journey. Its docs are partly stale: they reference files that don't exist here (`on-site-baseline.*`, `dashboard/macro.njk`, `metric-results.*`) and the scripts previously pointed at `.claude/skills/...` (now fixed to `.claude/commands/...`). Follow the real journey-registration pattern above, not the skill's copy-from examples. Its manifest is `.ai/commands/figma-journey/journeys.json`.
- When port 3000 is busy, run a second instance with `PORT=3100 npm run dev`.
