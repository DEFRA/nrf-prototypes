# GOV.UK Prototype Kit v13 — knowledge file

A practical reference for building prototype journeys with the **GOV.UK Prototype Kit**. Distilled from
the official tutorials & guides at
<https://prototype-kit.service.gov.uk/docs/tutorials-and-guides> on 2026-08-05. This repo runs **kit
13.17.0** with **govuk-frontend 5.11.1** — examples below match that. Defer to the live docs for the
canonical wording; this file exists so the `figma-journey` skill (and anyone building pages) has the
kit's real patterns to hand, and does not reinvent them.

British English throughout (colour, behaviour, organise).

---

## 1. Pages get a URL from their file — no route needed

The kit serves **any** `.html` (or `.njk`) file under `app/views/` at a URL that matches its path. You
do not write any route code for a page that just shows content.

- `app/views/start.html` → `http://localhost:3000/start`
- `app/views/juggling-balls.html` → `/juggling-balls`
- `app/views/apply/name.html` → `/apply/name` (subfolders become URL segments)

If the kit cannot find a matching view, it returns an "Error: not found" page. You only add a route
when a page must read submitted data, branch, or pre-compute data (see [Routes](#8-routes) and
[Branching](#9-branching)).

The easiest way to create a page is the **Manage your prototype** UI at
`http://localhost:3000/manage-prototype` — give a path (e.g. `/start`) and the kit writes the file from
a template. You can also just create the file by hand.

**Source:** `docs/make-first-prototype/create-pages`, `docs/create-pages-from-templates`.

---

## 2. Layouts & blocks

A page starts by extending the standard layout:

```nunjucks
{% extends "layouts/main.html" %}
```

`app/views/layouts/main.html` itself extends the kit's layout:

```nunjucks
{% extends "govuk-prototype-kit/layouts/govuk-branded.njk" %}
```

This loads the GOV.UK header, footer, phase banner, styles and scripts — the full GOV.UK chrome — for
every page that extends it.

**Blocks** are how pages and layouts share code. The standard layout exposes (among others):

| Block | Use it for |
| --- | --- |
| `content` | The main page body (required on most pages) |
| `beforeContent` | The back link, breadcrumbs — anything above the main column |
| `pageTitle` | Override the `<title>` |
| `header` / `govukHeader` | Replace the GOV.UK header |
| `govukServiceNavigation` | Add items to the service navigation bar |
| `footer` / `govukFooter` | Replace the footer |
| `stylesheets` | Add CSS on this page (call `{{ super() }}` to keep the defaults) |
| `scripts` | Add JS on every page that uses this layout |
| `pageScripts` | Add JS on a single page |

Example — adding nav items on one page:

```nunjucks
{% block govukServiceNavigation %}
  {{ govukServiceNavigation({
    serviceName: serviceName,
    navigation: [
      { href: "#", text: "Navigation item 1" },
      { href: "#", text: "Navigation item 2", active: true }
    ]
  }) }}
{% endblock %}
```

**Custom layout:** edit `app/views/layouts/main.html` (or create
`app/views/layouts/your-layout.html`) and extend it with
`{% extends "layouts/your-layout.html" %}`. You can override existing blocks and define your own.

**Source:** `docs/how-to-use-layouts`.

---

## 3. Service name

Set **once** in `app/config.json`:

```json
{
  "serviceName": "Service name goes here"
}
```

The standard layout renders that `serviceName` in the GOV.UK header **and** in the `<title>` of every
page automatically (`<pageName> - <serviceName> - GOV.UK`).

**Set the page title** with `{% set pageName = "How many balls can you juggle?" %}` — the layout turns
it into the `<title>`.

**Change the service name on one page only** (a supported kit feature — useful when a prototype hosts
several distinct services):

```nunjucks
{% set serviceName %}
  Report a smokey vehicle
{% endset %}
```

**Source:** `docs/make-first-prototype/create-pages`, `docs/examples/override-service-name`.

---

## 4. Components (Nunjucks macros)

GOV.UK Design System components are **globally available** Nunjucks macros — call them directly, no
`{% from %}` import needed. Copy the Nunjucks code from the Design System
(<https://design-system.service.gov.uk/>) and paste it into your view.

Options are named key-value pairs inside `{{ componentName({ ... }) }}`. Add a comma after each option
except the last.

```nunjucks
{{ govukButton({
  text: "Find address",
  classes: "govuk-button--secondary"
}) }}
```

Multi-part components (radios, checkboxes) take an `items` array — add or remove items to match the
design:

```nunjucks
{{ govukRadios({
  name: "where-do-you-live",
  fieldset: {
    legend: {
      text: "Where do you live?",
      isPageHeading: true,
      classes: "govuk-fieldset__legend--l"
    }
  },
  items: [
    { value: "england", text: "England" },
    { value: "spain", text: "Spain" }
  ]
}) }}
```

- `fieldset.legend.isPageHeading: true` makes the question the page's `<h1>`.
- Use `text` for plain text and `html` when the value contains markup.
- The `name` attribute is what stores the answer in session data (see [Session data](#7-session-data--showing-answers)).

**Source:** `docs/make-first-prototype/use-components`, `docs/add-change-nunjucks-components`.

---

## 5. Built-in page templates

Create these from **Manage your prototype → Templates**
(`http://localhost:3000/manage-prototype/templates`):

**Service page templates:** GOV.UK page · Unbranded page · Question page · Content page · Task list ·
Check your answers · Confirmation page.

**GOV.UK guidance/publishing templates (content-only):** Mainstream guide · Start page.

(Step-by-Step Navigation is a separate plugin, installable from the Plugins section.)

**Source:** `docs/create-pages-from-templates`.

---

## 6. Linking pages together

Two ways to move between pages: a **link** (`<a>`, or `govukButton` with an `href`) for navigation, or
a **form** (`<form>`, when the user submits data).

**Always omit the `.html` extension** in `href` / `action` — link to the path, e.g. `/juggling-balls`,
not `/juggling-balls.html`.

Start-page button (a link that looks like a button):

```nunjucks
{{ govukButton({ href: "/juggling-balls", text: "Start now" }) }}
```

Question page (a form that POSTs to the next step):

```nunjucks
<form class="form" action="/juggling-trick" method="post">
  {{ govukRadios({ name: "how-many-balls", items: [...] }) }}
  {{ govukButton({ text: "Continue" }) }}
</form>
```

**Source:** `docs/make-first-prototype/link-pages-together`.

---

## 7. Session data & showing answers

Every answer a user submits is stored in `req.session.data`, keyed by the input's `name` attribute. A
field `name="how-many-balls"` becomes `req.session.data['how-many-balls']`.

In a **view**, read it through the global `data` object:

```nunjucks
{{ data['how-many-balls'] }}
```

Use it to populate a summary list (Check your answers):

```nunjucks
{{ govukSummaryList({
  rows: [
    {
      key: { text: "Number of balls you can juggle" },
      value: { text: data['how-many-balls'] },
      actions: {
        items: [{ href: "#", text: "Change", visuallyHiddenText: "number of balls you can juggle" }]
      }
    }
  ]
}) }}
```

**Nested data:** field names like `claimant[first-name]` are stored as
`req.session.data['claimant']['first-name']` and shown as `{{ data['claimant']['first-name'] }}`.

**Clear data** with the "Clear data" link in the footer, or by using an incognito window. Default
session values can be set in `app/data/session-data-defaults.js`.

**Source:** `docs/make-first-prototype/show-users-answers`, `docs/session`.

---

## 8. Routes

Routes go in the project's single **`app/routes.js`**, which already contains the boilerplate:

```js
const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

// Add your routes here
```

Request types: **GET** (enter an address or follow a link), **POST** (submit a form). A route handler
reads answers from `req.session.data` and either **redirects** or **renders**.

```js
router.post('/live-in-uk-answer', function (req, res) {
  var liveInUk = req.session.data['live-in-uk']
  if (liveInUk == 'Yes') {
    res.redirect('/next-question')
  } else {
    res.redirect('/ineligible')
  }
})
```

- The form's `action` (`/live-in-uk-answer`) matches the `router.post` path.
- `==` compares; `=` assigns.
- If no route matches, the kit falls back to auto-serving the matching view file (see
  [§1](#1-pages-get-a-url-from-their-file--no-route-needed)).

**Render a view with extra data** — `res.render('view-name', { ... })`. The view name is the path under
`app/views/` **without** the extension; passed properties become variables in the template, alongside
the automatic `data` (session):

```js
router.get('/dashboard', function (req, res) {
  var rows = [/* …static data… */]
  res.render('dashboard', { rows: rows })
})
```

**Source:** `docs/create-routes`, `docs/pass-data`.

---

## 9. Branching

Send users to different pages based on their answer. On the question page, the form POSTs to a
dedicated `…-answer` path:

```nunjucks
<form class="form" action="/country-answer" method="post">
  {{ govukRadios({ name: "country", fieldset: { legend: { text: "Which country do you live in?", isPageHeading: true } }, items: [...] }) }}
  {{ govukButton({ text: "Continue" }) }}
</form>
```

In `app/routes.js`, read the answer and redirect:

```js
router.post('/country-answer', function (req, res) {
  var country = req.session.data['country']
  if (country == 'England') {
    res.redirect('/age')
  } else {
    res.redirect('/ineligible-country')
  }
})
```

Add `novalidate` to a `<form>` when you want the kit — not the browser — to handle validation.

**Source:** `docs/branching-journeys`, `docs/branching-journeys-radios`.

---

## 10. Conditional content

Change content **within** a page based on an answer, using Nunjucks `if` against `data`:

```nunjucks
{% if data['country'] == "Scotland" %}
  <div class="govuk-inset-text">This service is also available in Gaelic.</div>
{% endif %}
```

`elseif`, `else`, and combining with `and` / `or` all work:

```nunjucks
{% if data['country'] == "Scotland" or data['country'] == "Northern Ireland" %}
  <div class="govuk-inset-text">…available in Gaelic and Irish.</div>
{% endif %}
```

So: **branching** sends users to different _pages_; **conditional content** changes content within the
_same_ page.

**Source:** `docs/conditional-content`.

---

## 11. Validation & error messages

Two components work together: an **error summary** at the top of the page and a **field-level error
message** on the component. The error text should match between the two.

```nunjucks
{{ govukErrorSummary({
  titleText: "There is a problem",
  errorList: [
    { text: "Enter your full name", href: "#full-name" }
  ]
}) }}

{{ govukInput({
  label: { text: "Full name" },
  id: "full-name",
  name: "fullName",
  errorMessage: { text: "Enter your full name" }
}) }}
```

For a real POST handler, validate in the route and **re-render the same template** with an errors
object (do **not** redirect — you'd lose the message):

```js
router.post('/full-name-answer', function (req, res) {
  var fullName = req.session.data['fullName']
  var errors = []
  if (!fullName) {
    errors.push({ text: 'Enter your full name', href: '#full-name' })
  }
  if (errors.length) {
    res.render('full-name', { errors: errors }) // re-render, same view
  } else {
    res.redirect('/next-page')
  }
})
```

> For User Research click-throughs you can also build dedicated error-state pages rather than wiring up
> live validation that blocks navigation.

**Source:** `docs/validation`.

---

## 12. Filters

Change how an answer appears with Nunjucks filters, applied with `|`:

```nunjucks
{{ data['name'] | upper }}
```

Built-in Nunjucks filters are available; **create your own** in `app/filters.js`:

```js
const govukPrototypeKit = require('govuk-prototype-kit')
const addFilter = govukPrototypeKit.views.addFilter

addFilter('uppercase', function (content) {
  return content.toUpperCase()
})
```

If a filter returns **HTML**, pass `{ renderAsHtml: true }`, and chain filters with another `|`:

```js
addFilter('bold', function (content) {
  return '<strong>' + content + '</strong>'
}, { renderAsHtml: true })
```

```nunjucks
{{ data['name'] | upper | bold }}
```

**Source:** `docs/filters`.

---

## 13. Assets — CSS, JavaScript, images

Files in `app/assets/` are processed and served at `/public`.

| Put it in | Served at |
| --- | --- |
| `app/assets/sass/` (Sass) or `app/assets/css/` | `/public/css/…` |
| `app/assets/javascripts/` | `/public/javascripts/…` |
| `app/assets/images/` | `/public/images/…` |
| `app/assets/` (any other file) | `/public/…` |

**Global styles:** add to `app/assets/sass/application.scss`. Split large Sass into partials named with
a leading underscore (`_admin.scss`) and `@import "admin";` them.

**Per-page CSS** — add a `stylesheets` block (keep the defaults with `{{ super() }}`):

```nunjucks
{% block stylesheets %}
  {{ super() }}
  <link href="/public/css/filename-here.css" rel="stylesheet" type="text/css" />
{% endblock %}
```

**Per-page JS** — use the `pageScripts` block:

```nunjucks
{% block pageScripts %}
  <script src="/public/javascripts/filename-here.js"></script>
{% endblock %}
```

**All-page JS** — add a `scripts` block to `app/views/layouts/main.html` (again with `{{ super() }}`).
Global app JS goes in `app/assets/javascripts/application.js`.

**Images:** `<img src="/public/images/user.png" alt="User icon">`.

**Source:** `docs/adding-css-javascript-and-images`.

---

## 14. Manage your prototype

`http://localhost:3000/manage-prototype` gives you: create pages from templates, install plugins, and
(in development) "Manage your prototype" / "Clear data" links in the footer. Use **Clear data** to wipe
`req.session.data` between test runs.

---

## 15. A minimal working page (everything together)

`app/views/how-many.html`:

```nunjucks
{% extends "layouts/main.html" %}

{% set pageName = "How many balls can you juggle?" %}

{% block beforeContent %}
  {{ govukBackLink({ text: "Back", href: "/start" }) }}
{% endblock %}

{% block content %}
  <div class="govuk-grid-row">
    <div class="govuk-grid-column-two-thirds">
      <form class="form" action="/how-many-answer" method="post" novalidate>
        {{ govukRadios({
          name: "how-many-balls",
          fieldset: { legend: { text: "How many balls can you juggle?", isPageHeading: true, classes: "govuk-fieldset__legend--l" } },
          items: [
            { value: "3 or more", text: "3 or more" },
            { value: "1 or 2", text: "1 or 2" },
            { value: "None - I cannot juggle", text: "None - I cannot juggle" }
          ]
        }) }}
        {{ govukButton({ text: "Continue" }) }}
      </form>
    </div>
  </div>
{% endblock %}
```

In `app/routes.js`:

```js
router.post('/how-many-answer', function (req, res) {
  var answer = req.session.data['how-many-balls']
  if (answer == 'None - I cannot juggle') {
    res.redirect('/ineligible')
  } else {
    res.redirect('/juggling-trick')
  }
})
```

`app/views/juggling-trick.html` already exists (auto-served at `/juggling-trick`) — no route needed.

---

## 16. Further reading (the full guide index)

Foundations — `docs/install/getting-started`, `create-a-prototype`, `how-to-run-the-kit`,
`getting-started-advanced`; first-prototype tutorial (`make-first-prototype/*`).

Basic usage — `create-pages-from-templates`, `add-change-nunjucks-components`, `how-to-use-layouts`,
`install-and-use-plugins`, `usage-data`, `adding-css-javascript-and-images`, GitHub/git guides
(`github-*`, `setting-up-git`), `publishing`, `pass-data`, `conditional-content`,
`update-to-latest-version`, `validation`, `run-multiple-prototypes`.

Advanced — `create-routes`, `branching-journeys` (+ `-radios`, `-checkboxes`), `filters`, `date-filters`,
`examples/override-service-name`, `session`, `using-notify`, page-template partial areas (Design System),
`migrate-an-existing-prototype`, `use-govuk-brand-refresh`.

Plugins — `create-plugin`, `create-first-plugin`, `configure-plugin`.

Design System — <https://design-system.service.gov.uk>.
