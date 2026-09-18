const { test, expect } = require('@playwright/test')
const {
  toFlowGraph,
  journeyGroups,
  journeySections,
  exportSections,
  exportScreens
} = require('../../app/lib/journey-engine')
const { copyOf } = require('./helpers/journey')
const { LEVY_AMOUNT } = require('../../app/lib/nrf-request-to-use-1/hooks')
const {
  requestToUse,
  retrieveQuote,
  expectEmailChrome,
  acceptAndSkipVariation,
  chooseDefraUserType,
  signIn,
  reachSignIn
} = require('./helpers/request-to-use')

/**
 * nrf-request-to-use-1: retrieving a quote, accepting the levy, signing in
 * with the mock GOV.UK One Login and getting a commitment certificate.
 *
 * Page list, headings, labels, links and error text come from
 * content/nrf-request-to-use-1 through the helpers, so these tests follow
 * the journey definition and survive a reword.
 */

const {
  journey,
  base,
  answer,
  optionLocator,
  fillAnswer,
  answerBox,
  fillField,
  submit,
  act,
  actionLocator,
  link,
  followLink,
  followResearchLink,
  changeLink,
  expectHeading,
  expectError,
  expectBodyCopy,
  caption,
  heading,
  notificationTitle,
  rowKey,
  rowValue,
  fieldBox,
  expectFieldError
} = requestToUse

// The development details are the quote journey's own pages, borrowed
// with the way back in `nav` (see content/README.md)
const quote = copyOf('nrf-quote-7')
const quotePath = quote.base

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

test.describe('nrf-request-to-use-1 preview mode', () => {
  for (const page of journey.pages) {
    test(`${page.id} renders with sample data`, async ({ page: browser }) => {
      const response = await browser.goto(`${page.path}?preview=1`)
      expect(response.status()).toBe(200)
      await expect(browser.locator('.govuk-template')).toBeVisible()
      const headingSelector =
        page.type === 'confirmation'
          ? '.govuk-panel__title'
          : page.type === 'custom'
            ? 'body'
            : 'h1'
      // Up to the first placeholder: a heading may carry an answer
      // ("Your registration for {{ account.businessName }} is complete")
      await expect(browser.locator(headingSelector).first()).toContainText(
        page.content.heading
          .split('{{')[0]
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 40)
      )
    })
  }

  test('a form page previews one error per required field', async ({
    page
  }) => {
    const form = journey.byId.get('developer-details')
    await page.goto(`${form.path}?preview=1&error=1`)
    const required = form.content.fields.filter((field) => !field.optional)
    const links = page.locator('.govuk-error-summary__list a')
    await expect(links).toHaveCount(required.length)
    for (const field of required) {
      await expect(page.locator(`a[href="#${field.name}"]`)).toHaveCount(1)
    }
  })
})

test.describe('nrf-request-to-use-1 validation', () => {
  test('empty submission re-renders with the page error', async ({ page }) => {
    const question = journey.byId.get('have-nrl-reference')
    const response = await page.request.post(question.path, { form: {} })
    expect(response.status()).toBe(200)
    const html = await response.text()
    expect(html).toContain('There is a problem')
    expect(html).toContain(question.content.errors.required)
  })

  test('the reference must look like NRL-123456 (or NRF-)', async ({
    page
  }) => {
    const reference = journey.byId.get('quote-reference')
    const bad = await page.request.post(reference.path, {
      form: { 'nrf-reference': 'ABC' }
    })
    expect(await bad.text()).toContain(reference.content.errors.format)
    for (const value of ['NRF-123456', 'nrl-123456']) {
      const good = await page.request.post(reference.path, {
        form: { 'nrf-reference': value },
        maxRedirects: 0
      })
      expect(good.status()).toBe(303)
      expect(good.headers().location).toBe(`${base}/email`)
    }
  })

  test('the password page needs a password and never keeps it', async ({
    page
  }) => {
    const password = journey.byId.get('one-login-password')
    const response = await page.request.post(password.path, { form: {} })
    expect(await response.text()).toContain(password.content.errors.required)
    expect(password.sessionKey).toBeUndefined()
    expect(password.field.startsWith('_')).toBe(true)
  })
})

