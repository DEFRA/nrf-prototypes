/**
 * Journey engine: JPG capture of every screen
 *
 * Drives headless Chromium (Playwright, a dev dependency) over each preview
 * URL from exportScreens(), so the export shows exactly what the running
 * prototype renders with the sample data in journey.yaml.
 */

const { exportScreens, previewErrorKey } = require('./flow')
const { pageHandoff } = require('./history')

// Capture sizes. Pages are captured full length (all but the full-screen
// map), so the height only sets the initial viewport
const VIEWPORTS = {
  desktop: { width: 1000, height: 760 },
  mobile: { width: 375, height: 812 }
}
// Map pages fetch tiles after load, so custom pages (which may carry one)
// get a moment. The full-screen map (layouts/interactive-map.html, which
// marks its body with this class) fills the viewport and is captured as
// is: a full-page capture of it is unreliable. Every other page, custom
// ones included, is captured full length.
const CUSTOM_PAGE_WAIT_MS = 3000
const FULL_SCREEN_MAP = 'body.app-draw-boundary-body'

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
 * Capture one preview URL on an open page. Pages that may carry a map get
 * a moment for its tiles; only the full-screen map is captured
 * viewport-only.
 */
async function shoot(page, baseUrl, screen, quality) {
  const isCustom = screen.type === 'custom'
  // Documents may carry a map, so give its tiles a moment too
  const waitForMap = isCustom || screen.type === 'document'
  await page.goto(baseUrl + screen.url, { waitUntil: 'networkidle' })
  if (waitForMap) {
    await page.waitForTimeout(CUSTOM_PAGE_WAIT_MS)
  }
  const fullScreenMap = (await page.locator(FULL_SCREEN_MAP).count()) > 0
  return page.screenshot({
    type: 'jpeg',
    quality,
    fullPage: !fullScreenMap
  })
}

function trimBaseUrl(baseUrl) {
  return (baseUrl || 'http://localhost:3000').replace(/\/$/, '')
}

/**
 * Capture every screen of a journey as a JPEG.
 *
 * @param {object} journey  loaded journey definition
 * @param {object} options  { baseUrl, viewport, includeErrors, sections, handoff, quality, onProgress }
 *   viewport is a key of VIEWPORTS ('desktop' by default); includeErrors
 *   (true by default) also captures each form's error state; sections
 *   ('main' and group ids, all by default) picks which parts to capture
 * @returns {Promise<Array<{ file: string, buffer: Buffer }>>}
 */
async function captureScreens(journey, options = {}) {
  const baseUrl = trimBaseUrl(options.baseUrl)
  const quality = options.quality || 85
  const onProgress = options.onProgress || (() => {})
  let screens = exportScreens(journey, {
    includeErrors: options.includeErrors !== false,
    sections: options.sections
  })
  if (options.handoff) {
    screens = asHandedOver(journey, screens)
  }
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
 * The screens as handed over: only the pages with a frozen copy (see
 * snapshots.js), each captured from that copy in the same state, with
 * `--handoff` on the file name. Copy variants are left out: a handoff is
 * the confirmed design, and a frozen copy never varies.
 *
 * @param {object} journey  loaded journey definition
 * @param {Array} screens  entries from exportScreens
 * @returns {Array}  the entries that have a frozen copy, pointed at it
 */
function asHandedOver(journey, screens) {
  const frozen = new Map()
  return screens.flatMap((screen) => {
    if (screen.copy) {
      return []
    }
    if (!frozen.has(screen.id)) {
      const handoff = pageHandoff(journey, journey.byId.get(screen.id))
      frozen.set(
        screen.id,
        handoff && handoff.frozenUrl ? handoff.frozenUrl : null
      )
    }
    const url = frozen.get(screen.id)
    if (!url) {
      return []
    }
    return [
      {
        ...screen,
        url: screen.url.replace(screen.path, url),
        file: screen.file.replace(/\.jpg$/, '--handoff.jpg')
      }
    ]
  })
}

/**
 * Capture a single screen of a journey as a JPEG, for the export button on
 * each card of the screen wall.
 *
 * @param {object} journey  loaded journey definition
 * @param {object} options  { baseUrl, viewport, pageId, error, variant, copy, handoff, quality }
 *   error captures the page's error state (`1` or `required` for the default
 *   one, or a key of its `errors:` block such as `max`); variant names one of the page's
 *   preview variants; copy one of its copy variants (`b` for
 *   pages/<id>~b.md); handoff captures the page's frozen copy, as handed
 *   over (see snapshots.js), in the same state
 * @returns {Promise<{ file: string, buffer: Buffer }>}  or null when the
 *   page (or the requested state of it) is not one the export knows about
 */
async function captureScreen(journey, options = {}) {
  const baseUrl = trimBaseUrl(options.baseUrl)
  const quality = options.quality || 85
  const errorKey = previewErrorKey(options.error)
  let screen = exportScreens(journey).find(
    (item) =>
      item.id === options.pageId &&
      (item.error || null) === errorKey &&
      item.variant === (options.variant || null) &&
      item.copy === (options.copy || null)
  )
  if (screen && options.handoff) {
    screen = asHandedOver(journey, [screen])[0] || null
  }
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
  asHandedOver,
  canExportScreens,
  VIEWPORTS
}
