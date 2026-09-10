const { test, expect } = require('@playwright/test')
const fs = require('fs')
const path = require('path')
const turf = require('@turf/turf')
const {
  loadJourney,
  toFlowGraph,
  previewVariants
} = require('../../app/lib/journey-engine')

/**
 * nrf-quote-7: the content-driven port of nrf-quote-6.
 *
 * Page list, headings and error text come from content/nrf-quote-7 so these
 * tests stay in step with the journey definition.
 */

const journey = loadJourney('nrf-quote-7')
// The wall shows one card per page plus one per preview variant
const wallCardCount = journey.pages.reduce(
  (count, page) => count + 1 + previewVariants(page).length,
  0
)

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
    await expect(page).toHaveURL(/what-would-you-like-to-do/)

    // The shared funnel page: the quote answer stays in this journey
    await page.getByLabel(/I want a quote/).check()
    await page.getByRole('button', { name: 'Continue' }).click()
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
    await expect(page.locator('.govuk-panel__body')).toContainText('NRL-')
  })

  test('uploads a boundary file, sees it checked and previewed', async ({
    page
  }) => {
    // A square inside the live Broads/Wensum EDP
    const ring = [
      [1.162, 52.6845],
      [1.165, 52.6845],
      [1.165, 52.6875],
      [1.162, 52.6875],
      [1.162, 52.6845]
    ]
    const geojson = (coordinates) =>
      Buffer.from(
        JSON.stringify({
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [coordinates] }
        })
      )

    await page.goto(`${journey.basePath}/planning-type`)
    await page.getByLabel('Full planning permission').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('Yes', { exact: true }).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel(/maximum number of units/).fill('100')
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByLabel('Upload a file').check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(/upload-redline$/)

    await page.locator('input[type="file"]').setInputFiles({
      name: 'site.geojson',
      mimeType: 'application/geo+json',
      buffer: geojson(ring)
    })
    await page.getByRole('button', { name: 'Continue' }).click()

    // The spinner page moves on by itself
    await expect(page).toHaveURL(/checking-file$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Checking your file'
    )
    await expect(page).toHaveURL(/file-preview$/, { timeout: 10000 })
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Your uploaded red line boundary file'
    )
    await expect(page.locator('.govuk-list--bullet')).toContainText(
      'Broads SAC, Broadland Ramsar and River Wensum SAC'
    )
    await expect(page.locator('.govuk-list--bullet')).toContainText(
      '(100% of boundary)'
    )
    await expect(page.locator('#boundary-map')).toBeAttached()
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page).toHaveURL(/estimate-email$/)
    await expect(page.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      `${journey.basePath}/file-preview`
    )

    // Nothing is checked: a file that is not GeoJSON still reaches the
    // preview, plotted with the sample boundary
    await page.goto(`${journey.basePath}/upload-redline`)
    await page.locator('input[type="file"]').setInputFiles({
      name: 'site.kml',
      mimeType: 'application/vnd.google-earth.kml+xml',
      buffer: Buffer.from('<kml></kml>')
    })
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(/file-preview$/, { timeout: 10000 })
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Your uploaded red line boundary file'
    )

    // A GeoJSON polygon outside every EDP still reaches the preview, with
    // the sample boundary standing in
    await page.goto(`${journey.basePath}/upload-redline`)
    await page.locator('input[type="file"]').setInputFiles({
      name: 'nottingham.geojson',
      mimeType: 'application/geo+json',
      buffer: geojson([
        [-1.1544, 52.9518],
        [-1.1444, 52.9518],
        [-1.1444, 52.9578],
        [-1.1544, 52.9578],
        [-1.1544, 52.9518]
      ])
    })
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(/file-preview$/, { timeout: 10000 })
    await expect(page.locator('.govuk-list--bullet')).toContainText(
      'Broads SAC, Broadland Ramsar and River Wensum SAC'
    )

    // The error states live on the screen wall as preview variants
    await page.goto(
      `${journey.basePath}/file-preview?preview=1&variant=overlapping`
    )
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Your red line boundary file contains an error'
    )
    await expect(page.locator('main')).toContainText(
      'The red line boundary is overlapping itself.'
    )
    await expect(
      page.getByRole('link', { name: 'Upload a new file or draw on a map' })
    ).toHaveAttribute('href', `${journey.basePath}/redline-map`)
    await expect(
      page.getByRole('button', { name: 'Save and continue' })
    ).toHaveCount(0)
  })

  test('changing an answer returns to check your answers', async ({ page }) => {
    await page.goto(`${journey.basePath}/start`)
    await page.getByRole('button', { name: 'Start now' }).click()
    await page.getByLabel(/I want a quote/).check()
    await page.getByRole('button', { name: 'Continue' }).click()
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

    await page.getByRole('link', { name: /Change.*number of units/ }).click()
    await expect(page).toHaveURL(/units\?change=true&nav=check-your-answers/)
    await expect(page.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      `${journey.basePath}/check-your-answers`
    )
    await page.getByLabel(/maximum number of units/).fill('25')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(/check-your-answers$/)
    await expect(page.locator('.govuk-summary-list')).toContainText('25')

    // The delete page's Back and Cancel still mean check your answers here
    // (`$summary` with no `nav` from another journey)
    await page.getByRole('link', { name: /Delete/ }).click()
    await expect(page).toHaveURL(`${journey.basePath}/delete-quote`)
    await expect(page.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      `${journey.basePath}/check-your-answers`
    )
    await expect(page.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
      'href',
      `${journey.basePath}/check-your-answers`
    )
    await expect(
      page.locator('.govuk-service-navigation__service-name')
    ).toContainText(`PROTOTYPE - ${journey.serviceName}`)
  })
})

