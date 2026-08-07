const { test, expect } = require('@playwright/test')
const { getJourneysWithStartPage } = require('../../app/config/shared/journeys')
const fs = require('fs')
const path = require('path')

/**
 * Smoke Tests for GOV.UK Prototype Kit - NRF Prototypes
 *
 * These tests verify that:
 * 1. The application starts without module errors
 * 2. Critical pages load without errors
 * 3. Critical dependencies (like @turf/turf) are available
 *
 * These tests are designed to catch "Module not found" errors before deployment.
 *
 * Journey configurations are sourced from app/config/shared/journeys.js
 * to ensure tests stay in sync with the application.
 */

test.describe('Application Startup', () => {
  test('app starts without module errors', async ({ page }) => {
    // Navigate to the homepage
    const response = await page.goto('/')

    // Check that the response is successful
    expect(response.status()).toBe(200)

    // Check that the GOV.UK prototype kit loaded
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Journey Start Pages', () => {
  // Journey pages are dynamically loaded from shared config
  // This ensures tests stay in sync with the application
  const journeyPages = getJourneysWithStartPage()

  for (const journey of journeyPages) {
    test(`${journey.name} start page loads without errors`, async ({
      page
    }) => {
      // Navigate to the journey start page
      const response = await page.goto(journey.path)

      // Check that the response is successful
      expect(response.status()).toBe(200)

      // Check that the GOV.UK template is present
      await expect(page.locator('.govuk-template')).toBeVisible()
    })
  }
})

test.describe('Filesystem start pages (auto-routed, not in the journey registry)', () => {
  // Cover journeys that expose a /start page but are NOT registered in
  // app/config/shared/journeys.js — for example standard-kit journeys that
  // rely on the Prototype Kit's automatic view routing. This keeps them
  // covered by the smoke test without forcing them into the registry.
  const viewsDir = path.join(__dirname, '../../app/views')
  const registryStartPaths = new Set(
    getJourneysWithStartPage().map((journey) => journey.path)
  )

  // Build the list of /<folder>/start pages that have a view file on disk and
  // are NOT already covered by the registry test above.
  const filesystemStartPages = fs
    .readdirSync(viewsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'layouts')
    .map((dir) => ({ folder: dir.name, url: `/${dir.name}/start` }))
    .filter((startPage) =>
      fs.existsSync(path.join(viewsDir, startPage.folder, 'start.html'))
    )
    .filter((startPage) => !registryStartPaths.has(startPage.url))

  for (const startPage of filesystemStartPages) {
    test(`${startPage.folder} start page loads without errors`, async ({
      page
    }) => {
      const response = await page.goto(startPage.url)

      expect(response.status()).toBe(200)
      await expect(page.locator('.govuk-template')).toBeVisible()
    })
  }
})
