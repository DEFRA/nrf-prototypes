/**
 * Journey engine: loader
 *
 * Reads `content/<journey>/journey.yaml` (flow and logic) and
 * `content/<journey>/pages/*.md` (copy), merges them into a validated
 * JourneyDefinition and caches it keyed on file modification times so
 * edits to content files show up without restarting the server.
 */

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const { validateCondition } = require('./expressions')
const { extractHeading, parseIfParams } = require('./markdown')
const { isHandoffDate } = require('./history')

const CONTENT_DIR = path.join(__dirname, '../../../content')
// Pages marked `shared: true` in journey.yaml read their copy from
// shared/pages/, so several journeys can start on the same page without
// duplicating it. `shared: <folder>` names another folder under shared/ (the
// mock identity providers: one-login, government-gateway, defra-id).
const SHARED_DIR = path.join(CONTENT_DIR, 'shared')
const SHARED_PAGES_DIR = path.join(SHARED_DIR, 'pages')
// A journey normally loads from content/, but a frozen copy of a handoff
// loads the same layout from a snapshot folder (see snapshots.js), so every
// path below derives from the `contentDir` a journey was loaded with.

const TYPES = [
  'start',
  'content',
  'radios',
  'checkboxes',
  'input',
  'number',
  'email',
  'file-upload',
  'password',
  'form',
  'select',
  'check-answers',
  'confirmation',
  'document',
  'custom'
]

const QUESTION_TYPES = [
  'radios',
  'checkboxes',
  'input',
  'number',
  'email',
  'password',
  'form',
  'select',
  'file-upload'
]

const TEMPLATE_BY_TYPE = {
  start: 'journey-engine/start-page',
  content: 'journey-engine/content',
  radios: 'journey-engine/radios',
  checkboxes: 'journey-engine/checkboxes',
  input: 'journey-engine/input',
  number: 'journey-engine/input',
  email: 'journey-engine/input',
  password: 'journey-engine/password',
  form: 'journey-engine/form',
  select: 'journey-engine/select',
  'file-upload': 'journey-engine/file-upload',
  'check-answers': 'journey-engine/check-answers',
  confirmation: 'journey-engine/confirmation',
  document: 'journey-engine/document'
}

// How a page is dressed: the prototype header and phase banner (default), the
// GOV.UK One Login look for the mock sign-in pages, the Government Gateway
// look (a "Government Gateway" bar, no banner), the Defra ID look for the
// mock "register a Defra account" pages (defra-id: a bare Sign out bar;
// defra-account: the "Your Defra account" bar with the user's name), a
// full-width document with a bare crown header and no banner or back link
// (certificates, letters), or an email: the same bare chrome at reading
// width, so it reads as something sent rather than a page of the service;
// or staff: an internal case-work service (the LPA's), with the service
// name, account and Menu in the header and a wider page for tables. A
// journey can set its own default with `layout:` in journey.yaml.
const LAYOUTS = [
  'default',
  'staff',
  'one-login',
  'government-gateway',
  'defra-id',
  'defra-account',
  'document',
  'email'
]

// A `goto` of `$summary` returns to whichever summary page the user came from
const { SUMMARY_TARGET } = require('./back-link')

const cache = new Map()

function camelCase(value) {
  return String(value || '').replace(/-([a-z0-9])/g, (m, c) => c.toUpperCase())
}

function upperSnake(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .toUpperCase()
}

function isQuestionType(type) {
  return QUESTION_TYPES.includes(type)
}

/**
 * A check-your-answers page can carry a confirmation checkbox (`options`
 * plus a `field`). It is not a question type, so other CYA pages stay as
 * they are; this is only the declaration box before submit.
 */
function hasCheckAnswersCheckboxes(page) {
  return (
    page.type === 'check-answers' &&
    Boolean(page.field) &&
    ((page.content && page.content.options) || []).length > 0
  )
}

/**
 * Split a markdown file into { frontmatter, body }. Frontmatter is an
 * optional leading block delimited by `---` lines and parsed as YAML.
 */
function parseMarkdownFile(source, file) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) {
    return { frontmatter: {}, body: source }
  }
  let frontmatter = {}
  try {
    frontmatter = yaml.load(match[1]) || {}
  } catch (error) {
    throw new Error(`${file}: invalid frontmatter YAML (${error.message})`)
  }
  return { frontmatter, body: match[2] }
}

function journeyDir(journeyId, contentDir = CONTENT_DIR) {
  return path.join(contentDir, journeyId)
}

/**
 * Every folder under content/shared/ (pages, one-login, ...).
 */
function sharedDirs(contentDir = CONTENT_DIR) {
  const sharedDir = path.join(contentDir, 'shared')
  if (!fs.existsSync(sharedDir)) {
    return []
  }
  return fs
    .readdirSync(sharedDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(sharedDir, entry.name))
}

