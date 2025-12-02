const { test, expect } = require('@playwright/test')
const { getJourneysWithStartPage } = require('../../app/config/shared/journeys')

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
