const { test, expect } = require('@playwright/test')
const { copyOf } = require('./helpers/journey')
const { reachSignIn, signIn } = require('./helpers/request-to-use')

/**
 * The participant details box: a user research aid in the footer of every
 * page (and behind ?participant on any URL) where the facilitator types the
 * participant's name and organisation. The mock accounts then use them in
 * place of the stand-in names, so the Defra account pages and emails read
 * the participant's own details back to them.
 *
 * The box is prototype chrome, not journey copy, so its own labels are
 * literals here; everything on the journey's pages comes from content/.
 */

const requestToUse = copyOf('nrf-request-to-use-1')
const {
  base,
  answer,
  submit,
  fillField,
  fieldBox,
  followLink,
  expectBodyCopy
} = requestToUse

const PARTICIPANT = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  organisation: 'Analytical Engines Ltd'
}

function dialog(page) {
  return page.locator('#research-participant')
}

async function describeParticipant(page, participant = PARTICIPANT) {
  await page.goto(`${base}/start?participant`)
  await expect(dialog(page)).toBeVisible()
  await dialog(page).getByLabel('First name').fill(participant.firstName)
  await dialog(page).getByLabel('Last name').fill(participant.lastName)
  await dialog(page)
    .getByLabel('Organisation or client')
    .fill(participant.organisation)
  await dialog(page).getByRole('button', { name: 'Use these details' }).click()
  // Back on the page it was opened from, without the flag
  await expect(page).toHaveURL(`${base}/start`)
  await expect(dialog(page)).toBeHidden()
}

// From the sign-in choice: register a Defra account as far as the
// business-or-individual question
async function reachRegistrationType(page, email, userType) {
  await reachSignIn(page, userType)
  await signIn(page, email)
  await expect(page).toHaveURL(`${base}/defra-register`)
  await submit(page, 'defra-register')
  await submit(page, 'defra-terms')
  await submit(page, 'defra-what-we-need')
  await expect(page).toHaveURL(`${base}/defra-registration-type`)
}