test.describe('nrf-request-to-use-1 happy paths', () => {
  test('a company signs in, gives its address and gets a certificate', async ({
    page
  }) => {
    await retrieveQuote(page)
    // The fixture quote's answers show as their option labels
    const summary = page.locator('.govuk-summary-list')
    await expect(summary).toContainText(quote.option('planning-type', 'full'))
    await expect(summary).toContainText('100')
    await expect(summary).toContainText('Added')
    await expect(summary).toContainText('jane@example.com')

    await submit(page, 'review-quote-details')
    await expect(page).toHaveURL(`${base}/accept-levy`)
    await expect(page.locator('main')).toContainText(`£${LEVY_AMOUNT}`)
    await answer(page, 'accept-levy', 'Yes')
    await submit(page, 'accept-levy')
    await expect(page).toHaveURL(`${base}/variation`)

    await answer(page, 'variation', 'No')
    await submit(page, 'variation')
    // The organisation guidance offers the employee invitation email as a
    // user research link, followed in this tab instead of Continue
    await answer(page, 'defra-account-user-type', 'organisation')
    await submit(page, 'defra-account-user-type')
    await expect(page).toHaveURL(`${base}/defra-account-organisation`)
    const invitation = page
      .locator('.app-footer--research')
      .getByRole('link', { name: 'Employee invitation email' })
    await expect(invitation).toHaveAttribute(
      'href',
      `${base}/defra-account-employee-email`
    )
    await expect(invitation).not.toHaveAttribute('target', '_blank')
    // Opening it makes them an invited employee: signing in skips the
    // Defra account registration
    await invitation.click()
    await expect(page).toHaveURL(`${base}/defra-account-employee-email`)
    await expect(page.locator('main')).toContainText('jane@example.com')
    await followLink(page, 'defra-account-employee-email', './$next')
    await signIn(page, 'company@example.com')
    await expect(page).toHaveURL(`${base}/your-address`)
    await expectBodyCopy(page, 'your-address', 'company address')

    // Signing in never gave a name, so the box is empty (never "Name Name")
    await expect(fieldBox(page, 'your-address', 'full-name')).toHaveValue('')
    await fillField(page, 'your-address', 'full-name', 'Jane Smith')
    await fillField(page, 'your-address', 'address-line-1', '53 Business Lane')
    await fillField(page, 'your-address', 'town', 'Business')
    await fillField(page, 'your-address', 'postcode', 'LP1 7RF')
    await submit(page, 'your-address')
    await expect(page).toHaveURL(`${base}/review-your-details`)
    await expect(page.locator('.govuk-summary-list')).toContainText(
      'Jane Smith'
    )
    await expect(page.locator('.govuk-summary-list')).not.toContainText(
      'Name Name'
    )
    await expect(
      changeLink(page, 'review-your-details', 'your-address')
    ).toHaveAttribute(
      'href',
      `${base}/your-address?change=true&nav=review-your-details`
    )
    await expect(page.locator('.govuk-summary-list')).toContainText(
      'Developer Ltd'
    )
    await expect(page.locator('.govuk-summary-list')).toContainText(
      '53 Business Lane'
    )
    await submit(page, 'review-your-details')
    await expect(page).toHaveURL(`${base}/check-your-answers`)
    await expect(page.locator('main')).toContainText(
      rowKey('check-your-answers', 'review-your-details')
    )
    await expect(page.locator('main')).toContainText('Jane Smith')
    await expect(page.locator('main')).not.toContainText('Name Name')

    // Everyone confirms the declaration box before submitting; it is
    // required and the Delete link is the way out
    await expect(
      actionLocator(page, 'check-your-answers', 'destructive')
    ).toHaveAttribute(
      'href',
      `${quotePath}/delete-quote?nav=${base}/check-your-answers`
    )
    await submit(page, 'check-your-answers')
    await expect(page).toHaveURL(`${base}/check-your-answers`)
    await expectError(page, 'check-your-answers')
    await answer(page, 'check-your-answers', 'Yes')
    await submit(page, 'check-your-answers')
    await expect(page).toHaveURL(`${base}/confirmation`)
    await expect(page.locator('.govuk-panel__body')).toContainText('NRL-')

    // The email and certificate are user research links in the footer
    await followResearchLink(page, 'confirmation', 'request-email')
    await expect(page).toHaveURL(`${base}/request-email`)
    await expectEmailChrome(page)
    await expectHeading(page, 'request-email')

    await page.goBack()
    await followResearchLink(page, 'confirmation', 'commitment-certificate')
    await expect(page).toHaveURL(`${base}/commitment-certificate`)
    await expectHeading(page, 'commitment-certificate')
    await expect(page.locator('.app-boundary-map')).toHaveCount(1)
    await expect(page.locator('.govuk-phase-banner')).toHaveCount(0)
    await expect(page.locator('main')).toContainText('Jane Smith')
    await expect(page.locator('main')).toContainText('53 Business Lane')
  })

  test('an agent enters the developer details and can sign out', async ({
    page
  }) => {
    await retrieveQuote(page)
    await submit(page, 'review-quote-details')
    await answer(page, 'accept-levy', 'Yes')
    await submit(page, 'accept-levy')
    await expect(page).toHaveURL(`${base}/variation`)
    await answer(page, 'variation', 'Yes')
    await submit(page, 'variation')
    await expect(page).toHaveURL(`${base}/original-committed`)
    await answer(page, 'original-committed', 'Yes')
    await submit(page, 'original-committed')
    await expect(page).toHaveURL(`${base}/original-reference`)
    await fillAnswer(page, 'original-reference', 'NRL-000001')
    await submit(page, 'original-reference')

    // Who the levy is being requested for comes after the variation
    // questions and walks back through them
    await expect(page).toHaveURL(`${base}/defra-account-user-type`)
    await expectHeading(page, 'defra-account-user-type')
    await expect(page.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      `${base}/original-reference`
    )
    // The answer is required
    await submit(page, 'defra-account-user-type')
    await expectError(page, 'defra-account-user-type')
    await answer(page, 'defra-account-user-type', 'agent')
    await submit(page, 'defra-account-user-type')
    await expect(page).toHaveURL(`${base}/defra-account-agent`)
    await expectHeading(page, 'defra-account-agent')
    await expect(page.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      `${base}/defra-account-user-type`
    )
    await submit(page, 'defra-account-agent')

    // The invitation email from the client's Defra account, addressed to
    // the email given to retrieve the quote, then its link carries on to
    // signing in
    await expect(page).toHaveURL(`${base}/defra-account-agent-email`)
    await expectHeading(page, 'defra-account-agent-email')
    await expectBodyCopy(
      page,
      'defra-account-agent-email',
      'using the email address jane@example.com',
      { retrievalEmail: 'jane@example.com' }
    )
    await followLink(page, 'defra-account-agent-email', './$next')
    await expect(page).toHaveURL(`${base}/sign-in-method`)
    await expect(page.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      `${base}/defra-account-agent-email`
    )

    // The account type follows the answer, not the email
    await signIn(page, 'company@example.com')
    await expect(page).toHaveURL(`${base}/developer-details`)
    await expect(page.locator('.app-organisation-bar')).toContainText(
      'Organisation name'
    )
    await expect(
      page.locator('.govuk-service-navigation').getByRole('link', {
        name: 'Sign out'
      })
    ).toHaveCount(1)

    await fillField(page, 'developer-details', 'full-name', 'A Developer')
    await fillField(
      page,
      'developer-details',
      'address-line-1',
      'Development Road'
    )
    await fillField(page, 'developer-details', 'town', 'Development')
    await fillField(page, 'developer-details', 'postcode', 'DV1 6RP')
    await submit(page, 'developer-details')
    await expect(page).toHaveURL(`${base}/review-developer-details`)
    await expect(page.locator('.govuk-summary-list')).toContainText(
      'A Developer'
    )
    await submit(page, 'review-developer-details')
    await expect(page).toHaveURL(`${base}/check-your-answers`)
    await expect(page.locator('.govuk-summary-list').first()).toContainText(
      'NRL-000001'
    )
    await expect(page.locator('.govuk-summary-list').first()).toContainText(
      rowValue('check-your-answers', 'defra-account-user-type', {
        defraUserType: 'agent'
      })
    )

    // Changing who the levy is for goes through the guidance and back, and
    // moves the signed-in account to the new type (still signed in: becoming
    // an individual here does not send them back to register)
    await changeLink(
      page,
      'check-your-answers',
      'defra-account-user-type'
    ).click()
    await expect(page).toHaveURL(
      `${base}/defra-account-user-type?change=true&nav=check-your-answers`
    )
    await answer(page, 'defra-account-user-type', 'individual')
    await submit(page, 'defra-account-user-type')
    await expect(page).toHaveURL(
      `${base}/defra-account-individual?change=true&nav=check-your-answers`
    )
    await expectHeading(page, 'defra-account-individual')
    await submit(page, 'defra-account-individual')
    await expect(page).toHaveURL(`${base}/check-your-answers`)
    await expect(page.locator('.govuk-summary-list').first()).toContainText(
      rowValue('check-your-answers', 'defra-account-user-type', {
        defraUserType: 'individual'
      })
    )
    await expect(page.locator('.app-organisation-bar')).toHaveCount(0)

    await page
      .locator('.govuk-service-navigation')
      .getByRole('link', { name: 'Sign out' })
      .click()
    await expect(page).toHaveURL(`${base}/start`)
    await page.goto(`${base}/check-your-answers`)
    await expect(page).toHaveURL(`${base}/sign-in-method`)
  })

  test('the One Login pages look like One Login', async ({ page }) => {
    await page.goto(`${base}/one-login-start`)
    await expect(page.locator('.govuk-service-navigation')).toHaveCount(0)
    // The Create button is a link (role button) to the create flow; Sign in
    // is the page's own, secondary, button
    await expect(actionLocator(page, 'one-login-start', 'submit')).toHaveCount(
      1
    )
    await expect(
      actionLocator(page, 'one-login-start', 'secondary')
    ).toHaveClass(/govuk-button--secondary/)
    await page.goto(`${base}/one-login-email`)
    await expect(page.locator('.govuk-service-navigation')).toHaveCount(0)
    await expect(page.locator('.govuk-phase-banner .govuk-tag')).toHaveText(
      'Test'
    )
    await expect(page.getByRole('link', { name: 'Cymraeg' })).toHaveCount(1)
    await expect(
      page.getByRole('link', { name: 'Accessibility statement' })
    ).toHaveCount(1)
    await expect(page).toHaveTitle(/GOV.UK One Login$/)
  })
})

