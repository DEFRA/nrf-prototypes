/**
 * Hooks for the content-driven "Request to use" journey
 * (content/nrf-request-to-use-1). The engine (app/lib/journey-engine) renders
 * the pages and follows journey.yaml; this file adds the bits that need code:
 *
 *   - a mock quote store: the NRL reference typed retrieves the quote made in
 *     nrf-quote-7 when it matches the reference that journey minted (kept in
 *     the session, never shown in the box), otherwise a fixture quote
 *   - "levy increased" when the units grow; the levy amount itself is the
 *     £X,XXX placeholder every journey shows until a rate is agreed
 *   - a mock GOV.UK One Login: the sign-in email decides the account type
 *     (company@… company, individual@… individual, anything else an agent),
 *     whether the user signs in or has just created the account
 *   - a mock Government Gateway: the user ID typed at sign in works the same
 *     way (company, individual, new-company…); creating sign in details
 *     mints a 12 digit user ID and signs in with the email given
 *   - a mock Defra ID registration for anyone requesting to use the levy
 *     for themselves as an individual or for their organisation as its
 *     account admin (an employee who opened the invitation email, a user
 *     research link on the organisation guidance page, skips it), and for
 *     agents whose email (or user ID) contains "new": the business or
 *     individual answer on the registration pages decides the account type
 *   - sign out, the NRL reference and certificate dates on submission
 *   - the research participant's own name and organisation, typed by the
 *     facilitator into the footer's "Participant details" box
 *     (app/routes/research.js), in place of the stand-in names above
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
// No levy rate is agreed yet, so every amount is the placeholder the quote
// journey's email shows (content/nrf-quote-7)
const LEVY_AMOUNT = 'X,XXX'
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
  planningType: 'full',
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

// The stand-in name of a mock account: signing in never asks for one, so
// the journey asks companies and individuals for theirs (your-address) and
// only fills the box in from a name the user really gave
const MOCK_NAME = 'Name Name'

// Mock accounts, keyed on the start of the sign-in email address
const ACCOUNTS = {
  company: {
    accountType: 'company',
    fullName: MOCK_NAME,
    businessName: 'Developer Ltd'
  },
  individual: {
    accountType: 'individual',
    fullName: MOCK_NAME,
    businessName: ''
  },
  agent: {
    accountType: 'agent',
    fullName: MOCK_NAME,
    businessName: 'Agent Ltd',
    organisationName: 'Organisation name'
  }
}

/**
 * The research participant, as the facilitator described them in the
 * footer's "Participant details" box (session key `researchParticipant`):
 * blank strings when nothing was given
 */
function participantOf(data) {
  const given = (data && data.researchParticipant) || {}
  const firstName = String(given.firstName || '').trim()
  const lastName = String(given.lastName || '').trim()
  return {
    firstName,
    lastName,
    fullName: [firstName, lastName].filter(Boolean).join(' '),
    organisation: String(given.organisation || '').trim()
  }
}

/**
 * A mock account wearing the participant's details: their name in place of
 * the stand-in (never over a name the user typed in the journey) and their
 * organisation or client in place of every business name the prototype
 * would otherwise make up (the company's business, the agent's firm and
 * the organisation the agent acts for). An individual has no business.
 */
