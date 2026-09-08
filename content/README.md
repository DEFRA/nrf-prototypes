# Journey content

This folder holds the words and the logic for content-driven journeys. The prototype kit builds the screens from these files directly. There is no AI in the loop and no HTML to write.

```
content/
  nrf-quote-7/
    journey.yaml      order of pages, branching, what is remembered (logic)
    pages/
      start.md        one file per screen (content)
      planning-type.md
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
```

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

| `type`          | Settings you can use                                              |
| --------------- | ----------------------------------------------------------------- |
| `start`         | `title`                                                           |
| `content`       | `title`, `actions`                                                |
| `radios`        | `hint`, `options` (each with optional `hint`), `errors`, `button` |
| `checkboxes`    | as radios                                                         |
| `input`         | `hint`, `errors`, `button`, `width`                               |
| `number`        | as input                                                          |
| `email`         | as input                                                          |
| `file-upload`   | `hint`, `errors`, `button`                                        |
| `check-answers` | `rows`, `actions`                                                 |
| `confirmation`  | `title`, `panel` (with `title` and `body`)                        |
| `custom`        | a developer-built screen; `hint`, `errors` still come from here   |

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
```

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

## Things that need a developer

- Adding, removing or renaming a page (the file name is the page's URL). The running server picks the new page up without a restart.
- Changing where an answer leads (`journey.yaml → next`).
- Changing what a page remembers (`journey.yaml → session`).
- New kinds of block or component.
- The map page's behaviour (`app/lib/nrf-quote-7/hooks.js`). Changes to hooks, or to `basePath` in `journey.yaml`, need `npm run dev` restarting.

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

Other page keys: `back` (page id, absolute path, or a rule list), `guard` (condition plus `redirect`), `store` (map radio labels to stored values), `set` (write values on submit; also allowed on a rule), `clears` (list of keys, or `$session`), `handler: custom` (page has hooks), `template` (a hand-written view for `type: custom`), `accept` and `maxSize` for uploads, `min` and `max` for numbers.

Journey keys: `id`, `name`, `serviceName`, `start`, `summaryPage`, `session`, `preview.data` (sample answers for `?preview=1` and the screen wall), `homepage` (the homepage card: `family`, `version`, `status`, `title`, `description`, `changes`; see "Adding a new journey"). `serviceName` is used in every page `<title>` and, prefixed "PROTOTYPE - ", in the service navigation bar under the header (`app/views/includes/service-header.html`).

The definition is validated on load. A broken file fails loudly with every problem listed, both on `npm run dev` and at `/tools/journeys`.