test.describe('nrf-request-to-use-1 Defra ID registration', () => {
  // Anyone requesting the levy for themselves as an individual, and sign-in
  // emails containing "new", register a Defra account first; the business or
  // individual answer then decides the account type, with who the levy is
  // being requested for deciding between a company and an agent
  async function registerStart(page, email, userType = 'agent') {
    await reachSignIn(page, userType)
    await signIn(page, email)
    await expect(page).toHaveURL(`${base}/defra-register`)
    // Defra ID chrome: Sign out bar, no phase banner, Defra footer
    await expect(page.locator('.govuk-phase-banner')).toHaveCount(0)
    await expect(
      page.locator('.govuk-service-navigation').getByRole('link', {
        name: 'Sign out'
      })
    ).toHaveCount(1)
    await expect(page.getByRole('link', { name: 'Help' })).toHaveCount(1)
    await expect(page).toHaveTitle(/Defra account - GOV.UK$/)

    await submit(page, 'defra-register')
    await expect(page).toHaveURL(`${base}/defra-terms`)
    await submit(page, 'defra-terms')
    await expect(page).toHaveURL(`${base}/defra-what-we-need`)
    await submit(page, 'defra-what-we-need')
  }

  // Everyone but an invited employee is asked business or individual next
  async function atRegistrationType(page) {
    await expect(page).toHaveURL(`${base}/defra-registration-type`)
    await expect(page.locator('.govuk-caption-l')).toContainText(
      caption('defra-registration-type')
    )
  }

  test('an individual registers, finds their address and continues', async ({
    page
  }) => {
    await registerStart(page, 'new-individual@example.com', 'individual')
    await atRegistrationType(page)
    await answer(page, 'defra-registration-type', 'individual')
    await submit(page, 'defra-registration-type')
    await expect(page).toHaveURL(`${base}/defra-name`)

    await fillField(page, 'defra-name', 'first-name', 'John')
    await fillField(page, 'defra-name', 'last-name', 'Smith')
    await submit(page, 'defra-name')
    await expect(page).toHaveURL(`${base}/defra-telephone`)
    await fillField(page, 'defra-telephone', 'telephone-number', '07387 202019')
    await submit(page, 'defra-telephone')
    await expect(page).toHaveURL(`${base}/defra-postcode`)

    await fillField(page, 'defra-postcode', 'postcode', 'SK11 8BD')
    await submit(page, 'defra-postcode')
    await expect(page).toHaveURL(`${base}/defra-select-address`)
    await expect(page.locator('main')).toContainText('SK11 8BD')
    // Nothing selected is an error
    await submit(page, 'defra-select-address')
    await expectError(page, 'defra-select-address')
    await answer(page, 'defra-select-address', 0)
    await submit(page, 'defra-select-address')
    await expect(page).toHaveURL(`${base}/defra-memorable-word`)

    await fillField(page, 'defra-memorable-word', 'memorable-word', 'sundance')
    await fillField(
      page,
      'defra-memorable-word',
      'hint-question',
      'First school?'
    )
    await expect(page.locator('.govuk-character-count__status')).toContainText(
      'characters remaining'
    )
    await submit(page, 'defra-memorable-word')
    await expect(page).toHaveURL(`${base}/defra-check-answers`)
    const summary = page.locator('.govuk-summary-list')
    await expect(summary.first()).toContainText(
      rowValue('defra-check-answers', 'defra-registration-type')
    )
    await expect(summary.last()).toContainText('John Smith')
    await expect(summary.last()).toContainText('84 Hobson Street')
    await expect(summary.last()).toContainText('sundance')

    // Changing the address by hand comes back here
    await changeLink(page, 'defra-check-answers', 'defra-postcode').click()
    await expect(page).toHaveURL(/defra-postcode\?change=true/)
    await act(page, 'defra-postcode', 'link')
    await expect(page).toHaveURL(/defra-address-manual/)
    await fillField(
      page,
      'defra-address-manual',
      'address-line-1',
      '1 Manual Street'
    )
    await fillField(page, 'defra-address-manual', 'town', 'Macclesfield')
    await fillField(page, 'defra-address-manual', 'postcode', 'SK11 8BD')
    await submit(page, 'defra-address-manual')
    await expect(page).toHaveURL(`${base}/defra-check-answers`)
    await expect(summary.last()).toContainText('1 Manual Street, Macclesfield')

    await submit(page, 'defra-check-answers')
    // The registration email for an individual, then signing in carries on
    await expect(page).toHaveURL(`${base}/defra-registered-individual`)
    await expectBodyCopy(page, 'defra-registered-individual', 'Hello John,', {
      defraName: { firstName: 'John' }
    })
    await expect(page.locator('main')).toContainText(
      /Contact Support ID is BA\d{6}-[A-Z]\d-\d{4}-[A-Z]\d-\d{4}\./
    )
    await expect(page.locator('main')).not.toContainText('on behalf of')
    await followLink(page, 'defra-registered-individual', './$next')
    await expect(page).toHaveURL(`${base}/your-address`)
    await expect(page.locator('main')).not.toContainText('company address')
    // The name given at registration is already filled in
    await expect(fieldBox(page, 'your-address', 'full-name')).toHaveValue(
      'John Smith'
    )
    await fillField(page, 'your-address', 'address-line-1', '53 Business Lane')
    await fillField(page, 'your-address', 'town', 'Business')
    await fillField(page, 'your-address', 'postcode', 'LP1 7RF')
    await submit(page, 'your-address')
    await expect(page).toHaveURL(`${base}/review-your-details`)
    await expect(page.locator('.govuk-summary-list')).toContainText(
      'John Smith'
    )
  })

  test('a business registers and becomes a company for the organisation they work for', async ({
    page
  }) => {
    await registerStart(page, 'new-company@example.com', 'organisation')
    await atRegistrationType(page)
    await answer(page, 'defra-registration-type', 'business')
    await submit(page, 'defra-registration-type')
    await expect(page).toHaveURL(`${base}/defra-trading-uk`)
    // The business pages wear the "Your Defra account" bar
    await expect(
      page.locator('.govuk-service-navigation__service-name')
    ).toContainText('Your Defra account')
    await expect(
      page.getByRole('link', { name: 'Manage account' })
    ).toHaveCount(1)
    await expect(page.locator('.govuk-caption-l')).toContainText(
      caption('defra-trading-uk')
    )

    await answer(page, 'defra-trading-uk', 'Yes')
    await submit(page, 'defra-trading-uk')
    await expect(page).toHaveURL(`${base}/defra-has-crn`)
    await answer(page, 'defra-has-crn', 'Yes')
    await submit(page, 'defra-has-crn')
    await expect(page).toHaveURL(`${base}/defra-crn`)
    await fillField(
      page,
      'defra-crn',
      'company-registration-number',
      '09084488'
    )
    await submit(page, 'defra-crn')
    await expect(page).toHaveURL(`${base}/defra-confirm-business`)
    await expect(page.locator('.govuk-inset-text')).toContainText('ACME LTD')
    await submit(page, 'defra-confirm-business')
    await expect(page).toHaveURL(`${base}/defra-business-contact`)
    await fillField(
      page,
      'defra-business-contact',
      'telephone-number',
      '07387 202019'
    )
    await fillField(
      page,
      'defra-business-contact',
      'email-address',
      'hello@acme.com'
    )
    await submit(page, 'defra-business-contact')
    await expect(page).toHaveURL(`${base}/defra-business-check-answers`)
    await expect(page.locator('main')).toContainText('09084488')
    await expect(page.locator('main')).toContainText('hello@acme.com')

    await submit(page, 'defra-business-check-answers')
    // The registration email for a business names the company
    await expect(page).toHaveURL(`${base}/defra-registered-business`)
    await expectBodyCopy(
      page,
      'defra-registered-business',
      'registered to use Defra online services on behalf of ACME LTD',
      { account: { businessName: 'ACME LTD' } }
    )
    await expectBodyCopy(
      page,
      'defra-registered-business',
      'Contact Support ID'
    )
    await followLink(page, 'defra-registered-business', './$next')
    await expect(page).toHaveURL(`${base}/your-address`)
    await expectBodyCopy(page, 'your-address', 'company address')
  })

  test('a business registered by an agent is an agent account', async ({
    page
  }) => {
    await registerStart(page, 'new@example.com', 'agent')
    await atRegistrationType(page)
    await answer(page, 'defra-registration-type', 'business')
    await submit(page, 'defra-registration-type')
    await answer(page, 'defra-trading-uk', 'No')
    await submit(page, 'defra-trading-uk')
    await expect(page).toHaveURL(`${base}/defra-has-crn`)
    await answer(page, 'defra-has-crn', 'No')
    await submit(page, 'defra-has-crn')
    await expect(page).toHaveURL(`${base}/defra-business-contact`)
    await fillField(
      page,
      'defra-business-contact',
      'telephone-number',
      '07387 202019'
    )
    await fillField(
      page,
      'defra-business-contact',
      'email-address',
      'hello@acme.com'
    )
    await submit(page, 'defra-business-contact')
    await expect(page).toHaveURL(`${base}/defra-business-check-answers`)
    await expect(page.locator('main')).toContainText('Not provided')
    await submit(page, 'defra-business-check-answers')
    await expect(page).toHaveURL(`${base}/defra-registered-business`)
    await followLink(page, 'defra-registered-business', './$next')
    await expect(page).toHaveURL(`${base}/developer-details`)
    await expect(page.locator('.app-organisation-bar')).toHaveCount(1)
  })

  test('an invited employee gives their own details and acts for the business', async ({
    page
  }) => {
    await registerStart(page, 'new-employee@example.com', 'organisation')
    // No business or individual question: straight to their own details
    await expect(page).toHaveURL(`${base}/defra-name`)
    await fillField(page, 'defra-name', 'first-name', 'Fabien')
    await fillField(page, 'defra-name', 'last-name', 'Saujot')
    await submit(page, 'defra-name')
    await fillField(page, 'defra-telephone', 'telephone-number', '07387 202019')
    await submit(page, 'defra-telephone')
    await fillField(page, 'defra-postcode', 'postcode', 'SK11 8BD')
    await submit(page, 'defra-postcode')
    await answer(page, 'defra-select-address', 0)
    await submit(page, 'defra-select-address')
    await fillField(page, 'defra-memorable-word', 'memorable-word', 'sundance')
    await fillField(
      page,
      'defra-memorable-word',
      'hint-question',
      'First school?'
    )
    await submit(page, 'defra-memorable-word')
    await expect(page).toHaveURL(`${base}/defra-check-answers`)
    await submit(page, 'defra-check-answers')

    // The employee email: the administrator finishes setting them up
    await expect(page).toHaveURL(`${base}/defra-registered-employee`)
    const business = { account: { businessName: 'ACME LTD' } }
    await expectHeading(page, 'defra-registered-employee', business)
    await expectBodyCopy(page, 'defra-registered-employee', 'Hello Fabien,', {
      defraName: { firstName: 'Fabien' }
    })
    await expectBodyCopy(
      page,
      'defra-registered-employee',
      'What happens next?'
    )
    await expectBodyCopy(
      page,
      'defra-registered-employee',
      'tasks you can perform on behalf of ACME LTD',
      business
    )
    // They act for the business, so they get the company's pages
    await followLink(page, 'defra-registered-employee', './$next')
    await expect(page).toHaveURL(`${base}/your-address`)
    await expectBodyCopy(page, 'your-address', 'company address')
  })

  test('signing out from a Defra page forgets the registration', async ({
    page
  }) => {
    await registerStart(page, 'new@example.com')
    await page
      .locator('.govuk-service-navigation')
      .getByRole('link', { name: 'Sign out' })
      .click()
    await expect(page).toHaveURL(`${base}/start`)
    await page.goto(`${base}/defra-name`)
    await expect(page).toHaveURL(`${base}/sign-in-method`)
  })

  test('an individual always registers, whatever their email', async ({
    page
  }) => {
    await reachSignIn(page, 'individual')
    await signIn(page, 'individual@example.com')
    await expect(page).toHaveURL(`${base}/defra-register`)
  })

  test('an organisation admin registers, whatever their email', async ({
    page
  }) => {
    await reachSignIn(page, 'organisation')
    await signIn(page, 'company@example.com')
    await expect(page).toHaveURL(`${base}/defra-register`)
    await submit(page, 'defra-register')
    await submit(page, 'defra-terms')
    await submit(page, 'defra-what-we-need')
    await atRegistrationType(page)
  })

  test('an invited employee skips registration and is asked for their name', async ({
    page
  }) => {
    await reachSignIn(page, 'employee')
    await signIn(page, 'company@example.com')
    await expect(page).toHaveURL(`${base}/your-address`)
    // Nothing is known about them: the name box is empty and required
    await expect(fieldBox(page, 'your-address', 'full-name')).toHaveValue('')
    await submit(page, 'your-address')
    await expect(page).toHaveURL(`${base}/your-address`)
    await expectFieldError(page, 'your-address', 'full-name')
  })

  test('who the levy is requested for decides the account type', async ({
    page
  }) => {
    // An individual's email, but the account is for the organisation they
    // work for: a company, which gives its own address
    await reachSignIn(page, 'employee')
    await signIn(page, 'individual@example.com')
    await expect(page).toHaveURL(`${base}/your-address`)
    await expectBodyCopy(page, 'your-address', 'company address')
  })
})

