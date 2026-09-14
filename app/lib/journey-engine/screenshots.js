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
 * Open headless Chromium at the given viewport and hand a page to `run`,
 * closing the browser afterwards whatever happens.
 */
async function withPage(viewportName, run) {
  const viewport = VIEWPORTS[viewportName] || VIEWPORTS.desktop
  const chromium = loadChromium()
  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 2
    })
    return await run(await context.newPage())
  } finally {
    await browser.close()
  }
}

/**
 * Capture one preview URL on an open page. Map pages fetch tiles after
 * load, so they get a moment and a viewport-only capture.
 */
async function shoot(page, baseUrl, screen, quality) {
  const isCustom = screen.type === 'custom'
  // Documents may carry a map, so give its tiles a moment too
  const waitForMap = isCustom || screen.type === 'document'
  await page.goto(baseUrl + screen.url, { waitUntil: 'networkidle' })
  if (waitForMap) {
    await page.waitForTimeout(CUSTOM_PAGE_WAIT_MS)
  }
  return page.screenshot({
    type: 'jpeg',
    quality,
    fullPage: !isCustom
  })
}

function trimBaseUrl(baseUrl) {
  return (baseUrl || 'http://localhost:3000').replace(/\/$/, '')
}

/**
 * Capture every screen of a journey as a JPEG.
 *
 * @param {object} journey  loaded journey definition
 * @param {object} options  { baseUrl, viewport, includeErrors, sections, quality, onProgress }
 *   viewport is a key of VIEWPORTS ('desktop' by default); includeErrors
 *   (true by default) also captures each form's error state; sections
 *   ('main' and group ids, all by default) picks which parts to capture
 * @returns {Promise<Array<{ file: string, buffer: Buffer }>>}
 */
async function captureScreens(journey, options = {}) {
  const baseUrl = trimBaseUrl(options.baseUrl)
  const quality = options.quality || 85
  const onProgress = options.onProgress || (() => {})
  const screens = exportScreens(journey, {
    includeErrors: options.includeErrors !== false,
    sections: options.sections
  })
  return withPage(options.viewport, async (page) => {
    const results = []
    for (const screen of screens) {
      const buffer = await shoot(page, baseUrl, screen, quality)
      results.push({ file: screen.file, buffer })
      onProgress(screen, results.length, screens.length)
    }
    return results
  })
}

/**
 * Capture a single screen of a journey as a JPEG, for the export button on
 * each card of the screen wall.
 *
 * @param {object} journey  loaded journey definition
 * @param {object} options  { baseUrl, viewport, pageId, error, variant, quality }
 *   error captures the page's error state; variant names one of the page's
 *   preview variants
 * @returns {Promise<{ file: string, buffer: Buffer }>}  or null when the
 *   page (or the requested state of it) is not one the export knows about
 */
async function captureScreen(journey, options = {}) {
  const baseUrl = trimBaseUrl(options.baseUrl)
  const quality = options.quality || 85
  const screen = exportScreens(journey).find(
    (item) =>
      item.id === options.pageId &&
      item.error === Boolean(options.error) &&
      item.variant === (options.variant || null)
  )
  if (!screen) {
    return null
  }
  const buffer = await withPage(options.viewport, (page) =>
    shoot(page, baseUrl, screen, quality)
  )
  // Drop the section folder and the ordering prefix: one file needs neither
  const file = screen.file.split('/').pop().replace(/^\d+-/, '')
  return { file, buffer }
}

module.exports = {
  captureScreens,
  captureScreen,
  canExportScreens,
  VIEWPORTS
}
