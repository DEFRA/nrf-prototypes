/**
 * Journey engine: Express router factory
 *
 * Mounts one dispatcher under the journey's basePath. Every request re-loads
 * the definition (cheap, mtime-cached) and resolves the page by path, so copy
 * edits, rule changes and added or removed pages in content/ all show up
 * without a restart. Only the basePath and hook routes are fixed at boot.
 *
 * Hooks (`app/lib/<journey>/hooks.js`) give a page imperative behaviour:
 *   hooks[pageId] = {
 *     routes(router, journey) → { NAME: path }   extra endpoints, run once
 *     load(ctx)               → { redirect }?     before the page is built, e.g.
 *                                                 to put data in the session
 *     get(ctx, model)         → { redirect }?     enrich the render model
 *     validate(ctx)           → { ok, value | error }
 *     process(ctx, value)     → { redirect | error }?  after validation
 *   }
 */

const multer = require('multer')
const { evaluate, firstMatch, isTruthy } = require('./expressions')
const { validatePage, previewErrors, message } = require('./validation')
const { resolveBackLink, toPath } = require('./back-link')
const { createRenderer } = require('./markdown')
const {
  loadJourney,
  resolveSummaryPath,
  isQuestionType,
  SUMMARY_TARGET
} = require('./loader')

const renderer = createRenderer()

// Query and hidden-input names the engine uses for control flow. The kit's
// autoStoreData copies every query param and body field into the session,
// so these are removed again on every request.
const ENGINE_KEYS = [
  'preview',
  'change',
  'nav',
  'error',
  'variant',
  'isChange',
  'navFromSummary'
]

function scrub(sessionData) {
  for (const key of ENGINE_KEYS) {
    delete sessionData[key]
  }
}

/**
 * Sample answers for a page: the journey's `preview.data`, then the page's
 * own `preview.data` (or a bare `preview:` map of answers), then the named
 * variant's `data` when `?variant=<id>` is set. Variants show alternative
 * states of one screen on the wall (an upload that failed, say).
 */
function previewData(journey, page, variantId) {
  const base = (journey.preview && journey.preview.data) || {}
  const pagePreview = page.preview || {}
  const structured = 'data' in pagePreview || 'variants' in pagePreview
  const override = structured ? pagePreview.data || {} : pagePreview
  const variant = variantId
    ? (pagePreview.variants || []).find((item) => item.id === variantId)
    : null
  const variantData = (variant && variant.data) || {}
  return JSON.parse(JSON.stringify({ ...base, ...override, ...variantData }))
}

function parseSize(value) {
  if (!value) {
    return 2 * 1024 * 1024
  }
  if (typeof value === 'number') {
    return value
  }
  const match = String(value).match(/^(\d+(?:\.\d+)?)\s*(kb|mb|gb)?$/i)
  if (!match) {
    return 2 * 1024 * 1024
  }
  const units = { kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 }
  return Math.round(
    parseFloat(match[1]) * (units[(match[2] || 'mb').toLowerCase()] || 1)
  )
}