test.describe('nrf-request-to-use-1 with errors switched off', () => {
  test('?errors=false lets every page continue with nothing entered', async ({
    page
  }) => {
    await page.goto(`${base}/have-nrl-reference`)
    await page.getByRole('link', { name: 'Turn errors off' }).click()
    await expect(page).toHaveURL(`${base}/have-nrl-reference?errors=false`)
    await expect(
      page.getByRole('link', { name: 'Turn errors on' })
    ).toHaveCount(1)
    await submit(page, 'have-nrl-reference')
    await expect(page).toHaveURL(`${base}/quote-reference`)
    await submit(page, 'quote-reference')
    await expect(page).toHaveURL(`${base}/email`)
    await submit(page, 'email')
    await expect(page).toHaveURL(`${base}/retrieve-email`)
    await followLink(page, 'retrieve-email', 'review-quote-details')
    await expect(page).toHaveURL(`${base}/review-quote-details`)
    // Blanks were filled from the sample answers
    await expect(page.locator('.govuk-summary-list')).toContainText(
      'developer@example.com'
    )
    await submit(page, 'review-quote-details')
    await expect(page).toHaveURL(`${base}/accept-levy`)
    await submit(page, 'accept-levy')
    await expect(page).toHaveURL(`${base}/variation`)
    // The sample answers say it is a variation of a committed application
    await submit(page, 'variation')
    await expect(page).toHaveURL(`${base}/original-committed`)
    await submit(page, 'original-committed')
    await expect(page).toHaveURL(`${base}/original-reference`)
    await submit(page, 'original-reference')
    await expect(page).toHaveURL(`${base}/defra-account-user-type`)
    // The sample answer says the levy is for a client
    await submit(page, 'defra-account-user-type')
    await expect(page).toHaveURL(`${base}/defra-account-agent`)
    await submit(page, 'defra-account-agent')
    await expect(page).toHaveURL(`${base}/defra-account-agent-email`)
    await followLink(page, 'defra-account-agent-email', './$next')
    await expect(page).toHaveURL(`${base}/sign-in-method`)
    await submit(page, 'sign-in-method')
    await expect(page).toHaveURL(`${base}/one-login-start`)
    await submit(page, 'one-login-start')
    await submit(page, 'one-login-email')
    await expect(page).toHaveURL(`${base}/one-login-password`)
    await submit(page, 'one-login-password')
    // The sample sign-in email is an agent's
    await expect(page).toHaveURL(`${base}/developer-details`)
    await submit(page, 'developer-details')
    await expect(page).toHaveURL(`${base}/review-developer-details`)
    await expect(page.locator('.govuk-summary-list')).toContainText(
      'Development Road'
    )

    // The footer link brings the errors back
    await page.goto(`${base}/quote-reference`)
    await page.getByRole('link', { name: 'Turn errors on' }).click()
    await expect(page).toHaveURL(`${base}/quote-reference?errors=true`)
    await fillAnswer(page, 'quote-reference', '')
    await submit(page, 'quote-reference')
    await expect(page.locator('.govuk-error-summary')).toBeVisible()
  })
})

