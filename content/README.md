# Journey content

This folder holds the words and the logic for content-driven journeys. The prototype kit builds the screens from these files directly. There is no AI in the loop and no HTML to write.

```
content/
  shared/
    pages/
      start.md        screens shared by more than one journey (content)
      what-would-you-like-to-do.md
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

### Markdown you can use

| Write                          | You get                       |
| ------------------------------ | ----------------------------- |
| `## Heading` / `### Heading`   | medium / small heading        |
| blank line between lines       | new paragraph                 |
| `- item`                       | bulleted list                 |
| `1. item`                      | numbered list                 |
| `[link text](https://...)`     | link                          |
| `[text (opens in new tab)](…)` | link that opens a new tab     |
| `**bold**`                     | bold                          |
| `\` at the end of a line       | line break inside a paragraph |

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

`:::map` draws the saved red line boundary on a small read-only map (used on the commitment certificate). The name after `map` is the answer holding the boundary and can be left out.

`:::if key` shows a block only when an answer exists, and `:::if key equals value` only when it matches:

```markdown
:::if residentialBuildingCount

- housing with a total of {{ residentialBuildingCount }} unit(s)

:::
```

Leave a blank line before a closing `:::` when the block ends with a list, otherwise the formatter folds it into the last item.

### Showing an answer the user gave

Write the answer's name in double curly braces: `{{ estimateEmail }}`. The names are listed under `session:` in `journey.yaml`. Useful variations:

- `{{ planningType | lower }}` lower-case
- `{{ estimateEmail or "user@example.com" }}` fallback when there is no answer yet
- `{{ redlineBoundaryPolygon.intersectingCatchment }}` a value inside a value

## Settings by page type

| `type`          | Settings you can use                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| `start`         | `title`                                                                                                          |
| `content`       | `title`, `actions`                                                                                               |
| `radios`        | `hint`, `options` (each with optional `hint`), `errors`, `button`                                                |
| `checkboxes`    | as radios                                                                                                        |
| `input`         | `hint`, `errors`, `button`, `width`                                                                              |
| `number`        | as input                                                                                                         |
| `email`         | as input                                                                                                         |
| `password`      | `hint`, `errors`, `button`; has a Show/Hide toggle, never stored                                                 |
| `form`          | `hint`, `fields`, `button`, `actions` (see "Several fields")                                                     |
| `file-upload`   | `hint`, `errors`, `button`                                                                                       |
| `check-answers` | `rows`, `actions`                                                                                                |
| `confirmation`  | `title`, `panel` (with `title` and `body`)                                                                       |
| `document`      | `title`; a full-width document with no banner or back link                                                       |
| `custom`        | a developer-built screen; `hint`, `errors` and `text:` (named strings the template renders) still come from here |

Every page can also set `layout` to change its chrome: `default` (the prototype header and banner), `one-login` (the GOV.UK One Login look used by the shared sign-in pages) or `document` (bare crown header, full width, no banner or back link; `type: document` pages get this automatically).

### Several fields on one page

`type: form` puts more than one text input on a page, an address for example. List the inputs under `fields:`; each has a `name` (kebab-case), a `label` and optionally `hint`, `optional: true`, `width` (a number of characters, or `two-thirds`, `one-half`...), `autocomplete` and its own `errors`. The answers are remembered together as one object under the page's `sessionKey` in `journey.yaml`, so `{{ developerDetails.postcode }}` shows one of them.

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

A `value` can also be a choice, `{ when: <condition>, then: Added, else: Not added }`, and `change` can be a list of rules so the link goes to a different page depending on an answer (a rule list with no default shows no link when nothing matches).

### Buttons and links at the bottom of a page

```yaml
actions:
  - text: Confirm and submit
    kind: submit
  - text: Delete
    kind: destructive # red link
    goto: delete-quote