test.describe('journey tools', () => {
  test('flow and screen wall page lists every screen', async ({ page }) => {
    const response = await page.goto(`/tools/journeys/${journey.id}`)
    expect(response.status()).toBe(200)
    await expect(page.locator('iframe')).toHaveCount(wallCardCount)
  })

  test('screen wall shows a card per preview variant', async ({ page }) => {
    await page.goto(`/tools/journeys/${journey.id}`)
    await page.getByRole('tab', { name: 'Screens' }).click()
    const variants = previewVariants(journey.byId.get('file-preview'))
    expect(variants.length).toBeGreaterThan(0)
    await expect(page.locator('.wall-card--variant')).toHaveCount(
      variants.length
    )
    await expect(
      page.locator('.wall-card--variant iframe').first()
    ).toHaveAttribute('src', /file-preview\?preview=1&variant=/)
  })

  test('screen wall places branch screens beside the page they branch from', async ({
    page
  }) => {
    await page.goto(`/tools/journeys/${journey.id}`)
    await page.getByRole('tab', { name: 'Screens' }).click()
    const rowWith = (id) =>
      page.locator('.wall-level', {
        has: page.locator('.wall-card__id', { hasText: id })
      })
    await expect(
      rowWith('planning-type').locator('.wall-card__id', {
        hasText: 'wrong-permission'
      })
    ).toHaveCount(1)
    await expect(
      rowWith('housing').locator('.wall-card__id', { hasText: 'not-housing' })
    ).toHaveCount(1)
    await expect(rowWith('housing').locator('.wall-card__via')).toContainText(
      'isHousing is No'
    )
  })

  test('flow diagram keeps the default path on one row', async ({ page }) => {
    await page.goto(`/tools/journeys/${journey.id}`)
    // ELK is loaded from a CDN, so give the layout a moment
    await expect(
      page.locator('#flow-diagram[data-rendered="true"]')
    ).toHaveCount(1, { timeout: 20000 })
    // Every page plus one node per exit to another journey
    await expect(page.locator('.flow-node')).toHaveCount(
      toFlowGraph(journey).nodes.length
    )
    const rows = await page
      .locator('.flow-node[data-main-chain="true"]')
      .evaluateAll((rects) => rects.map((r) => r.getAttribute('y')))
    expect(rows.length).toBeGreaterThan(1)
    expect(new Set(rows).size).toBe(1)
  })

  test('flow diagram is visible when the Flow tab is opened', async ({
    page
  }) => {
    await page.goto(`/tools/journeys/${journey.id}`)
    await expect(
      page.locator('#flow-diagram[data-rendered="true"]')
    ).toHaveCount(1, { timeout: 20000 })
    await page.getByRole('tab', { name: 'Flow' }).click()
    const svg = page.locator('#flow-diagram svg')
    await expect(svg).toBeVisible()
    const width = await svg.evaluate((el) => el.getBoundingClientRect().width)
    expect(width).toBeGreaterThan(100)
    // Nodes are sized from labels measured at load; a hidden tab must not
    // collapse them to nothing
    const node = await page
      .locator('.flow-node')
      .first()
      .evaluate((el) => el.getBoundingClientRect())
    expect(node.width).toBeGreaterThan(50)
    expect(node.height).toBeGreaterThan(10)
  })

  test('screen wall does not scroll when embedded pages take focus', async ({
    page
  }) => {
    await page.goto(`/tools/journeys/${journey.id}`)
    await page.getByRole('tab', { name: 'Screens' }).click()
    // The map preview focuses its boundary panel heading once the saved
    // boundary check completes; that must not drag the wall down to it
    const mapFrame = page.frameLocator(
      'iframe[title="Draw your boundary on a map"]'
    )
    await expect(
      mapFrame.locator('[data-boundary-info-results]:not([hidden])')
    ).toHaveCount(1, { timeout: 30000 })
    await page.waitForTimeout(500)
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
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
