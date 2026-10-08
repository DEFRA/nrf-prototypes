const { defineConfig, devices } = require('@playwright/test')

// The tests run against their own server, with the production map's keys
// blanked, so they always see the prototype's own basemaps and EDP data
// however .env is set up (the dev server on :3000 keeps its keys). Blank
// values win over .env, which never overrides a variable already set.
const TEST_PORT = 3300
const TEST_URL = `http://localhost:${TEST_PORT}`
const WITHOUT_PRODUCTION_SERVICES = {
  OS_API_KEY: '',
  IMPACT_ASSESSOR_BASE_URL: '',
  IMPACT_ASSESSOR_API_KEY: '',
  NRF_BACKEND_API_URL: '',
  BACKEND_API_KEY: ''
}

/**
 * Playwright configuration for GOV.UK Prototype Kit
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests/e2e',

  // Maximum time one test can run for
  timeout: 30 * 1000,

  // Run tests in files in parallel
  fullyParallel: false,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 1 : 0,

  // Opt out of parallel tests on CI (prototype kit limitation)
  workers: 1,

  // Reporter to use
  reporter: [['html'], ['list']],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: TEST_URL,

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure'
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  // Start the test server before the tests (or reuse one left running)
  webServer: {
    command: 'npm run dev',
    url: TEST_URL,
    env: { PORT: String(TEST_PORT), ...WITHOUT_PRODUCTION_SERVICES },
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000
  }
})
