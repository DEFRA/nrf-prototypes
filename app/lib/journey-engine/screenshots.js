/**
 * Journey engine: JPG capture of every screen
 *
 * Drives headless Chromium (Playwright, a dev dependency) over each preview
 * URL from exportScreens(), so the export shows exactly what the running
 * prototype renders with the sample data in journey.yaml.
 */

const { exportScreens } = require('./flow')

// Capture sizes. Non-map pages are captured full length, so the height only
// sets the initial viewport
const VIEWPORTS = {
  desktop: { width: 1000, height: 760 },
  mobile: { width: 375, height: 812 }
}
// Map pages fetch tiles after load; give them a moment and capture the
// viewport only, as a full-page capture of a map canvas is unreliable
const CUSTOM_PAGE_WAIT_MS = 3000

function loadChromium() {
  try {
    return require('@playwright/test').chromium
  } catch (error) {
    throw new Error(
      'Screen export needs Playwright, which is a dev dependency. Run `npm install` and `npx playwright install chromium`.'
    )
  }
}

/**
 * Whether the export can run here. Playwright is a dev dependency, so a
 * production install (`npm ci --omit=dev`, as the Dockerfile does for CDP)
 * has no Playwright and the screen wall hides the export instead of
 * offering a button that can only fail.
 */
function canExportScreens() {
  try {
    require.resolve('@playwright/test')
    return true
  } catch (error) {
    return false
  }
}

/**
 * Capture every screen of a journey as a JPEG.
 *
 * @param {object} journey  loaded journey definition
 * @param {object} options  { baseUrl, viewport, quality, onProgress }
 *   viewport is a key of VIEWPORTS ('desktop' by default)
 * @returns {Promise<Array<{ file: string, buffer: Buffer }>>}
 */
async function captureScreens(journey, options = {}) {
  const baseUrl = (options.baseUrl || 'http://localhost:3000').replace(
    /\/$/,
    ''
  )
  const viewport = VIEWPORTS[options.viewport] || VIEWPORTS.desktop
  const quality = options.quality || 85
  const onProgress = options.onProgress || (() => {})
  const chromium = loadChromium()
  const screens = exportScreens(journey)
  const results = []

  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 2
    })
    const page = await context.newPage()
    for (const screen of screens) {
      const isCustom = screen.type === 'custom'
      // Documents may carry a map, so give its tiles a moment too
      const waitForMap = isCustom || screen.type === 'document'
      await page.goto(baseUrl + screen.url, { waitUntil: 'networkidle' })
      if (waitForMap) {
        await page.waitForTimeout(CUSTOM_PAGE_WAIT_MS)
      }
      const buffer = await page.screenshot({
        type: 'jpeg',
        quality,
        fullPage: !isCustom
      })
      results.push({ file: screen.file, buffer })
      onProgress(screen, results.length, screens.length)
    }
  } finally {
    await browser.close()
  }
  return results
}

module.exports = { captureScreens, canExportScreens, VIEWPORTS }