function signatureFor(journeyId, contentDir = CONTENT_DIR) {
  const dir = journeyDir(journeyId, contentDir)
  const files = [path.join(dir, 'journey.yaml')]
  // Shared pages count for every journey, so an edit to one reloads them all.
  // Partials (rows several pages share) count for their journey.
  for (const pagesDir of [
    path.join(dir, 'pages'),
    path.join(dir, 'partials'),
    ...sharedDirs(contentDir)
  ]) {
    if (fs.existsSync(pagesDir)) {
      for (const name of fs.readdirSync(pagesDir)) {
        files.push(path.join(pagesDir, name))
      }
    }
  }
  return files
    .map((file) => {
      try {
        return `${file}:${fs.statSync(file).mtimeMs}`
      } catch (error) {
        return `${file}:missing`
      }
    })
    .join('|')
}

function normaliseRules(raw, where, problems) {
  if (raw === undefined || raw === null) {
    return undefined
  }
  if (typeof raw === 'string') {
    return [{ goto: raw }]
  }
  if (!Array.isArray(raw)) {
    problems.push(`${where}: must be a page id or a list of rules`)
    return []
  }
  const rules = raw.map((rule, i) => {
    if (typeof rule === 'string') {
      return { goto: rule }
    }
    if (!rule || typeof rule !== 'object' || !rule.goto) {
      problems.push(`${where}[${i}]: each rule needs a 'goto'`)
      return { goto: '' }
    }
    problems.push(...validateCondition(rule.when, `${where}[${i}].when`))
    return rule
  })
  if (rules.length && rules[rules.length - 1].when) {
    problems.push(`${where}: the last rule must have no 'when' (a default)`)
  }
  return rules
}

/**
 * Normalise the `fields:` list of a `type: form` page. Each field becomes
 * { name, key, label, hint, optional, autocomplete, classes, type, maxLength,
 * rows, errors }; the answers are stored together as one object under the
 * page's sessionKey, keyed by `key` (camelCase of the field name). `type` is
 * text by default; `tel` and `email` set the input type, `textarea` (with an
 * optional `maxLength`, which adds a character count) gives a bigger box and
 * `password` a Show/Hide input whose value is never echoed back (pair it with
 * `remember: false` on the page and a field name starting `_`).
 */
const FIELD_TYPES = ['text', 'tel', 'email', 'textarea', 'password']

function buildFields(raw, type, where, problems) {
  if (type !== 'form') {
    return []
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    problems.push(`${where}: 'form' pages need a non-empty 'fields' list`)
    return []
  }
  const names = new Set()
  return raw.map((field, i) => {
    const f = field && typeof field === 'object' ? field : { name: field }
    if (!f.name) {
      problems.push(`${where}.fields[${i}]: needs a 'name'`)
    }
    if (!f.label) {
      problems.push(`${where}.fields[${i}]: needs a 'label'`)
    }
    if (names.has(f.name)) {
      problems.push(`${where}.fields[${i}]: duplicate name '${f.name}'`)
    }
    names.add(f.name)
    const fieldType = f.type || 'text'
    if (!FIELD_TYPES.includes(fieldType)) {
      problems.push(
        `${where}.fields[${i}]: unknown type '${fieldType}' (expected one of ${FIELD_TYPES.join(', ')})`
      )
    }
    let classes = ''
    if (typeof f.width === 'number') {
      classes = `govuk-input--width-${f.width}`
    } else if (f.width) {
      classes = `govuk-!-width-${f.width}`
    }
    return {
      name: String(f.name || ''),
      key: camelCase(f.name),
      label: f.label || f.name,
      hint: f.hint,
      optional: Boolean(f.optional),
      autocomplete: f.autocomplete,
      classes,
      type: fieldType,
      maxLength: f.maxLength,
      rows: f.rows,
      errors: f.errors || {}
    }
  })
}

/**
 * A page's summary rows, with every `- include: <name>` item replaced by the
 * rows of `partials/<name>.md` in the journey's folder (frontmatter `rows:`
 * only). Rows several pages show (the details of a commitment, say) are then
 * written once. A partial may not include another.
 */
function expandRows(rows, journey, where, problems) {
  const expanded = []
  for (const row of rows || []) {
    if (!row || row.include === undefined) {
      expanded.push(row)
      continue
    }
    const name = String(row.include)
    const file = path.join(
      journeyDir(journey.id, journey.contentDir || CONTENT_DIR),
      'partials',
      `${name}.md`
    )
    if (!fs.existsSync(file)) {
      problems.push(`${where}.rows: missing partial partials/${name}.md`)
      continue
    }
    const { frontmatter } = parseMarkdownFile(
      fs.readFileSync(file, 'utf8'),
      file
    )
    const included = frontmatter.rows || []
    if (included.some((item) => item && item.include !== undefined)) {
      problems.push(`partials/${name}.md: a partial cannot include another`)
    }
    expanded.push(
      ...included.filter((item) => item && item.include === undefined)
    )
  }
  return expanded
}

