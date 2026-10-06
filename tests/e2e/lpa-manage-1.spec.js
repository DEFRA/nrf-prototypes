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
 * finds it in the dashboard’s table of records.
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
  option,
  text,
  expectHeading,
  heading,
  expectError,
  expectOnPage,
  pageOf
} = copyOf('lpa-manage-1')

const store = loadStore()
// A commitment the council has no record of yet, and one it already has
const waiting = store.commitments.find((entry) => !entry.record)
const recorded = store.commitments.find((entry) => entry.record)

// Signing in lands on the dashboard, or on "Enter an NRL reference" for a
// council with no records yet (an email with "new" in it)
async function signIn(page, email = 'officer@scarfolk.gov.uk') {
  await page.goto(`${base}/${journey.start}`)
  await expectOnPage(page, 'one-login-email')
  await fillAnswer(page, 'one-login-email', email)
  await submit(page, 'one-login-email')
  await fillAnswer(page, 'one-login-password', 'not-a-real-password')
  await submit(page, 'one-login-password')
  await expectOnPage(
    page,
    email.includes('new') ? 'retrieve-commitment' : 'dashboard'
  )
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

    // The one dropdown, the officer's, holds the menu and account links
    await expect(page.locator('.app-staff-header__toggle')).toHaveCount(1)
    const toggle = page.locator('.app-staff-header__toggle')
    const panel = page.locator('#app-staff-header-account')
    await expect(panel).toBeHidden()
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(panel).toBeVisible()
    for (const link of [
      ...journey.header.menu.links,
      ...journey.header.account
    ]) {
      await expect(panel.getByRole('link', { name: link.text })).toBeVisible()
    }
  })

  test('adds a developer record from an NRL reference', async ({ page }) => {
    await signIn(page)
    await page
      .getByRole('button', { name: text('dashboard', 'addRecord') })
      .click()
    await expectHeading(page, 'retrieve-commitment')
    await expect(page.locator('.govuk-back-link')).toHaveAttribute(
      'href',
      `${base}/dashboard`
    )

    await submit(page, 'retrieve-commitment')
    await expectError(page, 'retrieve-commitment', 'required')
    await retrieve(page, 'NRL-12')
    await expectError(page, 'retrieve-commitment', 'format')

    // The planning reference follows straight on and adds the record: no
    // confirm or check your answers page
    await retrieve(page, waiting.reference)
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
    // with the email they signed in with
    await expect(timeline.locator('.app-timeline__email')).toHaveText(
      '(officer@scarfolk.gov.uk)'
    )
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

  test('an NRL reference already in the records may be a planning variation', async ({
    page
  }) => {
    // The record page's row for the original planning application
    const originalKey = pageOf('view-record').content.rows.find((row) =>
      String(row.value).includes('record.originalPlanningReference')
    ).key
    const main = page.locator('main')
    await signIn(page)

    // Not a variation: the record opens as it is
    await page.goto(`${base}/retrieve-commitment`)
    await retrieve(page, recorded.reference)
    await expectHeading(page, 'planning-variation')
    await submit(page, 'planning-variation')
    await expectError(page, 'planning-variation', 'required')
    await answer(page, 'planning-variation', 'no')
    await submit(page, 'planning-variation')
    await expectHeading(page, 'view-record', { record: recorded })
    await expect(main).not.toContainText(originalKey)

    // A variation takes the new planning application reference and keeps
    // the original
    await page.goto(`${base}/retrieve-commitment`)
    await retrieve(page, recorded.reference)
    await answer(page, 'planning-variation', 'yes')
    await submit(page, 'planning-variation')
    await expectHeading(page, 'planning-variation-reference')
    await fillAnswer(
      page,
      'planning-variation-reference',
      recorded.record.planningReference
    )
    await submit(page, 'planning-variation-reference')
    await expectError(page, 'planning-variation-reference', 'same')
    await fillAnswer(page, 'planning-variation-reference', '26/00003/VAR')
    await submit(page, 'planning-variation-reference')

    await expect(page).toHaveURL(
      `${base}/view-record?ref=${recorded.reference}`
    )
    await expect(main).toContainText(originalKey)
    await expect(main).toContainText(recorded.record.planningReference)
    await expect(main).toContainText('26/00003/VAR')
    await expect(page.locator('.app-timeline__item').first()).toContainText(
      text('view-record', 'timelineVariation')
    )
  })

  test('the history gives each officer’s email', async ({ page }) => {
    const { officers } = loadStore()
    await signIn(page)
    await page.goto(`${base}/view-record?ref=${recorded.reference}`)
    const items = page.locator('.app-timeline__item')
    const count = await items.count()
    for (let i = 0; i < count; i++) {
      const by = recorded.record.history[count - 1 - i].by
      await expect(items.nth(i).locator('.app-timeline__email')).toHaveText(
        `(${officers[by]})`
      )
    }
  })

  test('a variation’s commitment and the original’s record link to each other', async ({
    page
  }) => {
    const linkedKey = pageOf('view-record').content.rows.find((row) =>
      String(row.value).includes('record.linkedText')
    ).key
    const variation = store.commitments.find(
      (entry) => entry.originalReference && !entry.record
    )
    const row = page
      .locator('.govuk-summary-list__row')
      .filter({ hasText: linkedKey })
    await signIn(page)

    // Adding the variation's commitment links it to the original's record
    await page.goto(`${base}/retrieve-commitment`)
    await retrieve(page, variation.reference)
    await fillAnswer(page, 'planning-reference', '26/00004/VAR')
    await submit(page, 'planning-reference')
    await expect(row).toContainText(
      `${variation.originalReference} (${text('view-record', 'linkedOriginal')})`
    )

    // and the original's record links back
    await row.getByRole('link', { name: variation.originalReference }).click()
    await expectHeading(page, 'view-record', {
      record: { reference: variation.originalReference }
    })
    await expect(row).toContainText(
      `${variation.reference} (${text('view-record', 'linkedVariation')})`
    )
    await row.getByRole('link', { name: variation.reference }).click()
    await expect(page).toHaveURL(
      `${base}/view-record?ref=${variation.reference}`
    )
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
    await expect(page.locator('legend')).toHaveText(
      text('view-record', 'planningLegend')
    )
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

  test('rejecting asks why and is final', async ({ page }) => {
    const forReview = store.commitments.find(
      (entry) => entry.record && entry.record.status === 'for-review'
    )
    const viewPath = `${base}/view-record?ref=${forReview.reference}`
    await signIn(page)
    await page.goto(viewPath)
    const entries = await page.locator('.app-timeline__item').count()

    await answer(page, 'view-record', 'rejected')
    await submit(page, 'view-record')
    await expectHeading(page, 'reject-commitment')
    await expect(page.locator('.govuk-warning-text')).toContainText(
      text('reject-commitment', 'rejectWarning')
    )
    // The link beside Confirm goes back without rejecting
    await actionLocator(page, 'reject-commitment', 'link').click()
    await expectHeading(page, 'view-record', { record: forReview })
    await answer(page, 'view-record', 'rejected')
    await submit(page, 'view-record')
    await submit(page, 'reject-commitment')
    await expectError(page, 'reject-commitment', 'required')
    await answer(page, 'reject-commitment', 'mismatch')
    await page
      .getByLabel(text('reject-commitment', 'commentLabel'), { exact: true })
      .fill('The boundary does not match the application')
    await submit(page, 'reject-commitment')
    await expectHeading(page, 'dashboard')

    await page.goto(viewPath)
    const rejected = store.statuses.rejected.label
    await expect(page.locator('h1 .govuk-tag')).toHaveText(rejected)
    const latest = page.locator('.app-timeline__item').first()
    await expect(latest).toContainText(rejected)
    await expect(latest).toContainText(option('reject-commitment', 'mismatch'))
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

  test('a granted outline application takes reserved matters', async ({
    page
  }) => {
    const outline = (entry) =>
      entry.record &&
      entry.record.status === 'reviewed' &&
      store.planningTypes[entry.planningType] === 'Outline'
    const notGranted = store.commitments.find(
      (entry) => outline(entry) && entry.record.planningStage === 'applied'
    )
    const granted = store.commitments.find(
      (entry) =>
        outline(entry) &&
        entry.record.planningStage === 'granted' &&
        (entry.record.reservedMatters || []).length
    )
    const addButton = page.getByRole('button', {
      name: text('view-record', 'addReservedMatters')
    })
    const save = page.getByRole('button', {
      name: text('view-record', 'reservedMattersSave')
    })
    const label = (key) =>
      page.getByLabel(text('view-record', key), { exact: true })
    await signIn(page)

    // Not until the outline application is granted
    await page.goto(`${base}/view-record?ref=${notGranted.reference}`)
    await expect(addButton).toHaveCount(0)
    await answer(page, 'view-record', 'granted')
    await submit(page, 'view-record')
    await expectHeading(page, 'dashboard')
    await page.goto(`${base}/view-record?ref=${notGranted.reference}`)
    await expect(page.locator('#reserved-matters')).toHaveText(
      text('view-record', 'outlineHeading')
    )
    await expect(addButton).toBeVisible()

    // One already granted lists its reserved matters in the planning
    // details
    const viewPath = `${base}/view-record?ref=${granted.reference}`
    await page.goto(viewPath)
    const [existing] = granted.record.reservedMatters
    const details = page.locator('.govuk-summary-list').nth(1)
    await expect(details).toContainText(existing.reference)
    await expect(details).toContainText(existing.description)
    const entries = await page.locator('.app-timeline__item').count()

    await addButton.click()
    await save.click()
    await expectError(page, 'view-record', 'reservedMattersReferenceRequired')
    await expectError(page, 'view-record', 'reservedMattersStatusRequired')
    await expectError(page, 'view-record', 'reservedMattersDescriptionRequired')

    // The same reference twice is refused; the answers are kept
    await label('reservedMattersReferenceLabel').fill(existing.reference)
    await page.getByLabel(store.planningStages.applied, { exact: true }).check()
    await label('reservedMattersDescriptionLabel').fill('Phase 2 (120 homes)')
    await save.click()
    await expectError(page, 'view-record', 'reservedMattersReferenceAdded')
    await expect(label('reservedMattersDescriptionLabel')).toHaveValue(
      'Phase 2 (120 homes)'
    )

    await label('reservedMattersReferenceLabel').fill('2026/0577/REM')
    await save.click()
    await expectHeading(page, 'view-record', { record: granted })
    await expect(page.locator('.govuk-notification-banner')).toContainText(
      text('view-record', 'reservedMattersAdded').replace(
        '{reference}',
        '2026/0577/REM'
      )
    )
    await expect(details).toContainText(existing.reference)
    await expect(details).toContainText('2026/0577/REM')
    await expect(details).toContainText('Phase 2 (120 homes)')
    const items = page.locator('.app-timeline__item')
    await expect(items).toHaveCount(entries + 1)
    await expect(items.first()).toContainText(
      text('view-record', 'timelineReservedMatters')
    )
    await expect(items.first()).toContainText('2026/0577/REM')
    // The form closes, ready for another
    await expect(addButton).toBeVisible()
  })

  test('the dashboard’s cards open the table filtered to them', async ({
    page
  }) => {
    await signIn(page)
    await expectHeading(page, 'dashboard')
    await expect(page.locator('.govuk-back-link')).toHaveCount(0)

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
    await expectHeading(page, 'dashboard')
    const rows = page.locator('.app-staff-table tbody tr')
    await expect(rows).toHaveCount(counted[3].length)

    // The filter's summary counts the filters set; clearing them shows
    // every record again
    const summary = page.getByText(text('dashboard', 'filterSummary'))
    await expect(summary).toHaveText(
      `${text('dashboard', 'filterSummary')} (1)`
    )
    // Clear filters sits beside the count (the filter's own is in its
    // closed details)
    const clear = page
      .locator('.app-staff-table-footer')
      .getByRole('link', { name: text('dashboard', 'clearFilters') })
    await clear.click()
    await expect(summary).toHaveText(text('dashboard', 'filterSummary'))
    await expect(clear).toHaveCount(0)
    await expect(rows).toHaveCount(Math.min(records.length, RECORDS_PER_PAGE))

    // Reviewed with active planning applications: two filters at once
    await page.goto(`${base}/dashboard`)
    await cards.nth(2).getByRole('link').click()
    await expect(rows).toHaveCount(counted[2].length)
    await expect(summary).toHaveText(
      `${text('dashboard', 'filterSummary')} (2)`
    )
    await expect(
      page.getByLabel(store.statuses.reviewed.label, { exact: true })
    ).toBeChecked()
    await expect(
      page.getByLabel(store.planningStages.applied, { exact: true })
    ).toBeChecked()
  })

  test('the dashboard’s table searches, filters, sorts and pages the records', async ({
    page
  }) => {
    await signIn(page)
    await page.goto(`${base}/dashboard`)
    await expectHeading(page, 'dashboard')
    const records = allRecords({})
    const rows = page.locator('.app-staff-table tbody tr')
    await expect(rows).toHaveCount(Math.min(records.length, RECORDS_PER_PAGE))

    // Sorting by a heading, then the other way; the pages keep the sort
    const heading = page.locator('.app-staff-table th', {
      hasText: text('dashboard', 'columns').reference
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
      `${base}/dashboard?_sort=reference&_dir=desc&_page=2`
    )
    await expect(rows).toHaveCount(records.length - RECORDS_PER_PAGE)
    await expect(rows.last()).toContainText(references[0])

    // Filtering by planning application stage
    await page.getByText(text('dashboard', 'filterSummary')).click()
    await page.getByLabel(store.planningStages.refused, { exact: true }).check()
    await page
      .getByRole('button', { name: text('dashboard', 'applyFilters') })
      .click()
    const refused = records.filter(
      (record) => record.planningStage.value === 'refused'
    )
    await expect(rows).toHaveCount(refused.length)

    // Searching keeps the filter
    await page
      .getByLabel(text('dashboard', 'searchLabel'), { exact: true })
      .fill(refused[0].developer)
    await page
      .getByRole('button', { name: text('dashboard', 'searchButton') })
      .click()
    await expect(rows).toHaveCount(
      refused.filter((record) => record.developer === refused[0].developer)
        .length
    )

    await page.goto(`${base}/dashboard?_q=no-such-record`)
    await expect(page.locator('main')).toContainText(
      text('dashboard', 'noResults')
    )
  })

  test('a council with no records yet goes straight to adding one', async ({
    page
  }) => {
    await signIn(page, 'new-officer@scarfolk.gov.uk')
    await expectHeading(page, 'retrieve-commitment')
    // Nothing to go back to, and the dashboard sends the officer here too
    await expect(page.locator('.govuk-back-link')).toHaveCount(0)
    await page.goto(`${base}/dashboard`)
    await expectOnPage(page, 'retrieve-commitment')

    // The council's first record is the only one on the dashboard
    await retrieve(page, recorded.reference)
    await expectHeading(page, 'planning-reference')
    await fillAnswer(page, 'planning-reference', '26/00002/FUL')
    await submit(page, 'planning-reference')
    await expectHeading(page, 'view-record', { record: recorded })
    await page.goto(`${base}/dashboard`)
    await expectHeading(page, 'dashboard')
    const rows = page.locator('.app-staff-table tbody tr')
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText(recorded.reference)
  })

  test('signing out returns to GOV.UK One Login', async ({ page }) => {
    await signIn(page)
    await page.goto(`${base}/sign-out`)
    await expectOnPage(page, 'one-login-email')
    await page.goto(`${base}/dashboard`)
    await expectOnPage(page, 'one-login-email')
  })
})