function buildContext(req, res, journey, page, options = {}) {
  req.session = req.session || {}
  req.session.data = req.session.data || {}
  scrub(req.session.data)
  const query = req.query || {}
  const body = req.body || {}
  const preview =
    !options.isPost && ['1', 'true'].includes(String(query.preview))
  const isChange = query.change === 'true' || body.isChange === 'true'
  // The summary page to return to (`?nav=...` or the hidden input a form
  // carries forward), or false: the id of one of this journey's summary
  // pages, or the absolute path of another journey's summary page when this
  // page has been borrowed by that journey (a Change link on its summary
  // page pointing here). A bare `true` from an older form means the
  // journey's first summary page. Anything else is ignored, so `nav` can
  // never redirect outside the mounted journeys.
  const nav = query.nav || body.navFromSummary
  let navFromSummary = false
  let returnJourney = null
  if (nav === 'true' && journey.summaryPage) {
    navFromSummary = journey.summaryPage
  } else if (nav && journey.summaryPages.includes(nav)) {
    navFromSummary = nav
  } else if (nav && String(nav).startsWith('/')) {
    const found = resolveSummaryPath(String(nav))
    if (found) {
      navFromSummary = String(nav)
      returnJourney = found.journey
    }
  }
  return {
    req,
    res,
    journey,
    page,
    data: preview
      ? previewData(journey, page, query.variant)
      : req.session.data,
    body,
    file: req.file,
    query,
    preview,
    previewError: preview && ['1', 'true'].includes(String(query.error)),
    variant: preview && query.variant ? String(query.variant) : null,
    isChange,
    navFromSummary,
    // The journey that borrowed this page, when navFromSummary is a path
    // into another journey; its header is shown instead of this journey's
    returnJourney
  }
}

/**
 * Append the way back to a URL that leaves for another journey: `nav` is the
 * absolute path of the summary page to return to, so the borrowed page's
 * Back link, `$summary` and Cancel all come back here.
 */
function withReturn(url, returnTo, journey) {
  const returnPath = toPath(returnTo, journey)
  if (!url || !returnPath) {
    return url
  }
  return `${url}${url.includes('?') ? '&' : '?'}nav=${returnPath}`
}

/**
 * A change detour (reached from a summary page with ?change=true&nav=...)
 * that moves on to another page of this journey keeps its way back, so the
 * detour can chain across several pages before returning. Summary pages and
 * pages that end the flow are left alone.
 */
function withChangeDetour(url, target, ctx) {
  const { journey } = ctx
  const continuesFlow = target && target.next && target.next.length > 0
  if (
    !url ||
    !target ||
    !ctx.navFromSummary ||
    journey.summaryPages.includes(target.id) ||
    !continuesFlow
  ) {
    return url
  }
  const params = []
  if (ctx.isChange) {
    params.push('change=true')
  }
  params.push(`nav=${ctx.navFromSummary}`)
  return `${url}${url.includes('?') ? '&' : '?'}${params.join('&')}`
}

function storedValueFor(page, optionValue) {
  if (
    page.store &&
    Object.prototype.hasOwnProperty.call(page.store, optionValue)
  ) {
    return page.store[optionValue]
  }
  return optionValue
}

function isChecked(page, option, data) {
  const current = data[page.sessionKey]
  if (current === undefined || current === null || current === '') {
    return false
  }
  const expected = storedValueFor(page, option.value)
  if (Array.isArray(current)) {
    return current.some((v) => String(v) === String(expected))
  }
  return String(current) === String(expected)
}

function resolveRow(row, ctx) {
  const { journey, data, page } = ctx
  // `- heading: Development details` starts a new group of rows
  if (row.heading && row.key === undefined) {
    return {
      heading: renderer.interpolate(row.heading, data, { escape: false })
    }
  }
  const key = renderer.interpolate(row.key, data, { escape: false })
  const result = { key: { text: key } }
  if (row.value && typeof row.value === 'object' && row.value.lines) {
    // Multi-line value (an address): each line escaped, empties dropped
    const lines = row.value.lines
      .map((line) => renderer.interpolate(line, data))
      .filter((line) => line.trim() !== '')
    result.value = { html: lines.join('<br>') }
  } else if (row.value && typeof row.value === 'object') {
    const chosen = evaluate(row.value.when, ctx)
      ? row.value.then
      : row.value.else
    result.value = {
      text: renderer.interpolate(chosen, data, { escape: false })
    }
  } else {
    result.value = {
      text: renderer.interpolate(row.value, data, { escape: false })
    }
  }
  let changeTarget
  if (typeof row.change === 'string') {
    changeTarget = row.change
  } else if (Array.isArray(row.change)) {
    const rule = firstMatch(row.change, ctx)
    changeTarget = rule ? rule.goto : undefined
  }
  if (changeTarget) {
    const base = toPath(changeTarget, journey)
    const params = ['change=true']
    // Come back to this summary page if it is one, else the journey's first.
    // A page borrowed from another journey needs the full path to find it.
    const returnTo =
      page && journey.summaryPages.includes(page.id)
        ? page.id
        : journey.summaryPage
    if (returnTo && changeTarget.startsWith('/')) {
      params.push(`nav=${toPath(returnTo, journey)}`)
    } else if (returnTo) {
      params.push(`nav=${returnTo}`)
    }
    result.actions = {
      items: [
        {
          href: `${base}?${params.join('&')}`,
          text: 'Change',
          visuallyHiddenText: resolveHiddenText(row.changeHidden, ctx) || key
        }
      ]
    }
  }
  return result
}

