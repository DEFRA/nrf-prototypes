const { test, expect } = require('@playwright/test')
const { loadJourney, toFlowGraph } = require('../../app/lib/journey-engine')

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

  await page.getByRole('link', { name: 'Retrieve the quote details' }).click()
  await expect(page).toHaveURL(`${base}/review-quote-details`)
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
      await expect(browser.locator(headingSelector).first()).toContainText(
        page.content.heading.replace(/\s+/g, ' ').slice(0, 40)
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
    await expect(page.locator('.govuk-hint')).toContainText('£25,000')
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
    await expect(page).toHaveURL(`${base}/defra-registration-type`)
    await expect(page.locator('.govuk-caption-l')).toContainText(
      'Register Defra account'
    )
  }

  test('an individual registers, finds their address and continues', async ({
    page
  }) => {
    await registerStart(page, 'new-individual@example.com')
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
    await expect(page).toHaveURL(`${base}/your-address`)
    await expect(page.locator('main')).toContainText('company address')
  })

  test('a business with no registration number is an agent by default', async ({
    page
  }) => {
    await registerStart(page, 'new@example.com')
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
    await expect(page).toHaveURL(`${base}/developer-details`)
    await expect(page.locator('.app-organisation-bar')).toHaveCount(1)
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
    await expect(page.locator('.govuk-hint')).toContainText('£25,000')
    await expect(page.getByLabel(/No, delete/)).not.toBeChecked()
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
    await page.getByRole('link', { name: /change the number/ }).click()
    await expect(page).toHaveURL(`${quote}/units?change=true&nav=${review}`)
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
  test('flow and screen wall page lists every screen', async ({ page }) => {
    const response = await page.goto(`/tools/journeys/${journey.id}`)
    expect(response.status()).toBe(200)
    await expect(page.locator('iframe')).toHaveCount(journey.pages.length)
  })

  test('flow diagram renders every node', async ({ page }) => {
    await page.goto(`/tools/journeys/${journey.id}`)
    await expect(
      page.locator('#flow-diagram[data-rendered="true"]')
    ).toHaveCount(1, { timeout: 20000 })
    await expect(page.locator('.flow-node')).toHaveCount(
      toFlowGraph(journey).nodes.length
    )
  })
})
