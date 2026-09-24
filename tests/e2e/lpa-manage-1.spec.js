const { test, expect } = require('@playwright/test')
const { copyOf } = require('./helpers/journey')
const {
  loadStore,
  allRecords,
  MOCK_OFFICER
} = require('../../app/lib/lpa-manage-1/hooks')

/**
 * lpa-manage-1: a planning officer signs in with the mock GOV.UK One Login,
 * adds a developer record from an NRL reference, changes its status, and
 * finds it on the dashboard and in the table of records.
 *
 * Headings, labels, buttons and errors come from content/lpa-manage-1
 * through the helpers; references and names come from records.yaml.
 */

const {
  journey,
  base,
  answer,
  fillAnswer,
  submit,
  action,
  text,
  option,
  expectHeading,
  expectError,
  expectOnPage
} = copyOf('lpa-manage-1')

const store = loadStore()
// A commitment the council has no record of yet, and one it already has
const waiting = store.commitments.find((entry) => !entry.record)
const recorded = store.commitments.find((entry) => entry.record)

async function signIn(page) {
  await page.goto(`${base}/${journey.start}`)
  await expectOnPage(page, 'one-login-email')
  await fillAnswer(page, 'one-login-email', 'officer@scarfolk.gov.uk')
  await submit(page, 'one-login-email')
  await fillAnswer(page, 'one-login-password', 'not-a-real-password')
  await submit(page, 'one-login-password')
  await expectOnPage(page, 'what-would-you-like-to-do')
}

async function retrieve(page, reference) {
  await fillAnswer(page, 'retrieve-commitment', reference)
  await submit(page, 'retrieve-commitment')
}

