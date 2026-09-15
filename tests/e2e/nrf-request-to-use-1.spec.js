const { test, expect } = require('@playwright/test')
const {
  loadJourney,
  toFlowGraph,
  journeyGroups,
  journeySections,
  exportSections,
  exportScreens
} = require('../../app/lib/journey-engine')

/**
 * nrf-request-to-use-1: retrieving a quote, accepting the levy, signing in
 * with the mock GOV.UK One Login and getting a commitment certificate.
 *
 * Page list, headings and error text come from content/nrf-request-to-use-1
 * so these tests stay in step with the journey definition.
 */

const journey = loadJourney('nrf-request-to-use-1')
const base = journey.basePath

async function retrieveQuote(page, reference = 'NRL-123456') {
  await page.goto(`${base}/start`)
  await page.getByRole('button', { name: 'Start now' }).click()
  await page.getByLabel(/request to use/).check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(`${base}/have-nrl-reference`)

  await page.getByLabel('Yes', { exact: true }).check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(`${base}/quote-reference`)

  await page.getByLabel(/NRL reference/).fill(reference)
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(`${base}/email`)

  await page.getByLabel(/email address/).fill('jane@example.com')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(`${base}/retrieve-email`)
  await expectEmailChrome(page)

  await page.getByRole('link', { name: 'Retrieve the quote details' }).click()
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

async function signIn(page, email) {
  await expect(page).toHaveURL(`${base}/sign-in-method`)
  await page.getByLabel(/GOV.UK One Login/).check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(`${base}/one-login-start`)

  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(`${base}/one-login-email`)

  await page.getByLabel(/email address/).fill(email)
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(`${base}/one-login-password`)

  await page.getByLabel('Enter your password').fill('not-a-real-password')
  await page.getByRole('button', { name: 'Continue' }).click()
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
    const summary = page.locator('.govuk-summary-list')
    await expect(summary).toContainText('Full planning permission')
    await expect(summary).toContainText('100')
    await expect(summary).toContainText('Added')
    await expect(summary).toContainText('jane@example.com')

    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/accept-levy`)
    await expect(page.locator('main')).toContainText('£25,000')
    await page.getByLabel(/Yes, accept/).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/variation`)

    await page.getByLabel('No', { exact: true }).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await signIn(page, 'company@example.com')
    await expect(page).toHaveURL(`${base}/your-address`)
    await expect(page.locator('main')).toContainText('company address')

    await page.getByLabel('Address line 1').fill('53 Business Lane')
    await page.getByLabel('Town or city').fill('Business')
    await page.getByLabel('Postcode').fill('LP1 7RF')
    await page.getByRole('button', { name: 'Confirm' }).click()
    await expect(page).toHaveURL(`${base}/review-your-details`)
    await expect(page.locator('.govuk-summary-list')).toContainText(
      'Developer Ltd'
    )
    await expect(page.locator('.govuk-summary-list')).toContainText(
      '53 Business Lane'
    )
    await page.getByRole('button', { name: 'Confirm' }).click()
    await expect(page).toHaveURL(`${base}/check-your-answers`)
    await expect(page.locator('main')).toContainText('Details confirmed')
    await expect(page.locator('main')).toContainText('Development details')

    await page.getByRole('button', { name: 'Confirm and submit' }).click()
    await expect(page).toHaveURL(`${base}/confirmation`)
    await expect(page.locator('.govuk-panel__body')).toContainText('NRL-')

    await page.getByRole('link', { name: 'View the email' }).click()
    await expect(page).toHaveURL(`${base}/request-email`)
    await expectEmailChrome(page)
    await expect(page.locator('h1')).toContainText('requested to use')

    await page.goBack()
    await page
      .getByRole('link', { name: 'View the commitment certificate' })
      .click()
    await expect(page).toHaveURL(`${base}/commitment-certificate`)
    await expect(page.locator('h1')).toContainText('commitment certificate')
    await expect(page.locator('.app-boundary-map')).toHaveCount(1)
    await expect(page.locator('.govuk-phase-banner')).toHaveCount(0)
    await expect(page.locator('main')).toContainText('Name Name')
    await expect(page.locator('main')).toContainText('53 Business Lane')
  })

  test('an agent enters the developer details and can sign out', async ({
    page
  }) => {
    await retrieveQuote(page)
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel(/Yes, accept/).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/variation`)
    await page.getByLabel('Yes', { exact: true }).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/original-committed`)
    await page.getByLabel('Yes', { exact: true }).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/original-reference`)
    await page.getByLabel(/NRL reference/).fill('NRL-000001')
    await page.getByRole('button', { name: 'Continue' }).click()

    await signIn(page, 'agent@example.com')
    await expect(page).toHaveURL(`${base}/developer-details`)
    await expect(page.locator('.app-organisation-bar')).toContainText(
      'Organisation name'
    )
    await expect(
      page.locator('.govuk-service-navigation').getByRole('link', {
        name: 'Sign out'
      })
    ).toHaveCount(1)

    await page.getByLabel('Full name').fill('A Developer')
    await page.getByLabel('Address line 1').fill('Development Road')
    await page.getByLabel('Town or city').fill('Development')
    await page.getByLabel('Postcode').fill('DV1 6RP')
    await page.getByRole('button', { name: 'Confirm' }).click()
    await expect(page).toHaveURL(`${base}/review-developer-details`)
    await expect(page.locator('.govuk-summary-list')).toContainText(
      'A Developer'
    )
    await page.getByRole('button', { name: 'Confirm' }).click()
    await expect(page).toHaveURL(`${base}/placeholder`)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/check-your-answers`)
    await expect(page.locator('.govuk-summary-list').first()).toContainText(
      'NRL-000001'
    )

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
    await expect(
      page.getByRole('button', { name: 'Create your GOV.UK One Login' })
    ).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Sign in' })).toHaveClass(
      /govuk-button--secondary/
    )
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
  // Sign-in emails containing "new" register a Defra account first; the
  // business or individual answer then decides the account type
  async function reachSignIn(page) {
    await retrieveQuote(page)
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel(/Yes, accept/).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/variation`)
    await page.getByLabel('No', { exact: true }).check()
    await page.getByRole('button', { name: 'Continue' }).click()
  }

  async function registerStart(page, email) {
    await reachSignIn(page)
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

    await page
      .getByRole('button', { name: 'Continue Registering for a Defra Account' })
      .click()
    await expect(page).toHaveURL(`${base}/defra-terms`)
    await page.getByRole('button', { name: 'Accept and Continue' }).click()
    await expect(page).toHaveURL(`${base}/defra-what-we-need`)
    await page.getByRole('button', { name: 'Continue' }).click()
  }

  // Everyone but an invited employee is asked business or individual next
  async function atRegistrationType(page) {
    await expect(page).toHaveURL(`${base}/defra-registration-type`)
    await expect(page.locator('.govuk-caption-l')).toContainText(
      'Register Defra account'
    )
  }

  test('an individual registers, finds their address and continues', async ({
    page
  }) => {
    await registerStart(page, 'new-individual@example.com')
    await atRegistrationType(page)
    await page.getByLabel(/No, as an individual/).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/defra-name`)

    await page.getByLabel('First name').fill('John')
    await page.getByLabel('Last name').fill('Smith')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/defra-telephone`)
    await page.getByLabel('Telephone number').fill('07387 202019')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/defra-postcode`)

    await page.getByLabel('Postcode').fill('SK11 8BD')
    await page.getByRole('button', { name: 'Find address' }).click()
    await expect(page).toHaveURL(`${base}/defra-select-address`)
    await expect(page.locator('main')).toContainText('SK11 8BD')
    // Nothing selected is an error
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.locator('.govuk-error-summary')).toContainText(
      'Select your address'
    )
    await page.getByLabel('Select your address').selectOption({
      label: '84 Hobson Street, Macclesfield, Cheshire, SK11 8BD'
    })
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/defra-memorable-word`)

    await page.getByLabel('Memorable word').fill('sundance')
    await page.getByLabel('Hint question').fill('First school?')
    await expect(page.locator('.govuk-character-count__status')).toContainText(
      'characters remaining'
    )
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/defra-check-answers`)
    const summary = page.locator('.govuk-summary-list')
    await expect(summary.first()).toContainText('Individual')
    await expect(summary.last()).toContainText('John Smith')
    await expect(summary.last()).toContainText('84 Hobson Street')
    await expect(summary.last()).toContainText('sundance')

    // Changing the address by hand comes back here
    await page.getByRole('link', { name: /Change.*address/ }).click()
    await expect(page).toHaveURL(/defra-postcode\?change=true/)
    await page.getByRole('link', { name: 'Enter the address manually' }).click()
    await expect(page).toHaveURL(/defra-address-manual/)
    await page.getByLabel('Address line 1').fill('1 Manual Street')
    await page.getByLabel('Town or city').fill('Macclesfield')
    await page.getByLabel('Postcode').fill('SK11 8BD')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/defra-check-answers`)
    await expect(summary.last()).toContainText('1 Manual Street, Macclesfield')

    await page
      .getByRole('button', { name: 'Confirm and complete registration' })
      .click()
    // The registration email for an individual, then signing in carries on
    await expect(page).toHaveURL(`${base}/defra-registered-individual`)
    await expect(page.locator('main')).toContainText('Hello John,')
    await expect(page.locator('main')).toContainText(
      /Contact Support ID is BA\d{6}-[A-Z]\d-\d{4}-[A-Z]\d-\d{4}\./
    )
    await expect(page.locator('main')).not.toContainText('on behalf of')
    await page.getByRole('link', { name: 'Sign in to your account' }).click()
    await expect(page).toHaveURL(`${base}/your-address`)
    await expect(page.locator('main')).not.toContainText('company address')
    await page.getByLabel('Address line 1').fill('53 Business Lane')
    await page.getByLabel('Town or city').fill('Business')
    await page.getByLabel('Postcode').fill('LP1 7RF')
    await page.getByRole('button', { name: 'Confirm' }).click()
    await expect(page).toHaveURL(`${base}/review-your-details`)
    await expect(page.locator('.govuk-summary-list')).toContainText(
      'John Smith'
    )
  })

  test('a business registers and becomes a company when the email says so', async ({
    page
  }) => {
    await registerStart(page, 'new-company@example.com')
    await atRegistrationType(page)
    await page.getByLabel(/Yes, and I have permission/).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/defra-trading-uk`)
    // The business pages wear the "Your Defra account" bar
    await expect(
      page.locator('.govuk-service-navigation__service-name')
    ).toContainText('Your Defra account')
    await expect(
      page.getByRole('link', { name: 'Manage account' })
    ).toHaveCount(1)
    await expect(page.locator('.govuk-caption-l')).toContainText(
      'Register new Defra account'
    )

    await page.getByLabel('Yes', { exact: true }).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/defra-has-crn`)
    await page.getByLabel('Yes', { exact: true }).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/defra-crn`)
    await page.getByLabel('Company registration number').fill('09084488')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/defra-confirm-business`)
    await expect(page.locator('.govuk-inset-text')).toContainText('ACME LTD')
    await page.getByRole('button', { name: 'Confirm and continue' }).click()
    await expect(page).toHaveURL(`${base}/defra-business-contact`)
    await page.getByLabel('Telephone number').fill('07387 202019')
    await page.getByLabel('Email address').fill('hello@acme.com')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/defra-business-check-answers`)
    await expect(page.locator('main')).toContainText('09084488')
    await expect(page.locator('main')).toContainText('hello@acme.com')

    await page.getByRole('button', { name: 'Accept and continue' }).click()
    // The registration email for a business names the company
    await expect(page).toHaveURL(`${base}/defra-registered-business`)
    await expect(page.locator('main')).toContainText(
      'registered to use Defra online services on behalf of ACME LTD'
    )
    await expect(page.locator('main')).toContainText('Contact Support ID')
    await page.getByRole('link', { name: 'Sign in to your account' }).click()
    await expect(page).toHaveURL(`${base}/your-address`)
    await expect(page.locator('main')).toContainText('company address')
  })

  test('a business with no registration number is an agent by default', async ({
    page
  }) => {
    await registerStart(page, 'new@example.com')
    await atRegistrationType(page)
    await page.getByLabel(/Yes, and I have permission/).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('No', { exact: true }).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/defra-has-crn`)
    await page.getByLabel('No', { exact: true }).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/defra-business-contact`)
    await page.getByLabel('Telephone number').fill('07387 202019')
    await page.getByLabel('Email address').fill('hello@acme.com')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/defra-business-check-answers`)
    await expect(page.locator('main')).toContainText('Not provided')
    await page.getByRole('button', { name: 'Accept and continue' }).click()
    await expect(page).toHaveURL(`${base}/defra-registered-business`)
    await page.getByRole('link', { name: 'Sign in to your account' }).click()
    await expect(page).toHaveURL(`${base}/developer-details`)
    await expect(page.locator('.app-organisation-bar')).toHaveCount(1)
  })

  test('an invited employee gives their own details and acts for the business', async ({
    page
  }) => {
    await registerStart(page, 'new-employee@example.com')
    // No business or individual question: straight to their own details
    await expect(page).toHaveURL(`${base}/defra-name`)
    await page.getByLabel('First name').fill('Fabien')
    await page.getByLabel('Last name').fill('Saujot')
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('Telephone number').fill('07387 202019')
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('Postcode').fill('SK11 8BD')
    await page.getByRole('button', { name: 'Find address' }).click()
    await page.getByLabel('Select your address').selectOption({
      label: '84 Hobson Street, Macclesfield, Cheshire, SK11 8BD'
    })
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('Memorable word').fill('sundance')
    await page.getByLabel('Hint question').fill('First school?')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/defra-check-answers`)
    await page
      .getByRole('button', { name: 'Confirm and complete registration' })
      .click()

    // The employee email: the administrator finishes setting them up
    await expect(page).toHaveURL(`${base}/defra-registered-employee`)
    await expect(page.locator('main')).toContainText(
      'Your registration for ACME LTD is complete'
    )
    await expect(page.locator('main')).toContainText('Hello Fabien,')
    await expect(page.locator('main')).toContainText('What happens next?')
    await expect(page.locator('main')).toContainText(
      'tasks you can perform on behalf of ACME LTD'
    )
    // They act for the business, so they get the company's pages
    await page.getByRole('link', { name: 'Sign in to your account' }).click()
    await expect(page).toHaveURL(`${base}/your-address`)
    await expect(page.locator('main')).toContainText('company address')
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

  test('other emails skip registration', async ({ page }) => {
    await reachSignIn(page)
    await signIn(page, 'individual@example.com')
    await expect(page).toHaveURL(`${base}/your-address`)
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
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/quote-reference`)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/email`)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/retrieve-email`)
    await page.getByRole('link', { name: 'Retrieve the quote details' }).click()
    await expect(page).toHaveURL(`${base}/review-quote-details`)
    // Blanks were filled from the sample answers
    await expect(page.locator('.govuk-summary-list')).toContainText(
      'developer@example.com'
    )
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/accept-levy`)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/variation`)
    // The sample answers say it is a variation of a committed application
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/original-committed`)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/original-reference`)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/sign-in-method`)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/one-login-start`)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/one-login-password`)
    await page.getByRole('button', { name: 'Continue' }).click()
    // The sample sign-in email is an agent's
    await expect(page).toHaveURL(`${base}/developer-details`)
    await page.getByRole('button', { name: 'Confirm' }).click()
    await expect(page).toHaveURL(`${base}/review-developer-details`)
    await expect(page.locator('.govuk-summary-list')).toContainText(
      'Development Road'
    )

    // The footer link brings the errors back
    await page.goto(`${base}/quote-reference`)
    await page.getByRole('link', { name: 'Turn errors on' }).click()
    await expect(page).toHaveURL(`${base}/quote-reference?errors=true`)
    await page.getByLabel(/NRL reference/).fill('')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.locator('.govuk-error-summary')).toBeVisible()
  })
})

