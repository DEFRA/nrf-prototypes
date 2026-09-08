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

function toPath(target, journey) {
  if (!target) {
    return null
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
    const summary =
      typeof ctx.navFromSummary === 'string'
        ? ctx.navFromSummary
        : journey.summaryPage
    return toPath(summary, journey)
  }
  if (typeof page.back === 'string') {
    return toPath(page.back, journey)
  }
  if (Array.isArray(page.back)) {
    const rule = firstMatch(page.back, ctx)
    return rule ? toPath(rule.goto, journey) : null
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

module.exports = { resolveBackLink, toPath, findReferrer }