test.describe('lpa-manage-1: manage commitments', () => {
  test('the staff header shows the service, the officer and the council', async ({
    page
  }) => {
    await signIn(page)
    const header = page.locator('.app-staff-header')
    await expect(header).toContainText(journey.serviceName)
    await expect(header).toContainText(MOCK_OFFICER)
    await expect(header).toContainText(journey.header.organisation)
    await expect(page.locator('.govuk-phase-banner')).toBeVisible()

    // The Menu opens its panel of links
    const menu = page.locator('.app-staff-header__toggle--menu')
    await expect(page.locator('#app-staff-header-menu')).toBeHidden()
    await menu.click()
    await expect(menu).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('#app-staff-header-menu')).toBeVisible()
  })

  test('adds a developer record from an NRL reference', async ({ page }) => {
    await signIn(page)
    await answer(page, 'what-would-you-like-to-do', 'create')
    await submit(page, 'what-would-you-like-to-do')
    await expectHeading(page, 'retrieve-commitment')

    await submit(page, 'retrieve-commitment')
    await expectError(page, 'retrieve-commitment', 'required')
    await retrieve(page, 'NRL-12')
    await expectError(page, 'retrieve-commitment', 'format')
    await retrieve(page, recorded.reference)
    await expectError(page, 'retrieve-commitment', 'recorded')

    await retrieve(page, waiting.reference)
    await expectHeading(page, 'confirm-commitment')
    await expect(page.locator('main')).toContainText(waiting.developer)
    await expect(page.locator('.app-boundary-map')).toHaveCount(1)
    await submit(page, 'confirm-commitment')

    await expectHeading(page, 'planning-reference')
    await fillAnswer(page, 'planning-reference', '26/00001/FUL')
    await submit(page, 'planning-reference')

    await expectHeading(page, 'check-your-answers')
    await expect(page.locator('main')).toContainText('26/00001/FUL')
    await submit(page, 'check-your-answers')
    await expectError(page, 'check-your-answers')
    await answer(page, 'check-your-answers', 'Yes')
    await submit(page, 'check-your-answers')

    await expect(page).toHaveURL(`${base}/view-record?ref=${waiting.reference}`)
    await expectHeading(page, 'view-record', { record: waiting })
    await expect(page.locator('.govuk-notification-banner')).toContainText(
      text('view-record', 'added')
    )
    const timeline = page.locator('.app-timeline')
    await expect(timeline).toContainText(text('view-record', 'timelineAdded'))
    await expect(timeline).toContainText(MOCK_OFFICER)

    // The new record leads the dashboard's table
    await page.getByRole('button', { name: action('view-record', 1) }).click()
    await expectHeading(page, 'dashboard')
    await expect(
      page.locator('.app-staff-table tbody tr').first()
    ).toContainText(waiting.reference)
  })

  test('changes a record’s status in the popover', async ({ page }) => {
    await signIn(page)
    await page.goto(`${base}/view-record?ref=${recorded.reference}`)
    await page
      .getByRole('button', { name: text('view-record', 'changeStatus') })
      .click()
    const dialog = page.locator('#app-status-dialog')
    await expect(dialog).toBeVisible()
    await dialog
      .getByLabel(option('change-status', 'rejected'), { exact: true })
      .check()
    await dialog
      .getByRole('button', {
        name: journey.byId.get('change-status').content.button
      })
      .click()

    await expect(page).toHaveURL(
      `${base}/view-record?ref=${recorded.reference}`
    )
    await expect(page.locator('.govuk-notification-banner')).toContainText(
      text('view-record', 'statusChanged')
    )
    const rejected = store.statuses.rejected.label
    await expect(page.locator('h1 .govuk-tag')).toHaveText(rejected)
    await expect(page.locator('.app-timeline__item').first()).toContainText(
      rejected
    )

    const entries = await page.locator('.app-timeline__item').count()

    // Reopened, it shows the current status; saving that again changes
    // nothing, so the timeline gains no entry
    await page
      .getByRole('button', { name: text('view-record', 'changeStatus') })
      .click()
    await expect(
      dialog.getByLabel(option('change-status', 'rejected'), { exact: true })
    ).toBeChecked()
    await dialog
      .getByRole('button', {
        name: journey.byId.get('change-status').content.button
      })
      .click()
    await expect(page.locator('.govuk-notification-banner')).toHaveCount(0)
    await expect(page.locator('.app-timeline__item')).toHaveCount(entries)
  })

  test('the change status page asks for a status without JavaScript', async ({
    page
  }) => {
    await signIn(page)
    await page.goto(`${base}/view-record?ref=${recorded.reference}`)
    await page.goto(`${base}/change-status`)
    await submit(page, 'change-status')
    await expectError(page, 'change-status')
  })

  test('the dashboard counts the records and the table searches them', async ({
    page
  }) => {
    await signIn(page)
    await answer(page, 'what-would-you-like-to-do', 'view')
    await submit(page, 'what-would-you-like-to-do')
    await expectHeading(page, 'dashboard')

    const records = allRecords({})
    const expired = records.filter((record) => record.expired).length
    await expect(page.locator('.app-staff-card').nth(2)).toContainText(
      String(expired)
    )

    await page
      .getByRole('button', { name: text('dashboard', 'viewAll') })
      .click()
    await expectHeading(page, 'records')
    await expect(page.locator('.app-staff-table tbody tr')).toHaveCount(
      records.length
    )

    await page
      .getByLabel(text('records', 'searchLabel'), { exact: true })
      .fill(recorded.developer)
    await page
      .getByRole('button', { name: text('records', 'searchButton') })
      .click()
    const matching = records.filter(
      (record) => record.developer === recorded.developer
    )
    await expect(page.locator('.app-staff-table tbody tr')).toHaveCount(
      matching.length
    )

    await page.goto(`${base}/records?_q=no-such-record`)
    await expect(page.locator('main')).toContainText(
      text('records', 'noResults')
    )
  })

  test('signing out returns to GOV.UK One Login', async ({ page }) => {
    await signIn(page)
    await page.goto(`${base}/sign-out`)
    await expectOnPage(page, 'one-login-email')
    await page.goto(`${base}/dashboard`)
    await expectOnPage(page, 'one-login-email')
  })
})