/**
 * `changeHidden` is a string, or `{ when, then, else }` when the hidden text
 * depends on the answer (an uploaded versus a drawn boundary)
 */
function resolveHiddenText(changeHidden, ctx) {
  if (changeHidden && typeof changeHidden === 'object') {
    return evaluate(changeHidden.when, ctx)
      ? changeHidden.then
      : changeHidden.else
  }
  return changeHidden
}

/**
 * Split resolved summary rows into groups at each `heading` entry, so a
 * check-your-answers page can carry several titled summary lists.
 */
function groupRows(rows) {
  const groups = [{ heading: undefined, rows: [] }]
  for (const row of rows) {
    if (row.heading !== undefined && row.key === undefined) {
      groups.push({ heading: row.heading, rows: [] })
    } else {
      groups[groups.length - 1].rows.push(row)
    }
  }
  return groups.filter((group) => group.rows.length || group.heading)
}

function renderContent(page, ctx) {
  const { data, journey } = ctx
  const c = page.content
  const plain = (text) => renderer.interpolate(text, data, { escape: false })
  const rows = (c.rows || []).map((row) => resolveRow(row, ctx))
  return {
    title: plain(c.title),
    heading: plain(c.heading),
    headingInBody: c.headingInBody,
    caption: c.caption ? plain(c.caption) : undefined,
    hint: c.hint ? plain(c.hint) : undefined,
    label: c.label ? plain(c.label) : undefined,
    placeholder: c.placeholder ? plain(c.placeholder) : undefined,
    html: renderer.render(c.body, ctx),
    button: c.button,
    inputType: c.inputType,
    width: c.width,
    autocomplete: c.autocomplete,
    spellcheck: c.spellcheck,
    errors: c.errors,
    // Named strings a custom template renders itself (`text:` frontmatter)
    text: c.text || {},
    items: (c.options || []).map((option) => {
      const item = {
        text: plain(option.label),
        value: option.value,
        checked: isChecked(page, option, data)
      }
      if (option.hint) {
        item.hint = { text: plain(option.hint) }
      }
      return item
    }),
    fields: (c.fields || []).map((field) => ({
      ...field,
      label: plain(field.label),
      hint: field.hint ? plain(field.hint) : undefined
    })),
    rows: rows.filter((row) => row.key),
    rowGroups: groupRows(rows),
    // A link action may leave for another journey (`goto: /other/page`)
    // and carry the way back (`return: <summary page>`); `$summary` works
    // here too, so a Cancel link returns to whichever summary page the
    // user came from. A link to a page of this journey keeps a change
    // detour going ("Enter the address manually" from the postcode page).
    actions: (c.actions || []).map((action) => ({
      text: plain(action.text),
      kind: action.kind || 'submit',
      href: action.goto
        ? withReturn(
            withChangeDetour(
              toPath(action.goto, journey, ctx),
              journey.byId.get(action.goto),
              ctx
            ),
            action.return,
            journey
          )
        : undefined,
      hidden: action.hidden
    })),
    panel: c.panel
      ? { title: plain(c.panel.title), body: plain(c.panel.body) }
      : undefined
  }
}