function withParticipant(account, data) {
  const participant = participantOf(data)
  if (
    participant.fullName &&
    (!account.fullName || account.fullName === MOCK_NAME)
  ) {
    account.fullName = participant.fullName
  }
  if (participant.organisation && account.accountType !== 'individual') {
    account.businessName = participant.organisation
    if (account.accountType === 'agent') {
      account.organisationName = participant.organisation
    }
  }
  return account
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

// The levy amount for any number of units: the placeholder, until a rate exists
function levyFor() {
  return LEVY_AMOUNT
}

// The business every company registration number finds (a fixture)
const FIXTURE_BUSINESS = 'ACME LTD'
// The administrator who invited an employee to the business's Defra account
const FIXTURE_ADMINISTRATOR = MOCK_NAME

function emailLocalPart(email) {
  return String(email || '')
    .trim()
    .toLowerCase()
    .split('@')[0]
}

// The account type for each answer to "Who are you requesting to use the nature restoration levy for?"
const USER_TYPE_ACCOUNTS = {
  individual: 'individual',
  organisation: 'company',
  agent: 'agent'
}

/**
 * The account type from the sign-in email address alone: "company" or
 * "individual" in it, otherwise an agent
 */
function accountTypeFromEmail(email) {
  const local = emailLocalPart(email)
  return ['company', 'individual'].find((t) => local.includes(t)) || 'agent'
}

/**
 * Which mock account an email address (or a Government Gateway user ID,
 * which has no @) signs in to. The answer to "Who are you requesting to use the levy for?"
 * decides the account type; the email decides it only when that question
 * was skipped. Anyone requesting to use the levy for themselves as an
 * individual, or for their organisation as its account admin, has no Defra
 * account yet, so the journey registers one first. An employee who opened
 * the invitation email (`employeeInvited`) has been invited to the
 * organisation's account and skips it. For anyone else an email containing
 * "new" registers. `data` is the session, for the research participant's
 * own name and organisation (see withParticipant).
 */
function accountFor(email, userType, employeeInvited = false, data = {}) {
  const local = emailLocalPart(email)
  const type = USER_TYPE_ACCOUNTS[userType] || accountTypeFromEmail(email)
  const invited = userType === 'organisation' && Boolean(employeeInvited)
  const admin = userType === 'individual' || userType === 'organisation'
  const account = {
    ...ACCOUNTS[type],
    email: String(email || '').trim(),
    needsDefraAccount: !invited && (admin || local.includes('new')),
    // An employee invited to a business's account (new-employee@) registers
    // with their own details only and is told the administrator will finish
    // setting them up
    invitedEmployee: local.includes('employee')
  }
  return withParticipant(account, data)
}

/**
 * A Defra account Contact Support ID, quoted on the registration emails:
 * "BA202609-R9-2509-K0-0410" (BA, the year and month, then letter-digit and
 * four-digit blocks)
 */
function mintContactSupportId(now = new Date()) {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const pick = (chars) => chars[Math.floor(Math.random() * chars.length)]
  const digits = (n) =>
    Array.from({ length: n }, () => pick('0123456789')).join('')
  const block = () => `${pick(letters)}${digits(1)}`
  const month = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  return `BA${month}-${block()}-${digits(4)}-${block()}-${digits(4)}`
}

/**
 * The account once a Defra account is registered. The business or individual
 * answer wins: an individual is an individual; a business is a company or an
 * agent according to who they said the Defra account is for (falling back to
 * the email, agent by default). An invited employee gave their own details
 * and acts for the business, so they get a company account under the
 * business's name. The research participant's name and organisation stand
 * in for the mock name and the fixture business when they were given.
 */
function registeredAccount(data) {
  const email = (data.account && data.account.email) || data.signInEmail
  const employee = Boolean(data.account && data.account.invitedEmployee)
  const business = data.defraAccountType === 'business'
  const businessType =
    data.defraUserType === 'agent'
      ? 'agent'
      : data.defraUserType === 'organisation'
        ? 'company'
        : accountTypeFromEmail(email) === 'company'
          ? 'company'
          : 'agent'
  const type = employee ? 'company' : !business ? 'individual' : businessType
  const name = data.defraName || {}
  const fullName = [name.firstName, name.lastName].filter(Boolean).join(' ')
  const participant = participantOf(data)
  const account = { ...ACCOUNTS[type], email: String(email || '').trim() }
  if (fullName) {
    account.fullName = fullName
  } else if (participant.fullName) {
    account.fullName = participant.fullName
  }
  if (business || employee) {
    account.businessName = participant.organisation || FIXTURE_BUSINESS
  }
  if (type === 'agent' && participant.organisation) {
    account.organisationName = participant.organisation
  }
  if (employee) {
    account.invitedEmployee = true
    account.administratorName = FIXTURE_ADMINISTRATOR
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
    data.quotedLevyAmount = levyFor()
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
    data.levyAmount = levyFor()
    data.edpName =
      (data.redlineBoundaryPolygon &&
        data.redlineBoundaryPolygon.intersectingCatchment) ||
      data.edpName ||
      EDP_NAME
  }
}

const SIGN_IN_KEYS = [
  'account',
  'employeeInvited',
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
  'defraAccountCreated',
  'defraContactSupportId'
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

// Changing who the Defra account is for after signing in (from check your
// answers) moves the signed-in account to the matching type. They stay
// signed in: becoming an individual here never sends them back to register.
// An employee invitation only counts for an organisation, so another answer
// forgets it.
const defraAccountUserType = {
  process(ctx) {
    const { data } = ctx
    if (data.defraUserType !== 'organisation') {
      delete data.employeeInvited
    }
    if (data.account && !data.account.needsDefraAccount) {
      const { fullName } = data.account
      data.account = accountFor(
        data.account.email,
        data.defraUserType,
        data.employeeInvited,
        data
      )
      data.account.fullName = fullName
      data.account.needsDefraAccount = false
    }
  }
}

// Opening the employee invitation email (the user research link on the
// organisation guidance page) makes the user an invited employee: they
// have been invited to the organisation's Defra account, so signing in
// skips the registration. Continuing without opening it makes them the
// account admin, who registers.
const defraAccountEmployeeEmail = {
  load(ctx) {
    if (!ctx.preview) {
      ctx.data.employeeInvited = true
    }
  }
}

// Signing in with a password, or finishing creating a One Login: who the
// Defra account is for (or the email) decides the account
const oneLoginSignIn = {
  process(ctx) {
    const { data } = ctx
    // The password field is named _password so the kit never stores it; make
    // sure of that here too
    delete data._password
    data.account = accountFor(
      data.signInEmail,
      data.defraUserType,
      data.employeeInvited,
      data
    )
  }
}

// Government Gateway sign in: the user ID stands in for the email. Nothing
// typed on the page is kept (remember: false), so it arrives as `value`,
// keyed by the field name `_user-id` in camelCase.
const governmentGatewaySignIn = {
  process(ctx, value) {
    ctx.data.account = accountFor(
      (value && value._userId) || '',
      ctx.data.defraUserType,
      ctx.data.employeeInvited,
      ctx.data
    )
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
    data.account = accountFor(
      data.signInEmail,
      data.defraUserType,
      data.employeeInvited,
      data
    )
    if (data.governmentGatewayName) {
      data.account.fullName = String(data.governmentGatewayName).trim()
    }
  }
}

// The name pages start with the research participant's name, until the
// participant types one: "What's your name?" on the Defra ID registration
// and the Government Gateway's "What is your full name?". The page's copy
// of the data is filled in, not the session, so the answer is only kept
// once the form is submitted
const defraName = {
  get(ctx, model) {
    const { data } = ctx
    const participant = participantOf(data)
    if (!ctx.preview && !data.defraName && participant.fullName) {
      model.data = {
        ...data,
        defraName: {
          firstName: participant.firstName,
          lastName: participant.lastName
        }
      }
    }
  }
}

const governmentGatewayName = {
  get(ctx, model) {
    const { data } = ctx
    const participant = participantOf(data)
    if (!ctx.preview && !data.governmentGatewayName && participant.fullName) {
      model.data = { ...data, governmentGatewayName: participant.fullName }
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

// "What are your details?": the full name box starts with the name given
// when the Defra account or Government Gateway sign in was created, never
// the mock account's stand-in. The page's copy of the data is filled in,
// not the session, so the review page's guard waits for the form
const yourAddress = {
  get(ctx, model) {
    const { data } = ctx
    const known = data.account && data.account.fullName
    const typed = data.yourAddress && data.yourAddress.fullName
    if (!ctx.preview && known && known !== MOCK_NAME && !typed) {
      model.data = {
        ...data,
        yourAddress: { ...(data.yourAddress || {}), fullName: known }
      }
    }
  }
}

// Both Defra ID check your answers pages (individual and business)
const completeRegistration = {
  process(ctx) {
    const { data } = ctx
    data.account = registeredAccount(data)
    data.defraAccountCreated = 'Yes'
    data.defraContactSupportId = mintContactSupportId()
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
    data.levyAmount = data.levyAmount || levyFor()
    data.edpName = data.edpName || EDP_NAME
  }
}

module.exports = {
  'quote-reference': quoteReference,
  'original-reference': originalReference,
  'review-quote-details': reviewQuoteDetails,
  'defra-account-user-type': defraAccountUserType,
  'defra-account-employee-email': defraAccountEmployeeEmail,
  'sign-in-method': signInMethod,
  'one-login-password': oneLoginSignIn,
  'one-login-created': oneLoginSignIn,
  'government-gateway-sign-in': governmentGatewaySignIn,
  'government-gateway-user-id': governmentGatewayUserId,
  'government-gateway-name': governmentGatewayName,
  'defra-name': defraName,
  'defra-select-address': defraSelectAddress,
  'defra-address-manual': defraAddressManual,
  'your-address': yourAddress,
  'defra-check-answers': completeRegistration,
  'defra-business-check-answers': completeRegistration,
  'check-your-answers': checkYourAnswers,
  // For tests
  accountFor,
  registeredAccount,
  participantOf,
  withParticipant,
  mintGatewayUserId,
  mintContactSupportId,
  FIXTURE_BUSINESS,
  FIXTURE_ADMINISTRATOR,
  MOCK_NAME,
  loadQuote,
  levyFor,
  LEVY_AMOUNT,
  FIXTURE_QUOTE,
  EDP_NAME
}