test.describe('nrf-request-to-use-1 amending the quote', () => {
  // The development details are the quote journey's own pages, borrowed
  // with the way back in `nav` (see content/README.md)
  const quote = '/nrf-quote-7'
  const review = `${base}/review-quote-details`
  const serviceNav = '.govuk-service-navigation__service-name'

  test('changing the units borrows the quote page and comes back', async ({
    page
  }) => {
    await retrieveQuote(page)
    await page
      .getByRole('link', { name: /Change.*number of housing units/ })
      .click()
    await expect(page).toHaveURL(`${quote}/units?change=true&nav=${review}`)
    // The borrowed page wears the request-to-use header
    await expect(page.locator(serviceNav)).toContainText(
      `PROTOTYPE - ${journey.serviceName}`
    )
    await expect(page.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      review
    )
    await page.getByLabel(/maximum number of units/).fill('120')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(review)
    await expect(page.locator('.govuk-summary-list')).toContainText('120')

    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/levy-increased`)
    await expect(page.locator('.govuk-hint')).toContainText('£30,000')
  })

  test('deleting the quote details uses the quote journey and starts afresh', async ({
    page
  }) => {
    await retrieveQuote(page)
    await page
      .getByRole('link', { name: /Change.*number of housing units/ })
      .click()
    await page.getByLabel(/maximum number of units/).fill('120')
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/levy-increased`)

    await page.getByLabel(/No, delete/).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${quote}/delete-quote?nav=${review}`)
    await expect(page.locator(serviceNav)).toContainText(
      `PROTOTYPE - ${journey.serviceName}`
    )
    await expect(page.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      review
    )
    await expect(page.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
      'href',
      review
    )

    await page.getByRole('button', { name: 'Delete' }).click()
    await expect(page).toHaveURL(`${quote}/delete-confirmation`)
    await expect(page.locator('.govuk-panel__title')).toContainText('deleted')

    // Retrieving again, even with the same reference, gives the quoted
    // figures afresh rather than the amended ones
    await retrieveQuote(page)
    await expect(page.locator('.govuk-summary-list')).toContainText('100')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/accept-levy`)
    await expect(page.locator('main')).toContainText('£25,000')
    await expect(page.getByLabel(/No, delete/)).not.toBeChecked()
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
      ['planning-type', { 'planning-type': 'Full planning permission' }],
      ['housing', { housing: 'Yes' }],
      ['units', { 'unit-count': '120' }],
      ['redline-map', { 'has-redline-boundary-file': 'Draw on a map' }],
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
      const response = await page.request.post(`${quote}/${id}`, {
        form,
        maxRedirects: 0
      })
      expect(response.status(), id).toBe(303)
    }
    await page.goto(`${quote}/check-your-answers`)
    await expect(page.locator('.govuk-summary-list')).toContainText('Added')
    await page.getByRole('button', { name: 'Confirm and submit' }).click()
    await expect(page).toHaveURL(`${quote}/confirmation`)
    const minted = (await page.locator('.govuk-panel__body').innerText()).match(
      /NRL-\d{6}/
    )[0]

    // The user comes to request to use afresh: nothing is filled in
    await page.goto(`${base}/have-nrl-reference`)
    await page.getByLabel('Yes', { exact: true }).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/quote-reference`)
    await expect(page.getByLabel(/NRL reference/)).toHaveValue('')
    await page.getByLabel(/NRL reference/).fill(minted)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/email`)
    await expect(page.getByLabel(/email address/)).toHaveValue('')

    // Typing the minted reference pulls that quote up
    await retrieveQuote(page, minted)
    await expect(page.locator('.govuk-summary-list')).toContainText('120')

    // Any other reference retrieves the fixture quote instead
    await retrieveQuote(page, 'NRL-000001')
    await expect(page.locator('.govuk-summary-list')).toContainText('100')
  })

  test('the delete link on check your answers also comes back here', async ({
    page
  }) => {
    await retrieveQuote(page)
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel(/Yes, accept/).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('No', { exact: true }).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await signIn(page, 'agent@example.com')
    await page.getByLabel('Full name').fill('A Developer')
    await page.getByLabel('Address line 1').fill('Development Road')
    await page.getByLabel('Town or city').fill('Development')
    await page.getByLabel('Postcode').fill('DV1 6RP')
    await page.getByRole('button', { name: 'Confirm' }).click()
    await page.getByRole('button', { name: 'Confirm' }).click()
    await expect(page).toHaveURL(`${base}/placeholder`)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/check-your-answers`)

    const cya = `${base}/check-your-answers`
    await expect(
      page.getByRole('link', { name: /Change.*planning permission type/ })
    ).toHaveAttribute('href', `${quote}/planning-type?change=true&nav=${cya}`)
    await page.getByRole('link', { name: /Delete.*quote details/ }).click()
    await expect(page).toHaveURL(`${quote}/delete-quote?nav=${cya}`)
    // Signed in as an agent: the borrowed page keeps the organisation bar
    await expect(page.locator('.app-organisation-bar')).toContainText(
      'Organisation name'
    )
    await expect(
      page.getByRole('link', { name: 'Change organisation' })
    ).toHaveAttribute('href', `${base}/sign-in-method`)
    await page.getByRole('link', { name: 'Cancel' }).click()
    await expect(page).toHaveURL(cya)
  })

  test('too many units means not enough capacity', async ({ page }) => {
    await retrieveQuote(page)
    await page
      .getByRole('link', { name: /Change.*number of housing units/ })
      .click()
    await page.getByLabel(/maximum number of units/).fill('16000')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(review)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/not-enough-capacity`)
    await expect(
      page.getByRole('link', { name: /Habitat Regulations/ })
    ).toHaveAttribute(
      'href',
      'https://www.gov.uk/guidance/habitats-regulations-assessments-protecting-a-european-site'
    )
  })

  test('no reference sends the user to get a quote', async ({ page }) => {
    await page.goto(`${base}/have-nrl-reference`)
    await page.getByLabel('No', { exact: true }).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL('/nrf-quote-7/planning-type')
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
      '/nrf-quote-7/delete-quote',
      '/nrf-quote-7/housing',
      '/nrf-quote-7/map',
      '/nrf-quote-7/planning-type',
      '/nrf-quote-7/units'
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

  async function reachSignIn(page) {
    await retrieveQuote(page)
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel(/Yes, accept/).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/variation`)
    await page.getByLabel('No', { exact: true }).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/sign-in-method`)
  }

  async function createOneLogin(page, email) {
    await reachSignIn(page)
    await page.getByLabel(/GOV.UK One Login/).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/one-login-start`)
    // The Create button is a link (role button) to the create flow; Sign in
    // still submits
    await page
      .getByRole('button', { name: 'Create your GOV.UK One Login' })
      .click()
    await expect(page).toHaveURL(`${base}/one-login-create-email`)
    await expect(page).toHaveTitle(/GOV.UK One Login$/)

    await page.getByLabel('Enter your email address').fill(email)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/one-login-check-email`)
    await expect(page.locator('.govuk-inset-text')).toContainText(email)
    await page.getByLabel('Enter the 6 digit code').fill('123456')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/one-login-create-password`)

    await page.getByLabel('Enter a password').fill('not-a-real-password1')
    await page.getByLabel('Re-type password').fill('not-a-real-password1')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/one-login-security-codes`)
  }

  test('creating a One Login with an authenticator app signs in', async ({
    page
  }) => {
    await createOneLogin(page, 'agent@example.com')
    await page.getByLabel('Authenticator app').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/one-login-authenticator`)
    await expect(page.locator('img[src$="one-login-qr-code.svg"]')).toHaveCount(
      1
    )
    await expect(
      page.getByRole('link', {
        name: 'Choose another way to get security codes'
      })
    ).toHaveAttribute('href', `${base}/one-login-security-codes`)
    await page.getByLabel('Enter the code').fill('123456')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/one-login-created`)
    await page.getByRole('button', { name: 'Continue' }).click()
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
    await page.getByLabel(/Text message/).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/one-login-phone-number`)
    await page.getByLabel('Enter your mobile phone number').fill('07700 900123')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/one-login-check-phone`)
    await expect(page.locator('main')).toContainText('07700 900123')
    await page.getByLabel('Enter the 6 digit security code').fill('123456')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/one-login-created`)
    await page.getByRole('button', { name: 'Continue' }).click()
    // An email containing "new" still registers a Defra account first
    await expect(page).toHaveURL(`${base}/defra-register`)
  })

  async function reachGateway(page) {
    await reachSignIn(page)
    await page.getByLabel(/Government Gateway/).check()
    await page.getByRole('button', { name: 'Continue' }).click()
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
      'Keeping your information secure'
    )
    await expect(page).toHaveTitle(/Sign in using Government Gateway - GOV.UK$/)
  }

  test('signing in with Government Gateway reads the user ID', async ({
    page
  }) => {
    await reachGateway(page)
    await page.getByLabel('Government Gateway user ID').fill('company')
    await page
      .getByRole('textbox', { name: 'Password', exact: true })
      .fill('not-a-real-password')
    await page.getByRole('button', { name: 'Sign in' }).click()
    // A company gives its own address
    await expect(page).toHaveURL(`${base}/your-address`)
  })

  test('creating Government Gateway sign in details mints a user ID', async ({
    page
  }) => {
    await reachGateway(page)
    // A link written as ./government-gateway-email resolves to this journey
    await page.getByRole('link', { name: 'Create sign in details' }).click()
    await expect(page).toHaveURL(`${base}/government-gateway-email`)
    await page.getByLabel('Email address').fill('agent@example.com')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/government-gateway-confirm-email`)
    await expect(page.locator('main')).toContainText('agent@example.com')
    await page.getByLabel('Confirmation code').fill('DNCLRK')
    await page.getByRole('button', { name: 'Confirm' }).click()
    await expect(page).toHaveURL(`${base}/government-gateway-email-confirmed`)
    await page.getByRole('button', { name: 'Confirm' }).click()
    await expect(page).toHaveURL(`${base}/government-gateway-name`)
    await page.getByLabel('What is your full name?').fill('Jane Agent')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/government-gateway-create-password`)
    await page
      .getByRole('textbox', { name: 'Password', exact: true })
      .fill('three random words')
    await page.getByLabel('Confirm your password').fill('three random words')
    await page.getByRole('button', { name: 'Confirm' }).click()
    await expect(page).toHaveURL(`${base}/government-gateway-user-id`)
    await expect(page.locator('.govuk-panel__body')).toHaveText(
      /^\s*(\d\d ){5}\d\d\s*$/
    )
    await expect(page.locator('main')).toContainText('agent@example.com')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${base}/developer-details`)
  })
})
