const { expect } = require('@playwright/test')
const { copyOf } = require('./journey')

/**
 * Walkthroughs shared by the nrf-request-to-use-1 specs: retrieving a
 * quote, choosing who the levy is for and signing in with the mock GOV.UK
 * One Login. Every label, heading and link comes from the content files
 * through copyOf(); the flow itself (page ids and URLs) is what the tests
 * pin down.
 */
const requestToUse = copyOf('nrf-request-to-use-1')
const { base, answer, fillAnswer, submit, followLink } = requestToUse

async function retrieveQuote(page, reference = 'NRL-123456') {
  await page.goto(`${base}/start`)
  await page.getByRole('button', { name: 'Start now' }).click()
  await answer(page, 'what-would-you-like-to-do', 'request-to-use')
  await submit(page, 'what-would-you-like-to-do')
  await expect(page).toHaveURL(`${base}/have-nrl-reference`)

  await answer(page, 'have-nrl-reference', 'Yes')
  await submit(page, 'have-nrl-reference')
  await expect(page).toHaveURL(`${base}/quote-reference`)

  await fillAnswer(page, 'quote-reference', reference)
  await submit(page, 'quote-reference')
  await expect(page).toHaveURL(`${base}/email`)

  await fillAnswer(page, 'email', 'jane@example.com')
  await submit(page, 'email')
  await expect(page).toHaveURL(`${base}/retrieve-email`)
  await expectEmailChrome(page)

  await followLink(page, 'retrieve-email', 'review-quote-details')
  await expect(page).toHaveURL(`${base}/review-quote-details`)
}

// Emails wear the bare crown header, so they do not read as a page of the
// service: no service navigation, phase banner or back link
async function expectEmailChrome(page) {
  await expect(page.locator('.govuk-header')).toHaveCount(1)
  await expect(page.locator('.govuk-service-navigation')).toHaveCount(0)
  await expect(page.locator('.govuk-phase-banner')).toHaveCount(0)
  await expect(page.locator('.govuk-back-link')).toHaveCount(0)
  await expect(page.locator('.govuk-grid-column-two-thirds')).toHaveCount(1)
}

// From the review page: accept the levy, say it is not a variation and
// arrive at who the levy is for
async function acceptAndSkipVariation(page) {
  await submit(page, 'review-quote-details')
  await expect(page).toHaveURL(`${base}/accept-levy`)
  await answer(page, 'accept-levy', 'Yes')
  await submit(page, 'accept-levy')
  await expect(page).toHaveURL(`${base}/variation`)
  await answer(page, 'variation', 'No')
  await submit(page, 'variation')
}

// After the variation questions: who the user is requesting to use the levy
// for (an option value: individual, organisation or agent), then the Defra
// account guidance for that kind of user, then on to sign in. 'employee'
// answers organisation and then opens the employee invitation email (the
// user research link on the guidance page) and follows its link to sign in,
// as an invited employee does; 'organisation' presses Continue instead, as
// the account admin does.
async function chooseDefraUserType(page, userType) {
  const answerValue = userType === 'employee' ? 'organisation' : userType
  await expect(page).toHaveURL(`${base}/defra-account-user-type`)
  await answer(page, 'defra-account-user-type', answerValue)
  await submit(page, 'defra-account-user-type')
  await expect(page).toHaveURL(`${base}/defra-account-${answerValue}`)
  if (userType === 'employee') {
    await page
      .locator('.app-footer--research')
      .getByRole('link', { name: 'Employee invitation email' })
      .click()
    await expect(page).toHaveURL(`${base}/defra-account-employee-email`)
    await followLink(page, 'defra-account-employee-email', './$next')
    return
  }
  await submit(page, `defra-account-${userType}`)
  if (userType === 'agent') {
    // Agents read the invitation email from their client's Defra account
    // and follow its link to sign in
    await expect(page).toHaveURL(`${base}/defra-account-agent-email`)
    await followLink(page, 'defra-account-agent-email', './$next')
  }
}

async function signIn(page, email) {
  await expect(page).toHaveURL(`${base}/sign-in-method`)
  await answer(page, 'sign-in-method', 'one-login')
  await submit(page, 'sign-in-method')
  await expect(page).toHaveURL(`${base}/one-login-start`)

  await submit(page, 'one-login-start')
  await expect(page).toHaveURL(`${base}/one-login-email`)

  await fillAnswer(page, 'one-login-email', email)
  await submit(page, 'one-login-email')
  await expect(page).toHaveURL(`${base}/one-login-password`)

  await fillAnswer(page, 'one-login-password', 'not-a-real-password')
  await submit(page, 'one-login-password')
}

// Signed in as an agent: which organisation they represent (an option
// value; 'participant' is the research participant's own organisation,
// whose label is filled in from `data`)
async function chooseOrganisation(
  page,
  organisation = 'participant',
  data = {}
) {
  await expect(page).toHaveURL(`${base}/defra-choose-organisation`)
  await answer(page, 'defra-choose-organisation', organisation, data)
  await submit(page, 'defra-choose-organisation')
}

// Retrieve the fixture quote and get as far as choosing how to sign in
async function reachSignIn(page, userType = 'agent') {
  await retrieveQuote(page)
  await acceptAndSkipVariation(page)
  await chooseDefraUserType(page, userType)
  await expect(page).toHaveURL(`${base}/sign-in-method`)
}

module.exports = {
  requestToUse,
  retrieveQuote,
  expectEmailChrome,
  acceptAndSkipVariation,
  chooseDefraUserType,
  signIn,
  chooseOrganisation,
  reachSignIn
}
