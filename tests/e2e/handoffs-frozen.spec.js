const { test, expect } = require('@playwright/test')
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const {
  loadJourney,
  journeyHandoffs,
  loadFrozenJourney,
  resolveHandoffCommit,
  snapshotDir
} = require('../../app/lib/journey-engine')
const { gotoTools } = require('./helpers/journey')

/**
 * Frozen copies of handoffs: /handoffs/<journey>/<date>/<page> serves the
 * journey from the content as handed over on that date, so the link keeps
 * showing the same copy however much the live page moves afterwards.
 */

const journeyId = 'nrf-quote-7'
const journey = loadJourney(journeyId)
const repoRoot = path.join(__dirname, '../..')

// A handoff whose date is committed (an uncommitted stamp has nothing to
// freeze yet, so locally the list can be empty mid-edit)
const frozen = journeyHandoffs(journey).find((item) => item.frozenUrl)

function plain(text) {
  return String(text || '')
    .split('{{')[0]
    .replace(/\s+/g, ' ')
    .trim()
}

test.describe('frozen copy of a handoff', () => {
  test.skip(!frozen, 'no committed handoff to freeze')

  test('serves the page as handed over, with a banner', async ({ page }) => {
    expect(frozen.frozenUrl).toBe(`/handoffs/${journeyId}/latest/${frozen.id}`)
    const result = loadFrozenJourney(journeyId, 'latest', frozen.id)
    expect(result.error).toBeUndefined()
    const copy = result.journey
    expect(copy.basePath).toBe(`/handoffs/${journeyId}/latest`)
    expect(copy.frozen.commit).toBe(frozen.stampCommit)

    const response = await page.goto(`${frozen.frozenUrl}?preview=1`)
    expect(response.status()).toBe(200)
    const banner = page.locator('.app-frozen-banner')
    await expect(banner).toBeVisible()
    await expect(banner).toContainText(
      `handed over on ${copy.frozen.pages[frozen.id].onText}`
    )
    await expect(
      banner.getByRole('link', { name: 'Working copy' })
    ).toHaveAttribute('href', `${journey.basePath}/${frozen.id}`)
    await expect(page.locator('h1').first()).toContainText(
      plain(copy.byId.get(frozen.id).content.heading)
    )
  })

  test('the dated URL pins the same copy', async ({ page }) => {
    expect(frozen.datedUrl).toBe(
      `/handoffs/${journeyId}/${frozen.on}/${frozen.id}`
    )
    const copy = loadFrozenJourney(journeyId, frozen.on, frozen.id).journey
    expect(copy.basePath).toBe(`/handoffs/${journeyId}/${frozen.on}`)
    expect(copy.frozen.commit).toBe(frozen.stampCommit)

    await page.goto(`${frozen.datedUrl}?preview=1`)
    const banner = page.locator('.app-frozen-banner')
    await expect(banner).toContainText(`handed over on ${copy.frozen.onText}`)
  })

  test('a page that was never handed over says so', async ({ page }) => {
    const other = journey.pages.find(
      (item) => !item.handoff && item.type !== 'custom'
    )
    test.skip(!other, 'every page has been handed over')

    // Under a date, an unstamped page comes from the newest commit that
    // handed a page over on that date (one date can span several commits)
    const newestOfDate = journeyHandoffs(journey)
      .filter((item) => item.on === frozen.on && item.stampCommit)
      .sort((a, b) => (b.stampedAt || '').localeCompare(a.stampedAt || ''))[0]

    for (const slug of ['latest', frozen.on]) {
      const copy = loadFrozenJourney(journeyId, slug, other.id).journey
      expect(copy.frozen.pages[other.id]).toBeUndefined()
      // Under `latest` an unstamped page is the live content
      expect(copy.frozen.commit).toBe(
        slug === 'latest' ? null : newestOfDate.stampCommit
      )

      await page.goto(`${copy.basePath}/${other.id}?preview=1`)
      const banner = page.locator('.app-frozen-banner')
      await expect(banner).toBeVisible()
      await expect(banner).toContainText('Not handed over')
      await expect(banner).not.toContainText('Copy as handed over')
      await expect(
        banner.getByRole('link', { name: 'Working copy' })
      ).toHaveAttribute('href', `${journey.basePath}/${other.id}`)
    }
  })

  test('the mount root of latest goes to the start page', async ({ page }) => {
    await page.goto(`/handoffs/${journeyId}/latest`)
    await expect(page).toHaveURL(
      new RegExp(`/handoffs/${journeyId}/latest/${journey.start}$`)
    )
    await expect(page.locator('.app-frozen-banner')).toBeVisible()
  })

  test('the snapshot is the file at the handoff commit', () => {
    const dir = snapshotDir(frozen.stampCommit)
    expect(dir).toBeTruthy()
    const snapshot = fs.readFileSync(path.join(dir, frozen.contentFile), 'utf8')
    const committed = execFileSync(
      'git',
      ['show', `${frozen.stampCommit}:${frozen.contentFile}`],
      { cwd: repoRoot, encoding: 'utf8' }
    )
    expect(snapshot).toBe(committed)
  })

  test('the mount root goes to the frozen start page', async ({ page }) => {
    await page.goto(`/handoffs/${journeyId}/${frozen.on}`)
    await expect(page).toHaveURL(
      new RegExp(`/handoffs/${journeyId}/${frozen.on}/${journey.start}$`)
    )
    await expect(page.locator('.app-frozen-banner')).toBeVisible()
  })

  test('the tools page links to it', async ({ page }) => {
    await gotoTools(page, journeyId)
    await page.getByRole('tab', { name: 'Screens' }).click()
    await page.locator('#handoffs summary').click()
    const row = page.locator('#handoffs table tbody tr', { hasText: frozen.id })
    await expect(
      row.getByRole('link', { name: 'Frozen page' })
    ).toHaveAttribute('href', `${frozen.frozenUrl}?preview=1`)

    // The screen's menu can show the frozen copy in place; Open, Copy link
    // and Export then follow it
    const card = page.locator(`#screen-${frozen.id}`)
    await card.locator('.wall-card__menu-button').click()
    await card.locator('.wall-card__views input[value=handoff]').check()
    await expect(card.locator('iframe')).toHaveAttribute(
      'src',
      `${frozen.frozenUrl}?preview=1&embed=1`
    )
    await expect(card.locator('.wall-card__showing')).toBeVisible()
    await expect(card.locator('.wall-card__open')).toHaveAttribute(
      'href',
      `${frozen.frozenUrl}?preview=1`
    )
    await expect(
      card.locator('.wall-card__copy[data-copy-url]')
    ).toHaveAttribute(
      'data-copy-url',
      new RegExp(`${frozen.frozenUrl}\\?preview=1$`)
    )
    const exportLink = card.locator('.wall-card__export')
    if (await exportLink.count()) {
      await expect(exportLink).toHaveAttribute('href', /\?handoff=1$/)
    }

    // Back to live, and the copy link is the live page again
    await card.locator('.wall-card__views input[value=live]').check()
    await expect(card.locator('iframe')).toHaveAttribute(
      'src',
      `${journey.basePath}/${frozen.id}?preview=1&embed=1`
    )
    await expect(card.locator('.wall-card__showing')).toBeHidden()
  })

  test('the bulk export as handed over keeps only frozen pages', () => {
    const { asHandedOver } = require('../../app/lib/journey-engine/screenshots')
    const { exportScreens } = require('../../app/lib/journey-engine/flow')
    const screens = asHandedOver(journey, exportScreens(journey))
    const withCopy = journeyHandoffs(journey)
      .filter((item) => item.frozenUrl)
      .map((item) => item.id)
    expect(screens.length).toBeGreaterThan(0)
    for (const screen of screens) {
      expect(withCopy).toContain(screen.id)
      expect(screen.url).toMatch(
        new RegExp(
          `^/handoffs/${journeyId}/latest/${screen.id}\\?preview=1&embed=1`
        )
      )
      expect(screen.file).toMatch(/--handoff\.jpg$/)
    }
    expect(new Set(screens.map((screen) => screen.id)).size).toBe(
      withCopy.length
    )
  })

  test('the export of a page with no frozen copy is not found', async ({
    request
  }) => {
    const other = journey.pages.find(
      (item) => !item.handoff && item.type !== 'custom'
    )
    test.skip(!other, 'every page has been handed over')
    const response = await request.get(
      `/tools/journeys/${journeyId}/screens/${other.id}.jpg?handoff=1`
    )
    expect(response.status()).toBe(404)
  })
})