test.describe('nrf-request-to-use-1 amending the quote', () => {
  const review = `${base}/review-quote-details`
  const serviceNav = '.govuk-service-navigation__service-name'

  test('changing the units borrows the quote page and comes back', async ({
    page
  }) => {
    await retrieveQuote(page)
    await changeLink(page, 'review-quote-details', `${quotePath}/units`).click()
    await expect(page).toHaveURL(`${quotePath}/units?change=true&nav=${review}`)
    // The borrowed page wears the request-to-use header
    await expect(page.locator(serviceNav)).toContainText(
      `PROTOTYPE - ${journey.serviceName}`
    )
    await expect(page.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      review
    )
    await quote.fillAnswer(page, 'units', '120')
    await quote.submit(page, 'units')
    await expect(page).toHaveURL(review)
    await expect(page.locator('.govuk-summary-list')).toContainText('120')

    await submit(page, 'review-quote-details')
    await expect(page).toHaveURL(`${base}/levy-increased`)
    await expect(page.locator('.govuk-hint')).toContainText(`£${LEVY_AMOUNT}`)
  })

  test('deleting the quote details uses the quote journey and starts afresh', async ({
    page
  }) => {
    await retrieveQuote(page)
    await changeLink(page, 'review-quote-details', `${quotePath}/units`).click()
    await quote.fillAnswer(page, 'units', '120')
    await quote.submit(page, 'units')
    await submit(page, 'review-quote-details')
    await expect(page).toHaveURL(`${base}/levy-increased`)

    await answer(page, 'levy-increased', 'No')
    await submit(page, 'levy-increased')
    await expect(page).toHaveURL(`${quotePath}/delete-quote?nav=${review}`)
    await expect(page.locator(serviceNav)).toContainText(
      `PROTOTYPE - ${journey.serviceName}`
    )
    await expect(page.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      review
    )
    await expect(
      quote.actionLocator(page, 'delete-quote', 'link')
    ).toHaveAttribute('href', review)

    await quote.submit(page, 'delete-quote')
    await expect(page).toHaveURL(`${quotePath}/delete-confirmation`)
    await quote.expectHeading(page, 'delete-confirmation')

    // Retrieving again, even with the same reference, gives the quoted
    // figures afresh rather than the amended ones
    await retrieveQuote(page)
    await expect(page.locator('.govuk-summary-list')).toContainText('100')
    await submit(page, 'review-quote-details')
    await expect(page).toHaveURL(`${base}/accept-levy`)
    await expect(page.locator('main')).toContainText(`£${LEVY_AMOUNT}`)
    await expect(optionLocator(page, 'accept-levy', 'No')).not.toBeChecked()
  })

  test('a quote made in the same session fills nothing in, but its reference pulls it up', async ({
    page
  }) => {
    // Make a quote of 120 units (the fixture quote has 100) with direct
    // requests: a map page left open in the browser keeps fetching tiles,
    // and each of those rewrites the session file
    const coordinates = [
      [1.11, 52.56],
      [1.12, 52.56],
      [1.12, 52.57],
      [1.11, 52.57]
    ]
    const answers = [
      ['planning-type', { 'planning-type': 'full' }],
      ['housing', { housing: 'Yes' }],
      ['units', { 'unit-count': '120' }],
      ['redline-map', { 'has-redline-boundary-file': 'draw' }],
      [
        'map',
        {
          'boundary-data': JSON.stringify({
            coordinates,
            center: coordinates[0]
          })
        }
      ],
      ['estimate-email', { email: 'jane@example.com' }]
    ]
    for (const [id, form] of answers) {
      const response = await page.request.post(`${quotePath}/${id}`, {
        form,
        maxRedirects: 0
      })
      expect(response.status(), id).toBe(303)
    }
    await page.goto(`${quotePath}/check-your-answers`)
    await expect(page.locator('.govuk-summary-list')).toContainText('Added')
    await quote.submit(page, 'check-your-answers')
    await expect(page).toHaveURL(`${quotePath}/confirmation`)
    const minted = (await page.locator('.govuk-panel__body').innerText()).match(
      /NRL-\d{6}/
    )[0]

    // The user comes to request to use afresh: nothing is filled in
    await page.goto(`${base}/have-nrl-reference`)
    await answer(page, 'have-nrl-reference', 'Yes')
    await submit(page, 'have-nrl-reference')
    await expect(page).toHaveURL(`${base}/quote-reference`)
    await expect(answerBox(page, 'quote-reference')).toHaveValue('')
    await fillAnswer(page, 'quote-reference', minted)
    await submit(page, 'quote-reference')
    await expect(page).toHaveURL(`${base}/email`)
    await expect(answerBox(page, 'email')).toHaveValue('')

    // Typing the minted reference pulls that quote up
    await retrieveQuote(page, minted)
    await expect(page.locator('.govuk-summary-list')).toContainText('120')

    // Any other reference retrieves the fixture quote instead
    await retrieveQuote(page, 'NRL-000001')
    await expect(page.locator('.govuk-summary-list')).toContainText('100')
  })

  test('a quote with an uploaded boundary shows the file name', async ({
    page
  }) => {
    // Make the quote on nrf-quote-7 by uploading (no file: the sample
    // boundary is plotted under a stand-in file name)
    const answers = [
      ['planning-type', { 'planning-type': 'full' }],
      ['housing', { housing: 'Yes' }],
      ['units', { 'unit-count': '120' }],
      ['redline-map', { 'has-redline-boundary-file': 'upload' }],
      ['upload-redline', {}],
      ['estimate-email', { email: 'jane@example.com' }]
    ]
    for (const [id, form] of answers) {
      const response = await page.request.post(`${quotePath}/${id}`, {
        form,
        maxRedirects: 0
      })
      expect(response.status(), id).toBe(303)
    }
    await page.goto(`${quotePath}/check-your-answers`)
    await quote.submit(page, 'check-your-answers')
    await expect(page).toHaveURL(`${quotePath}/confirmation`)
    const minted = (await page.locator('.govuk-panel__body').innerText()).match(
      /NRL-\d{6}/
    )[0]

    const uploaded = {
      hasRedlineBoundaryFile: true,
      redlineFile: 'red-line-boundary.geojson'
    }
    const filePreview = `${quotePath}/file-preview`
    await retrieveQuote(page, minted)
    await expect(page.locator('.govuk-summary-list')).toContainText(
      rowValue('review-quote-details', filePreview, uploaded)
    )
    await expect(
      changeLink(page, 'review-quote-details', filePreview)
    ).toHaveAttribute(
      'href',
      `${filePreview}?change=true&nav=${base}/review-quote-details`
    )

    await acceptAndSkipVariation(page)
    await chooseDefraUserType(page, 'employee')
    await signIn(page, 'company@example.com')
    await fillField(page, 'your-address', 'full-name', 'Jane Smith')
    await fillField(page, 'your-address', 'address-line-1', '53 Business Lane')
    await fillField(page, 'your-address', 'town', 'Business')
    await fillField(page, 'your-address', 'postcode', 'LP1 7RF')
    await submit(page, 'your-address')
    await submit(page, 'review-your-details')
    await expect(page).toHaveURL(`${base}/check-your-answers`)
    await expect(page.locator('main')).toContainText(
      rowValue('check-your-answers', filePreview, uploaded)
    )
    await expect(
      changeLink(page, 'check-your-answers', filePreview)
    ).toHaveAttribute(
      'href',
      `${filePreview}?change=true&nav=${base}/check-your-answers`
    )
  })

  test('the delete link on check your answers also comes back here', async ({
    page
  }) => {
    await retrieveQuote(page)
    await acceptAndSkipVariation(page)
    await chooseDefraUserType(page, 'agent')
    await signIn(page, 'agent@example.com')
    await fillField(page, 'developer-details', 'full-name', 'A Developer')
    await fillField(
      page,
      'developer-details',
      'address-line-1',
      'Development Road'
    )
    await fillField(page, 'developer-details', 'town', 'Development')
    await fillField(page, 'developer-details', 'postcode', 'DV1 6RP')
    await submit(page, 'developer-details')
    await submit(page, 'review-developer-details')
    await expect(page).toHaveURL(`${base}/check-your-answers`)

    const cya = `${base}/check-your-answers`
    await expect(
      changeLink(page, 'check-your-answers', `${quotePath}/planning-type`)
    ).toHaveAttribute(
      'href',
      `${quotePath}/planning-type?change=true&nav=${cya}`
    )
    await act(page, 'check-your-answers', 'destructive')
    await expect(page).toHaveURL(`${quotePath}/delete-quote?nav=${cya}`)
    // Signed in as an agent: the borrowed page keeps the organisation bar
    await expect(page.locator('.app-organisation-bar')).toContainText(
      'Organisation name'
    )
    await expect(
      page.getByRole('link', { name: 'Change organisation' })
    ).toHaveAttribute('href', `${base}/sign-in-method`)
    await quote.act(page, 'delete-quote', 'link')
    await expect(page).toHaveURL(cya)
  })

  test('too many units means not enough capacity', async ({ page }) => {
    await retrieveQuote(page)
    await changeLink(page, 'review-quote-details', `${quotePath}/units`).click()
    await quote.fillAnswer(page, 'units', '16000')
    await quote.submit(page, 'units')
    await expect(page).toHaveURL(review)
    await submit(page, 'review-quote-details')
    await expect(page).toHaveURL(`${base}/not-enough-capacity`)
    // The way out is the Habitat Regulations guidance
    await expect(
      link(
        page,
        'not-enough-capacity',
        'https://www.gov.uk/guidance/habitats-regulations-assessments-protecting-a-european-site'
      )
    ).toHaveCount(1)
  })

  test('no reference sends the user to get a quote', async ({ page }) => {
    await page.goto(`${base}/have-nrl-reference`)
    await answer(page, 'have-nrl-reference', 'No')
    await submit(page, 'have-nrl-reference')
    await expect(page).toHaveURL(`${quotePath}/planning-type`)
  })

  test('the journey has no copies of the quote pages', () => {
    for (const id of [
      'planning-type',
      'housing',
      'units',
      'map',
      'delete-quote',
      'delete-confirmation'
    ]) {
      expect(journey.byId.has(id)).toBe(false)
    }
    const graph = toFlowGraph(journey)
    const borrowed = graph.nodes.filter((node) => node.external)
    expect(borrowed.map((node) => node.path).sort()).toEqual([
      `${quotePath}/delete-quote`,
      `${quotePath}/file-preview`,
      `${quotePath}/housing`,
      `${quotePath}/map`,
      `${quotePath}/planning-type`,
      `${quotePath}/units`
    ])
  })
})

