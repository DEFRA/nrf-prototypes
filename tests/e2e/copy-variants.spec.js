const { test, expect } = require('@playwright/test')
const fs = require('fs')
const path = require('path')
const {
  loadJourney,
  copyVariants,
  exportScreens,
  journeyHandoffs
} = require('../../app/lib/journey-engine')
const { parseMarkdownFile } = require('../../app/lib/journey-engine/loader')
const { asHandedOver } = require('../../app/lib/journey-engine/screenshots')
const { copyOf } = require('./helpers/journey')

/**
 * Copy variants: a sibling file `pages/<id>~<name>.md` is an alternative
 * copy of the page, shown with `?copy=<name>` (for the session) or
 * `?_copy=<name>` (this request only), side by side on the tools page and
 * in the JPG export, and never in a frozen handoff copy.
 *
 * The spec writes its own variant of one page for the duration of the run
 * and removes it again, so it does not depend on any variant the team is
 * trying out, and it changes nothing under content/ once it has finished.
 */

const journeyId = 'nrf-quote-7'
const pageId = 'planning-type'
const variantId = 'test'
const { heading, expectHeading } = copyOf(journeyId)

const repoRoot = path.join(__dirname, '../..')
const pagesDir = path.join(repoRoot, 'content', journeyId, 'pages')
const defaultFile = path.join(pagesDir, `${pageId}.md`)
const variantFile = path.join(pagesDir, `${pageId}~${variantId}.md`)

// The page's own copy with its heading reworded (the words are fixture
// data, built from the real heading rather than written here)
const defaultHeading = heading(pageId)
const variantHeading = `${defaultHeading} (${variantId} copy)`
const variantLabel = 'Test copy'

function variantSource() {
  const source = fs.readFileSync(defaultFile, 'utf8')
  const { frontmatter } = parseMarkdownFile(source, defaultFile)
  const frontmatterText = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1]
  expect(frontmatter.type).toBe('radios')
  return `---\nvariant: ${variantLabel}\n${frontmatterText}\n---\n\n# ${variantHeading}\n`
}

