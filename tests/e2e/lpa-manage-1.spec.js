const { test, expect } = require('@playwright/test')
const { copyOf } = require('./helpers/journey')
const {
  loadStore,
  allRecords,
  MOCK_OFFICER,
  RECORDS_PER_PAGE
} = require('../../app/lib/lpa-manage-1/hooks')

/**
 * lpa-manage-1: a planning officer signs in with the mock GOV.UK One Login,
 * adds a developer record from an NRL reference, reviews it and sets its
 * planning application's stage, and
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
  actionLocator,
  optionLocator,
  text,
  expectHeading,
  heading,
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

    // Confirming shows the first three details and the boundary
    await retrieve(page, waiting.reference)
    await expectHeading(page, 'confirm-commitment')
    await expect(page.locator('main')).toContainText(waiting.developer)
    await expect(page.locator('.govuk-summary-list__row')).toHaveCount(3)
    await expect(page.locator('.app-boundary-map')).toHaveCount(1)
    await submit(page, 'confirm-commitment')

    // The planning reference adds the record: no check your answers
    await expectHeading(page, 'planning-reference')
    await fillAnswer(page, 'planning-reference', '26/00001/FUL')
    await submit(page, 'planning-reference')

    await expect(page).toHaveURL(`${base}/view-record?ref=${waiting.reference}`)
    await expectHeading(page, 'view-record', { record: waiting })
    await expect(page.locator('main')).toContainText('26/00001/FUL')
    await expect(page.locator('.govuk-notification-banner')).toContainText(
      text('view-record', 'added')
    )
    const timeline = page.locator('.app-timeline')
    await expect(timeline).toContainText(text('view-record', 'timelineAdded'))
    await expect(timeline).toContainText(MOCK_OFFICER)
    // No review option is chosen for the officer
    await expect(page.locator('input[name="new-status"]:checked')).toHaveCount(
      0
    )

    // The new record leads the dashboard's table
    await actionLocator(page, 'view-record', 'secondary').click()
    await expectHeading(page, 'dashboard')
    await expect(
      page.locator('.app-staff-table tbody tr').first()
    ).toContainText(waiting.reference)
  })

  test('the full certificate sits behind the record', async ({ page }) => {
    await signIn(page)
    await page.goto(`${base}/view-record?ref=${recorded.reference}`)
    await page
      .getByRole('button', { name: text('view-record', 'viewCertificate') })
      .click()
    await expect(page).toHaveURL(
      `${base}/certificate?ref=${recorded.reference}`
    )
    await expectHeading(page, 'certificate')
    await expect(page.locator('main')).toContainText(recorded.edp)
    await expect(page.locator('.app-boundary-map')).toHaveCount(1)

    const crumbs = page.locator('.govuk-breadcrumbs')
    // The trail ends on this page, as text rather than a link
    const current = crumbs.locator('[aria-current="page"]')
    await expect(current).toHaveText(heading('certificate'))
    await expect(current.getByRole('link')).toHaveCount(0)
    await crumbs.getByRole('link', { name: recorded.reference }).click()
    await expectHeading(page, 'view-record', { record: recorded })

    // The button at the bottom leads back to the record too
    await page.goto(`${base}/certificate?ref=${recorded.reference}`)
    await page
      .getByRole('button', { name: text('certificate', 'backToRecord') })
      .click()
    await expectHeading(page, 'view-record', { record: recorded })
  })

  test('reviews a record, then sets its planning application stage', async ({
    page
  }) => {
    const forReview = store.commitments.find(
      (entry) => entry.record && entry.record.status === 'for-review'
    )
    const viewPath = `${base}/view-record?ref=${forReview.reference}`
    const items = page.locator('.app-timeline__item')
    const radios = page.locator('input[name="new-status"]')
    await signIn(page)
    await page.goto(viewPath)
    const entries = await items.count()

    // For review: the three review options, none chosen
    await expect(radios).toHaveCount(3)
    await expect(page.locator('input[name="new-status"]:checked')).toHaveCount(
      0
    )
    await submit(page, 'view-record')
    await expectError(page, 'view-record', 'required')

    // Later keeps it For review, notes it on the timeline and returns to
    // the dashboard, which says so
    await answer(page, 'view-record', 'review-later')
    await submit(page, 'view-record')
    await expectHeading(page, 'dashboard')
    await expect(page.locator('.govuk-notification-banner')).toContainText(
      text('dashboard', 'updated').replace('{reference}', forReview.reference)
    )
    const row = page.locator('.app-staff-table tbody tr').first()
    await expect(row).toContainText(forReview.reference)
    await expect(row).toContainText(store.statuses['for-review'].label)
    await page.goto(viewPath)
    await expect(items).toHaveCount(entries + 1)
    await expect(items.first()).toContainText(
      text('view-record', 'timelineReviewLater')
    )

    // Reviewing moves it on: the options become the planning stages
    await answer(page, 'view-record', 'reviewed')
    await submit(page, 'view-record')
    await expectHeading(page, 'dashboard')
    await page.goto(viewPath)
    await expect(page.locator('h1 .govuk-tag')).toHaveText(
      store.statuses.reviewed.label
    )
    await expect(radios).toHaveCount(4)
    await expect(optionLocator(page, 'view-record', 'reviewed')).toHaveCount(0)
    await submit(page, 'view-record')
    await expectError(page, 'view-record', 'stageRequired')
    await answer(page, 'view-record', 'judicial-review')
    await submit(page, 'view-record')
    await expectHeading(page, 'dashboard')
    const stage = store.planningStages['judicial-review']
    await expect(row).toContainText(stage)
    await page.goto(viewPath)
    await expect(items).toHaveCount(entries + 3)
    await expect(items.first()).toContainText(
      `${text('view-record', 'timelineStage')} ${stage}`
    )
    await expect(page.locator('h1 .govuk-tag')).toHaveText(
      store.statuses.reviewed.label
    )
  })

  test('rejecting needs a comment and is final', async ({ page }) => {
    const forReview = store.commitments.find(
      (entry) => entry.record && entry.record.status === 'for-review'
    )
    const viewPath = `${base}/view-record?ref=${forReview.reference}`
    await signIn(page)
    await page.goto(viewPath)
    const entries = await page.locator('.app-timeline__item').count()

    await answer(page, 'view-record', 'rejected')
    await expect(page.locator('.govuk-warning-text')).toContainText(
      text('view-record', 'rejectWarning')
    )
    await submit(page, 'view-record')
    await expectError(page, 'view-record', 'comment')
    await expect(optionLocator(page, 'view-record', 'rejected')).toBeChecked()
    await page
      .getByLabel(text('view-record', 'commentLabel'), { exact: true })
      .fill('The boundary does not match the application')
    await submit(page, 'view-record')
    await expectHeading(page, 'dashboard')

    await page.goto(viewPath)
    const rejected = store.statuses.rejected.label
    await expect(page.locator('h1 .govuk-tag')).toHaveText(rejected)
    const latest = page.locator('.app-timeline__item').first()
    await expect(latest).toContainText(rejected)
    await expect(latest).toContainText(
      'The boundary does not match the application'
    )
    await expect(page.locator('.app-timeline__item')).toHaveCount(entries + 1)

    // A rejected record's status cannot change: a warning replaces the
    // radios
    await expect(page.locator('.govuk-warning-text')).toContainText(
      text('view-record', 'rejectedFinal')
    )
    await expect(optionLocator(page, 'view-record', 'rejected')).toHaveCount(0)
  })

  test('the dashboard’s cards open the table filtered to them', async ({
    page
  }) => {
    await signIn(page)
    await answer(page, 'what-would-you-like-to-do', 'view')
    await submit(page, 'what-would-you-like-to-do')
    await expectHeading(page, 'dashboard')

    const records = allRecords({})
    const counted = [
      records.filter((r) => r.status.shown === 'for-review'),
      records.filter((r) => r.status.shown === 'rejected'),
      records.filter(
        (r) =>
          r.status.shown === 'reviewed' && r.planningStage.value === 'applied'
      ),
      records.filter((r) => r.overdue)
    ]
    const labels = [
      'forReviewCount',
      'rejectedCount',
      'reviewedActiveCount',
      'overdueCount'
    ]
    const cards = page.locator('.app-staff-card')
    await expect(cards).toHaveCount(4)
    for (const [index, matching] of counted.entries()) {
      await expect(cards.nth(index)).toContainText(String(matching.length))
      await expect(cards.nth(index)).toContainText(
        text('dashboard', labels[index])
      )
    }

    // Overdue actions: the table filtered to them
    await cards.nth(3).getByRole('link').click()
    await expectHeading(page, 'records')
    const rows = page.locator('.app-staff-table tbody tr')
    await expect(rows).toHaveCount(counted[3].length)

    // The filter's summary counts the filters set; clearing them shows
    // every record again
    const summary = page.getByText(text('records', 'filterSummary'))
    await expect(summary).toHaveText(`${text('records', 'filterSummary')} (1)`)
    await summary.click()
    await page
      .getByRole('link', { name: text('records', 'clearFilters') })
      .click()
    await expect(summary).toHaveText(text('records', 'filterSummary'))
    await expect(rows).toHaveCount(Math.min(records.length, RECORDS_PER_PAGE))

    // Reviewed with active planning applications: two filters at once
    await page.goto(`${base}/dashboard`)
    await cards.nth(2).getByRole('link').click()
    await expect(rows).toHaveCount(counted[2].length)
    await expect(summary).toHaveText(`${text('records', 'filterSummary')} (2)`)
    await expect(
      page.getByLabel(store.statuses.reviewed.label, { exact: true })
    ).toBeChecked()
    await expect(
      page.getByLabel(store.planningStages.applied, { exact: true })
    ).toBeChecked()
  })

  test('the table searches, filters, sorts and pages the records', async ({
    page
  }) => {
    await signIn(page)
    await page.goto(`${base}/records`)
    await expectHeading(page, 'records')
    const records = allRecords({})
    const rows = page.locator('.app-staff-table tbody tr')
    await expect(rows).toHaveCount(Math.min(records.length, RECORDS_PER_PAGE))

    // Sorting by a heading, then the other way; the pages keep the sort
    const heading = page.locator('.app-staff-table th', {
      hasText: text('records', 'columns').reference
    })
    await heading.getByRole('link').click()
    await expect(heading).toHaveAttribute('aria-sort', 'ascending')
    const references = records.map((record) => record.reference).sort()
    await expect(rows.first()).toContainText(references[0])
    await heading.getByRole('link').click()
    await expect(heading).toHaveAttribute('aria-sort', 'descending')
    await expect(rows.first()).toContainText(references[references.length - 1])
    await page.locator('.govuk-pagination__next a').click()
    await expect(page).toHaveURL(
      `${base}/records?_sort=reference&_dir=desc&_page=2`
    )
    await expect(rows).toHaveCount(records.length - RECORDS_PER_PAGE)
    await expect(rows.last()).toContainText(references[0])

    // Filtering by planning application stage
    await page.getByText(text('records', 'filterSummary')).click()
    await page.getByLabel(store.planningStages.refused, { exact: true }).check()
    await page
      .getByRole('button', { name: text('records', 'applyFilters') })
      .click()
    const refused = records.filter(
      (record) => record.planningStage.value === 'refused'
    )
    await expect(rows).toHaveCount(refused.length)

    // Searching keeps the filter
    await page
      .getByLabel(text('records', 'searchLabel'), { exact: true })
      .fill(refused[0].developer)
    await page
      .getByRole('button', { name: text('records', 'searchButton') })
      .click()
    await expect(rows).toHaveCount(
      refused.filter((record) => record.developer === refused[0].developer)
        .length
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
