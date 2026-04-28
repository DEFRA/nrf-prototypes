---
name: journey-updates
description: Merge new changes to a prototype user journey (routes, config, and on-disk Nunjucks templates under app/views/{journey}/)
parameters:
  - name: journey
    description: The type of journey to update (e.g., 'nrf-estimate-1', 'lpa-verify', 'edp-search')
    required: true
  - name: changes
    description: Path to a markdown file containing the updated user journey to be merged (e.g., 'prompts/implementation/quote-journey-v2.md')
    required: true
---

# Code Review Command

## Description

Take the content from updates to the user journey and integrate them into the implemented code

## Usage

Type `/journey-updates` in the chat to trigger a merge of changes to the user journey.

### Parameters

- `journey` (required): Specify which journey to update
- `changes` (required): Path to a markdown file containing the updated user journey to be merged

### Examples

- `/journey-updates journey:nrf-estimate-1 changes:prompts/implementation/quote-journey-v2.md`

### Content Change Examples

- **Terminology**: "redline" → "red line", "residential" → "dwellinghouse"
- **Spacing**: "redline boundary" → "red line boundary"
- **Error messages**: "Select a building type" → "Select a building type to continue"
- **Page titles**: "Upload redline file" → "Upload a red line boundary file"
- **Pronoun changes**: "your development" → "the development"
- **Grammar fixes**: "If you need to help" → "If you need help"
- **Alphabetical ordering**: Form options (checkboxes, radio buttons, select options) must be in alphabetical order

### Styling Requirements

When implementing or updating journeys, ensure consistent styling across all pages:

- **Heading Styles**:
  - **All pages**: Use `govuk-heading-l` for main headings (h1)
  - **Confirmation pages**: Use `govukPanel` component with `titleText` (not h1 headings)
  - **Sub-headings**: Use `govuk-heading-m` for h2, `govuk-heading-s` for h3

- **Email Pages**:
  - **No button styles**: Email pages must use `govuk-link` class for links, never `govuk-button` or button styling
  - **Link styling**: All navigation links in email pages should be plain links with `class="govuk-link"`

- **Data Display**:
  - **Payment/Reference numbers**: When displaying "Payment reference:" or similar labels, make the label bold using `<strong>Payment reference:</strong>` followed by the value
  - **Structured data**: Use `govuk-summary-list` component for displaying key-value pairs (e.g., payment reference and business name together)

