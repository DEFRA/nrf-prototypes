# Journey content

This folder holds the words and the logic for content-driven journeys. The prototype kit builds the screens from these files directly. There is no AI in the loop and no HTML to write.

```
content/
  shared/
    pages/
      start.md        screens shared by more than one journey (content)
      what-would-you-like-to-do.md
    one-login/        the mock GOV.UK One Login (sign in, create an account)
    government-gateway/  the mock Government Gateway (sign in, create sign in details)
    defra-id/         the mock Defra ID registration
  nrf-quote-7/
    journey.yaml      order of pages, branching, what is remembered (logic)
    pages/
      planning-type.md  one file per screen (content)
      ...
```

**If you are changing copy, options, hints, error messages or button text, you only ever edit files in `pages/`.** You never need to touch `journey.yaml` for that.

See the flow and every screen side by side at `/tools/journeys/nrf-quote-7` while `npm run dev` is running. Save a page file or `journey.yaml` and the open browser tab reloads itself with the change; no refresh and no restart needed. The flow diagram keeps the default path (following each page's default `goto` from `start`) on a single row, with branches and exits hanging below it; nothing needs marking as "main" by hand.

## Editing a page

Every page file has two parts: a short block of settings at the top between `---` lines, then the page copy in markdown.

```markdown
---
type: radios
hint: Options below include any variations to an existing permission.
options:
  - label: Full planning permission
  - label: Outline planning permission
  - label: Other
errors:
  required: Select a planning application type
button: Continue
---

# What type of planning application are you planning to submit?
```

The first `# Heading` is the page's question or title. Everything after it is body copy.

### Labels and values

An option has a `label` and, where the journey branches on the answer, a short `value`:

```yaml
options:
  - label: Full planning permission
    value: full
  - label: Other
    value: other
```

The label is copy: reword it whenever you like. The value is the answer's short name, the one `journey.yaml` uses (`when: { key: planningType, equals: other }`), so leave it alone when you change the label. Wherever the answer is shown back to the user (`{{ planningType }}` on a check your answers page, in an email or a certificate) the label appears, not the value. A page whose answer nothing branches on needs no values at all. The app refuses to start a journey whose `journey.yaml` compares an answer with a value none of the page's options has, naming the page and the option, so a mismatch shows up straight away rather than as a wrong turn in the journey.

### Markdown you can use

| Write                           | You get                       |
| ------------------------------- | ----------------------------- |
| `## Heading` / `### Heading`    | medium / small heading        |
| blank line between lines        | new paragraph                 |
| `- item`                        | bulleted list                 |
| `1. item`                       | numbered list                 |
| `[link text](https://...)`      | link                          |
| `[text (opens in new tab)](…)`  | link that opens a new tab     |
| `**bold**`                      | bold                          |
| `\` at the end of a line        | line break inside a paragraph |
| `\| Heading \| Heading \|` rows | table (see below)             |

A table is written the markdown way, one row per line with `|` between the cells and a line of dashes under the headings, and comes out as a GOV.UK table. Two extras match the design system: a body row whose first cell is entirely bold (`| **Provisional** | £1,000 |`) makes that cell the row's header, and a column whose dashes end in a colon (`---:`) is a numeric column, aligned right.

```markdown
| Levy amount            | Amount (excluding VAT) |
| ---------------------- | ---------------------: |
| **Provisional**        |      £{{ levyAmount }} |
| **Inflation-adjusted** |      £{{ levyAmount }} |
```

Do not write HTML or template code in these files. If you need something the list above cannot do, ask a developer to add a block type.

### Blocks

Wrap copy in `:::` lines to get GOV.UK components:

```markdown
:::inset
This quote does not commit you to pay the levy.
:::

:::details What happens next
You will receive an email with details of the quote.
:::

:::warning
You must keep this reference.
:::

:::panel Your details have been submitted
NRF reference: {{ nrfReference }}
:::

:::button Start now
:::

:::map redlineBoundaryPolygon
:::
```

```markdown
:::notification Keeping your information secure
Do not share your Government Gateway user ID and password with anyone else.
:::

:::after-button

[Get help with this page](#)

:::
```

`:::map` draws the saved red line boundary on a small read-only map (used on the commitment certificate). The name after `map` is the answer holding the boundary and can be left out.

`:::notification Title` is the blue notification banner. `:::after-button` moves everything from that line to the end of the file below the page's button: a "Get help with this page" link, or a details block that sits under Continue. When the block holds another block (a details, say), open and close it with four colons (`::::after-button` … `::::`) so the inner `:::` lines do not end it early.

A link written as `[text](./page-id)` points at a page of whichever journey the file is used in, so a shared page can link to a sibling page (the Government Gateway sign in page links to `./government-gateway-email`). `[text](./$next)` follows the page's own `next` rules in `journey.yaml`, evaluated for the current session: the Defra account registration emails use it for "Sign in to your account", so the copy never names the page that comes after signing in.

`:::if key` shows a block only when an answer exists, and `:::if key equals value` only when it matches:

```markdown
:::if residentialBuildingCount

- housing with a total of {{ residentialBuildingCount }} unit(s)

:::
```

Leave a blank line before a closing `:::` when the block ends with a list, otherwise the formatter folds it into the last item.

### Showing an answer the user gave

Write the answer's name in double curly braces: `{{ estimateEmail }}`. The names are listed under `session:` in `journey.yaml`. An answer to a radios or checkboxes question shows as the option's label (see "Labels and values"). Useful variations:

- `{{ planningType | lower }}` lower-case
- `{{ estimateEmail or "user@example.com" }}` fallback when there is no answer yet
- `{{ redlineBoundaryPolygon.intersectingCatchment }}` a value inside a value

## Settings by page type

| `type`          | Settings you can use                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| `start`         | `title`                                                                                                          |
| `content`       | `title`, `actions`                                                                                               |
| `radios`        | `hint`, `options` (each with optional `hint`), `errors`, `button`, `bodyFirst` (body copy above the options)     |
| `checkboxes`    | as radios, plus `actions` of kind `link` or `destructive` beside the button (a Delete link on an agreement page) |
| `input`         | `hint`, `errors`, `button`, `width`, `label` (see "A label under the heading")                                   |
| `number`        | as input                                                                                                         |
| `email`         | as input                                                                                                         |
| `password`      | `hint`, `errors`, `button`; has a Show/Hide toggle, never stored                                                 |
| `form`          | `hint`, `fields`, `button`, `actions` (see "Several fields")                                                     |
| `select`        | `label`, `placeholder`, `options`, `errors`, `button`, `actions`; a dropdown under the heading and body copy     |
| `file-upload`   | `hint`, `errors`, `button`                                                                                       |
| `check-answers` | `rows`, `actions`                                                                                                |
| `confirmation`  | `title`, `panel` (with `title` and `body`)                                                                       |
| `document`      | `title`; a full-width document with no banner or back link                                                       |
| `custom`        | a developer-built screen; `hint`, `errors` and `text:` (named strings the template renders) still come from here |

Every page can also set `layout` to change its chrome: `default` (the prototype header and banner), `one-login` (the GOV.UK One Login look used by the shared sign-in pages), `government-gateway` (the Government Gateway look: a "Government Gateway" bar, the language toggle, no banner), `defra-id` (the Defra ID look: bare header with a Sign out bar and the Defra footer, used by the mock "register a Defra account" pages), `defra-account` (as `defra-id` with the "Your Defra account" bar showing the user's name, Manage account and Sign out) `document` (bare crown header, full width, no banner or back link; `type: document` pages get this automatically) or `email` (the same bare header at the usual reading width, for the emails the service sends, so they do not look like a page of the service).

A `caption` ("Register Defra account", say) shows in grey above the heading of content, radios, form, select and check your answers pages.

### A label under the heading

An `input`, `number` or `email` page normally uses its heading as the label of the box. Add `label:` when the page has copy between the heading and the box, or the box needs its own name:

```markdown
---
type: input
label: Enter the 6 digit code
width: 10
---

# Check your email

We have sent an email to: **{{ signInEmail }}**
```

### Several fields on one page

`type: form` puts more than one text input on a page, an address for example. List the inputs under `fields:`; each has a `name` (kebab-case), a `label` and optionally `hint`, `optional: true`, `width` (a number of characters, or `two-thirds`, `one-half`...), `autocomplete`, `type` (`text` unless you say `tel`, `email`, `textarea` or `password`; a `textarea` with a `maxLength` shows how many characters are left, a `password` gets a Show/Hide button and is never shown again) and its own `errors`. A page whose fields are all passwords sets `remember: false` and names them starting with `_` (see the create password pages) so nothing is kept. The answers are remembered together as one object under the page's `sessionKey` in `journey.yaml`, so `{{ developerDetails.postcode }}` shows one of them.

```markdown
---
type: form
fields:
  - name: full-name
    label: Full name
    errors:
      required: Enter the developer's full name
  - name: address-line-2
    label: Address line 2
    optional: true
  - name: postcode
    label: Postcode
    width: 10
button: Confirm
---

# What are the developer details?
```

The error summary lists one link per field that is missing. A `link` or `destructive` entry under `actions:` on any question page adds a link beside its button (a Cancel link, say).

`title` is only needed when the browser tab title should differ from the heading.

### Error messages

`errors:` is a small list of situations and the message to show. The message is used in both the error summary and next to the field.

| Key           | When it shows                         |
| ------------- | ------------------------------------- |
| `required`    | nothing entered, selected or uploaded |
| `invalid`     | not a number                          |
| `min` / `max` | number too small or too large         |
| `format`      | email address in the wrong shape      |
| `tooLarge`    | file over the size limit              |
| `wrongType`   | file extension not allowed            |
| `empty`       | uploaded file has nothing in it       |

Any key you leave out falls back to `required`.

### Check your answers rows

```yaml
rows:
  - key: Number of units
    value: '{{ residentialBuildingCount }}'
    change: units # page the Change link goes to
    changeHidden: number of housing units # read out by screen readers
  - key: Housing
    value: '{{ isHousing }}' # no `change` means no Change link
  - key: Address
    value:
      lines: # several lines in one value; empty lines are dropped
        - '{{ developerDetails.addressLine1 }}'
        - '{{ developerDetails.postcode }}'
    change: developer-details
  - heading: Development details # starts a new titled group of rows
  - key: Planning permission type
    value: '{{ planningType }}'
```

A `value` can also be a choice, `{ when: <condition>, then: Added, else: Not added }`, whose `else` may be another choice when there are three or more possibilities, and `change` can be a list of rules so the link goes to a different page depending on an answer (a rule list with no default shows no link when nothing matches).

### Buttons and links at the bottom of a page

```yaml
actions:
  - text: Confirm and submit
    kind: submit
  - text: Delete
    kind: destructive # red link
    goto: delete-quote
```

Kinds: `submit`, `secondary` (grey button, submits the same form), `warning` (red button), `link`, `destructive` (red link), `start`.

## Pages shared by more than one journey

The quote and request-to-use journeys both begin with the same start page and the same "What would you like to do?" question. That copy lives once, in `content/shared/pages/`, and each journey lists the page with `shared: true`:

```yaml
pages:
  - id: start
    shared: true # copy comes from content/shared/pages/start.md
    next: what-would-you-like-to-do

  - id: what-would-you-like-to-do
    shared: true
    next:
      - when: { key: journeyType, equals: request-to-use }
        goto: /nrf-request-to-use-1/have-nrl-reference # leaves this journey
      - goto: planning-type
```

The mock identity providers are shared the same way, each in its own folder so `shared/pages/` stays small: `content/shared/one-login/` (create or sign in, email, password, and the "Create your GOV.UK One Login" flow), `content/shared/government-gateway/` (sign in and "Create sign in details") and `content/shared/defra-id/` (register a Defra account). A journey lists those pages with the folder name instead of `true`:

```yaml
- id: one-login-start
  shared: one-login
  next: one-login-email

- id: defra-register
  shared: defra-id
  next: defra-terms
```

The page ids keep their provider prefix (`one-login-`, `government-gateway-`, `defra-`) because they become URLs in every journey that uses them. The flow between the pages (which button leads where, the guards, what is remembered) is still each journey's own, in its `journey.yaml`; the request-to-use journey is the worked example. A shared page whose button links to another page (`goto:` in its `actions`, or a `[text](./page-id)` link) needs that page listed in the journey too.

The page keeps the journey's own URL (`/nrf-quote-7/start` and `/nrf-request-to-use-1/start` are the same words), so the homepage cards, the smoke test and the screen wall work as usual. To change the shared copy, edit the file in `content/shared/pages/`; every journey that uses it updates at once. A shared question page carries its own `type`, `field`, `sessionKey`, `options` and `errors` in its frontmatter, so the journeys only decide where each answer goes. A page can also set `serviceName` in its frontmatter (or in `journey.yaml`) to replace the journey's service name in the header and `<title>` on that page alone: the shared pages say "Manage the nature restoration levy" and the journey's own name takes over from the next page.

A `goto` that starts with `/` is an exit to another journey. The engine does not check that the page exists there, so **when a newer version becomes the target (say `nrf-quote-8`), update the path in the other journey's `journey.yaml`**. Exits show in the flow diagram as dashed boxes, on the screen wall as a placeholder card, and in `flow.json` under `transitions.offPage`. A page cannot be both shared and have a file of the same name in the journey's own `pages/`; the loader refuses to guess which one you meant.

### Groups on the tools page

The flow diagram and screen wall at `/tools/journeys/<id>` fold each shared provider folder into one purple box ("GOV.UK One Login, 11 screens") on the main journey, and draw the group's own screens and flow in a section of their own further down the page. Nothing needs setting up for that: a page listed with `shared: one-login` belongs to the `one-login` group. To put any other page in a group, give its entry `group: <name>` in `journey.yaml`; to change a group's title, add a `groups:` block:

```yaml
groups:
  one-login:
    title: GOV.UK One Login
```

Inside a group's section, a dashed box is a page of the journey outside the group ("Back in the journey"). The JPG export numbers the screens in the same order, the main journey first, then each group, with a folder per section in the zip; tick or untick sections on the export form to get the main journey on its own, or just one group.

## Borrowing a page from another journey

Sharing is for a page both journeys walk through in order. When a journey only needs to send the user to another journey's page _and get them back_, borrow it instead of copying it. The request-to-use journey does this for the development details: "Review and amend your quote details" has Change links to the quote journey's planning type, housing, units and map pages, and "No, delete my quote details" leaves for the quote journey's delete flow. The request-to-use journey has no copies of those pages.

```yaml
# In a check-answers page's rows: a Change link to another journey's page
rows:
  - key: Number of housing units
    value: '{{ residentialBuildingCount }}'
    change: /nrf-quote-7/units

# In actions or a `next` rule: an exit that comes back, `return` names one
# of this journey's summaryPages
actions:
  - text: Delete
    kind: destructive
    goto: /nrf-quote-7/delete-quote
    return: review-quote-details
```

A Change link to another journey carries the way back on its own. For an exit from `actions` or a `next` rule add `return: <page>`: usually a summary page, but the Delete link on the agreement page returns to the agreement page itself, so its Cancel lands where the user was. Either way the link opens the borrowed page with `?nav=/nrf-request-to-use-1/review-quote-details`, and on that page:

- the Back link and any `goto: $summary` (in `next`, `back` or `actions`, a Cancel link say) return to that summary page, so the borrowed page's own rules still run (a `wrong-permission` branch still applies) and its `$navFromSummary` rule brings the user back
- the header shows the borrowing journey's service name and signed-in state, so the user does not see the service change under them
- everything else (URL, session keys, hooks such as the map's API) stays the borrowed journey's

For this to work the borrowed page needs `changeable: true` and a `$navFromSummary` rule ending in `goto: $summary` (not a hard-coded page id). `nav` is only honoured when it names a page of a mounted journey; anything else is ignored. The page still lives in the other journey, so **the same caveat as exits applies: update the paths when a newer version becomes the target.**

## Trying out variations of a page

To try different words or a different layout for a page without a branch, save a copy of its file beside it, with `~` and a short name after the page id, and reword the copy:

```
pages/planning-type.md      # the page
pages/planning-type~b.md    # an alternative copy of it
```

```markdown
---
variant: Shorter heading # how the tools page labels this copy (the name after ~ if left out)
type: radios
hint: Options below include any variations to an existing permission.
options:
  - label: Full planning permission
    value: full
  # ...the same options, with the same values
errors:
  required: Select a planning application type
---

# Which type of planning application is it?
```

The name after the `~` uses lower-case letters, digits and hyphens. A variant is copy only: reword the heading, hint, body, labels, error messages and button as you like, but keep the page's `type`, the `value` of every option, the fields of a form and its `field` and `sessionKey`, because `journey.yaml` branches on those. The loader refuses a variant that changes them and says which file. A shared page varies the same way, with the file beside it in `content/shared/...`, in every journey that shares it.

Seeing the variants:

- On the screen wall at `/tools/journeys/<id>`, each variant is an orange-topped card right after the page it varies, labelled with its `variant:` name. The ⋯ menu on the page or on a variant has **Compare side by side**, which opens every copy of the page in columns at desktop or mobile width, in the error state if the page has one.
- `?_copy=b` on the page's URL shows that copy once, for that request. The wall and the export use it, so looking at a variant never changes what anyone else sees.
- `?copy=b` shows that copy for the rest of the session: every page that has a `~b` file shows it and the others show their own copy, so a research participant can be walked through variant B end to end. `?copy=default` goes back to the pages' own copy. The Copy link button on a variant's card gives that URL.
- The JPG export saves each variant beside the page as `<page>~b.jpg`.

Variants are for experiments, not handoffs. A variant never appears in a frozen handoff copy or in the "as handed over" export, and editing one does not turn the page's tag to **Changed since handoff**: only the page's own file counts. To keep a variant, move its words into the page's own file and delete the variant; to drop one, delete its file. Either shows up without a restart.

## Things that need a developer

- Adding, removing or renaming a page (the file name is the page's URL). The running server picks the new page up without a restart.
- Changing where an answer leads (`journey.yaml → next`).
- Changing what a page remembers (`journey.yaml → session`).
- New kinds of block or component.
- The map page's behaviour (`app/lib/nrf-quote-7/hooks.js`; the request-to-use journey borrows that page rather than having its own), the mock quote store, sign-in accounts and Defra ID registration (`app/lib/nrf-request-to-use-1/hooks.js`; anyone requesting to use the levy for themselves as an individual or as their organisation's account admin registers a Defra account first, an employee who opened the invitation email skips it, and for an agent a sign-in email or Government Gateway user ID containing `new` registers; `company` or `individual` in the email picks the account type when the who-for question was skipped, anything else is an agent). Changes to hooks, or to `basePath` in `journey.yaml`, need `npm run dev` restarting.

## Handing pages to development

There is no "ready for dev" button. When a page's design is ready to build, put the date on its entry in `journey.yaml`:

```yaml
- id: upload-redline
  handoff: 2026-09-17
```

That one line is the handoff. Anyone can add it, in an editor or on GitHub, and it is fine to hand over one page while the rest of the journey is still moving. A shared page (the start page, "What would you like to do?") is stamped on the journey handing it over.

What happens next:

- The journey's tools page (`/tools/journeys/<id>`) lists the handed-over pages at the top of the Screens tab and tags each screen **Ready for dev**. The homepage card shows how many pages are ready.
- When the page's copy is edited after the handoff, the tag turns yellow, **Changed since handoff**, on its own: the prototype asks git whether the markdown moved after the commit that added the date. Put today's date on the page to hand the change over (when the page was already handed over today, the date cannot change, so add a comment after it, `handoff: 2026-09-18 # copy corrected`, and commit: the handoff is the commit that last wrote that line). Changes to the page's rules in `journey.yaml` (`next`, `guard`, `set`) are not spotted this way, so tell the developer about those.
- When the date lands on `main`, the Publish workflow tags that commit `handoff/<journey>/<date>`. QA and BAs can link to the copy as handed over on GitHub (the "Copy at handoff" link on the tools page), and developers can diff two handoffs: `git diff handoff/nrf-quote-7/2026-09-01 handoff/nrf-quote-7/2026-09-17 -- content/`.
- Once the date is committed, the page has a frozen URL, `/handoffs/<journey>/latest/<page>` (the "Frozen page" link and the copy-link button on the tools page, for example `/handoffs/nrf-quote-7/latest/start?preview=1`). It shows the page as handed over however much the live copy moves afterwards, and the whole journey works under it, so Back and Continue stay in the frozen copy: every page under `latest` comes from its own most recent handoff, with a banner in place of the Prototype one saying **Frozen · Copy as handed over on <date>**, and a page never handed over shows the live copy under a grey **Not handed over** banner so nobody builds it. The link stays the same when the page is handed over again; `/handoffs/<journey>/<date>/<page>` pins the whole journey to that one handoff's commit if you ever need the copy exactly as it was. `?preview=1` shows it with sample answers, as the screen wall does; without it, pages guarded by earlier answers send you to the start. The copy comes from the commit that wrote the date (locally, git extracts it into `.tmp/handoffs/`; the Publish workflow bakes every handoff into `app/data/handoffs/` for the deployed prototype). Templates and behaviour are always today's: only the content is frozen, and a copy variant of a page (`<page>~<name>.md`, see "Trying out variations of a page") is never shown in a frozen copy.

Developers looking for what to build can search the content for `handoff:`.

## Adding a new journey

1. Create `content/<id>/journey.yaml` and `content/<id>/pages/` with at least a start page. Copy `content/nrf-request-to-use-1/` for the smallest working example.
2. Give it a `homepage:` block so it lands in the right tab on the homepage:

   ```yaml
   homepage:
     family: quote # quote | request-to-use | lpa | other (tabs in app/config/shared/journeys.yaml)
     version: 8 # highest version in a family is the main card; the rest go under "Previous versions"
     status: in-progress # tested | in-progress | spike
     title: Get a quote for Nature Restoration Fund levy (V8)
     description: One paragraph shown on the card.
     changes: # optional "Design changes" bullets; { heading, items } groups are allowed
       - What changed since the last version
   ```

3. Restart `npm run dev`. The journey mounts at `/<id>` (or `basePath` if set), appears on the homepage and at `/tools/journeys/<id>`. Until the restart the homepage shows the card with a "Restart to mount" tag.

Nothing else needs registering: no route file, no entry in `app/config/shared/journeys.yaml` (that file is only for the older hand-coded journeys). Bespoke page behaviour goes in `app/lib/<id>/hooks.js`, which is picked up automatically on the next restart. Route constants for tests are available with `getRouteConstants('<id>')` from `app/lib/journey-engine` (see `app/config/nrf-quote-7/routes.js`).

## For developers: journey.yaml

```yaml
pages:
  - id: planning-type # URL is /<journey>/<id>; copy is pages/<id>.md
    field: planning-type # form field name (kebab-case)
    sessionKey: planningType # session key (defaults to camelCase of field)
    changeable: true # can be reached from check your answers with ?change=true
    next: # first matching rule wins; the last has no `when`
      - when: { key: planningType, equals: Other }
        goto: wrong-permission
      - when: { key: $navFromSummary, truthy: true }
        goto: check-your-answers
      - goto: housing
```

Condition operators: `equals`, `notEquals`, `in`, `notIn`, `gt`, `gte`, `lt`, `lte`, `between`, `truthy`, `falsy`, `isSet`. Combine with `all:`, `any:`, `not:`. Engine values: `$navFromSummary`, `$isChange`, `$preview`, `$borrowed` (the page was opened from another journey's summary page, see "Borrowing a page from another journey").

Other page keys: `handoff: YYYY-MM-DD` (the page's design was handed to development on that date; see "Handing pages to development"), `shared: true` (copy comes from `content/shared/pages/<id>.md`) or `shared: <folder>` (from `content/shared/<folder>/<id>.md`, see "Pages shared by more than one journey"), `back` (page id, absolute path, or a rule list; it wins over the Back-to-the-summary shortcut a `changeable` page gets, so a change detour that runs through several pages can step back through them with rules on `$navFromSummary` or `$borrowed`, as the quote's map does), `guard` (condition plus `redirect`), `store` (map an option's `value` to what the session stores, for booleans and the like; prefer a `value` on the option in the page file), `set` (write values on submit; also allowed on a rule), `clears` (list of keys, or `$session`), `handler: custom` (page has hooks), `template` (a hand-written view for `type: custom`), `layout` (`default`, `one-login`, `government-gateway`, `defra-id`, `defra-account`, `document` or `email`), `remember: false` (never write the answer to the session; pair it with a field name starting `_` so the kit's own auto-store skips it too, as the password page does), `accept` and `maxSize` for uploads, `min` and `max` for numbers, `research` (see below).

`research` lists shortcuts for the research facilitator, shown in a "User research" section at the top of the page's footer, under the crown, each opening in a new tab. They are not part of the flow: the tools page draws one that points at a page of this journey as a dashed link from the page that offers it (so the linked page is not "not reached") and ignores the rest. A hook's `load` on the linked page can remember that it was opened (the request-to-use journey's employee invitation email). `newTab: false` opens a link in the same tab, for one the participant follows instead of the page's button. An `href` is a page of this journey (a query string is fine), a path into another journey when it starts with `/`, or a full URL:

```yaml
- id: what-would-you-like-to-do
  shared: true
  research:
    - text: Quote email
      href: /nrf-quote-7/estimate-email-content?preview=1
```

`?research=false` on any page hides the section for the session (`?research=true` shows it again). Embedded previews (`?preview=1&embed=1`: the screen wall's thumbnails, screenshots and the JPG export) never show it; a page opened from the screen wall (`?preview=1`) does.

A `next` rule or an action whose `goto` leaves for another journey can add `return: <page id>` so that journey's page comes back here (see "Borrowing a page from another journey"). `$summary` is allowed wherever a `goto` is: `next`, `back` and `actions`.

Journey keys: `id`, `name`, `serviceName`, `start`, `summaryPage` or `summaryPages` (every page with Change links; a rule's `goto: $summary` returns to whichever one the user came from, which may be in another journey when the page is borrowed), `signedIn` (a condition; while it holds the header shows a Sign out link, pointing at the `SIGN_OUT` route a hook registers, and agents see the organisation they act for), `session`, `preview.data` (sample answers for `?preview=1` and the screen wall; a page can add its own `preview:` block with `data:` to override them, and `variants:` — a list of `{ id, label, data }` — to show other states of the same screen on the wall and in the JPG export, opened with `?preview=1&variant=<id>`), `homepage` (the homepage card: `family`, `version`, `status`, `title`, `description`, `changes`; see "Adding a new journey"). `serviceName` is used in every page `<title>` and, prefixed "PROTOTYPE - ", in the service navigation bar under the header (`app/views/includes/service-header.html`).

Hooks (`app/lib/<journey>/hooks.js`) are per journey, so a shared page such as `one-login-password` only does something in the journeys that give it a hook. An action of kind `submit` or `secondary` with a `goto` renders as a button that links there instead of submitting (the "Create your GOV.UK One Login" button). A `load(ctx)` hook runs before a page is built and may put data in the session (the request-to-use journey fills in the retrieved quote this way); `get(ctx, model)` runs after and can add to the render model.

`?preview=1` on a summary page (one listed in `summaryPage` or `summaryPages`) also copies the sample answers into the session, so someone opening a shared link to check your answers can follow a Change link, find the page already answered and come back with the row updated, rather than being sent to the first unanswered question. Any other page leaves the session alone, as does an embedded preview, so the research aids that open a page with sample answers during a session (the quote email, say) never change a participant's answers.

`?preview=1&error=1` shows a question page with its `required` error, as the "Error state" view on the screen wall does. A page whose `errors:` block names more than one message (a `number` page's `invalid`, `whole`, `min` and `max`, say) can show each of them with `?preview=1&error=<key>`, for example `/nrf-quote-7/units?preview=1&error=max`; on the screen wall the card's Show menu has a select under "Error state" listing each key with its wording, and the JPG export saves one screen per key (`units--error.jpg`, `units--error-max.jpg`). On a `form` page the key applies to every field whose `errors:` define it. A key the page does not define falls back to `required`.

`?errors=false` on any page turns server-side validation off for the session (the kit keeps the flag in session data as `errors`); blank answers are then filled from `preview.data`, so keep the sample answers complete enough for every guard to pass. `?errors=true` turns validation back on.

`?copy=<name>` shows the page's copy variant `pages/<id>~<name>.md` (see "Trying out variations of a page") for the session, the same way (the kit keeps it as `copy`; a page with no such variant shows its own copy, and `?copy=default` ends it). `?_copy=<name>` shows it for that request only: the kit never stores a query key that starts with `_`, which is why the screen wall, the compare page and the export use it. A frozen handoff copy ignores both. In the engine, `copyVariantFor` in `router.js` swaps the variant's page object in before the page is handled, so hooks, validation and rules see the page's own id, path and `next` with the variant's copy; `copyVariants(page)` in `flow.js` lists them for the tools page and the export (`<page>~<name>.jpg`, left out of the "as handed over" export).

The definition is validated on load. A broken file fails loudly with every problem listed, both on `npm run dev` and at `/tools/journeys`.