test.describe('frozen copy that does not exist', () => {
  test('a date nothing was handed over on is not found', async ({ page }) => {
    const response = await page.goto(`/handoffs/${journeyId}/2000-01-01/start`)
    expect(response.status()).toBe(404)
    // The app's own not-found page, not journey copy
    await expect(page.locator('h1')).toContainText('2000-01-01') // copy-ok
  })

  test('anything but a date or latest falls through', async ({ page }) => {
    const response = await page.goto(`/handoffs/${journeyId}/newest/start`)
    expect(response.status()).toBe(404)
    await expect(page.locator('.app-frozen-banner')).toHaveCount(0)
  })
})

test.describe('which commit a handoff resolves to', () => {
  const stamped = journey.pages.find((page) => page.handoff)
  const other = journey.pages.find((page) => page.id !== stamped.id)
  const sha = 'a'.repeat(40)
  const tagSha = 'b'.repeat(40)
  const manifestWith = (pages, tags = {}) => ({ pages, tags })
  // Every page handed over on the same date, all from one pretend commit: a
  // page the manifest leaves out is answered from git, which would win
  const sameDate = Object.fromEntries(
    journey.pages
      .filter((page) => page.handoff === stamped.handoff)
      .map((page) => [
        `${journeyId}/${page.id}`,
        {
          on: page.handoff,
          stampCommit: sha,
          stampedAt: '2026-09-17T09:00:00Z'
        }
      ])
  )

  test('the page stamped with the date wins', () => {
    const manifest = manifestWith(sameDate)
    expect(
      resolveHandoffCommit(journeyId, stamped.handoff, stamped.id, { manifest })
    ).toEqual({ commit: sha, via: 'page' })
  })

  test('another page starts from the newest handoff of that date', () => {
    const manifest = manifestWith(sameDate)
    expect(
      resolveHandoffCommit(journeyId, stamped.handoff, other.id, { manifest })
    ).toEqual({ commit: sha, via: 'date' })
  })

  test('a date no page carries any more falls back to its tag', () => {
    const manifest = manifestWith(
      {},
      { [`handoff/${journeyId}/2026-01-01`]: tagSha }
    )
    expect(
      resolveHandoffCommit(journeyId, '2026-01-01', stamped.id, { manifest })
    ).toEqual({ commit: tagSha, via: 'tag' })
  })

  test('nothing to show is null', () => {
    const manifest = manifestWith({}, {})
    expect(
      resolveHandoffCommit(journeyId, '2026-01-01', stamped.id, { manifest })
    ).toBeNull()
  })
})