function buildModel(ctx, extra = {}) {
  const { journey, page } = ctx
  // `errors` lists one problem per field (form pages); `error` is the single
  // message every other question type shows
  let errors = extra.errors
  if (!errors && ctx.previewError && page.type === 'form') {
    errors = previewErrors(page)
  }
  const error =
    extra.error ||
    (errors && errors.length ? errors[0].message : undefined) ||
    (ctx.previewError ? message(page, 'required') : undefined)
  // A page borrowed by another journey (reached from its summary page with
  // the way back in `nav`) wears that journey's header: its service name and
  // signed-in state, so the user does not see the service change under them.
  // Everything else (basePath, hook routes, rules) stays this journey's.
  const chrome = ctx.returnJourney || journey
  return {
    journey: {
      id: journey.id,
      basePath: journey.basePath,
      name: journey.name,
      // A page can carry its own service name (the shared start page says
      // "Manage ..." before the journey's own name takes over)
      serviceName: page.serviceName || chrome.serviceName,
      // Where the header's own links (Change organisation) point
      chromeBasePath: chrome.basePath,
      summaryPage: journey.summaryPage,
      summaryPages: journey.summaryPages,
      start: journey.start
    },
    page: {
      id: page.id,
      path: page.path,
      type: page.type,
      layout: page.layout,
      field: page.field,
      sessionKey: page.sessionKey,
      changeable: page.changeable,
      accept: page.accept
    },
    data: ctx.data,
    content: renderContent(page, ctx),
    backLink: resolveBackLink(page, journey, ctx),
    error,
    errors,
    errorHref: page.field || 'main-content',
    // The header shows Sign out (and the agent's organisation) when the
    // journey's `signedIn` condition holds
    signedIn: chrome.signedIn ? evaluate(chrome.signedIn, ctx) : false,
    account: ctx.data.account,
    isChange: ctx.isChange,
    navFromSummary: ctx.navFromSummary,
    preview: ctx.preview,
    variant: ctx.variant,
    routes: journey.routes,
    ...extra
  }
}

function saveAndRedirect(req, res, url) {
  if (req.session && typeof req.session.save === 'function') {
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err)
      }
      res.redirect(303, url)
    })
    return
  }
  res.redirect(303, url)
}

function hasPost(page) {
  return Boolean(
    (page.next && page.next.length) ||
      page.handler === 'custom' ||
      isQuestionType(page.type)
  )
}

const uploads = new Map()

function uploadFor(page) {
  const key = `${page.field}|${page.maxSize || ''}`
  if (!uploads.has(key)) {
    uploads.set(
      key,
      multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: parseSize(page.maxSize) }
      })
    )
  }
  return uploads.get(key)
}

function runUpload(page, req, res) {
  return new Promise((resolve) => {
    uploadFor(page).single(page.field)(req, res, (err) => {
      req.multerError = err
      resolve()
    })
  })
}

function pageForRequest(journey, basePath, req) {
  const fullPath = (basePath + req.path).replace(/\/+$/, '') || basePath
  return journey.pages.find((page) => page.path === fullPath)
}

async function handleGet(req, res, journey, page, hooks) {
  const ctx = buildContext(req, res, journey, page)
  if (!ctx.preview && page.guard && !evaluate(page.guard, ctx)) {
    return res.redirect(toPath(page.guard.redirect, journey))
  }
  const hook = hooks[page.id]
  if (hook && typeof hook.load === 'function') {
    const result = await hook.load(ctx)
    if (result && result.redirect) {
      return res.redirect(result.redirect)
    }
  }
  const model = buildModel(ctx)
  if (hook && typeof hook.get === 'function') {
    const result = await hook.get(ctx, model)
    if (result && result.redirect) {
      return res.redirect(result.redirect)
    }
  }
  res.render(page.template, model)
}

