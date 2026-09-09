/**
 * Journey engine: back link resolution
 *
 * Order of precedence:
 *   1. A changeable page reached from the summary page goes back there.
 *   2. `back` in journey.yaml: a page id, an absolute path, or a rule list.
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

function resolveBackLink(page, journey, ctx) {
  // ctx.navFromSummary is the id of the summary page the user came from
  // (journeys may have more than one), or false
  if (page.changeable && ctx.isChange && ctx.navFromSummary) {
    return toPath(SUMMARY_TARGET, journey, ctx)
  }
  if (typeof page.back === 'string') {
    return toPath(page.back, journey, ctx)
  }
  if (Array.isArray(page.back)) {
    const rule = firstMatch(page.back, ctx)
    return rule ? toPath(rule.goto, journey, ctx) : null
  }
  if (page.type === 'confirmation' || page.layout === 'document') {
    return null
  }
  if (page.id === journey.start) {
    return '/'
  }
  const referrer = findReferrer(page, journey)
  return referrer ? referrer.path : null
}

module.exports = { resolveBackLink, toPath, findReferrer, SUMMARY_TARGET }
