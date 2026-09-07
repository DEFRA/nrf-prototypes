/**
 * Journey engine: Express router factory
 *
 * Builds GET and POST handlers for every page in a journey definition.
 * Handlers re-load the definition on each request (cheap, mtime-cached) so
 * copy edits in content/ show up without a restart. Adding a new page to
 * journey.yaml still needs a restart because paths are registered once.
 *
 * Hooks (`app/lib/<journey>/hooks.js`) give a page imperative behaviour:
 *   hooks[pageId] = {
 *     routes(router, journey) → { NAME: path }   extra endpoints, run once
 *     get(ctx, model)         → { redirect }?     enrich the render model
 *     validate(ctx)           → { ok, value | error }
 *     process(ctx, value)     → { redirect | error }?  after validation
 *   }
 */

const multer = require('multer')
const { evaluate, firstMatch, isTruthy } = require('./expressions')
const { validatePage, message } = require('./validation')
const { resolveBackLink, toPath } = require('./back-link')
const { createRenderer } = require('./markdown')
const { loadJourney, isQuestionType } = require('./loader')

const renderer = createRenderer()

// Query and hidden-input names the engine uses for control flow. The kit's
// autoStoreData copies every query param and body field into the session,
// so these are removed again on every request.
const ENGINE_KEYS = [
  'preview',
  'change',
  'nav',
  'error',
  'isChange',
  'navFromSummary'
]

function scrub(sessionData) {
  for (const key of ENGINE_KEYS) {
    delete sessionData[key]
  }
}

function previewData(journey, page) {
  const base = (journey.preview && journey.preview.data) || {}
  const override =
    page.preview && page.preview.data ? page.preview.data : page.preview || {}
  return JSON.parse(JSON.stringify({ ...base, ...override }))
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
  const navFromSummary =
    (Boolean(journey.summaryPage) && query.nav === journey.summaryPage) ||
    body.navFromSummary === 'true'
  return {
    req,
    res,
    journey,
    page,
    data: preview ? previewData(journey, page) : req.session.data,
    body,
    file: req.file,
    query,
    preview,
    previewError: preview && ['1', 'true'].includes(String(query.error)),
    isChange,
    navFromSummary
  }
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
  const { journey, data } = ctx
  const key = renderer.interpolate(row.key, data, { escape: false })
  let value
  if (row.value && typeof row.value === 'object') {
    value = evaluate(row.value.when, ctx) ? row.value.then : row.value.else
  } else {
    value = renderer.interpolate(row.value, data, { escape: false })
  }
  let changeTarget
  if (typeof row.change === 'string') {
    changeTarget = row.change
  } else if (Array.isArray(row.change)) {
    const rule = firstMatch(row.change, ctx)
    changeTarget = rule ? rule.goto : undefined
  }
  const result = { key: { text: key }, value: { text: value } }
  if (changeTarget) {
    const base = toPath(changeTarget, journey)
    const params = ['change=true']
    if (journey.summaryPage) {
      params.push(`nav=${journey.summaryPage}`)
    }
    result.actions = {
      items: [
        {
          href: `${base}?${params.join('&')}`,
          text: 'Change',
          visuallyHiddenText: row.changeHidden || key
        }
      ]
    }
  }
  return result
}

function renderContent(page, ctx) {
  const { data, journey } = ctx
  const c = page.content
  const plain = (text) => renderer.interpolate(text, data, { escape: false })
  return {
    title: plain(c.title),
    heading: plain(c.heading),
    headingInBody: c.headingInBody,
    hint: c.hint ? plain(c.hint) : undefined,
    html: renderer.render(c.body, ctx),
    button: c.button,
    inputType: c.inputType,
    width: c.width,
    autocomplete: c.autocomplete,
    spellcheck: c.spellcheck,
    errors: c.errors,
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
    rows: (c.rows || []).map((row) => resolveRow(row, ctx)),
    actions: (c.actions || []).map((action) => ({
      text: plain(action.text),
      kind: action.kind || 'submit',
      href: action.goto ? toPath(action.goto, journey) : undefined,
      hidden: action.hidden
    })),
    panel: c.panel
      ? { title: plain(c.panel.title), body: plain(c.panel.body) }
      : undefined
  }
}

