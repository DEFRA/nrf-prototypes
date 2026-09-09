/**
 * Journey engine: markdown → GOV.UK HTML
 *
 * Content designers write plain markdown. This module maps it to GOV.UK
 * Design System classes and adds a small set of fenced directives:
 *
 *   :::inset                 → govuk-inset-text
 *   :::details Summary text  → govuk-details
 *   :::warning               → govuk-warning-text
 *   :::panel Title           → govuk-panel--confirmation
 *   :::button Start now      → start button posting to the current page
 *   :::map [key]             → the saved red line boundary drawn on a small
 *                              map (key defaults to redlineBoundaryPolygon)
 *   :::if key                → conditional block (see expressions.js)
 *   :::if key equals value
 *   :::if not key
 *
 * `{{ key }}` placeholders are substituted after rendering and HTML-escaped.
 * Supported forms: `{{ a.b }}`, `{{ key | lower }}`, `{{ key or "fallback" }}`.
 */

const MarkdownIt = require('markdown-it')
const container = require('markdown-it-container')
const { evaluate, getPath, isSet } = require('./expressions')

// Conditional blocks are marked in the rendered HTML with NUL-delimited
// tokens that applyConditionals() strips out again. NUL never appears in
// real content, so the markers cannot collide with copy.
const MARK = '\u0000'
const IF_OPEN = `${MARK}IF:`
const IF_CLOSE = `${MARK}ENDIF${MARK}`
const ifOpen = (keep) => `${IF_OPEN}${keep ? '1' : '0'}${MARK}`

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const FILTERS = {
  lower: (v) => String(v).toLowerCase(),
  upper: (v) => String(v).toUpperCase(),
  capitalize: (v) => {
    const s = String(v)
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
}

/**
 * Resolve a single placeholder expression against the data.
 * Grammar: term ( 'or' term )* ( '|' filter )*
 * where term is a dotted key or a quoted string.
 */
function resolveExpression(expression, data) {
  const [termsPart, ...filterParts] = expression.split('|').map((s) => s.trim())
  const terms = termsPart.split(/\s+or\s+/).map((s) => s.trim())
  let value
  for (const term of terms) {
    const quoted = term.match(/^(?:"|&quot;|')(.*)(?:"|&quot;|')$/)
    value = quoted ? quoted[1] : getPath(data, term)
    if (isSet(value)) {
      break
    }
  }
  if (!isSet(value)) {
    return ''
  }
  for (const name of filterParts) {
    if (FILTERS[name]) {
      value = FILTERS[name](value)
    }
  }
  return value
}

/**
 * Substitute `{{ ... }}` placeholders in a string.
 */
function interpolate(text, data, options = {}) {
  if (text === undefined || text === null) {
    return ''
  }
  const escape = options.escape !== false
  return String(text).replace(
    /\{\{\s*([^}]+?)\s*\}\}/g,
    (match, expression) => {
      const value = resolveExpression(expression, data || {})
      return escape ? escapeHtml(value) : String(value)
    }
  )
}

/**
 * Parse the params of `:::if` into a condition object.
 *   `key`                 → { key, truthy: true }
 *   `not key`             → { key, falsy: true }
 *   `key equals value`    → { key, equals: value }
 *   `key notEquals value` → { key, notEquals: value }
 *   `key gt 10` etc.
 */
function parseIfParams(params) {
  const tokens = params.trim().split(/\s+/)
  if (tokens[0] === 'not' && tokens.length === 2) {
    return { key: tokens[1], falsy: true }
  }
  if (tokens.length === 1) {
    return { key: tokens[0], truthy: true }
  }
  const [key, op, ...rest] = tokens
  const raw = rest.join(' ').replace(/^["']|["']$/g, '')
  if (['in', 'notIn'].includes(op)) {
    return { [op]: raw.split(',').map((s) => s.trim()), key }
  }
  return { key, [op]: raw }
}

/**
 * Remove blocks whose `:::if` evaluated false. Handles nesting with a stack.
 */
function applyConditionals(html) {
  let out = ''
  let i = 0
  const stack = []
  while (i < html.length) {
    const openAt = html.indexOf(IF_OPEN, i)
    const closeAt = html.indexOf(IF_CLOSE, i)
    if (openAt === -1 && closeAt === -1) {
      if (stack.every((keep) => keep)) {
        out += html.slice(i)
      }
      break
    }
    const nextAt =
      openAt === -1
        ? closeAt
        : closeAt === -1
          ? openAt
          : Math.min(openAt, closeAt)
    if (stack.every((keep) => keep)) {
      out += html.slice(i, nextAt)
    }
    if (nextAt === openAt) {
      const end = html.indexOf(MARK, openAt + IF_OPEN.length)
      const flag = html.slice(openAt + IF_OPEN.length, end)
      stack.push(flag === '1')
      i = end + 1
    } else {
      stack.pop()
      i = closeAt + IF_CLOSE.length
    }
  }
  return out
}

/**
 * Stitch back together lists that a directive split in two.
 *
 * `:::if` (and `:::map`) are block-level containers, so a conditional bullet
 * inside a list closes the list and opens a new one. Once the conditional
 * markers are gone the two lists are adjacent and identical, and a reader
 * sees two bulleted lists where the content designer wrote one. Merge any
 * run of adjacent lists sharing the same open tag; markdown on its own never
 * produces those, so nothing else is affected.
 */
function mergeAdjacentLists(html) {
  const pattern = /<(ul|ol)([^>]*)>((?:(?!<\/?\1[\s>])[\s\S])*)<\/\1>\s*<\1\2>/g
  let out = html
  let previous
  do {
    previous = out
    out = out.replace(pattern, '<$1$2>$3')
  } while (out !== previous)
  return out
}

const MAP_WIDTH = 600
const MAP_HEIGHT = 400
const MAP_PADDING = 0.15
const BOUNDARY_COLOUR = '#d4351c'

/**
 * Inline SVG of a boundary ring ([lng, lat] pairs) fitted into a fixed
 * frame. Longitude is scaled by cos(latitude) so the shape is not squashed.
 * Serves as the no-JavaScript and print fallback for the `:::map` block; the
 * client script swaps a real basemap in when the map plugin is available.
 */
function boundarySvg(ring) {
  const lngs = ring.map((p) => p[0])
  const lats = ring.map((p) => p[1])
  const west = Math.min(...lngs)
  const east = Math.max(...lngs)
  const south = Math.min(...lats)
  const north = Math.max(...lats)
  const centreLat = (south + north) / 2
  const cos = Math.cos((centreLat * Math.PI) / 180) || 1
  const width = Math.max((east - west) * cos, 1e-9)
  const height = Math.max(north - south, 1e-9)
  const scale =
    Math.min(
      (MAP_WIDTH * (1 - 2 * MAP_PADDING)) / width,
      (MAP_HEIGHT * (1 - 2 * MAP_PADDING)) / height
    ) || 1
  const offsetX = (MAP_WIDTH - width * scale) / 2
  const offsetY = (MAP_HEIGHT - height * scale) / 2
  const points = ring
    .map(([lng, lat]) => {
      const x = offsetX + (lng - west) * cos * scale
      const y = offsetY + (north - lat) * scale
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    `<svg class="app-boundary-map__svg" viewBox="0 0 ${MAP_WIDTH} ${MAP_HEIGHT}" ` +
    'role="img" aria-label="Red line boundary of the development" ' +
    'xmlns="http://www.w3.org/2000/svg">' +
    `<rect width="${MAP_WIDTH}" height="${MAP_HEIGHT}" fill="#f3f2f1"/>` +
    `<polygon points="${points}" fill="${BOUNDARY_COLOUR}" fill-opacity="0.3" ` +
    `stroke="${BOUNDARY_COLOUR}" stroke-width="3" stroke-linejoin="round"/>` +
    '</svg>'
  )
}

/**
 * `:::map key` → a figure holding the SVG fallback and an empty canvas the
 * client script (app/assets/javascripts/boundary-map.js) fills with a map.
 */
function renderBoundaryMap(value) {
  const ring =
    value && Array.isArray(value.coordinates) ? value.coordinates : []
  const points = ring.filter(
    (p) => Array.isArray(p) && p.length >= 2 && p.every(Number.isFinite)
  )
  if (points.length < 3) {
    return '<p class="govuk-body">No red line boundary has been added.</p>\n'
  }
  const first = points[0]
  const last = points[points.length - 1]
  const closed =
    first[0] === last[0] && first[1] === last[1] ? points : [...points, first]
  return (
    '<figure class="app-boundary-map" data-module="app-boundary-map" ' +
    `data-coordinates="${escapeHtml(JSON.stringify(closed))}">\n` +
    `${boundarySvg(closed)}\n` +
    '<div class="app-boundary-map__canvas" hidden></div>\n' +
    '</figure>\n'
  )
}

const START_ICON =
  '<svg class="govuk-button__start-icon" xmlns="http://www.w3.org/2000/svg" width="17.5" height="19" viewBox="0 0 33 40" aria-hidden="true" focusable="false"><path fill="currentColor" d="M0 0h13l20 20-20 20H0l20-20z"/></svg>'

function createMarkdown() {
  const md = new MarkdownIt({ html: false, linkify: false, typographer: false })

  const HEADING_CLASSES = {
    h1: 'govuk-heading-l',
    h2: 'govuk-heading-m',
    h3: 'govuk-heading-s',
    h4: 'govuk-heading-s',
    h5: 'govuk-heading-s',
    h6: 'govuk-heading-s'
  }

  function addClass(tokens, idx, className) {
    tokens[idx].attrJoin('class', className)
  }

  const defaultRender = (tokens, idx, options, env, self) =>
    self.renderToken(tokens, idx, options)

  md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
    addClass(tokens, idx, HEADING_CLASSES[tokens[idx].tag] || 'govuk-heading-s')
    return defaultRender(tokens, idx, options, env, self)
  }
  md.renderer.rules.paragraph_open = (tokens, idx, options, env, self) => {
    if (!env.inPanel) {
      addClass(tokens, idx, 'govuk-body')
    }
    return defaultRender(tokens, idx, options, env, self)
  }
  md.renderer.rules.bullet_list_open = (tokens, idx, options, env, self) => {
    addClass(tokens, idx, 'govuk-list govuk-list--bullet')
    return defaultRender(tokens, idx, options, env, self)
  }
  md.renderer.rules.ordered_list_open = (tokens, idx, options, env, self) => {
    addClass(tokens, idx, 'govuk-list govuk-list--number')
    return defaultRender(tokens, idx, options, env, self)
  }
  md.renderer.rules.hr = () =>
    '<hr class="govuk-section-break govuk-section-break--l govuk-section-break--visible">\n'
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    addClass(tokens, idx, 'govuk-link')
    const next = tokens[idx + 1]
    if (
      next &&
      next.type === 'text' &&
      /\(opens in new tab\)\s*$/i.test(next.content)
    ) {
      tokens[idx].attrSet('target', '_blank')
      tokens[idx].attrSet('rel', 'noreferrer noopener')
    }
    return defaultRender(tokens, idx, options, env, self)
  }
  md.renderer.rules.table_open = (tokens, idx, options, env, self) => {
    addClass(tokens, idx, 'govuk-table')
    return defaultRender(tokens, idx, options, env, self)
  }
  md.renderer.rules.thead_open = (tokens, idx, options, env, self) => {
    addClass(tokens, idx, 'govuk-table__head')
    return defaultRender(tokens, idx, options, env, self)
  }
  md.renderer.rules.tbody_open = (tokens, idx, options, env, self) => {
    addClass(tokens, idx, 'govuk-table__body')
    return defaultRender(tokens, idx, options, env, self)
  }
  md.renderer.rules.tr_open = (tokens, idx, options, env, self) => {
    addClass(tokens, idx, 'govuk-table__row')
    return defaultRender(tokens, idx, options, env, self)
  }
  md.renderer.rules.th_open = (tokens, idx, options, env, self) => {
    addClass(tokens, idx, 'govuk-table__header')
    return defaultRender(tokens, idx, options, env, self)
  }
  md.renderer.rules.td_open = (tokens, idx, options, env, self) => {
    addClass(tokens, idx, 'govuk-table__cell')
    return defaultRender(tokens, idx, options, env, self)
  }

  function params(token, name) {
    return token.info.trim().slice(name.length).trim()
  }

  md.use(container, 'inset', {
    render: (tokens, idx) =>
      tokens[idx].nesting === 1
        ? '<div class="govuk-inset-text">\n'
        : '</div>\n'
  })

  md.use(container, 'details', {
    render: (tokens, idx) => {
      if (tokens[idx].nesting === 1) {
        const summary = escapeHtml(params(tokens[idx], 'details'))
        return (
          '<details class="govuk-details">\n' +
          '<summary class="govuk-details__summary">' +
          `<span class="govuk-details__summary-text">${summary}</span>` +
          '</summary>\n<div class="govuk-details__text">\n'
        )
      }
      return '</div>\n</details>\n'
    }
  })

  md.use(container, 'warning', {
    render: (tokens, idx, options, env) => {
      if (tokens[idx].nesting === 1) {
        env.inPanel = true
        return (
          '<div class="govuk-warning-text">\n' +
          '<span class="govuk-warning-text__icon" aria-hidden="true">!</span>\n' +
          '<strong class="govuk-warning-text__text">' +
          '<span class="govuk-visually-hidden">Warning</span>\n'
        )
      }
      env.inPanel = false
      return '</strong>\n</div>\n'
    }
  })

  md.use(container, 'panel', {
    render: (tokens, idx, options, env) => {
      if (tokens[idx].nesting === 1) {
        env.inPanel = true
        const title = escapeHtml(params(tokens[idx], 'panel'))
        return (
          '<div class="govuk-panel govuk-panel--confirmation">\n' +
          `<h1 class="govuk-panel__title">${title}</h1>\n` +
          '<div class="govuk-panel__body">\n'
        )
      }
      env.inPanel = false
      return '</div>\n</div>\n'
    }
  })

  md.use(container, 'button', {
    render: (tokens, idx, options, env) => {
      if (tokens[idx].nesting === 1) {
        const text = escapeHtml(params(tokens[idx], 'button') || 'Start now')
        const action = env.page && env.page.path ? env.page.path : ''
        return (
          `<form action="${escapeHtml(action)}" method="post" novalidate>\n` +
          '<button class="govuk-button govuk-button--start" data-module="govuk-button">' +
          `${text}${START_ICON}</button>\n</form>\n`
        )
      }
      return ''
    }
  })

  md.use(container, 'map', {
    render: (tokens, idx, options, env) => {
      if (tokens[idx].nesting === 1) {
        const key = params(tokens[idx], 'map') || 'redlineBoundaryPolygon'
        const data = (env.ctx && env.ctx.data) || {}
        // Anything written between the fences is dropped: the block is the map
        return `${renderBoundaryMap(getPath(data, key))}${ifOpen(false)}`
      }
      return IF_CLOSE
    }
  })

  md.use(container, 'if', {
    render: (tokens, idx, options, env) => {
      if (tokens[idx].nesting === 1) {
        const condition = parseIfParams(params(tokens[idx], 'if'))
        const keep = evaluate(condition, env.ctx || {})
        return ifOpen(keep)
      }
      return IF_CLOSE
    }
  })

  return md
}

/**
 * Split off the leading ATX H1 as the page heading. Only an H1 that is the
 * first non-blank line counts; an H1 further down stays in the body so a
 * page can put something (an inset, say) above its heading. Returns
 * { heading: 'text' | null, body: 'markdown without that heading' }.
 */
function extractHeading(markdown) {
  const lines = String(markdown || '').split('\n')
  const index = lines.findIndex((line) => line.trim() !== '')
  if (index === -1 || !/^#\s+\S/.test(lines[index])) {
    return { heading: null, body: lines.join('\n') }
  }
  const heading = lines[index].replace(/^#\s+/, '').trim()
  lines.splice(index, 1)
  return { heading, body: lines.join('\n') }
}

function createRenderer() {
  const md = createMarkdown()

  /**
   * Render markdown to GOV.UK HTML.
   * ctx: { data, page, isChange, navFromSummary, preview }
   */
  function render(markdown, ctx = {}) {
    if (!markdown || !String(markdown).trim()) {
      return ''
    }
    const env = { ctx, page: ctx.page, inPanel: false }
    const html = md.render(String(markdown), env)
    return interpolate(mergeAdjacentLists(applyConditionals(html)), ctx.data)
  }

  /**
   * Render a one-line markdown string (bold, links) without a wrapping <p>.
   */
  function renderInline(markdown, ctx = {}) {
    if (!markdown) {
      return ''
    }
    const env = { ctx, page: ctx.page }
    return interpolate(md.renderInline(String(markdown), env), ctx.data)
  }

  return { render, renderInline, interpolate, extractHeading }
}

module.exports = {
  createRenderer,
  createMarkdown,
  applyConditionals,
  mergeAdjacentLists,
  interpolate,
  extractHeading,
  escapeHtml,
  parseIfParams
}
