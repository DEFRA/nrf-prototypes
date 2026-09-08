const { test, expect } = require('@playwright/test')
const fs = require('fs')
const path = require('path')
const turf = require('@turf/turf')
const { loadJourney } = require('../../app/lib/journey-engine')

/**
 * nrf-quote-7: the content-driven port of nrf-quote-6.
 *
 * Page list, headings and error text come from content/nrf-quote-7 so these
 * tests stay in step with the journey definition.
 */

const journey = loadJourney('nrf-quote-7')

test.describe('nrf-quote-7 preview mode', () => {
  for (const page of journey.pages) {
    test(`${page.id} renders with sample data`, async ({ page: browser }) => {
      const response = await browser.goto(`${page.path}?preview=1`)
      expect(response.status()).toBe(200)
      await expect(browser.locator('.govuk-template')).toBeVisible()
      // Confirmations put the heading in a panel; custom pages (the map) place
      // it wherever their template wants, so check the whole body there.
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
})

test.describe('nrf-quote-7 validation', () => {
  test('empty submission re-renders with the page error', async ({ page }) => {
    const planningType = journey.byId.get('planning-type')
    const response = await page.request.post(planningType.path, { form: {} })
    expect(response.status()).toBe(200)
    const html = await response.text()
    expect(html).toContain('There is a problem')
    expect(html).toContain(planningType.content.errors.required)
  })
})

test.describe('nrf-quote-7 happy path', () => {
  test('draws a boundary and reaches confirmation', async ({ page }) => {
    // Pick a point inside the first nutrient catchment so the map check passes
    const catchments = JSON.parse(
      fs.readFileSync(
        path.join(
          __dirname,
          '../../app/assets/map-layers/catchments_nn_catchments_03_2024.geojson'
        ),
        'utf8'
      )
    )
    const [lng, lat] = turf.pointOnFeature(catchments.features[0]).geometry
      .coordinates
    const d = 0.002
    const square = [
      [lng - d, lat - d],
      [lng + d, lat - d],
      [lng + d, lat + d],
      [lng - d, lat + d],
      [lng - d, lat - d]
    ]

    await page.goto(`${journey.basePath}/start`)
    await page.getByRole('button', { name: 'Start now' }).click()
    await expect(page).toHaveURL(/planning-type/)

    await page.getByLabel('Full planning permission').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(/housing/)

    await page.getByLabel('Yes', { exact: true }).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(/units/)

    await page.getByLabel(/maximum number of units/).fill('100')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(/redline-map/)

    await page.getByLabel('Draw on a map').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(/\/map$/)

    // Bypass the drawing UI: set the hidden boundary field and submit the form
    await page.locator('#boundary-data').waitFor({ state: 'attached' })
    await page.evaluate((coordinates) => {
      const input = document.getElementById('boundary-data')
      input.value = JSON.stringify({ coordinates, center: coordinates[0] })
      document.getElementById('map-form').submit()
    }, square)
    await expect(page).toHaveURL(/estimate-email$/)

    await page.getByLabel(/email address/).fill('jane.smith@example.com')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(/check-your-answers/)

    const summary = page.locator('.govuk-summary-list')
    await expect(summary).toContainText('Full planning permission')
    await expect(summary).toContainText('100')
    await expect(summary).toContainText('Added')
    await expect(summary).toContainText('jane.smith@example.com')

    await page.getByRole('button', { name: 'Confirm and submit' }).click()
    await expect(page).toHaveURL(/confirmation/)
    await expect(page.locator('.govuk-panel__body')).toContainText('NRF-')
  })

  test('changing an answer returns to check your answers', async ({ page }) => {
    await page.goto(`${journey.basePath}/start`)
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel('Hybrid planning permission').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('Yes', { exact: true }).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel(/maximum number of units/).fill('12')
    await page.getByRole('button', { name: 'Continue' }).click()

    // Jump straight to email (the guard only needs an email to show CYA)
    await page.goto(`${journey.basePath}/estimate-email`)
    await page.getByLabel(/email address/).fill('a@b.com')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(/check-your-answers/)

    await page
      .getByRole('link', { name: /Change.*number of housing units/ })
      .click()
    await expect(page).toHaveURL(/units\?change=true&nav=check-your-answers/)
    await expect(page.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      `${journey.basePath}/check-your-answers`
    )
    await page.getByLabel(/maximum number of units/).fill('25')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(/check-your-answers$/)
    await expect(page.locator('.govuk-summary-list')).toContainText('25')
  })
})

test.describe('journey tools', () => {
  test('flow and screen wall page lists every screen', async ({ page }) => {
    const response = await page.goto(`/tools/journeys/${journey.id}`)
    expect(response.status()).toBe(200)
    await expect(page.locator('iframe')).toHaveCount(journey.pages.length)
  })

  test('flow diagram keeps the default path on one row', async ({ page }) => {
    await page.goto(`/tools/journeys/${journey.id}`)
    // ELK is loaded from a CDN, so give the layout a moment
    await expect(
      page.locator('#flow-diagram[data-rendered="true"]')
    ).toHaveCount(1, { timeout: 20000 })
    await expect(page.locator('.flow-node')).toHaveCount(journey.pages.length)
    const rows = await page
      .locator('.flow-node[data-main-chain="true"]')
      .evaluateAll((rects) => rects.map((r) => r.getAttribute('y')))
    expect(rows.length).toBeGreaterThan(1)
    expect(new Set(rows).size).toBe(1)
  })

  test('flow.json has the figma-journey shape', async ({ request }) => {
    const response = await request.get(
      `/tools/journeys/${journey.id}/flow.json`
    )
    expect(response.status()).toBe(200)
    const flow = await response.json()
    expect(flow.startNodeId).toBe('start')
    expect(flow.screens).toHaveLength(journey.pages.length)
    expect(flow.transitions.onPage.length).toBeGreaterThan(0)
  })
})
