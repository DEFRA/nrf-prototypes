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

const TYPES = [
  'start',
  'content',
  'radios',
  'checkboxes',
  'input',
  'number',
  'email',
  'file-upload',
  'check-answers',
  'confirmation',
  'custom'
]

const QUESTION_TYPES = [
  'radios',
  'checkboxes',
  'input',
  'number',
  'email',
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
  'file-upload': 'journey-engine/file-upload',
  'check-answers': 'journey-engine/check-answers',
  confirmation: 'journey-engine/confirmation'
}

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
  const pagesDir = path.join(dir, 'pages')
  if (fs.existsSync(pagesDir)) {
    for (const name of fs.readdirSync(pagesDir)) {
      files.push(path.join(pagesDir, name))
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

function buildPage(entry, journey, problems) {
  const id = entry.id
  const where = `pages.${id}`
  const pageFile = path.join(journeyDir(journey.id), 'pages', `${id}.md`)
  let frontmatter = {}
  let body = ''
  if (fs.existsSync(pageFile)) {
    const parsed = parseMarkdownFile(
      fs.readFileSync(pageFile, 'utf8'),
      pageFile
    )
    frontmatter = parsed.frontmatter
    body = parsed.body
  } else {
    problems.push(`${where}: missing content file pages/${id}.md`)
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
  if (isQuestionType(type) && !field) {
    problems.push(`${where}: '${type}' pages need a 'field'`)
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
    type,
    field,
    sessionKey: entry.sessionKey || (field ? camelCase(field) : undefined),
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
      rows: frontmatter.rows || [],
      actions: frontmatter.actions || [],
      panel: frontmatter.panel,
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
    if (target.startsWith('/')) {
      return
    }
    if (!ids.has(target)) {
      problems.push(`${where}: unknown page '${target}'`)
    }
  }
  if (!ids.has(journey.start)) {
    problems.push(`start: unknown page '${journey.start}'`)
  }
  if (journey.summaryPage && !ids.has(journey.summaryPage)) {
    problems.push(`summaryPage: unknown page '${journey.summaryPage}'`)
  }
  for (const page of journey.pages) {
    const where = `pages.${page.id}`
    ;(page.next || []).forEach((rule, i) =>
      check(rule.goto, `${where}.next[${i}]`)
    )
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
    page.content.actions.forEach((action, i) =>
      check(action.goto, `${where}.actions[${i}].goto`)
    )
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

  const journey = {
    id: raw.id || journeyId,
    basePath: raw.basePath || `/${raw.id || journeyId}`,
    name: raw.name || journeyId,
    serviceName: raw.serviceName || raw.name || journeyId,
    start: raw.start || 'start',
    summaryPage: raw.summaryPage,
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
  TYPES,
  QUESTION_TYPES,
  isQuestionType,
  camelCase,
  upperSnake,
  parseMarkdownFile,
  loadJourney,
  getJourneyIds,
  getRouteConstants
}