async function handlePost(req, res, journey, page, hooks) {
  if (page.type === 'file-upload') {
    await runUpload(page, req, res)
  }
  const ctx = buildContext(req, res, journey, page, { isPost: true })
  const hook = hooks[page.id] || {}
  const data = ctx.data

  let result = { ok: true }
  if (typeof hook.validate === 'function') {
    result = await hook.validate(ctx)
  } else if (isQuestionType(page.type)) {
    result = validatePage(page, ctx.body, ctx.file, req.multerError)
  }
  if (!result.ok) {
    return res.render(
      page.template,
      buildModel(ctx, {
        error: result.error,
        errors: result.errors,
        values: result.values
      })
    )
  }

  if (
    isQuestionType(page.type) &&
    page.sessionKey &&
    result.value !== undefined
  ) {
    if (page.type === 'file-upload') {
      data[page.sessionKey] = result.value.originalname
    } else {
      data[page.sessionKey] = Array.isArray(result.value)
        ? result.value.map((v) => storedValueFor(page, v))
        : storedValueFor(page, result.value)
    }
  }
  if (page.set) {
    Object.assign(data, page.set)
  }
  if (Array.isArray(page.clears)) {
    for (const key of page.clears) {
      delete data[key]
    }
  }

  if (typeof hook.process === 'function') {
    const outcome = await hook.process(ctx, result.value)
    if (outcome && outcome.error) {
      return res.render(
        page.template,
        buildModel(ctx, { error: outcome.error })
      )
    }
    if (outcome && outcome.redirect) {
      return saveAndRedirect(req, res, outcome.redirect)
    }
  }

  const rule = firstMatch(page.next, ctx)
  if (!rule) {
    return saveAndRedirect(req, res, page.path)
  }
  if (rule.set) {
    Object.assign(data, rule.set)
  }
  // `goto: $summary` returns to the summary page the user came from, which
  // may be in another journey (an absolute path) when this page is borrowed
  const gotoId =
    rule.goto === SUMMARY_TARGET
      ? ctx.navFromSummary || journey.summaryPage
      : rule.goto
  let url = toPath(gotoId, journey) || page.path
  url = withChangeDetour(url, journey.byId.get(gotoId), ctx)
  // A rule leaving for another journey may carry the way back
  url = withReturn(url, rule.return, journey)
  saveAndRedirect(req, res, url)
}

/**
 * Mount the journey on `router`: hook routes once, then a single dispatcher
 * under basePath that resolves the page from the current definition on
 * every request.
 */
function createJourneyRouter(router, journeyOrId, hooks = {}) {
  const journeyId =
    typeof journeyOrId === 'string' ? journeyOrId : journeyOrId.id
  const initial = loadJourney(journeyId)
  const basePath = initial.basePath

  // Hook-provided endpoints (APIs, data files) are registered once, before
  // the dispatcher, so they take precedence over page paths
  initial.hookRoutes = initial.hookRoutes || {}
  for (const [pageId, hook] of Object.entries(hooks)) {
    if (hook && typeof hook.routes === 'function' && initial.byId.has(pageId)) {
      const extra = hook.routes(router, initial) || {}
      Object.assign(initial.hookRoutes, extra)
      Object.assign(initial.routes, extra)
    }
  }

  router.use(basePath, async (req, res, next) => {
    try {
      const journey = loadJourney(journeyId)
      const page = pageForRequest(journey, basePath, req)
      if (!page) {
        return next()
      }
      if (req.method === 'GET' || req.method === 'HEAD') {
        return await handleGet(req, res, journey, page, hooks)
      }
      if (req.method === 'POST' && hasPost(page)) {
        return await handlePost(req, res, journey, page, hooks)
      }
      next()
    } catch (error) {
      next(error)
    }
  })

  return router
}

module.exports = {
  createJourneyRouter,
  buildContext,
  buildModel,
  renderContent,
  previewData,
  isTruthy
}
