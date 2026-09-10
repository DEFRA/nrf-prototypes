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
const { extractHeading } = require('./markdown')

const CONTENT_DIR = path.join(__dirname, '../../../content')
// Pages marked `shared: true` in journey.yaml read their copy from here, so
// several journeys can start on the same page without duplicating it
const SHARED_PAGES_DIR = path.join(CONTENT_DIR, 'shared', 'pages')

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
  'file-upload',
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
  'file-upload': 'journey-engine/file-upload',
  'check-answers': 'journey-engine/check-answers',
  confirmation: 'journey-engine/confirmation',
  document: 'journey-engine/document'
}

// How a page is dressed: the prototype header and phase banner (default), the
// GOV.UK One Login look for the mock sign-in pages, or a full-width document
// with a bare crown header and no banner or back link (certificates, letters)
const LAYOUTS = ['default', 'one-login', 'document']

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

function journeyDir(journeyId) {
  return path.join(CONTENT_DIR, journeyId)
}

function signatureFor(dir) {
  const files = [path.join(dir, 'journey.yaml')]
  // Shared pages count for every journey, so an edit to one reloads them all
  for (const pagesDir of [path.join(dir, 'pages'), SHARED_PAGES_DIR]) {
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
 * { name, key, label, hint, optional, autocomplete, classes, errors }; the
 * answers are stored together as one object under the page's sessionKey,
 * keyed by `key` (camelCase of the field name).
 */
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
      errors: f.errors || {}
    }
  })
}

function buildPage(entry, journey, problems) {
  const id = entry.id
  const where = `pages.${id}`
  const shared = Boolean(entry.shared)
  const localFile = path.join(journeyDir(journey.id), 'pages', `${id}.md`)
  const pageFile = shared ? path.join(SHARED_PAGES_DIR, `${id}.md`) : localFile
  const contentFile = path.relative(path.dirname(CONTENT_DIR), pageFile)
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
    problems.push(`${where}: missing shared content file shared/pages/${id}.md`)
  } else {
    problems.push(`${where}: missing content file pages/${id}.md`)
  }
  if (shared && fs.existsSync(localFile)) {
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
      `${where}: type '${entry.type}' in journey.yaml disagrees with '${frontmatter.type}' in pages/${id}.md`
    )
  }

  const field = entry.field || frontmatter.field
  if (isQuestionType(type) && type !== 'form' && !field) {
    problems.push(`${where}: '${type}' pages need a 'field'`)
  }

  const layout =
    entry.layout ||
    frontmatter.layout ||
    (type === 'document' ? 'document' : 'default')
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
  let sessionKey =
    entry.sessionKey ||
    frontmatter.sessionKey ||
    (field ? camelCase(field) : undefined)
  if (type === 'form' && !sessionKey) {
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

  return {
    id,
    path: `${journey.basePath}/${id}`,
    shared,
    contentFile,
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
    content: {
      title: frontmatter.title || heading || bodyHeading || id,
      heading: heading || bodyHeading || frontmatter.title || id,
      headingInBody: heading === null && Boolean(bodyHeading),
      hint: frontmatter.hint,
      options,
      errors,
      button: frontmatter.button || 'Continue',
      inputType: frontmatter.inputType,
      width: frontmatter.width,
      autocomplete: frontmatter.autocomplete,
      spellcheck: frontmatter.spellcheck,
      fields,
      rows: frontmatter.rows || [],
      actions: frontmatter.actions || [],
      panel: frontmatter.panel,
      // Named strings a hand-written template (type: custom) renders itself
      text: frontmatter.text || {},
      body: bodyMarkdown
    }
  }
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
  // `return: <summary page>` on a rule or action that leaves for another
  // journey: the borrowed page comes back here (see "Borrowing a page from
  // another journey" in content/README.md)
  const checkReturn = (rule, where) => {
    if (!rule || rule.return === undefined) {
      return
    }
    if (!journey.summaryPages.includes(rule.return)) {
      problems.push(
        `${where}.return: '${rule.return}' is not one of summaryPages`
      )
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

function build(journeyId) {
  const dir = journeyDir(journeyId)
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

  const journey = {
    id: raw.id || journeyId,
    basePath: raw.basePath || `/${raw.id || journeyId}`,
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

  const pagesDir = path.join(dir, 'pages')
  if (fs.existsSync(pagesDir)) {
    for (const name of fs.readdirSync(pagesDir)) {
      const id = name.replace(/\.md$/, '')
      if (name.endsWith('.md') && !journey.byId.has(id)) {
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
 * Load (and cache) a journey definition.
 */
function loadJourney(journeyId) {
  const signature = signatureFor(journeyDir(journeyId))
  const cached = cache.get(journeyId)
  if (cached && cached.signature === signature) {
    return cached.journey
  }
  const journey = build(journeyId)
  // Preserve routes registered by hooks across content reloads
  if (cached) {
    Object.assign(journey.routes, cached.journey.hookRoutes || {})
    journey.hookRoutes = cached.journey.hookRoutes
  }
  cache.set(journeyId, { signature, journey })
  return journey
}

/**
 * Ids of every journey directory under content/ that has a journey.yaml.
 */
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
 * the journey's summary pages. This is how a `nav` that points into another
 * journey is checked before it is ever used as a redirect or back link: a
 * path that is not a mounted journey's summary page resolves to null.
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
    if (journey.summaryPages.includes(pageId)) {
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
  SHARED_PAGES_DIR,
  TYPES,
  QUESTION_TYPES,
  LAYOUTS,
  SUMMARY_TARGET,
  isQuestionType,
  camelCase,
  upperSnake,
  parseMarkdownFile,
  loadJourney,
  getJourneyIds,
  resolveSummaryPath,
  getRouteConstants
}