- **Buttons** ([GOV.UK Button component](https://design-system.service.gov.uk/components/button/)):
  - **Check your answers / multi-action footers**: Put the primary submit button and any secondary control (secondary button, cancel link, or `govuk-link--destructive` “Delete”) inside one `<div class="govuk-button-group">`—not in separate block elements that stack vertically. **Structure**: the `<form method="post">` must wrap the `govuk-button-group`, not the other way around. Correct: `<form>…<div class="govuk-button-group">` submit button + links `</div></form>`. Wrong: `<div class="govuk-button-group"><form>…only submit…</form><a>Delete</a></div>` (avoids form/group nesting issues and matches `.cursor/rules/views-and-templates.mdc`).
  - **Destructive flows**: Use a destructive **link** from the summary page; reserve `govuk-button--warning` for the final confirmation step where the Design System recommends it.

- **Consistency**: Ensure all pages in a journey follow the same styling patterns as existing journeys (nrf-estimate-1, nrf-estimate-2). For view-level conventions, follow `.cursor/rules/views-and-templates.mdc`.

### Structural Change Examples

- **New pages**: Step 7 "Email sent from the Nature Restoration Fund service" → `/nrf-estimate-1/estimate-email-content`
- **Page order changes**: Reordering of steps in the journey flow
- **Path changes**: `/old-path` → `/new-path`
- **Deleted pages**: Removing steps that are no longer needed

## Mandatory: no cross-journey linking

All URLs, redirects, form actions, `Change` links, and `govukBackLink` targets implemented for this run must stay within the active journey namespace:

- If `journey:nrf-estimate-6`, use only `/nrf-estimate-6/...` for journey navigation.
- Do **not** link or redirect to other journeys (for example `/nrf-estimate-5/...`, `/nrf-quote-4/...`) unless the spec explicitly requires a cross-journey handoff.
- If the spec implies a page outside `{journey}` but does not explicitly define a cross-journey handoff, treat this as a blocker and either:
  1. create the missing page(s) under `app/views/{journey}/` and route(s) under `app/routes/{journey}.js`, or
  2. flag it in the output as **Manual review needed** rather than silently cross-linking.

## Mandatory: prototype wiring (always verify)

Content-only merges are not enough: if the journey is not wired into the kit, users get **404** on every path. **Treat the following as part of every `/journey-updates` run**—not optional follow-up.

1. **`app/config/shared/journeys.js`**
   - The `{journey}` must appear in `JOURNEYS` with the correct `basePath` (e.g. `/nrf-estimate-4`).
   - This drives both the **home page index** (`app/routes/index.js`) and **dynamic loading** of `app/routes/{journey}.js` in `app/routes.js`.
   - If the journey is missing here, the route file is never mounted and **all URLs under that base path return 404**.

2. **`app/config/{journey}/routes.js` (on disk)**
   - If `app/routes/{journey}.js` does `require('../config/{journey}/routes')` (or similar), the folder and file **must exist in the workspace**.
   - A missing file causes `require` to throw; the kit catches it and **skips loading the whole journey** (often only a console warning).

3. **Templates on disk: canonical path and `res.render` alignment (non-negotiable)**
   - **Canonical folder**: Every Nunjucks page for the journey lives under **`app/views/{journey}/`**, where `{journey}` is the **route module basename** (the `{journey}` parameter to this command—e.g. `nrf-quote-4-2`), **not** whatever URL prefix the markdown spec uses. If the spec says `/nrf-estimate-4/start` but you are implementing `journey:nrf-quote-4-2`, files belong at `app/views/nrf-quote-4-2/start.html` and URLs use that journey’s `basePath`.
   - **One file per step**: For each route that calls `res.render(...)`, there must be a matching **`app/views/{journey}/<name>.html`**. The render string is **`{journey}/<name>`** (no `.html`). Example: `res.render('nrf-quote-4-2/start')` requires **`app/views/nrf-quote-4-2/start.html`** on disk.
   - **`TEMPLATES` in `app/config/{journey}/routes.js`**: Every `TEMPLATES.*` value must resolve to an existing file under `app/views/{journey}/`. After edits, **enumerate** `TEMPLATES` (and any literal `res.render('…')` strings in the route file) and confirm each maps to `app/views/.../<slug>.html`.
   - **Do not finish the merge with missing templates**: If the router or `TEMPLATES` references a page that has no `.html` file yet, **create the file in the same run** (copy structure from a similar journey, then swap copy and paths). An empty stub is unacceptable for user-facing steps—use minimal valid GOV.UK layout + correct `form action`/`href` for that `basePath`.
   - **Verification before closing**: List `app/views/{journey}/` (e.g. `ls app/views/{journey}`) and compare to the set of pages implied by the spec **and** by `TEMPLATES` / `res.render`. Any gap is a **blocking** defect (runtime error: `template not found: {journey}/…`).

4. **Views for every spec path**
   - After mapping spec `Path:` entries to templates, confirm `app/views/{journey}/` has a matching `.html` for each (and map layouts if used).
   - Partial views + a loaded router still produce **404** or template errors for missing steps.

5. **Smoke check (run before finishing)**
   - From the repo root:

   ```bash
   node -e "require('./app/routes/{journey}.js'); console.log('OK');"
   ```

   Replace `{journey}` with the route module name (e.g. `nrf-estimate-4`). It must exit **0**. Any `Cannot find module` error means wiring or config is incomplete.
   - **Note**: This check does **not** load Nunjucks templates. Missing `app/views/{journey}/*.html` files still cause **`template not found: {journey}/…`** at runtime when a page is requested—hence item 3 above is mandatory.

6. **Optional HTTP check** (if a dev server is available)
   - `GET /{basePath}/start` (or the journey’s real entry URL) should return **200**, not 404.

# Instructions

Take the instructions and parameters provided, then:

1. **Journey Type**: Focus on the `{journey}` journey
2. **Changes Source**:
   - Read and analyze the markdown file content in `{changes}`
   - Compare with the implemented user journey under `{journey}`
   - **Content Replacement Methodology** (Recommended Approach):
     - **Parse Specification Content**: Extract complete content blocks from the markdown specification for each page
     - **Content Block Identification**: Identify content sections in the specification:
       - Main page content (paragraphs, lists, headings)
       - Form labels and options
       - Error messages and validation text
       - Button text and navigation elements
     - **Direct Content Mapping**: Map specification content directly to view file content sections
     - **Template-Aware Replacement**: Replace content while preserving:
       - GOV.UK Prototype Kit template structure
       - Template variables and data binding (`{{ data.variable }}`)
       - Form action URLs and method attributes
       - CSS classes and HTML attributes
       - JavaScript functionality
   - **Content Comparison Techniques** (Fallback Approach):
     - Use grep/search tools to find specific text patterns
     - Compare exact strings between specification and implementation
     - Look for word variations, spacing differences, and terminology changes
     - Check all user-facing text including hidden form elements and error messages
     - Forensically review the content in the implemented pages and compare against the content defined in `{changes}`
   - **Structural Detection Techniques**:
     - Use `grep -E "^\|\|.*Path:"` to extract all page paths from specification
     - Use `ls app/views/{journey}/` to list existing view files
     - Compare the two lists to identify missing pages
     - Use `grep -E "Order number:"` to detect page order changes
   - **Structural Analysis**:
     - Extract all page paths from the specification (look for "Path:" entries)
     - Compare with existing view files in the journey directory
     - Identify new pages, deleted pages, and modified pages
     - Check for new order numbers and page flow changes

3. **Implementation Steps**:
   - **Structural Analysis First**:
     - Extract all page paths from the specification using grep for "Path:"
     - List all existing view files in **`app/views/{journey}/`** (not another folder, even if the spec uses a different route prefix)
     - Identify new pages that need to be created **as new `.html` files under `app/views/{journey}/`**
     - Identify deleted pages that need to be removed
     - Check for page order changes and flow modifications
     - **Template path rule**: When adding a page, add **`app/views/{journey}/<slug>.html`** and wire `TEMPLATES` / `res.render('{journey}/<slug>')` in the same change set—never leave render targets without files
   - **Content Replacement Strategy** (Primary Approach):
     - **Extract Content Blocks**: Parse the specification markdown to extract complete content blocks for each page
     - **Direct Content Replacement**: Replace entire content sections in view files with the exact content from the specification
     - **Content Block Mapping**: Map specification content blocks to corresponding view file sections:
       - Page titles and headings
       - Main content paragraphs and lists
       - Form labels and options
       - Error messages and validation text
       - Button text and navigation elements
     - **Template Preservation**: Maintain GOV.UK Prototype Kit template structure while replacing content
     - **Variable Preservation**: Keep existing template variables and data binding intact
     - **Styling Preservation**: Ensure correct heading styles (all pages: `govuk-heading-l`, confirmation pages: `govukPanel`), email pages use `govuk-link` not buttons, payment references use bold labels, structured data uses `govuk-summary-list`
   - **Fallback Content Comparison** (Secondary Approach):
     - Use grep/search tools to find specific text patterns
     - Compare exact strings between specification and implementation
     - Look for word variations, spacing differences, and terminology changes
     - Check all user-facing text including hidden form elements and error messages
   - Focus on ALL content changes including:
     - **Text changes**: Exact wording, capitalization, punctuation, spacing
     - **Terminology changes**: Word variations (e.g., "redline" vs "red line", "dwellinghouse" vs "residential")
     - **Error messages**: Exact error text, validation messages, field labels
     - **Page titles and headings**: All heading text, page titles, form labels
     - **Navigation text**: Button text, link text, back link text
     - **Content structure**: Bullet points, lists, form options, radio/checkbox labels
     - **Alphabetical ordering**: Ensure all form options (checkboxes, radio buttons, select options) are in alphabetical order by their display text
     - **Page flow changes**: New pages, deleted pages, conditional routing
     - **Data structure changes**: Field names, variable names, data types
   - Update the relevant files (routes, views, etc.)
   - Ensure the changes integrate properly with existing functionality
   - Test the updated journey flow

4. **Files to Update**:
   - Routes: `app/routes/{journey}.js`
   - Views: **`app/views/{journey}/`** — one `.html` file per rendered template name; folder name **must** match `{journey}`
   - **Registry**: `app/config/shared/journeys.js` (must list the journey whenever the journey is new or the base path changes)
   - **Route constants**: `app/config/{journey}/routes.js` whenever the route module depends on it
   - Any additional files mentioned in the changes

5. **Validation**:
   - **Prototype wiring (do first)**:
     - Confirm `JOURNEYS` includes this journey and `basePath` matches `app/routes/{journey}.js`
     - Confirm `app/config/{journey}/routes.js` exists if required by the route module
     - Run `node -e "require('./app/routes/{journey}.js'); console.log('OK');"` from repo root
   - **Structural Verification**:
     - Verify all pages from the specification exist as view files under **`app/views/{journey}/`**
     - **Cross-check renders**: Grep `app/routes/{journey}.js` (and `app/config/{journey}/routes.js` for `TEMPLATES`) for template names; for each, assert `app/views/{journey}/<slug>.html` exists
     - Check that implemented URL paths match the journey’s `basePath` (spec markdown may use a different prefix—implementation paths follow `ROUTES` / `BASE_PATH`, but **files** always live under `app/views/{journey}/`)
     - Confirm page order and flow matches the specification
     - Ensure no orphaned pages exist that aren't in the specification
   - **Content Verification**:
     - Compare ALL user-facing text with the specification (page titles, headings, labels, buttons, error messages)
     - Verify terminology consistency throughout the journey
     - Check spacing, punctuation, and capitalization match exactly
     - Verify all form options (checkboxes, radio buttons, select options) are in alphabetical order by display text
   - **Styling Verification**:
     - Verify heading styles: all pages use `govuk-heading-l`, confirmation pages use `govukPanel`
     - Check email pages use `govuk-link` for links, not `govuk-button` styles
     - Verify payment/reference labels are bold (`<strong>Payment reference:</strong>`)
     - Check structured data uses `govuk-summary-list` where appropriate
     - On “check your answers” (or any page with submit + delete/cancel), confirm related actions use `govuk-button-group` per the Design System Button component, with **`<form>` outside** `govuk-button-group` when posting (see views-and-templates rule for the exact HTML order)
     - Ensure styling consistency with existing journeys (nrf-estimate-1, nrf-estimate-2)
   - **Functional Testing**:
     - Ensure all form submissions work correctly
     - Verify navigation flow is maintained
     - Check that validation logic is properly implemented and all conditions work as per the requirements
     - Check the error messages display for each of the defined conditions
   - **User Experience**:
     - Confirm the user experience matches the requirements exactly
     - Test the complete journey flow end-to-end
     - Verify all conditional paths work correctly
