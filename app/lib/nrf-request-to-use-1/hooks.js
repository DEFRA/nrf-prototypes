/**
 * Hooks for the content-driven "Request to use" journey
 * (content/nrf-request-to-use-1). The engine (app/lib/journey-engine) renders
 * the pages and follows journey.yaml; this file adds the bits that need code:
 *
 *   - a mock quote store: the NRL reference typed retrieves the quote made in
 *     nrf-quote-7 when it matches the reference that journey minted (kept in
 *     the session, never shown in the box), otherwise a fixture quote
 *   - "levy increased" and the levy amount, recalculated when units change
 *   - a mock GOV.UK One Login: the sign-in email decides the account type
 *     (company@… company, individual@… individual, anything else an agent),
 *     whether the user signs in or has just created the account
 *   - a mock Government Gateway: the user ID typed at sign in works the same
 *     way (company, individual, new-company…); creating sign in details
 *     mints a 12 digit user ID and signs in with the email given
 *   - a mock Defra ID registration for emails (or user IDs) containing "new"
 *     (new-individual@, new-company@, new@ for an agent): the business or
 *     individual answer on the registration pages decides the account type
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
  intersectingCatchment: EDP_NAME
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

// The business every company registration number finds (a fixture)
const FIXTURE_BUSINESS = 'ACME LTD'

function emailLocalPart(email) {
  return String(email || '')
    .trim()
    .toLowerCase()
    .split('@')[0]
}

/**
 * Which mock account an email address (or a Government Gateway user ID,
 * which has no @) signs in to. One containing "new" has no Defra account
 * yet, so the journey registers one first.
 */
function accountFor(email) {
  const local = emailLocalPart(email)
  const type = ['company', 'individual'].find((t) => local.includes(t))
  return {
    ...ACCOUNTS[type || 'agent'],
    email: String(email || '').trim(),
    needsDefraAccount: local.includes('new')
  }
}

/**
 * The account once a Defra account is registered. The business or individual
 * answer wins over the email: an individual is an individual; a business is a
 * company when the email says so, otherwise an agent (the assumed path).
 */
function registeredAccount(data) {
  const email = (data.account && data.account.email) || data.signInEmail
  const business = data.defraAccountType === 'business'
  const type = !business
    ? 'individual'
    : emailLocalPart(email).includes('company')
      ? 'company'
      : 'agent'
  const name = data.defraName || {}
  const fullName = [name.firstName, name.lastName].filter(Boolean).join(' ')
  const account = { ...ACCOUNTS[type], email: String(email || '').trim() }
  if (fullName) {
    account.fullName = fullName
  }
  if (business) {
    account.businessName = FIXTURE_BUSINESS
  }
  return account
}

/**
 * Put the retrieved quote into the session. The session stands in for the
 * quote store: a quote made in nrf-quote-7 stays under the reference that
 * journey minted (`nrfReference`), and typing that reference pulls it up.
 * Any other reference retrieves the fixture quote. The reference and email
 * typed here are kept apart from the quote's own, so neither box is ever
 * filled in from a quote made in the same session.
 *
 * `quoteLoaded` holds the reference the quoted figures belong to, so coming
 * back to the review page after amending on the quote journey's pages keeps
 * the amended quote. Deleting the quote happens on those pages, which clear
 * only that journey's keys, so the same reference typed again after a delete
 * (when the quote itself is gone) starts the figures afresh.
 */
function loadQuote(data) {
  const reference = data.quoteReference
  const hasQuote =
    data.redlineBoundaryPolygon && data.residentialBuildingCount !== undefined
  const matches =
    hasQuote &&
    (data.quoteLoaded === reference || data.nrfReference === reference)
  if (!matches) {
    Object.assign(data, JSON.parse(JSON.stringify(FIXTURE_QUOTE)))
    delete data.quoteLoaded
  }
  if (data.quoteLoaded !== reference) {
    data.quotedUnits = Number(data.residentialBuildingCount)
    data.quotedLevyAmount = levyFor(data.quotedUnits)
    data.levyAmount = data.quotedLevyAmount
    data.levyIncreased = false
    delete data.acceptLevy
    data.quoteLoaded = reference
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

const SIGN_IN_KEYS = [
  'account',
  'signInEmail',
  'signInMethod',
  'securityCodeMethod',
  'mobileNumber',
  'governmentGatewayName',
  'governmentGatewayUserId',
  'defraAccountType',
  'defraName',
  'defraTelephone',
  'defraPostcode',
  'defraAddress',
  'defraAddressManual',
  'defraMemorableWord',
  'defraTradingUk',
  'defraHasCrn',
  'defraCrn',
  'defraBusinessContact',
  'defraAccountCreated'
]

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

// Signing in with a password, or finishing creating a One Login: the email
// decides the account
const oneLoginSignIn = {
  process(ctx) {
    const { data } = ctx
    // The password field is named _password so the kit never stores it; make
    // sure of that here too
    delete data._password
    data.account = accountFor(data.signInEmail)
  }
}

// Government Gateway sign in: the user ID stands in for the email. Nothing
// typed on the page is kept (remember: false), so it arrives as `value`,
// keyed by the field name `_user-id` in camelCase.
const governmentGatewaySignIn = {
  process(ctx, value) {
    ctx.data.account = accountFor((value && value._userId) || '')
  }
}

/**
 * A Government Gateway user ID: 12 digits shown in pairs ("43 93 78 15 57 40")
 */
function mintGatewayUserId() {
  const digits = []
  for (let i = 0; i < 12; i += 1) {
    digits.push(Math.floor(Math.random() * 10))
  }
  return digits.join('').match(/\d{2}/g).join(' ')
}

// Creating Government Gateway sign in details ends on the user ID page:
// the ID is minted when the page opens and Continue signs in with the email
// given, under the name given
const governmentGatewayUserId = {
  load(ctx) {
    const { data } = ctx
    if (!ctx.preview && !data.governmentGatewayUserId) {
      data.governmentGatewayUserId = mintGatewayUserId()
    }
  },
  process(ctx) {
    const { data } = ctx
    data.account = accountFor(data.signInEmail)
    if (data.governmentGatewayName) {
      data.account.fullName = String(data.governmentGatewayName).trim()
    }
  }
}

// Picking an address from the list forgets one entered by hand, and the other
// way round: check your answers shows whichever the user gave last
const defraSelectAddress = {
  process(ctx) {
    delete ctx.data.defraAddressManual
  }
}

const defraAddressManual = {
  process(ctx) {
    const { data } = ctx
    const address = data.defraAddressManual || {}
    data.defraAddress = [
      address.addressLine1,
      address.addressLine2,
      address.town,
      address.county,
      address.postcode
    ]
      .filter(Boolean)
      .join(', ')
  }
}

// Both Defra ID check your answers pages (individual and business)
const completeRegistration = {
  process(ctx) {
    const { data } = ctx
    data.account = registeredAccount(data)
    data.defraAccountCreated = 'Yes'
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
  'one-login-password': oneLoginSignIn,
  'one-login-created': oneLoginSignIn,
  'government-gateway-sign-in': governmentGatewaySignIn,
  'government-gateway-user-id': governmentGatewayUserId,
  'defra-select-address': defraSelectAddress,
  'defra-address-manual': defraAddressManual,
  'defra-check-answers': completeRegistration,
  'defra-business-check-answers': completeRegistration,
  'check-your-answers': checkYourAnswers,
  // For tests
  accountFor,
  registeredAccount,
  mintGatewayUserId,
  FIXTURE_BUSINESS,
  loadQuote,
  levyFor,
  FIXTURE_QUOTE,
  EDP_NAME
}
