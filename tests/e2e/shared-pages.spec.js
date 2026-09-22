const { test, expect } = require('@playwright/test')
const {
  previewVariants,
  copyVariants
} = require('../../app/lib/journey-engine')
const { copyOf, gotoTools } = require('./helpers/journey')

/**
 * Shared pages: the quote and request-to-use journeys both start on the
 * start page and "What would you like to do?" from content/shared/pages/,
 * each served at its own basePath. One answer stays in the journey, the
 * other leaves for the sibling journey's first question.
 */

const quote = copyOf('nrf-quote-7')
const requestToUse = copyOf('nrf-request-to-use-1')
const funnel = quote.journey.byId.get('what-would-you-like-to-do')
// Where the funnel sends "request to use" answers: the request-to-use
// journey's first question, read from the rule so the test follows the YAML
const requestToUseEntry = funnel.next.find((rule) => rule.when).goto
const requestToUseEntryId = requestToUseEntry.split('/').pop()

test.describe('shared start page', () => {
  test('both journeys are marked as sharing the same content file', () => {
    for (const { journey } of [quote, requestToUse]) {
      expect(journey.start).toBe('start')
      for (const id of ['start', 'what-would-you-like-to-do']) {
        const page = journey.byId.get(id)
        expect(page.shared).toBe(true)
        expect(page.contentFile).toBe(`content/shared/pages/${id}.md`)
      }
    }
  })

  test('both journeys render the same start page heading', async ({ page }) => {
    const headings = []
    for (const { journey } of [quote, requestToUse]) {
      const response = await page.goto(`${journey.basePath}/start`)
      expect(response.status()).toBe(200)
      headings.push((await page.locator('h1').first().textContent()).trim())
    }
    expect(headings[0]).toBe(quote.heading('start'))
    expect(headings[1]).toBe(headings[0])
  })

  test('the shared pages carry their own service name', async ({ page }) => {
    const serviceNav = page.locator('.govuk-service-navigation__service-name')
    for (const { journey, serviceName } of [quote, requestToUse]) {
      for (const id of ['start', 'what-would-you-like-to-do']) {
        await page.goto(journey.byId.get(id).path)
        await expect(serviceNav).toContainText(`PROTOTYPE - ${serviceName(id)}`)
        await expect(page).toHaveTitle(
          new RegExp(`${serviceName(id)} - GOV.UK$`)
        )
      }
    }
    // The journey's own name takes over from its first question
    await page.goto(quote.journey.byId.get('planning-type').path)
    await expect(serviceNav).toContainText(
      `PROTOTYPE - ${quote.journey.serviceName}`
    )
    await page.goto(requestToUse.journey.byId.get(requestToUseEntryId).path)
    await expect(serviceNav).toContainText(
      `PROTOTYPE - ${requestToUse.journey.serviceName}`
    )
  })

  test('the funnel page needs an answer', async ({ page }) => {
    const response = await page.request.post(funnel.path, { form: {} })
    expect(response.status()).toBe(200)
    const html = await response.text()
    expect(html).toContain('There is a problem')
    expect(html).toContain(funnel.content.errors.required)
  })
})

test.describe('funnel between journeys', () => {
  test('choosing request to use leaves the quote journey', async ({ page }) => {
    await page.goto(`${quote.base}/start`)
    await page.getByRole('button', { name: 'Start now' }).click()
    await expect(page).toHaveURL(`${quote.base}/what-would-you-like-to-do`)

    await quote.answer(page, 'what-would-you-like-to-do', 'request-to-use')
    await quote.submit(page, 'what-would-you-like-to-do')
    await expect(page).toHaveURL(requestToUseEntry)

    // The back link stays inside the journey we landed in, on its own copy
    // of the shared funnel page, with the answer still selected
    await expect(page.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      `${requestToUse.base}/what-would-you-like-to-do`
    )
    await page.getByRole('link', { name: 'Back' }).click()
    await expect(
      requestToUse.optionLocator(
        page,
        'what-would-you-like-to-do',
        'request-to-use'
      )
    ).toBeChecked()
  })

  test('choosing a quote leaves the request-to-use journey', async ({
    page
  }) => {
    await page.goto(`${requestToUse.base}/start`)
    await page.getByRole('button', { name: 'Start now' }).click()
    await requestToUse.expectHeading(page, 'what-would-you-like-to-do')

    await requestToUse.answer(page, 'what-would-you-like-to-do', 'quote')
    await requestToUse.submit(page, 'what-would-you-like-to-do')
    await expect(page).toHaveURL(`${quote.base}/planning-type`)
    await expect(page.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      `${quote.base}/what-would-you-like-to-do`
    )
  })
})

test.describe('journey tools show exits to other journeys', () => {
  test('flow.json lists the exit as an off-page transition', async ({
    request
  }) => {
    const response = await request.get(
      `/tools/journeys/${quote.journey.id}/flow.json`
    )
    expect(response.status()).toBe(200)
    const flow = await response.json()
    // The funnel question branches there
    expect(flow.transitions.offPage).toEqual([
      expect.objectContaining({
        fromId: 'what-would-you-like-to-do',
        toPath: requestToUseEntry,
        kind: 'next'
      })
    ])
    // The exit is not a screen of this journey
    expect(flow.screens).toHaveLength(quote.journey.pages.length)
  })

  test('the flow diagram and screen wall show the exit', async ({ page }) => {
    await gotoTools(page, quote.journey.id)
    await expect(
      page.locator('#flow-diagram[data-rendered="true"]')
    ).toHaveCount(1, { timeout: 20000 })
    // The diagram draws one exit box per path left to; the wall has one
    // placeholder card per page that leaves (the funnel question goes to
    // the request-to-use entry)
    await expect(page.locator('.flow-node--external')).toHaveCount(1)
    await expect(page.locator('.wall-card--external')).toHaveCount(1)
    await expect(page.locator('.wall-card--external')).toContainText([
      requestToUseEntry
    ])
    // Placeholder cards carry no iframe, so the wall still has one per page
    // (plus one per preview variant and one per copy variant)
    const cards = quote.journey.pages.reduce(
      (count, page) =>
        count + 1 + previewVariants(page).length + copyVariants(page).length,
      0
    )
    await expect(page.locator('iframe')).toHaveCount(cards)
  })

  test('flow.mmd gives the exit a valid node id', async ({ request }) => {
    const response = await request.get(
      `/tools/journeys/${quote.journey.id}/flow.mmd`
    )
    expect(response.status()).toBe(200)
    const source = await response.text()
    expect(source).toContain(
      `ext0["${requestToUseEntry}<br/>Continues in another journey"]`
    )
    expect(source).toContain('class ext0 external')
  })
})