/**
 * Build one page from its journey.yaml entry and its markdown file. With
 * `from.file` and `from.variantId` set, the same entry is built from a
 * copy variant's file instead (`pages/<id>~<variantId>.md`, see
 * buildCopyVariants): the page keeps its id, path and rules and only the
 * copy differs.
 */
function buildPage(entry, journey, problems, from = {}) {
  const id = entry.id
  const variantId = from.variantId || null
  const fileName = variantId ? `${id}~${variantId}.md` : `${id}.md`
  const where = variantId ? `pages.${id}~${variantId}` : `pages.${id}`
  // `shared: true` reads shared/pages/<id>.md; `shared: <folder>` reads
  // shared/<folder>/<id>.md. `page.shared` keeps the value as written.
  const shared =
    typeof entry.shared === 'string' ? entry.shared : Boolean(entry.shared)
  const sharedFolder = shared === true ? 'pages' : shared
  const contentDir = journey.contentDir || CONTENT_DIR
  const localFile = path.join(
    journeyDir(journey.id, contentDir),
    'pages',
    `${id}.md`
  )
  const pageFile =
    from.file ||
    (shared
      ? path.join(contentDir, 'shared', sharedFolder, `${id}.md`)
      : localFile)
  // Relative to the folder holding content/, so a snapshot's pages keep the
  // same `content/<journey>/pages/<id>.md` name git knows them by
  const contentFile = path.relative(path.dirname(contentDir), pageFile)
  let frontmatter = {}
  let body = ''
  if (fs.existsSync(pageFile)) {
    const parsed = parseMarkdownFile(
      fs.readFileSync(pageFile, 'utf8'),
      pageFile
    )
    frontmatter = parsed.frontmatter
    body = parsed.body
  } else if (shared) {
    problems.push(
      `${where}: missing shared content file shared/${sharedFolder}/${id}.md`
    )
  } else {
    problems.push(`${where}: missing content file pages/${id}.md`)
  }
  if (!variantId && shared && fs.existsSync(localFile)) {
    problems.push(
      `${where}: is marked shared but pages/${id}.md also exists; delete one of them`
    )
  }

  const type = frontmatter.type || entry.type || 'content'
  if (!TYPES.includes(type)) {
    problems.push(
      `${where}: unknown type '${type}' (expected one of ${TYPES.join(', ')})`
    )
  }
  if (frontmatter.type && entry.type && frontmatter.type !== entry.type) {
    problems.push(
      `${where}: type '${entry.type}' in journey.yaml disagrees with '${frontmatter.type}' in pages/${fileName}`
    )
  }

  // `handoff: YYYY-MM-DD` marks the page as handed to development on that
  // date; history.js works out whether the copy moved since
  const handoff =
    entry.handoff === undefined || entry.handoff === null
      ? null
      : entry.handoff instanceof Date
        ? entry.handoff.toISOString().slice(0, 10)
        : String(entry.handoff)
  if (handoff !== null && !isHandoffDate(handoff)) {
    problems.push(
      `${where}: handoff '${handoff}' should be a date written YYYY-MM-DD`
    )
  }

  const field = entry.field || frontmatter.field
  if (isQuestionType(type) && type !== 'form' && !field) {
    problems.push(`${where}: '${type}' pages need a 'field'`)
  }
  if (
    type === 'check-answers' &&
    (frontmatter.options || []).length &&
    !field
  ) {
    problems.push(`${where}: check-answers pages with options need a 'field'`)
  }

  const layout =
    entry.layout ||
    frontmatter.layout ||
    (type === 'document' ? 'document' : journey.layout || 'default')
  if (!LAYOUTS.includes(layout)) {
    problems.push(
      `${where}: unknown layout '${layout}' (expected one of ${LAYOUTS.join(', ')})`
    )
  }

  // `remember: false` keeps an answer out of the session (passwords)
  const remember =
    entry.remember !== undefined
      ? entry.remember !== false
      : frontmatter.remember !== false

  const fields = buildFields(frontmatter.fields, type, where, problems)
  const research = buildResearchLinks(entry.research, journey, where, problems)
  let sessionKey =
    entry.sessionKey ||
    frontmatter.sessionKey ||
    (field ? camelCase(field) : undefined)
  if (type === 'form' && !sessionKey && remember) {
    problems.push(
      `${where}: 'form' pages need a 'sessionKey' to store their answers under`
    )
  }
  if (!remember) {
    sessionKey = undefined
  }

  let template = entry.template || TEMPLATE_BY_TYPE[type]
  if (type === 'custom' && !entry.template) {
    problems.push(`${where}: custom pages need a 'template'`)
    template = 'journey-engine/content'
  }

  const { heading, body: bodyMarkdown } = extractHeading(body)
  // An H1 further down the page (below an inset, say) still names the page
  const bodyHeading = (bodyMarkdown.match(/^#\s+(.+)$/m) || [])[1]

  const next = normaliseRules(entry.next, `${where}.next`, problems)
  const back =
    typeof entry.back === 'string'
      ? entry.back
      : normaliseRules(entry.back, `${where}.back`, problems)

  if (entry.guard) {
    const { redirect, ...condition } = entry.guard
    problems.push(...validateCondition(condition, `${where}.guard`))
    if (!redirect) {
      problems.push(`${where}.guard: needs a 'redirect' page id`)
    }
  }

  let clears = entry.clears
  if (clears === '$session') {
    clears = journey.session
  }

  const errors = frontmatter.errors || {}
  const options = (frontmatter.options || []).map((option) =>
    typeof option === 'string'
      ? { label: option, value: option }
      : {
          ...option,
          value: option.value !== undefined ? option.value : option.label
        }
  )

  const page = {
    id,
    path: `${journey.basePath}/${id}`,
    shared,
    // Pages of the same group are drawn as one box on the tools page, with
    // their own section below: every shared provider folder is a group, and
    // `group: <name>` puts any other page in one
    group: entry.group || (typeof shared === 'string' ? shared : undefined),
    contentFile,
    handoff,
    // Set on a page built from a copy variant's file: which one, and the
    // label the tools page shows for it (`variant:` in the frontmatter)
    copyVariant: variantId
      ? {
          id: variantId,
          label: frontmatter.variant ? String(frontmatter.variant) : variantId
        }
      : null,
    // The page's copy variants, [{ id, label, contentFile, page }]; filled
    // in below for the default copy, always empty on a variant
    copyVariants: [],
    serviceName: entry.serviceName || frontmatter.serviceName,
    type,
    layout,
    field,
    sessionKey,
    remember,
    template,
    changeable: Boolean(entry.changeable),
    handler: entry.handler,
    guard: entry.guard,
    next,
    back,
    clears,
    set: entry.set,
    store: entry.store,
    accept: entry.accept || frontmatter.accept,
    maxSize: entry.maxSize,
    min: entry.min !== undefined ? entry.min : frontmatter.min,
    max: entry.max !== undefined ? entry.max : frontmatter.max,
    preview: entry.preview || frontmatter.preview || {},
    research,
    content: {
      title: frontmatter.title || heading || bodyHeading || id,
      heading: heading || bodyHeading || frontmatter.title || id,
      headingInBody: heading === null && Boolean(bodyHeading),
      // Grey text above the heading ("Register Defra account")
      caption: frontmatter.caption,
      // Radios: body copy sits between the heading and the options rather
      // than after them (the heading leaves the fieldset legend)
      bodyFirst: Boolean(frontmatter.bodyFirst),
      hint: frontmatter.hint,
      // The label and placeholder of a `type: select` page's dropdown (the
      // heading is an h1)
      label: frontmatter.label,
      placeholder: frontmatter.placeholder,
      options,
      errors,
      button: frontmatter.button || 'Continue',
      inputType: frontmatter.inputType,
      width: frontmatter.width,
      autocomplete: frontmatter.autocomplete,
      spellcheck: frontmatter.spellcheck,
      fields,
      rows: expandRows(frontmatter.rows, journey, where, problems),
      actions: frontmatter.actions || [],
      panel: frontmatter.panel,
      // Named strings a hand-written template (type: custom) renders itself
      text: frontmatter.text || {},
      body: bodyMarkdown
    }
  }
  if (!variantId) {
    page.copyVariants = buildCopyVariants(
      entry,
      journey,
      problems,
      page,
      pageFile
    )
  }
  return page
}

// What comes after `<id>~` in a copy variant's file name
const COPY_VARIANT_ID = /^[a-z0-9-]+$/

/**
 * The copy variants of a page: sibling files named `<id>~<variant>.md` in
 * the folder holding the page's own file (the journey's pages/, or the
 * shared folder for a shared page, which then varies in every journey
 * using it). Each is built from the same journey.yaml entry, so it keeps
 * the page's id, path, rules and session key and only the copy differs;
 * checkCopyOnly refuses a variant that would change the logic.
 *
 * @returns [{ id, label, contentFile, page }] in id order
 */
function buildCopyVariants(entry, journey, problems, page, pageFile) {
  const dir = path.dirname(pageFile)
  if (!fs.existsSync(dir)) {
    return []
  }
  const prefix = `${entry.id}~`
  return fs
    .readdirSync(dir)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.md'))
    .sort()
    .map((name) => {
      const variantId = name.slice(prefix.length, -'.md'.length)
      const where = `pages.${entry.id}~${variantId}`
      if (!COPY_VARIANT_ID.test(variantId)) {
        problems.push(
          `${where}: a variant's name (after the ~) uses lower-case letters, digits and hyphens only`
        )
      }
      const variant = buildPage(entry, journey, problems, {
        file: path.join(dir, name),
        variantId
      })
      checkCopyOnly(page, variant, where, problems)
      return {
        id: variantId,
        label: variant.copyVariant.label,
        contentFile: variant.contentFile,
        page: variant
      }
    })
}

/**
 * A copy variant may reword anything but must not change what the page
 * does: its type, the values its options store (journey.yaml rules compare
 * against those), the fields a form has, or the field and session key its
 * answer is kept under.
 */
function checkCopyOnly(page, variant, where, problems) {
  const list = (items) => (items.length ? items.sort().join(', ') : 'none')
  if (variant.type !== page.type) {
    problems.push(
      `${where}: a variant keeps the page's type ('${page.type}', not '${variant.type}')`
    )
  }
  const values = (p) => p.content.options.map((option) => String(option.value))
  if (list(values(variant)) !== list(values(page))) {
    problems.push(
      `${where}: a variant keeps the options' values (${list(values(page))}); reword the labels, not the values`
    )
  }
  const names = (p) => (p.content.fields || []).map((field) => field.name)
  if (list(names(variant)) !== list(names(page))) {
    problems.push(
      `${where}: a variant keeps the form's fields (${list(names(page))})`
    )
  }
  if (variant.field !== page.field || variant.sessionKey !== page.sessionKey) {
    problems.push(
      `${where}: a variant keeps the page's field and sessionKey; set them in journey.yaml or the default file only`
    )
  }
}

/**
 * `research:` on a page lists user research aids: links the footer shows
 * in their own "User research" section, under the crown, that open in a
 * new tab. They are facilitator shortcuts (the quote email a participant
 * would have received), not part of the flow: the tools page draws one to
 * a page of this journey as a dashed link and ignores the rest. An `href`
 * is a page of this journey (`estimate-email-content`,
 * with any query string), a path into another journey (`/nrf-quote-7/...`)
 * or a full URL. Links open in a new tab unless `newTab: false`, for one
 * the participant is meant to follow in place of the page's own button.
 *
 *   research:
 *     - text: Quote email
 *       href: /nrf-quote-7/estimate-email-content?preview=1
 *     - text: Employee invitation email
 *       href: defra-account-employee-email
 *       newTab: false
 */
function buildResearchLinks(entries, journey, where, problems) {
  if (entries === undefined) {
    return []
  }
  if (!Array.isArray(entries)) {
    problems.push(`${where}.research: expected a list of { text, href }`)
    return []
  }
  return entries.flatMap((link, i) => {
    if (!link || typeof link !== 'object' || !link.text || !link.href) {
      problems.push(`${where}.research[${i}]: needs 'text' and 'href'`)
      return []
    }
    const href = String(link.href)
    const absolute = href.startsWith('/') || /^https?:\/\//.test(href)
    return [
      {
        text: String(link.text),
        href: absolute ? href : `${journey.basePath}/${href}`,
        newTab: link.newTab !== false
      }
    ]
  })
}

function validateTargets(journey, problems) {
  const ids = new Set(journey.pages.map((p) => p.id))
  const check = (target, where) => {
    if (!target) {
      return
    }
    if (target.startsWith('/') || target === SUMMARY_TARGET) {
      return
    }
    if (!ids.has(target)) {
      problems.push(`${where}: unknown page '${target}'`)
    }
  }
  // `return: <page>` on a rule or action that leaves for another journey:
  // the borrowed page comes back here, usually to a summary page but a
  // Delete link can bring its Cancel back to the page it was on (see
  // "Borrowing a page from another journey" in content/README.md)
  const checkReturn = (rule, where) => {
    if (!rule || rule.return === undefined) {
      return
    }
    if (!ids.has(rule.return)) {
      problems.push(`${where}.return: unknown page '${rule.return}'`)
    }
    if (!rule.goto || !rule.goto.startsWith('/')) {
      problems.push(
        `${where}.return: only applies to a 'goto' that leaves for another journey (an absolute path)`
      )
    }
  }
  if (!ids.has(journey.start)) {
    problems.push(`start: unknown page '${journey.start}'`)
  }
  for (const id of journey.summaryPages) {
    if (!ids.has(id)) {
      problems.push(`summaryPages: unknown page '${id}'`)
    }
  }
  for (const page of journey.pages) {
    const where = `pages.${page.id}`
    ;(page.next || []).forEach((rule, i) => {
      check(rule.goto, `${where}.next[${i}]`)
      checkReturn(rule, `${where}.next[${i}]`)
    })
    if (typeof page.back === 'string') {
      check(page.back, `${where}.back`)
    } else {
      ;(page.back || []).forEach((rule, i) =>
        check(rule.goto, `${where}.back[${i}]`)
      )
    }
    if (page.guard) {
      check(page.guard.redirect, `${where}.guard.redirect`)
    }
    page.content.rows.forEach((row, i) => {
      if (typeof row.change === 'string') {
        check(row.change, `${where}.rows[${i}].change`)
      } else if (Array.isArray(row.change)) {
        row.change.forEach((rule, j) =>
          check(rule.goto, `${where}.rows[${i}].change[${j}]`)
        )
      }
    })
    page.content.actions.forEach((action, i) => {
      check(action.goto, `${where}.actions[${i}].goto`)
      checkReturn(action, `${where}.actions[${i}]`)
    })
  }
}

/**
 * The answers a journey branches on must be answers its pages can give.
 *
 * Copy lives in the page files and logic in journey.yaml, so a reworded
 * option label must never change where the journey goes. Every option on a
 * radios or checkboxes page stores its `value` (through `store:` when there
 * is one), and here every condition that compares such an answer with a
 * literal (`equals`, `notEquals`, `in`, `notIn`) is checked against the
 * values those pages can store, along with `store:` keys, `set:` values and
 * the preview's sample answers. Keys no choice page writes (hooks, `set:`
 * only, `$` engine values, dotted paths into objects) are left alone, as are
 * `select` pages: their lists are fixtures (addresses), not branches.
 */
const CHOICE_TYPES = ['radios', 'checkboxes']
const VALUE_OPERATORS = ['equals', 'notEquals', 'in', 'notIn']

function validateChoiceValues(journey, problems) {
  const list = (values) => [...values].map((v) => `'${v}'`).join(', ')
  const storedValue = (page, value) =>
    page.store && Object.prototype.hasOwnProperty.call(page.store, value)
      ? page.store[value]
      : value

  // sessionKey -> { values: Set<string>, pages: [id] }
  const choices = new Map()
  for (const page of journey.pages) {
    if (!CHOICE_TYPES.includes(page.type) || !page.sessionKey) {
      continue
    }
    const entry = choices.get(page.sessionKey) || {
      values: new Set(),
      pages: []
    }
    entry.pages.push(page.id)
    for (const option of page.content.options) {
      entry.values.add(String(storedValue(page, option.value)))
    }
    choices.set(page.sessionKey, entry)

    const optionValues = page.content.options.map((o) => String(o.value))
    for (const key of Object.keys(page.store || {})) {
      if (!optionValues.includes(String(key))) {
        problems.push(
          `pages.${page.id}.store: '${key}' matches no option in ${page.contentFile} (the options' values are ${list(optionValues)})`
        )
      }
    }
  }

  // `set:` on a page or a rule can put other values in a tracked key
  for (const page of journey.pages) {
    const sets = [page.set, ...(page.next || []).map((rule) => rule.set)]
    for (const set of sets) {
      for (const [key, value] of Object.entries(set || {})) {
        if (choices.has(key)) {
          choices.get(key).values.add(String(value))
        }
      }
    }
  }

  const check = (condition, where) => {
    if (!condition || typeof condition !== 'object') {
      return
    }
    for (const comb of ['all', 'any']) {
      if (Array.isArray(condition[comb])) {
        condition[comb].forEach((c, i) => check(c, `${where}.${comb}[${i}]`))
        return
      }
    }
    if (condition.not) {
      check(condition.not, `${where}.not`)
      return
    }
    const key = condition.key
    if (
      typeof key !== 'string' ||
      key.startsWith('$') ||
      key.includes('.') ||
      !choices.has(key)
    ) {
      return
    }
    const { values, pages } = choices.get(key)
    for (const op of VALUE_OPERATORS) {
      if (condition[op] === undefined) {
        continue
      }
      for (const literal of [].concat(condition[op])) {
        if (!values.has(String(literal))) {
          problems.push(
            `${where}: '${key}' is compared with '${literal}' but no option on ${pages.join(', ')} can store it (the options store ${list(values)})`
          )
        }
      }
    }
  }

  for (const page of journey.pages) {
    const where = `pages.${page.id}`
    ;(page.next || []).forEach((rule, i) =>
      check(rule.when, `${where}.next[${i}].when`)
    )
    if (Array.isArray(page.back)) {
      page.back.forEach((rule, i) =>
        check(rule.when, `${where}.back[${i}].when`)
      )
    }
    if (page.guard) {
      const { redirect, ...condition } = page.guard
      check(condition, `${where}.guard`)
    }
    page.content.rows.forEach((row, i) => {
      check(row.when, `${where}.rows[${i}].when`)
      let value = row.value
      while (value && typeof value === 'object' && value.when) {
        check(value.when, `${where}.rows[${i}].value.when`)
        value = value.else
      }
      if (Array.isArray(row.change)) {
        row.change.forEach((rule, j) =>
          check(rule.when, `${where}.rows[${i}].change[${j}].when`)
        )
      }
      if (row.changeHidden && typeof row.changeHidden === 'object') {
        check(row.changeHidden.when, `${where}.rows[${i}].changeHidden.when`)
      }
    })
    for (const match of page.content.body.matchAll(/^:{3,}if\s+(.+)$/gm)) {
      check(parseIfParams(match[1]), `${page.contentFile} ':::if ${match[1]}'`)
    }
  }

  // The sample answers stand in for real ones in preview and ?errors=false
  const sample = (journey.preview && journey.preview.data) || {}
  for (const [key, value] of Object.entries(sample)) {
    if (choices.has(key) && !choices.get(key).values.has(String(value))) {
      const { values, pages } = choices.get(key)
      problems.push(
        `preview.data.${key}: '${value}' is not an answer ${pages.join(', ')} can store (the options store ${list(values)})`
      )
    }
  }
}

function build(journeyId, options = {}) {
  const contentDir = options.contentDir || CONTENT_DIR
  const dir = journeyDir(journeyId, contentDir)
  const yamlFile = path.join(dir, 'journey.yaml')
  if (!fs.existsSync(yamlFile)) {
    throw new Error(`Journey '${journeyId}' not found (no ${yamlFile})`)
  }
  const raw = yaml.load(fs.readFileSync(yamlFile, 'utf8')) || {}
  const problems = []

  // One summary page (`summaryPage`) or several (`summaryPages`); the first
  // stays on `summaryPage` for code and content that only know about one
  const summaryPages = []
    .concat(raw.summaryPages || raw.summaryPage || [])
    .filter(Boolean)
  if (raw.signedIn !== undefined) {
    problems.push(...validateCondition(raw.signedIn, 'signedIn'))
  }
  if (raw.layout !== undefined && !LAYOUTS.includes(raw.layout)) {
    problems.push(
      `layout: unknown layout '${raw.layout}' (expected one of ${LAYOUTS.join(', ')})`
    )
  }

  const journey = {
    id: raw.id || journeyId,
    // A frozen copy is mounted somewhere other than the journey's own path
    basePath: options.basePath || raw.basePath || `/${raw.id || journeyId}`,
    // Where this definition was read from (content/, or a snapshot folder)
    contentDir,
    name: raw.name || journeyId,
    serviceName: raw.serviceName || raw.name || journeyId,
    start: raw.start || 'start',
    summaryPage: summaryPages[0],
    summaryPages,
    // Condition (see expressions.js) for showing the signed-in header state
    signedIn: raw.signedIn,
    session: raw.session || [],
    preview: raw.preview || { data: {} },
    // Homepage card metadata (family, version, status, description, changes).
    // Read by app/config/shared/journeys.js; the engine itself ignores it.
    homepage: raw.homepage || {},
    // The layout every page wears unless it names its own (see LAYOUTS)
    layout: raw.layout,
    // The staff layout's header: the organisation under the user's name, and
    // the links in its account and Menu panels (see staff-header.html)
    header: raw.header || {},
    // Titles for the groups the tools page carves out (`groups: { one-login:
    // { title: GOV.UK One Login } }`); see flow.js journeyGroups()
    groups: raw.groups || {},
    pages: [],
    byId: new Map(),
    routes: {}
  }

  if (!Array.isArray(raw.pages) || raw.pages.length === 0) {
    problems.push('pages: journey.yaml needs a non-empty list of pages')
  } else {
    raw.pages.forEach((entry, i) => {
      if (!entry || !entry.id) {
        problems.push(`pages[${i}]: needs an 'id'`)
        return
      }
      if (journey.byId.has(entry.id)) {
        problems.push(`pages[${i}]: duplicate id '${entry.id}'`)
        return
      }
      const page = buildPage(entry, journey, problems)
      journey.pages.push(page)
      journey.byId.set(page.id, page)
      journey.routes[upperSnake(page.id)] = page.path
    })
  }

  validateTargets(journey, problems)
  validateChoiceValues(journey, problems)

  const pagesDir = path.join(dir, 'pages')
  if (fs.existsSync(pagesDir)) {
    for (const name of fs.readdirSync(pagesDir)) {
      if (!name.endsWith('.md')) {
        continue
      }
      const id = name.replace(/\.md$/, '')
      // `<id>~<variant>.md` is a copy variant of <id> (see buildCopyVariants)
      const [base, variant] = id.split('~')
      if (variant !== undefined && !journey.byId.has(base)) {
        console.warn(
          `⚠ journey '${journeyId}': pages/${name} varies a page that is not listed in journey.yaml`
        )
      } else if (variant === undefined && !journey.byId.has(id)) {
        console.warn(
          `⚠ journey '${journeyId}': pages/${name} is not listed in journey.yaml and has no route`
        )
      }
    }
  }

  if (problems.length) {
    throw new Error(
      `Journey '${journeyId}' has ${problems.length} problem(s):\n  - ${problems.join('\n  - ')}`
    )
  }
  return journey
}

/**
 * Load (and cache) a journey definition. `options.contentDir` reads the
 * journey from another folder laid out like content/ (a handoff snapshot)
 * and `options.basePath` mounts it somewhere other than its own path; both
 * are left out for the live journey.
 */
function loadJourney(journeyId, options = {}) {
  const contentDir = options.contentDir || CONTENT_DIR
  const signature = signatureFor(journeyId, contentDir)
  // Two handoff dates can share a commit, so the mount path is in the key
  const key = `${contentDir}::${options.basePath || ''}::${journeyId}`
  const cached = cache.get(key)
  if (cached && cached.signature === signature) {
    return cached.journey
  }
  const journey = build(journeyId, { contentDir, basePath: options.basePath })
  // Preserve routes registered by hooks across content reloads
  if (cached) {
    Object.assign(journey.routes, cached.journey.hookRoutes || {})
    journey.hookRoutes = cached.journey.hookRoutes
  }
  cache.set(key, { signature, journey })
  return journey
}

/**
 * Ids of every journey directory under content/ that has a journey.yaml.
 */
/**
 * The option labels of every choice answer, across every journey (a page
 * borrowed from another journey shows that journey's answers):
 * { planningType: { full: 'Full planning permission', … }, … }. The copy
 * renderer uses it so `{{ planningType }}` reads as the option the user
 * chose rather than the short value the session stores.
 */
function answerLabels() {
  const labels = {}
  for (const id of getJourneyIds()) {
    for (const page of loadJourney(id).pages) {
      if (!CHOICE_TYPES.includes(page.type) || !page.sessionKey) {
        continue
      }
      const forKey = labels[page.sessionKey] || {}
      for (const option of page.content.options) {
        const stored =
          page.store &&
          Object.prototype.hasOwnProperty.call(page.store, option.value)
            ? page.store[option.value]
            : option.value
        forKey[String(stored)] = option.label
      }
      labels[page.sessionKey] = forKey
    }
  }
  return labels
}

function getJourneyIds() {
  if (!fs.existsSync(CONTENT_DIR)) {
    return []
  }
  return fs
    .readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        fs.existsSync(path.join(CONTENT_DIR, entry.name, 'journey.yaml'))
    )
    .map((entry) => entry.name)
}

/**
 * The journey and page an absolute path names, provided that page is one of
 * a mounted journey's pages. This is how a `nav` that points into another
 * journey is checked before it is ever used as a redirect or back link: a
 * path that is not a mounted journey's page resolves to null, so `nav` can
 * never send the user outside the mounted journeys.
 */
function resolveSummaryPath(target) {
  if (typeof target !== 'string' || !target.startsWith('/')) {
    return null
  }
  for (const id of getJourneyIds()) {
    let journey
    try {
      journey = loadJourney(id)
    } catch (error) {
      continue
    }
    if (!target.startsWith(`${journey.basePath}/`)) {
      continue
    }
    const pageId = target.slice(journey.basePath.length + 1)
    if (journey.byId.has(pageId)) {
      return { journey, page: journey.byId.get(pageId) }
    }
  }
  return null
}

/**
 * ROUTES / TEMPLATES constants in the shape the rest of the repo expects
 * (see app/config/<journey>/routes.js in hand-written journeys).
 */
function getRouteConstants(journeyId) {
  const journey = loadJourney(journeyId)
  const ROUTES = { BASE: journey.basePath, ...journey.routes }
  const TEMPLATES = {}
  for (const page of journey.pages) {
    TEMPLATES[upperSnake(page.id)] = page.template
  }
  return { BASE_PATH: journey.basePath, ROUTES, TEMPLATES }
}

module.exports = {
  CONTENT_DIR,
  SHARED_DIR,
  SHARED_PAGES_DIR,
  TYPES,
  QUESTION_TYPES,
  LAYOUTS,
  SUMMARY_TARGET,
  isQuestionType,
  hasCheckAnswersCheckboxes,
  camelCase,
  upperSnake,
  parseMarkdownFile,
  loadJourney,
  getJourneyIds,
  resolveSummaryPath,
  getRouteConstants,
  validateChoiceValues,
  answerLabels
}
