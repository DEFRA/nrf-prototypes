/**
 * Journey engine: back link resolution
 *
 * Order of precedence:
 *   1. `back` in journey.yaml: a page id, an absolute path, or a rule list.
 *      Rules may use `$navFromSummary`, `$isChange` and `$borrowed`, and
 *      `goto: $summary`, so a page can say when a change detour returns to
 *      the summary page and when it steps back through the detour instead.
 *   2. A changeable page reached from the summary page goes back there.
 *   3. The first page (in document order) whose `next` rules lead here.
 *   4. The start page goes back to the homepage; confirmation pages and
 *      documents have none.
 */

const { firstMatch } = require('./expressions')

// A `goto` of `$summary` returns to whichever summary page the user came
// from (kept in step with SUMMARY_TARGET in loader.js, which requires this
// file)
const SUMMARY_TARGET = '$summary'

/**
 * The URL for a `goto` target: a page id in this journey, an absolute path
 * (another journey's page), or `$summary`, which needs the request context
 * to know which summary page the user came from. That summary page may be
 * in another journey, in which case `ctx.navFromSummary` is already a path.
 */
function toPath(target, journey, ctx) {
  if (!target) {
    return null
  }
  if (target === SUMMARY_TARGET) {
    const summary = (ctx && ctx.navFromSummary) || journey.summaryPage
    return summary ? toPath(summary, journey) : null
  }
  if (target.startsWith('/')) {
    return target
  }
  const page = journey.byId.get(target)
  return page ? page.path : null
}

function findReferrer(page, journey) {
  for (const candidate of journey.pages) {
    if (candidate.id === page.id) {
      continue
    }
    if ((candidate.next || []).some((rule) => rule.goto === page.id)) {
      return candidate
    }
  }
  return null
}

/**
 * Carry a change detour's way back (`change=true&nav=...`) onto a URL
 */
function withDetourParams(url, ctx) {
  const params = []
  if (ctx.isChange) {
    params.push('change=true')
  }
  params.push(`nav=${ctx.navFromSummary}`)
  return `${url}${url.includes('?') ? '&' : '?'}${params.join('&')}`
}

/**
 * Inside a change detour, a Back link to an earlier page of this journey
 * keeps the detour's way back, so answering that page again still returns
 * to the summary page (a drop-out page's Back link to the question that led
 * there, say). Summary pages and other journeys' pages are left alone.
 */
function stayInDetour(target, journey, ctx) {
  const url = toPath(target, journey, ctx)
  const page = target && journey.byId.get(target)
  if (
    !url ||
    !page ||
    !ctx.isChange ||
    !ctx.navFromSummary ||
    journey.summaryPages.includes(page.id)
  ) {
    return url
  }
  return withDetourParams(url, ctx)
}

function resolveBackLink(page, journey, ctx) {
  // ctx.navFromSummary is the id of the summary page the user came from
  // (journeys may have more than one), or false
  if (typeof page.back === 'string') {
    return stayInDetour(page.back, journey, ctx)
  }
  if (Array.isArray(page.back)) {
    const rule = firstMatch(page.back, ctx)
    return rule ? stayInDetour(rule.goto, journey, ctx) : null
  }
  if (page.changeable && ctx.isChange && ctx.navFromSummary) {
    return toPath(SUMMARY_TARGET, journey, ctx)
  }
  if (page.type === 'confirmation' || page.layout === 'document') {
    return null
  }
  if (page.id === journey.start) {
    return '/'
  }
  const referrer = findReferrer(page, journey)
  return referrer ? stayInDetour(referrer.id, journey, ctx) : null
}

module.exports = {
  resolveBackLink,
  toPath,
  findReferrer,
  withDetourParams,
  SUMMARY_TARGET
}
