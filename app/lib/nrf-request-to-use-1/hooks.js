/**
 * Hooks for the content-driven "Request to use" journey
 * (content/nrf-request-to-use-1). The engine (app/lib/journey-engine) renders
 * the pages and follows journey.yaml; this file adds the bits that need code:
 *
 *   - a mock quote store: the NRL reference retrieves a fixture quote, unless
 *     the session already holds a quote made in nrf-quote-7
 *   - "levy increased" and the levy amount, recalculated when units change
 *   - a mock GOV.UK One Login: the sign-in email decides the account type
 *     (company@… company, individual@… individual, anything else an agent)
 *   - sign out, the NRL reference and certificate dates on submission
 *
 * The development details and the delete flow are the quote journey's own
 * pages (content/nrf-quote-7), borrowed with the way back in `nav`, so the
 * map and its API stay in app/lib/nrf-quote-7/hooks.js.
 *
 * Nothing here is real: no passwords are checked or stored.
 */

const { message } = require('../journey-engine/validation')

const EDP_NAME =
  'Broads SAC, Broadland Ramsar and River Wensum SAC Environmental Delivery Plan addressing nutrient pollution (2026 to 2036)'
// Indicative charge per housing unit for the prototype's levy amounts
const LEVY_PER_UNIT = 250
// Quote references from either service: NRF-123456 or NRL-123456
const REFERENCE = /^(NRF|NRL)-\d{6}$/i
// An open ring ([lng, lat]) near Wymondham, inside the Broads/Wensum EDP and
// clear of its excluded areas (checked with checkEDPIntersections)
const FIXTURE_RING = [
  [1.11, 52.56],
  [1.12, 52.56],
  [1.12, 52.57],
  [1.11, 52.57]
]

const FIXTURE_QUOTE = {
  planningType: 'Full planning permission',
  isHousing: 'Yes',
  residentialBuildingCount: 100,
  hasRedlineBoundaryFile: false,
  mapReferrer: 'redline-map',
  redlineBoundaryPolygon: {
    center: [1.115, 52.565],
    coordinates: FIXTURE_RING,
    intersections: { nutrient: EDP_NAME },
    intersectingCatchment: EDP_NAME,
    intersectingExcludedAreas: []
  },
  intersectingCatchment: EDP_NAME,
  estimateEmail: 'developer@example.com'
}

// Mock accounts, keyed on the start of the sign-in email address
const ACCOUNTS = {
  company: {
    accountType: 'company',
    fullName: 'Name Name',
    businessName: 'Developer Ltd'
  },
  individual: {
    accountType: 'individual',
    fullName: 'Name Name',
    businessName: ''
  },
  agent: {
    accountType: 'agent',
    fullName: 'Name Name',
    businessName: 'Agent Ltd',
    organisationName: 'Organisation name'
  }
}

function formatMoney(amount) {
  return Math.round(Number(amount) || 0).toLocaleString('en-GB')
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date)
}

function addMonths(date, months) {
  const result = new Date(date.getTime())
  result.setMonth(result.getMonth() + months)
  return result
}

function levyFor(units) {
  return formatMoney(Number(units) * LEVY_PER_UNIT)
}

/**
 * Which mock account an email address signs in to.
 */
function accountFor(email) {
  const local = String(email || '')
    .trim()
    .toLowerCase()
    .split('@')[0]
  const type = ['company', 'individual'].find((t) => local.startsWith(t))
  return { ...ACCOUNTS[type || 'agent'], email: String(email || '').trim() }
}

/**
 * Put the retrieved quote into the session. A quote made in nrf-quote-7 in
 * the same session is kept; otherwise the fixture stands in for the store.
 * The reference and email the user just typed always win.
 *
 * `quoteLoaded` holds the reference the quoted figures belong to. Deleting
 * the quote happens on the quote journey's pages, which clear only that
 * journey's keys, so a different reference (or the same one typed again
 * after a delete, when the quote itself is gone) starts the figures afresh.
 */
function loadQuote(data) {
  const hasQuote =
    data.redlineBoundaryPolygon && data.residentialBuildingCount !== undefined
  if (!hasQuote) {
    const { estimateEmail, ...quote } = FIXTURE_QUOTE
    Object.assign(data, JSON.parse(JSON.stringify(quote)))
    data.estimateEmail = data.estimateEmail || estimateEmail
    delete data.quoteLoaded
  }
  if (data.quoteLoaded !== data.nrfReference) {
    data.quotedUnits = Number(data.residentialBuildingCount)
    data.quotedLevyAmount = levyFor(data.quotedUnits)
    data.levyAmount = data.quotedLevyAmount
    data.levyIncreased = false
    delete data.acceptLevy
    data.quoteLoaded = data.nrfReference
  }
  data.edpName =
    (data.redlineBoundaryPolygon &&
      data.redlineBoundaryPolygon.intersectingCatchment) ||
    data.intersectingCatchment ||
    EDP_NAME
}

function validateReference(ctx) {
  const { page } = ctx
  const raw = String(ctx.body[page.field] || '').trim()
  if (!raw) {
    return { ok: false, error: message(page, 'required') }
  }
  if (!REFERENCE.test(raw)) {
    return { ok: false, error: message(page, 'format') }
  }
  return { ok: true, value: raw.toUpperCase() }
}

const quoteReference = { validate: validateReference }
const originalReference = { validate: validateReference }

const reviewQuoteDetails = {
  // Runs before the page is built, so the rows show the retrieved quote
  load(ctx) {
    if (!ctx.preview) {
      loadQuote(ctx.data)
    }
  },
  process(ctx) {
    const { data } = ctx
    const units = Number(data.residentialBuildingCount)
    const quoted = Number(data.quotedUnits)
    data.levyIncreased = Number.isFinite(quoted) && units > quoted
    data.levyAmount = levyFor(units)
    data.edpName =
      (data.redlineBoundaryPolygon &&
        data.redlineBoundaryPolygon.intersectingCatchment) ||
      data.edpName ||
      EDP_NAME
  }
}

const SIGN_IN_KEYS = ['account', 'signInEmail', 'signInMethod']

const signInMethod = {
  routes(router, journey) {
    const routes = { SIGN_OUT: `${journey.basePath}/sign-out` }
    router.get(routes.SIGN_OUT, (req, res) => {
      const data = (req.session && req.session.data) || {}
      for (const key of SIGN_IN_KEYS) {
        delete data[key]
      }
      res.redirect(`${journey.basePath}/start`)
    })
    return routes
  }
}

const oneLoginPassword = {
  process(ctx) {
    const { data } = ctx
    // The password field is named _password so the kit never stores it; make
    // sure of that here too
    delete data._password
    data.account = accountFor(data.signInEmail)
  }
}

const checkYourAnswers = {
  process(ctx) {
    const { data } = ctx
    const issued = new Date()
    data.nrlReference = `NRL-${Date.now().toString().slice(-6)}`
    data.certificate = {
      issueDate: formatDate(issued),
      expiryDate: formatDate(addMonths(issued, 6))
    }
    data.levyAmount = data.levyAmount || levyFor(data.residentialBuildingCount)
    data.edpName = data.edpName || EDP_NAME
  }
}

module.exports = {
  'quote-reference': quoteReference,
  'original-reference': originalReference,
  'review-quote-details': reviewQuoteDetails,
  'sign-in-method': signInMethod,
  'one-login-password': oneLoginPassword,
  'check-your-answers': checkYourAnswers,
  // For tests
  accountFor,
  loadQuote,
  levyFor,
  FIXTURE_QUOTE,
  EDP_NAME
}