test.describe('copy variants', () => {
  test.beforeAll(() => {
    fs.writeFileSync(variantFile, variantSource())
  })

  test.afterAll(() => {
    fs.rmSync(variantFile, { force: true })
  })

  test('the loader lists the variant beside the page, copy only', () => {
    const journey = loadJourney(journeyId)
    const page = journey.byId.get(pageId)
    const variant = page.copyVariants.find((item) => item.id === variantId)
    expect(variant).toBeDefined()
    expect(variant.label).toBe(variantLabel)
    expect(variant.contentFile).toBe(
      `content/${journeyId}/pages/${pageId}~${variantId}.md`
    )
    // The variant is the same page with other words: id, path, rules and
    // session key are the page's own
    expect(variant.page.id).toBe(pageId)
    expect(variant.page.path).toBe(page.path)
    expect(variant.page.next).toEqual(page.next)
    expect(variant.page.sessionKey).toBe(page.sessionKey)
    expect(variant.page.content.heading).toBe(variantHeading)
    expect(variant.page.copyVariants).toEqual([])
    // The page itself is untouched, and its file is still what git is
    // asked about for the handoff tags
    expect(page.content.heading).toBe(defaultHeading)
    expect(page.contentFile).toBe(`content/${journeyId}/pages/${pageId}.md`)
    expect(journey.pages.filter((item) => item.id === pageId)).toHaveLength(1)
    expect(copyVariants(page)).toContainEqual({
      id: variantId,
      label: variantLabel,
      contentFile: variant.contentFile
    })
  })

  test('?_copy shows the variant for that request only', async ({ page }) => {
    const journey = loadJourney(journeyId)
    const path = journey.byId.get(pageId).path
    await page.goto(`${path}?_copy=${variantId}`)
    await expect(page.locator('h1')).toHaveText(variantHeading)
    await page.goto(path)
    await expectHeading(page, pageId)
  })

  test('?copy sticks for the session until ?copy=default', async ({ page }) => {
    const journey = loadJourney(journeyId)
    const path = journey.byId.get(pageId).path
    await page.goto(`${path}?copy=${variantId}`)
    await expect(page.locator('h1')).toHaveText(variantHeading)
    await page.goto(path)
    await expect(page.locator('h1')).toHaveText(variantHeading)
    // A page with no such variant shows its own copy
    await page.goto(journey.byId.get('housing').path)
    await expectHeading(page, 'housing')
    await page.goto(`${path}?copy=default`)
    await expectHeading(page, pageId)
    await page.goto(path)
    await expectHeading(page, pageId)
  })

  test('a preview with ?_copy leaves the session alone', async ({ page }) => {
    const journey = loadJourney(journeyId)
    const path = journey.byId.get(pageId).path
    await page.goto(`${path}?preview=1&_copy=${variantId}`)
    await expect(page.locator('h1')).toHaveText(variantHeading)
    await page.goto(path)
    await expectHeading(page, pageId)
  })

  test('a frozen handoff copy never varies', async ({ page }) => {
    const journey = loadJourney(journeyId)
    const frozen = journeyHandoffs(journey).find(
      (item) => item.id === pageId && item.frozenUrl
    )
    test.skip(!frozen, `no committed handoff of ${pageId} to freeze`)
    await page.goto(`${frozen.frozenUrl}?preview=1&copy=${variantId}`)
    await expect(page.locator('h1')).not.toHaveText(variantHeading)
    await page.goto(`${frozen.frozenUrl}?preview=1&_copy=${variantId}`)
    await expect(page.locator('h1')).not.toHaveText(variantHeading)
  })

  test('the screen wall shows the variant beside the page', async ({
    page
  }) => {
    await page.goto(`/tools/journeys/${journeyId}`)
    await page.getByRole('tab', { name: 'Screens' }).click()
    const card = page.locator(`#screen-${pageId}\\~${variantId}`)
    await expect(card).toHaveClass(/wall-card--copy/)
    await expect(card.locator('iframe')).toHaveAttribute(
      'src',
      new RegExp(`/${pageId}\\?preview=1&embed=1&_copy=${variantId}$`)
    )
    await expect(card.locator('.wall-card__file')).toHaveText(
      `${pageId}~${variantId}.md`
    )
    // The page's own card and the variant's both offer the comparison
    const compareUrl = `/tools/journeys/${journeyId}/compare/${pageId}`
    await expect(
      page.locator(`#screen-${pageId} .wall-card__compare`)
    ).toHaveAttribute('href', compareUrl)
    await expect(card.locator('.wall-card__compare')).toHaveAttribute(
      'href',
      compareUrl
    )
  })

  test('the compare page shows every copy of the page', async ({ page }) => {
    const journey = loadJourney(journeyId)
    const copies = copyVariants(journey.byId.get(pageId))
    const response = await page.goto(
      `/tools/journeys/${journeyId}/compare/${pageId}`
    )
    expect(response.status()).toBe(200)
    await expect(page.locator('.compare-column')).toHaveCount(1 + copies.length)
    const variantColumn = page.locator('.compare-column--variant', {
      hasText: variantLabel
    })
    await expect(variantColumn.locator('iframe')).toHaveAttribute(
      'src',
      new RegExp(`_copy=${variantId}$`)
    )
    // Mobile width and the error state change every frame together
    await page.getByLabel('Mobile').check()
    await expect(page.locator('#compare-grid')).toHaveAttribute(
      'data-width',
      '375'
    )
    await page.getByLabel('Show error state').check()
    await expect(variantColumn.locator('iframe')).toHaveAttribute(
      'src',
      /&error=/
    )
    const missing = await page.goto(
      `/tools/journeys/${journeyId}/compare/no-such-page`
    )
    expect(missing.status()).toBe(404)
  })

  test('the JPG export names the variant after its file, never as handed over', async ({
    request
  }) => {
    const journey = loadJourney(journeyId)
    const screens = exportScreens(journey).filter((item) => item.id === pageId)
    const variant = screens.find((item) => item.copy === variantId)
    expect(variant).toBeDefined()
    expect(variant.file).toMatch(new RegExp(`-${pageId}~${variantId}\\.jpg$`))
    expect(variant.url).toContain(`&_copy=${variantId}`)
    expect(screens[0].copy).toBeNull()
    expect(asHandedOver(journey, screens).some((item) => item.copy)).toBeFalsy()

    const response = await request.get(
      `/tools/journeys/${journeyId}/screens/${pageId}.jpg?copy=${variantId}`
    )
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toBe('image/jpeg')
    expect(response.headers()['content-disposition']).toContain(
      `${journeyId}-${pageId}~${variantId}.jpg`
    )
    const unknown = await request.get(
      `/tools/journeys/${journeyId}/screens/${pageId}.jpg?copy=no-such-copy`
    )
    expect(unknown.status()).toBe(404)
  })
})
