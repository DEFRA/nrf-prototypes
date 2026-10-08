const { test, expect } = require('@playwright/test')
const {
  loadJourney,
  journeyScenarios,
  previewData
} = require('../../app/lib/journey-engine')

/**
 * The Scenarios tab on the tools page lists every page's preview variants
 * (other sample answers) and copy variants (other wording), so a research
 * session can pick one without hunting through the screen wall. The
 * homepage card links straight to it.
 */

const journeyId = 'lpa-manage-1'
const journey = loadJourney(journeyId)
const scenarios = journeyScenarios(journey)
const withSamples = scenarios.find((page) => page.samples.length)

test.describe('tools page scenarios', () => {
  test('homepage card opens the Scenarios tab', async ({ page }) => {
    await page.goto(`/#${journey.homepage.family}`)
    const card = page
      .locator('.journey-card', {
        has: page.locator(`code:text-is("${journeyId}")`)
      })
      .first()
    await card.getByRole('link', { name: /^Scenarios/ }).click()
    await expect(page).toHaveURL(
      new RegExp(`/tools/journeys/${journeyId}#scenarios$`)
    )
    await expect(page.locator('#scenarios')).toBeVisible()
    await expect(page.locator('#screens')).toBeHidden()
  })

  test('lists the standard state, then each preview variant, linked by name', async ({
    page
  }) => {
    test.skip(!withSamples, 'no page of this journey has preview variants')
    await page.goto(`/tools/journeys/${journeyId}#scenarios`)
    const section = page.locator(`#scenarios-${withSamples.id}`)
    await expect(section.getByRole('heading')).toHaveText(withSamples.title)
    // A live scenario opens the page for real, the rest as a preview
    const expected = [
      {
        label: withSamples.standard.label,
        href: `${withSamples.path}?preview=1`
      },
      ...withSamples.samples.map((sample) => ({
        label: sample.label,
        href: sample.live
          ? `${withSamples.path}?_scenario=${sample.id}`
          : `${withSamples.path}?preview=1&variant=${sample.id}`
      }))
    ]
    const names = section.locator('td.scenarios__name > a')
    await expect(names).toHaveCount(expected.length)
    for (const [index, item] of expected.entries()) {
      await expect(names.nth(index)).toHaveAttribute('href', item.href)
      await expect(names.nth(index)).toContainText(item.label)
      await expect(names.nth(index)).toHaveAttribute('target', '_blank')
    }
    const response = await page.request.get(expected[1].href)
    expect(response.status()).toBe(200)
  })

  test('each scenario says what it shows', async ({ page }) => {
    const index = withSamples.samples.findIndex((sample) => sample.description)
    test.skip(index < 0, 'no preview variant has a description')
    const described = withSamples.samples[index]
    await page.goto(`/tools/journeys/${journeyId}#scenarios`)
    // The page's standard state is the first row, then its variants
    const row = page
      .locator(`#scenarios-${withSamples.id} tbody tr`)
      .nth(index + 1)
    await expect(row.locator('td.scenarios__name > a')).toContainText(
      described.label
    )
    await expect(row.locator('.scenarios__description')).toHaveText(
      described.description
    )
  })

  test('a scenarios column shows the sample answer of each scenario', async ({
    page
  }) => {
    const column = [].concat(journey.scenarios.columns || [])[0]
    test.skip(!column, 'the journey has no scenarios columns')
    const pageId = [].concat(column.pages || withSamples.id)[0]
    const entry = scenarios.find((item) => item.id === pageId)
    const source = journey.byId.get(pageId)
    await page.goto(`/tools/journeys/${journeyId}#scenarios`)
    const section = page.locator(`#scenarios-${pageId}`)
    await expect(section.locator('th.scenarios__value')).toHaveText(
      column.label
    )
    const expected = [
      previewData(journey, source),
      ...entry.samples.map((sample) => previewData(journey, source, sample.id))
    ].map((data) => String(data[column.key]))
    await expect(section.locator('td.scenarios__value')).toHaveText(expected)
  })

  test('a live scenario opens the page for real, so the user can carry on', async ({
    page
  }) => {
    const source = journey.pages.find((item) =>
      ((item.preview && item.preview.variants) || []).some((v) => v.live)
    )
    test.skip(!source, 'the journey has no live scenario')
    const variant = source.preview.variants.find((v) => v.live)
    await page.goto(`/tools/journeys/${journeyId}#scenarios`)
    const link = page.locator(
      `#scenarios-${source.id} td.scenarios__name > a`,
      {
        hasText: variant.label
      }
    )
    await expect(link).toHaveAttribute(
      'href',
      `${source.path}?_scenario=${variant.id}`
    )
    await page.goto(`${source.path}?_scenario=${variant.id}`)
    // The query is dropped, so reloading the page keeps what was typed
    await expect(page).toHaveURL(new RegExp(`${source.path}$`))
    await expect(page.locator(`input[name="${source.field}"]`)).toHaveValue(
      variant.data[source.sessionKey]
    )
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(
      new RegExp(`/${journeyId}/planning-variation$`)
    )
  })
})