function buildModel(ctx, extra = {}) {
  const { journey, page } = ctx
  const error =
    extra.error || (ctx.previewError ? message(page, 'required') : undefined)
  return {
    journey: {
      id: journey.id,
      basePath: journey.basePath,
      name: journey.name,
      serviceName: journey.serviceName,
      summaryPage: journey.summaryPage,
      start: journey.start
    },
    page: {
      id: page.id,
      path: page.path,
      type: page.type,
      field: page.field,
      sessionKey: page.sessionKey,
      changeable: page.changeable,
      accept: page.accept
    },
    data: ctx.data,
    content: renderContent(page, ctx),
    backLink: resolveBackLink(page, journey, ctx),
    error,
    errorHref: page.field || 'main-content',
    isChange: ctx.isChange,
    navFromSummary: ctx.navFromSummary,
    preview: ctx.preview,
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

/**
 * Register GET/POST handlers for every page of the journey on `router`.
 */
function createJourneyRouter(router, journeyOrId, hooks = {}) {
  const journeyId =
    typeof journeyOrId === 'string' ? journeyOrId : journeyOrId.id
  const initial = loadJourney(journeyId)

  // Hook-provided endpoints (APIs, data files) are registered once
  initial.hookRoutes = initial.hookRoutes || {}
  for (const [pageId, hook] of Object.entries(hooks)) {
    if (hook && typeof hook.routes === 'function' && initial.byId.has(pageId)) {
      const extra = hook.routes(router, initial) || {}
      Object.assign(initial.hookRoutes, extra)
      Object.assign(initial.routes, extra)
    }
  }

  for (const staticPage of initial.pages) {
    const pageId = staticPage.id
    const current = () => {
      const journey = loadJourney(journeyId)
      return { journey, page: journey.byId.get(pageId) || staticPage }
    }

    router.get(staticPage.path, async (req, res, next) => {
      try {
        const { journey, page } = current()
        const ctx = buildContext(req, res, journey, page)
        if (!ctx.preview && page.guard && !evaluate(page.guard, ctx)) {
          return res.redirect(toPath(page.guard.redirect, journey))
        }
        const model = buildModel(ctx)
        const hook = hooks[page.id]
        if (hook && typeof hook.get === 'function') {
          const result = await hook.get(ctx, model)
          if (result && result.redirect) {
            return res.redirect(result.redirect)
          }
        }
        res.render(page.template, model)
      } catch (error) {
        next(error)
      }
    })

    if (!hasPost(staticPage)) {
      continue
    }

    const middleware = []
    if (staticPage.type === 'file-upload') {
      const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: parseSize(staticPage.maxSize) }
      })
      middleware.push((req, res, next) => {
        upload.single(staticPage.field)(req, res, (err) => {
          req.multerError = err
          next()
        })
      })
    }

    router.post(staticPage.path, ...middleware, async (req, res, next) => {
      try {
        const { journey, page } = current()
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
            buildModel(ctx, { error: result.error })
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
        let url = toPath(rule.goto, journey) || page.path
        const target = journey.byId.get(rule.goto)
        const continuesFlow = target && target.next && target.next.length > 0
        if (
          target &&
          ctx.navFromSummary &&
          journey.summaryPage &&
          target.id !== journey.summaryPage &&
          continuesFlow
        ) {
          const params = []
          if (ctx.isChange) {
            params.push('change=true')
          }
          params.push(`nav=${journey.summaryPage}`)
          url += `?${params.join('&')}`
        }
        saveAndRedirect(req, res, url)
      } catch (error) {
        next(error)
      }
    })
  }

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