test.describe('journey tools', () => {
  // The sign-in and account pages come from the shared provider folders,
  // so the tools page folds each provider into one card and one node and
  // draws its screens in a section of its own
  const groups = journeyGroups(journey)
  const sections = journeySections(journey)

  test('the shared provider folders are the groups', () => {
    expect(groups.map((group) => group.id)).toEqual([
      'one-login',
      'government-gateway',
      'defra-id'
    ])
    // The engine's default titles for the provider folders
    expect(groups.map((group) => group.title)).toEqual([
      'GOV.UK One Login',
      'Government Gateway',
      'Defra ID'
    ])
    const grouped = groups.reduce((sum, group) => sum + group.pages.length, 0)
    expect(grouped).toBe(
      journey.pages.filter((page) => page.shared !== true && page.shared).length
    )
    // The main path goes through One Login as one step
    expect(sections.main.graph.mainChain).toContain('group:one-login')
    expect(sections.main.graph.mainChain).not.toContain('one-login-email')
    // Each group starts where the journey enters it
    expect(sections.groups.map((group) => group.levels[0].pages[0].id)).toEqual(
      ['one-login-start', 'government-gateway-sign-in', 'defra-register']
    )
    for (const group of sections.groups) {
      expect(group.levels.some((row) => row.unreachable)).toBe(false)
    }
  })

  test('flow and screen wall page lists every screen once', async ({
    page
  }) => {
    const response = await page.goto(`/tools/journeys/${journey.id}`)
    expect(response.status()).toBe(200)
    await expect(page.locator('iframe')).toHaveCount(journey.pages.length)
    // Thumbnails are embedded previews (no user research footer); the Open
    // links are plain previews, which show it
    await expect(page.locator('iframe').first()).toHaveAttribute(
      'src',
      /\?preview=1&embed=1$/
    )
    await expect(page.locator('.wall-card__shield').first()).toHaveAttribute(
      'href',
      /\?preview=1$/
    )
    await expect(page.locator('.wall-card--group')).toHaveCount(
      sections.main.graph.nodes.filter((node) => node.kind === 'group').length
    )
    for (const group of groups) {
      const section = page.locator(`#group-${group.id}`)
      await expect(section.locator('h2')).toHaveText(group.title)
      await expect(section.locator('iframe')).toHaveCount(group.pages.length)
    }
    // A group card links to its section
    await expect(
      page.locator('.wall-card--group a[href="#group-one-login"]').first()
    ).toHaveCount(1)
  })

  test('the JPG export can pick sections', async ({ request }) => {
    expect(exportSections(journey).map((section) => section.id)).toEqual([
      'main',
      ...groups.map((group) => group.id)
    ])
    // Everything, once, filed by section
    const all = exportScreens(journey, { includeErrors: false })
    expect(all.map((screen) => screen.id).sort()).toEqual(
      journey.pages.map((page) => page.id).sort()
    )
    expect(all[0].file).toBe('main/01-start.jpg')
    // One group on its own, numbered from 1
    const oneLogin = exportScreens(journey, {
      includeErrors: false,
      sections: ['one-login']
    })
    expect(oneLogin.map((screen) => screen.id).sort()).toEqual(
      groups.find((group) => group.id === 'one-login').pages.sort()
    )
    expect(oneLogin[0].file).toBe('one-login/01-one-login-start.jpg')
    // The form's checkboxes are there, all ticked; nothing ticked is refused
    const response = await request.get(
      `/tools/journeys/${journey.id}/screens.zip?section=nothing`
    )
    expect(response.status()).toBe(400)
  })

  test('flow diagrams render every node', async ({ page }) => {
    await page.goto(`/tools/journeys/${journey.id}`)
    await expect(
      page.locator('#flow-diagram[data-rendered="true"]')
    ).toHaveCount(1, { timeout: 20000 })
    for (const group of groups) {
      await expect(
        page.locator(`#flow-diagram-group-${group.id}[data-rendered="true"]`)
      ).toHaveCount(1, { timeout: 20000 })
    }
    const expected =
      sections.main.graph.nodes.length +
      sections.groups.reduce((sum, group) => sum + group.graph.nodes.length, 0)
    await expect(page.locator('.flow-node')).toHaveCount(expected)
    await expect(page.locator('.flow-node--group')).toHaveCount(
      sections.main.graph.nodes.filter((node) => node.kind === 'group').length
    )
    // The full graph is still what flow.json and flow.mmd describe
    expect(toFlowGraph(journey).nodes.length).toBeGreaterThan(
      sections.main.graph.nodes.length
    )
  })
})

