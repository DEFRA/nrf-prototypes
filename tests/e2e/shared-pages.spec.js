const { test, expect } = require('@playwright/test')
const { loadJourney } = require('../../app/lib/journey-engine')

/**
 * Shared pages: the quote and request-to-use journeys both start on the
 * start page and "What would you like to do?" from content/shared/pages/,
 * each served at its own basePath. One answer stays in the journey, the
 * other leaves for the sibling journey's first question.
 */

const quote = loadJourney('nrf-quote-7')
const requestToUse = loadJourney('nrf-request-to-use-1')
const funnel = quote.byId.get('what-would-you-like-to-do')

test.describe('shared start page', () => {
  test('both journeys are marked as sharing the same content file', () => {
    for (const journey of [quote, requestToUse]) {
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
    for (const journey of [quote, requestToUse]) {
      const response = await page.goto(`${journey.basePath}/start`)
      expect(response.status()).toBe(200)
      headings.push((await page.locator('h1').first().textContent()).trim())
    }
    expect(headings[0]).toBe(quote.byId.get('start').content.heading)
    expect(headings[1]).toBe(headings[0])
  })

  test('the shared pages carry their own service name', async ({ page }) => {
    const serviceNav = page.locator('.govuk-service-navigation__service-name')
    for (const journey of [quote, requestToUse]) {
      for (const id of ['start', 'what-would-you-like-to-do']) {
        await page.goto(journey.byId.get(id).path)
        await expect(serviceNav).toContainText(
          'PROTOTYPE - Manage the nature restoration levy'
        )
        await expect(page).toHaveTitle(
          /Manage the nature restoration levy - GOV.UK$/
        )
      }
    }
    // The journey's own name takes over from its first question
    await page.goto(quote.byId.get('planning-type').path)
    await expect(serviceNav).toContainText(`PROTOTYPE - ${quote.serviceName}`)
    await page.goto(requestToUse.byId.get('quote-reference').path)
    await expect(serviceNav).toContainText(
      `PROTOTYPE - ${requestToUse.serviceName}`
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
    await page.goto(`${quote.basePath}/start`)
    await page.getByRole('button', { name: 'Start now' }).click()
    await expect(page).toHaveURL(`${quote.basePath}/what-would-you-like-to-do`)

    await page.getByLabel(/request to use/).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${requestToUse.basePath}/quote-reference`)

    // The back link stays inside the journey we landed in, on its own copy
    // of the shared funnel page, with the answer still selected
    await expect(page.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      `${requestToUse.basePath}/what-would-you-like-to-do`
    )
    await page.getByRole('link', { name: 'Back' }).click()
    await expect(page.getByLabel(/request to use/)).toBeChecked()
  })

  test('choosing a quote leaves the request-to-use journey', async ({
    page
  }) => {
    await page.goto(`${requestToUse.basePath}/start`)
    await page.getByRole('button', { name: 'Start now' }).click()
    await expect(
      page.locator('h1, .govuk-fieldset__legend').first()
    ).toContainText('What would you like to do?')

    await page.getByLabel(/I want a quote/).check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`${quote.basePath}/planning-type`)
    await expect(page.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      `${quote.basePath}/what-would-you-like-to-do`
    )
  })
})

test.describe('journey tools show exits to other journeys', () => {
  test('flow.json lists the exit as an off-page transition', async ({
    request
  }) => {
    const response = await request.get(`/tools/journeys/${quote.id}/flow.json`)
    expect(response.status()).toBe(200)
    const flow = await response.json()
    expect(flow.transitions.offPage).toEqual([
      expect.objectContaining({
        fromId: 'what-would-you-like-to-do',
        toPath: `${requestToUse.basePath}/quote-reference`,
        kind: 'next'
      })
    ])
    // The exit is not a screen of this journey
    expect(flow.screens).toHaveLength(quote.pages.length)
  })

  test('the flow diagram and screen wall show the exit', async ({ page }) => {
    await page.goto(`/tools/journeys/${quote.id}`)
    await expect(
      page.locator('#flow-diagram[data-rendered="true"]')
    ).toHaveCount(1, { timeout: 20000 })
    await expect(page.locator('.flow-node--external')).toHaveCount(1)
    await expect(page.locator('.wall-card--external')).toHaveCount(1)
    await expect(page.locator('.wall-card--external')).toContainText(
      `${requestToUse.basePath}/quote-reference`
    )
    // Placeholder cards carry no iframe, so the wall still has one per page
    await expect(page.locator('iframe')).toHaveCount(quote.pages.length)
  })

  test('flow.mmd gives the exit a valid node id', async ({ request }) => {
    const response = await request.get(`/tools/journeys/${quote.id}/flow.mmd`)
    expect(response.status()).toBe(200)
    const source = await response.text()
    expect(source).toContain(
      `ext0["${requestToUse.basePath}/quote-reference<br/>Continues in another journey"]`
    )
    expect(source).toContain('class ext0 external')
  })
})
