// @ts-check
const fs = require('fs')
const path = require('path')
const { test, expect } = require('@playwright/test')
const turf = require('@turf/turf')

const BASE = '/nrf-quote-7'
const CHECK_URL = `${BASE}/api/boundary/check`

// A small square inside the first nutrient catchment, as a closed ring
function squareInsideFirstCatchment() {
  const catchments = JSON.parse(
    fs.readFileSync(
      path.join(
        __dirname,
        '../../app/assets/map-layers/catchments_nn_catchments_03_2024.geojson'
      ),
      'utf8'
    )
  )
  const [lon, lat] = turf.pointOnFeature(catchments.features[0]).geometry
    .coordinates
  const d = 0.002
  return [
    [lon - d, lat - d],
    [lon + d, lat - d],
    [lon + d, lat + d],
    [lon - d, lat + d],
    [lon - d, lat - d]
  ]
}

// A square in the North Sea, well away from any EDP
const SEA_SQUARE = [
  [2.5, 53.5],
  [2.51, 53.5],
  [2.51, 53.51],
  [2.5, 53.51],
  [2.5, 53.5]
]

test.describe('nrf-quote-7 production map', () => {
  test('map page loads the @defra/interactive-map plugin assets', async ({
    page
  }) => {
    const errors = []
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text())
      }
    })

    const response = await page.goto(`${BASE}/map?preview=1`)
    expect(response?.status()).toBe(200)

    await expect(page.locator('#draw-boundary-map')).toBeAttached()
    await expect(page.locator('#map-form #boundary-data')).toBeAttached()

    const globals = await page.evaluate(() => Object.keys(window.defra || {}))
    expect(globals).toEqual(
      expect.arrayContaining([
        'InteractiveMap',
        'maplibreProvider',
        'drawPlugin',
        'datasetsPlugin',
        'mapKeyPlugin'
      ])
    )

    // The map container gets the library's viewport once initialised
    await expect(
      page.locator('#draw-boundary-map [role="application"]')
    ).toBeAttached({ timeout: 15000 })

    expect(errors.filter((text) => text.includes('interactive-map'))).toEqual(
      []
    )
  })

  test('boundary check API returns the production-shaped payload', async ({
    request
  }) => {
    const response = await request.post(CHECK_URL, {
      data: {
        geometry: {
          type: 'Polygon',
          coordinates: [squareInsideFirstCatchment()]
        }
      }
    })
    expect(response.status()).toBe(200)

    const payload = await response.json()
    expect(payload.boundaryGeometryWgs84.type).toBe('Polygon')
    expect(payload.boundaryMetadata.area.hectares).toBeGreaterThan(0)
    expect(payload.boundaryMetadata.perimeter.kilometres).toBeGreaterThan(0)
    expect(payload.boundaryMetadata.bounds.bottomLeft).toHaveLength(2)
    expect(payload.boundaryMetadata.centre).toHaveLength(2)
    expect(payload.intersectingEdps.length).toBeGreaterThan(0)
    expect(typeof payload.intersectingEdps[0].label).toBe('string')
    expect(payload.intersectingExcludedAreas).toEqual([])
  })

  test('boundary check API rejects a non-polygon', async ({ request }) => {
    const response = await request.post(CHECK_URL, {
      data: { geometry: { type: 'Point', coordinates: [1, 52] } }
    })
    expect(response.status()).toBe(400)
    const payload = await response.json()
    expect(payload.failureReason).toBe('not_a_polygon')
  })

  test('saving the production check payload branches on the EDP result', async ({
    page,
    request
  }) => {
    async function saveBoundary(ring) {
      const check = await request.post(CHECK_URL, {
        data: { geometry: { type: 'Polygon', coordinates: [ring] } }
      })
      const payload = await check.json()

      await page.goto(`${BASE}/start`)
      await page.getByRole('button', { name: 'Start now' }).click()
      await page.getByLabel(/I want a quote/).check()
      await page.getByRole('button', { name: 'Continue' }).click()
      await page.getByLabel('Full planning permission').check()
      await page.getByRole('button', { name: 'Continue' }).click()
      await page.getByLabel('Yes', { exact: true }).check()
      await page.getByRole('button', { name: 'Continue' }).click()
      await page.getByLabel(/maximum number of units/).fill('100')
      await page.getByRole('button', { name: 'Continue' }).click()
      await page.getByLabel('Draw on a map').check()
      await page.getByRole('button', { name: 'Continue' }).click()
      await expect(page).toHaveURL(/\/map$/)

      await page.locator('#boundary-data').waitFor({ state: 'attached' })
      await page.evaluate((value) => {
        const input = document.getElementById('boundary-data')
        input.value = JSON.stringify(value)
        document.getElementById('map-form').requestSubmit()
      }, payload)
    }

    await saveBoundary(squareInsideFirstCatchment())
    await expect(page).toHaveURL(/estimate-email$/)

    await saveBoundary(SEA_SQUARE)
    await expect(page).toHaveURL(/no-edp$/)
  })

  test('map proxies answer sensibly without an OS key', async ({ request }) => {
    const style = await request.get('/os-base-map/resources/styles')
    expect([200, 503]).toContain(style.status())

    const names = await request.get('/os-names-search?query=Norwich')
    expect(names.status()).toBe(200)

    const tile = await request.get(
      '/impact-assessor-map/tiles/edp_boundaries/6/31/20.mvt'
    )
    expect([200, 204]).toContain(tile.status())

    const missing = await request.get(
      '/impact-assessor-map/tiles/nope/1/1/1.mvt'
    )
    expect(missing.status()).toBe(404)
  })
})