test.describe('nrf-request-to-use-1 creating an account', () => {
  // The mock identity providers each live in their own shared folder
  const providers = {
    'one-login-': 'one-login',
    'government-gateway-': 'government-gateway',
    'defra-': 'defra-id'
  }

  test('the identity provider pages are shared from their own folders', () => {
    for (const page of journey.pages) {
      // The "who are you requesting to use the levy for" pages before sign
      // in are the journey's own, not the mock Defra ID
      if (page.id.startsWith('defra-account')) {
        expect(page.shared).toBeFalsy()
        continue
      }
      const prefix = Object.keys(providers).find((p) => page.id.startsWith(p))
      if (!prefix) {
        continue
      }
      const folder = providers[prefix]
      expect(page.shared).toBe(folder)
      expect(page.contentFile).toBe(`content/shared/${folder}/${page.id}.md`)
    }
    expect(journey.byId.get('defra-name').shared).toBe('defra-id')
  })

  test('the password pages keep nothing and need every field', async ({
    page
  }) => {
    for (const id of [
      'one-login-create-password',
      'government-gateway-create-password',
      'government-gateway-sign-in'
    ]) {
      const form = journey.byId.get(id)
      expect(form.sessionKey).toBeUndefined()
      expect(form.content.fields.length).toBeGreaterThan(1)
      for (const field of form.content.fields) {
        expect(field.name.startsWith('_')).toBe(true)
      }
      const response = await page.request.post(form.path, { form: {} })
      expect(response.status()).toBe(200)
      const html = await response.text()
      expect(html).toContain('There is a problem')
      for (const field of form.content.fields) {
        expect(html).toContain(field.errors.required)
      }
    }
  })

  async function createOneLogin(page, email) {
    await reachSignIn(page)
    await answer(page, 'sign-in-method', 'one-login')
    await submit(page, 'sign-in-method')
    await expect(page).toHaveURL(`${base}/one-login-start`)
    // The Create button is a link (role button) to the create flow; Sign in
    // still submits
    await act(page, 'one-login-start', 'submit')
    await expect(page).toHaveURL(`${base}/one-login-create-email`)
    await expect(page).toHaveTitle(/GOV.UK One Login$/)

    await fillAnswer(page, 'one-login-create-email', email)
    await submit(page, 'one-login-create-email')
    await expect(page).toHaveURL(`${base}/one-login-check-email`)
    await expect(page.locator('.govuk-inset-text')).toContainText(email)
    await fillAnswer(page, 'one-login-check-email', '123456')
    await submit(page, 'one-login-check-email')
    await expect(page).toHaveURL(`${base}/one-login-create-password`)

    await fillField(
      page,
      'one-login-create-password',
      '_password',
      'not-a-real-password1'
    )
    await fillField(
      page,
      'one-login-create-password',
      '_password-confirm',
      'not-a-real-password1'
    )
    await submit(page, 'one-login-create-password')
    await expect(page).toHaveURL(`${base}/one-login-security-codes`)
  }

  test('creating a One Login with an authenticator app signs in', async ({
    page
  }) => {
    await createOneLogin(page, 'agent@example.com')
    await answer(page, 'one-login-security-codes', 'app')
    await submit(page, 'one-login-security-codes')
    await expect(page).toHaveURL(`${base}/one-login-authenticator`)
    await expect(page.locator('img[src$="one-login-qr-code.svg"]')).toHaveCount(
      1
    )
    await expect(
      actionLocator(page, 'one-login-authenticator', 'link')
    ).toHaveAttribute('href', `${base}/one-login-security-codes`)
    await fillAnswer(page, 'one-login-authenticator', '123456')
    await submit(page, 'one-login-authenticator')
    await expect(page).toHaveURL(`${base}/one-login-created`)
    await submit(page, 'one-login-created')
    // The email is an agent's, so on to the developer details, signed in
    await expect(page).toHaveURL(`${base}/developer-details`)
    await expect(
      page.locator('.govuk-service-navigation').getByRole('link', {
        name: 'Sign out'
      })
    ).toHaveCount(1)
  })

  test('security codes by text message ask for a phone number', async ({
    page
  }) => {
    await createOneLogin(page, 'new-individual@example.com')
    await answer(page, 'one-login-security-codes', 'sms')
    await submit(page, 'one-login-security-codes')
    await expect(page).toHaveURL(`${base}/one-login-phone-number`)
    await fillAnswer(page, 'one-login-phone-number', '07700 900123')
    await submit(page, 'one-login-phone-number')
    await expect(page).toHaveURL(`${base}/one-login-check-phone`)
    await expect(page.locator('main')).toContainText('07700 900123')
    await fillAnswer(page, 'one-login-check-phone', '123456')
    await submit(page, 'one-login-check-phone')
    await expect(page).toHaveURL(`${base}/one-login-created`)
    await submit(page, 'one-login-created')
    // An email containing "new" still registers a Defra account first
    await expect(page).toHaveURL(`${base}/defra-register`)
  })

  async function reachGateway(page) {
    await reachSignIn(page)
    await answer(page, 'sign-in-method', 'government-gateway')
    await submit(page, 'sign-in-method')
    await expect(page).toHaveURL(`${base}/government-gateway-sign-in`)
    // Government Gateway chrome: its own bar, language toggle, no phase
    // banner, the notification banner above the heading
    await expect(
      page.locator('.govuk-service-navigation__service-name')
    ).toContainText('Government Gateway')
    await expect(page.locator('.govuk-phase-banner')).toHaveCount(0)
    await expect(
      page.getByRole('link', { name: 'Cymraeg', exact: true })
    ).toHaveCount(1)
    await expect(page.locator('.govuk-notification-banner__title')).toHaveText(
      notificationTitle('government-gateway-sign-in')
    )
    await expect(page).toHaveTitle(
      new RegExp(
        `${escapeRegExp(heading('government-gateway-sign-in'))} - GOV.UK$`
      )
    )
  }

  test('signing in with Government Gateway reads the user ID', async ({
    page
  }) => {
    await reachGateway(page)
    await fillField(page, 'government-gateway-sign-in', '_user-id', 'company')
    await fillField(
      page,
      'government-gateway-sign-in',
      '_password',
      'not-a-real-password'
    )
    await submit(page, 'government-gateway-sign-in')
    // The account is for a client, so an agent enters the developer details
    // whatever the user ID says
    await expect(page).toHaveURL(`${base}/developer-details`)
  })

  test('creating Government Gateway sign in details mints a user ID', async ({
    page
  }) => {
    await reachGateway(page)
    // A link written as ./government-gateway-email resolves to this journey
    await followLink(
      page,
      'government-gateway-sign-in',
      './government-gateway-email'
    )
    await expect(page).toHaveURL(`${base}/government-gateway-email`)
    await fillAnswer(page, 'government-gateway-email', 'agent@example.com')
    await submit(page, 'government-gateway-email')
    await expect(page).toHaveURL(`${base}/government-gateway-confirm-email`)
    await expect(page.locator('main')).toContainText('agent@example.com')
    await fillAnswer(page, 'government-gateway-confirm-email', 'DNCLRK')
    await submit(page, 'government-gateway-confirm-email')
    await expect(page).toHaveURL(`${base}/government-gateway-email-confirmed`)
    await submit(page, 'government-gateway-email-confirmed')
    await expect(page).toHaveURL(`${base}/government-gateway-name`)
    await fillAnswer(page, 'government-gateway-name', 'Jane Agent')
    await submit(page, 'government-gateway-name')
    await expect(page).toHaveURL(`${base}/government-gateway-create-password`)
    await fillField(
      page,
      'government-gateway-create-password',
      '_password',
      'three random words'
    )
    await fillField(
      page,
      'government-gateway-create-password',
      '_password-confirm',
      'three random words'
    )
    await submit(page, 'government-gateway-create-password')
    await expect(page).toHaveURL(`${base}/government-gateway-user-id`)
    await expect(page.locator('.govuk-panel__body')).toHaveText(
      /^\s*(\d\d ){5}\d\d\s*$/
    )
    await expect(page.locator('main')).toContainText('agent@example.com')
    await submit(page, 'government-gateway-user-id')
    await expect(page).toHaveURL(`${base}/developer-details`)
  })
})