test.describe('participant details', () => {
  test('the footer link opens the box and ?participant opens it on load', async ({
    page
  }) => {
    await page.goto(`${base}/start`)
    await expect(dialog(page)).toBeHidden()
    const footer = page.locator('.govuk-footer')
    await footer.getByRole('link', { name: 'Participant details' }).click()
    await expect(dialog(page)).toBeVisible()
    // Opened over the page, not by reloading it
    await expect(page).toHaveURL(`${base}/start`)
    // The box's own words are prototype chrome, not journey copy
    await expect(dialog(page).getByRole('heading')).toHaveText(
      'Who is taking part?' // copy-ok
    )
    await dialog(page).getByRole('button', { name: 'Not now' }).click()
    await expect(dialog(page)).toBeHidden()

    await page.goto(`${base}/start?participant`)
    await expect(dialog(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog(page)).toBeHidden()
  })

  test('the details are kept for the session and can be forgotten', async ({
    page
  }) => {
    await describeParticipant(page)
    await page.goto(`${base}/have-nrl-reference?participant`)
    await expect(dialog(page).getByLabel('First name')).toHaveValue('Ada')
    await expect(dialog(page).getByLabel('Last name')).toHaveValue('Lovelace')
    await expect(dialog(page).getByLabel('Organisation or client')).toHaveValue(
      'Analytical Engines Ltd'
    )
    await dialog(page).getByRole('button', { name: 'Forget them' }).click()
    await expect(page).toHaveURL(`${base}/have-nrl-reference`)
    await page.goto(`${base}/start?participant`)
    await expect(dialog(page).getByLabel('First name')).toHaveValue('')
    await expect(
      dialog(page).getByRole('button', { name: 'Forget them' })
    ).toHaveCount(0)
  })

  test('an embedded preview has no box', async ({ page }) => {
    await page.goto(`${base}/start?preview=1&embed=1`)
    await expect(dialog(page)).toHaveCount(0)
  })

  test('an individual registering finds their name filled in and is greeted by it', async ({
    page
  }) => {
    await describeParticipant(page)
    await reachRegistrationType(
      page,
      'new-individual@example.com',
      'individual'
    )
    await answer(page, 'defra-registration-type', 'individual')
    await submit(page, 'defra-registration-type')
    await expect(page).toHaveURL(`${base}/defra-name`)
    await expect(fieldBox(page, 'defra-name', 'first-name')).toHaveValue('Ada')
    await expect(fieldBox(page, 'defra-name', 'last-name')).toHaveValue(
      'Lovelace'
    )
    await submit(page, 'defra-name')
    await fillField(page, 'defra-telephone', 'telephone-number', '07387 202019')
    await submit(page, 'defra-telephone')
    await fillField(page, 'defra-postcode', 'postcode', 'SK11 8BD')
    await submit(page, 'defra-postcode')
    await answer(page, 'defra-select-address', 0)
    await submit(page, 'defra-select-address')
    await fillField(page, 'defra-memorable-word', 'memorable-word', 'sundance')
    await fillField(page, 'defra-memorable-word', 'hint-question', 'School?')
    await submit(page, 'defra-memorable-word')
    await expect(page).toHaveURL(`${base}/defra-check-answers`)
    await expect(page.locator('.govuk-summary-list').last()).toContainText(
      'Ada Lovelace'
    )
    await submit(page, 'defra-check-answers')
    await expect(page).toHaveURL(`${base}/defra-registered-individual`)
    await expectBodyCopy(page, 'defra-registered-individual', 'Hello Ada,', {
      defraName: { firstName: 'Ada' }
    })
    await followLink(page, 'defra-registered-individual', './$next')
    await expect(page).toHaveURL(`${base}/your-address`)
    await expect(fieldBox(page, 'your-address', 'full-name')).toHaveValue(
      'Ada Lovelace'
    )
  })

  test('a business registering is named after the organisation given', async ({
    page
  }) => {
    await describeParticipant(page)
    await reachRegistrationType(page, 'new-company@example.com', 'organisation')
    await answer(page, 'defra-registration-type', 'business')
    await submit(page, 'defra-registration-type')
    // The business pages' bar shows the participant's name
    await expect(page.locator('.govuk-service-navigation')).toContainText(
      'Ada Lovelace'
    )
    await answer(page, 'defra-trading-uk', 'Yes')
    await submit(page, 'defra-trading-uk')
    await answer(page, 'defra-has-crn', 'Yes')
    await submit(page, 'defra-has-crn')
    await fillField(
      page,
      'defra-crn',
      'company-registration-number',
      '09084488'
    )
    await submit(page, 'defra-crn')
    // The business found is the organisation given, not the fixture
    await expect(page).toHaveURL(`${base}/defra-confirm-business`)
    await expect(page.locator('.govuk-inset-text')).toContainText(
      'Analytical Engines Ltd'
    )
    await expect(page.locator('.govuk-inset-text')).not.toContainText(
      'ACME LTD'
    )
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
      'ada@example.com'
    )
    await submit(page, 'defra-business-contact')
    await expect(page).toHaveURL(`${base}/defra-business-check-answers`)
    await expect(page.locator('.govuk-summary-list').last()).toContainText(
      'Analytical Engines Ltd'
    )
    await submit(page, 'defra-business-check-answers')
    await expect(page).toHaveURL(`${base}/defra-registered-business`)
    await expectBodyCopy(
      page,
      'defra-registered-business',
      'on behalf of Analytical Engines Ltd',
      { account: { businessName: 'Analytical Engines Ltd' } }
    )
    await expectBodyCopy(
      page,
      'defra-registered-business',
      'Hello Ada Lovelace,',
      {
        account: { fullName: 'Ada Lovelace' }
      }
    )
  })

  test('the employee invitation email names the organisation given', async ({
    page
  }) => {
    await describeParticipant(page)
    await reachSignIn(page, 'employee')
    await page.goBack()
    await expect(page).toHaveURL(`${base}/defra-account-employee-email`)
    await expectBodyCopy(
      page,
      'defra-account-employee-email',
      'on behalf of Analytical Engines Ltd',
      { researchParticipant: { organisation: 'Analytical Engines Ltd' } }
    )
    await expect(page.locator('main')).not.toContainText('Bloggs Developers')
  })

  test('an agent acts for the client given', async ({ page }) => {
    await describeParticipant(page)
    await reachSignIn(page, 'agent')
    await signIn(page, 'agent@example.com')
    await expect(page).toHaveURL(`${base}/developer-details`)
    await expect(page.locator('.app-organisation-bar')).toContainText(
      'Analytical Engines Ltd'
    )
  })
})