```

Kinds: `submit`, `warning` (red button), `link`, `destructive` (red link), `start`.

## Pages shared by more than one journey

The quote and request-to-use journeys both begin with the same start page and the same "What would you like to do?" question, and the mock GOV.UK One Login pages (`one-login-email`, `one-login-password`) are shared the same way so any journey can sign the user in. That copy lives once, in `content/shared/pages/`, and each journey lists the page with `shared: true`:

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

The page keeps the journey's own URL (`/nrf-quote-7/start` and `/nrf-request-to-use-1/start` are the same words), so the homepage cards, the smoke test and the screen wall work as usual. To change the shared copy, edit the file in `content/shared/pages/`; every journey that uses it updates at once. A shared question page carries its own `type`, `field`, `sessionKey`, `options` and `errors` in its frontmatter, so the journeys only decide where each answer goes. A page can also set `serviceName` in its frontmatter (or in `journey.yaml`) to replace the journey's service name in the header and `<title>` on that page alone: the shared pages say "Manage the nature restoration levy" and the journey's own name takes over from the next page.

A `goto` that starts with `/` is an exit to another journey. The engine does not check that the page exists there, so **when a newer version becomes the target (say `nrf-quote-8`), update the path in the other journey's `journey.yaml`**. Exits show in the flow diagram as dashed boxes, on the screen wall as a placeholder card, and in `flow.json` under `transitions.offPage`. A page cannot be both shared and have a file of the same name in the journey's own `pages/`; the loader refuses to guess which one you meant.

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

A Change link to another journey carries the way back on its own. For an exit from `actions` or a `next` rule add `return: <summary page>`. Either way the link opens the borrowed page with `?nav=/nrf-request-to-use-1/review-quote-details`, and on that page:

- the Back link and any `goto: $summary` (in `next`, `back` or `actions`, a Cancel link say) return to that summary page, so the borrowed page's own rules still run (a `wrong-permission` branch still applies) and its `$navFromSummary` rule brings the user back
- the header shows the borrowing journey's service name and signed-in state, so the user does not see the service change under them
- everything else (URL, session keys, hooks such as the map's API) stays the borrowed journey's

For this to work the borrowed page needs `changeable: true` and a `$navFromSummary` rule ending in `goto: $summary` (not a hard-coded page id). `nav` is only honoured when it names a summary page of a mounted journey; anything else is ignored. The page still lives in the other journey, so **the same caveat as exits applies: update the paths when a newer version becomes the target.**

## Things that need a developer

- Adding, removing or renaming a page (the file name is the page's URL). The running server picks the new page up without a restart.
- Changing where an answer leads (`journey.yaml → next`).
- Changing what a page remembers (`journey.yaml → session`).
- New kinds of block or component.
- The map page's behaviour (`app/lib/nrf-quote-7/hooks.js`; the request-to-use journey borrows that page rather than having its own), the mock quote store and sign-in accounts (`app/lib/nrf-request-to-use-1/hooks.js`). Changes to hooks, or to `basePath` in `journey.yaml`, need `npm run dev` restarting.

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

Condition operators: `equals`, `notEquals`, `in`, `notIn`, `gt`, `gte`, `lt`, `lte`, `between`, `truthy`, `falsy`, `isSet`. Combine with `all:`, `any:`, `not:`. Engine values: `$navFromSummary`, `$isChange`, `$preview`.

Other page keys: `shared: true` (copy comes from `content/shared/pages/<id>.md`, see "Pages shared by more than one journey"), `back` (page id, absolute path, or a rule list), `guard` (condition plus `redirect`), `store` (map radio labels to stored values), `set` (write values on submit; also allowed on a rule), `clears` (list of keys, or `$session`), `handler: custom` (page has hooks), `template` (a hand-written view for `type: custom`), `layout` (`default`, `one-login` or `document`), `remember: false` (never write the answer to the session; pair it with a field name starting `_` so the kit's own auto-store skips it too, as the password page does), `accept` and `maxSize` for uploads, `min` and `max` for numbers.

A `next` rule or an action whose `goto` leaves for another journey can add `return: <summary page id>` so that journey's page comes back here (see "Borrowing a page from another journey"). `$summary` is allowed wherever a `goto` is: `next`, `back` and `actions`.

Journey keys: `id`, `name`, `serviceName`, `start`, `summaryPage` or `summaryPages` (every page with Change links; a rule's `goto: $summary` returns to whichever one the user came from, which may be in another journey when the page is borrowed), `signedIn` (a condition; while it holds the header shows a Sign out link, pointing at the `SIGN_OUT` route a hook registers, and agents see the organisation they act for), `session`, `preview.data` (sample answers for `?preview=1` and the screen wall; a page can add its own `preview:` block with `data:` to override them, and `variants:` — a list of `{ id, label, data }` — to show other states of the same screen on the wall and in the JPG export, opened with `?preview=1&variant=<id>`), `homepage` (the homepage card: `family`, `version`, `status`, `title`, `description`, `changes`; see "Adding a new journey"). `serviceName` is used in every page `<title>` and, prefixed "PROTOTYPE - ", in the service navigation bar under the header (`app/views/includes/service-header.html`).

Hooks (`app/lib/<journey>/hooks.js`) are per journey, so a shared page such as `one-login-password` only does something in the journeys that give it a hook. A `load(ctx)` hook runs before a page is built and may put data in the session (the request-to-use journey fills in the retrieved quote this way); `get(ctx, model)` runs after and can add to the render model.

The definition is validated on load. A broken file fails loudly with every problem listed, both on `npm run dev` and at `/tools/journeys`.
