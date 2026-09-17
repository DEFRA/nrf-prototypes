const { test, expect } = require('@playwright/test')
const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const { loadJourney } = require('../../app/lib/journey-engine/loader')
const {
  handoffLine,
  pageHandoff,
  journeyHandoffs,
  LABELS
} = require('../../app/lib/journey-engine/history')

/**
 * Design handoff: `handoff: <date>` on a page in journey.yaml marks it ready
 * for dev. The tools page tags the screen, the homepage card counts them,
 * and the tag turns yellow when the copy changes after the handoff.
 */

const journeyId = 'nrf-quote-7'
const journey = loadJourney(journeyId)
const yamlFile = path.join(
  __dirname,
  '../../content',
  journeyId,
  'journey.yaml'
)
const stamped = (yaml.load(fs.readFileSync(yamlFile, 'utf8')).pages || [])
  .filter((page) => page.handoff)
  .map((page) => page.id)

test.describe('design handoff', () => {
  test('the quote journey has handed-over pages to show', () => {
    expect(stamped.length).toBeGreaterThan(0)
    expect(
      journeyHandoffs(journey)
        .map((item) => item.id)
        .sort()
    ).toEqual([...stamped].sort())
  })

  test('screen wall tags every handed-over screen and no other', async ({
    page
  }) => {
    await page.goto(`/tools/journeys/${journeyId}`)
    await page.getByRole('tab', { name: 'Screens' }).click()
    for (const id of stamped) {
      const card = page.locator(`#screen-${id}`)
      await expect(card).toHaveClass(/wall-card--handoff/)
      await expect(card.locator('.wall-card__handoff .govuk-tag')).toHaveText(
        new RegExp(`^\\s*(${LABELS.ready}|${LABELS.changed})\\s*$`)
      )
    }
    const tagged = page.locator('.wall-card--handoff:not(.wall-card--variant)')
    await expect(tagged).toHaveCount(stamped.length)
  })

  test('screens tab lists the handoffs with their git tag', async ({
    page
  }) => {
    await page.goto(`/tools/journeys/${journeyId}`)
    await page.getByRole('tab', { name: 'Screens' }).click()
    // The list sits inside a details component, closed by default
    await page.locator('#handoffs summary').click()
    const table = page.locator('#handoffs table')
    await expect(table.locator('tbody tr')).toHaveCount(stamped.length)
    for (const item of journeyHandoffs(journey)) {
      const row = table.locator('tbody tr', { hasText: item.id })
      await expect(row).toContainText(item.on)
      await expect(row).toContainText(item.tag)
      await expect(
        row.getByRole('link', { name: 'Copy at handoff' })
      ).toHaveAttribute('href', item.fileUrl)
    }
  })

  test('homepage card counts the pages ready for dev', async ({ page }) => {
    await page.goto('/')
    const card = page
      .locator('div', { has: page.locator(`code:text-is("${journeyId}")`) })
      .first()
    const ready = journeyHandoffs(journey).filter((item) => !item.changed)
    if (ready.length) {
      await expect(
        card.locator('.journey-card__handoff .govuk-tag').first()
      ).toContainText('ready for dev')
    }
  })
})

test.describe('handoff history', () => {
  // A page the journey really stamps, so the blame line exists in its yaml
  const samplePage = journey.pages.find((page) => page.handoff)

  test('finds the handoff line inside the right page entry', () => {
    const text = [
      'pages:',
      '  - id: start',
      '    shared: true',
      '  - id: upload-redline',
      '    field: redline-file',
      '    handoff: 2026-09-17',
      '  - id: map',
      '    handoff: 2026-09-01'
    ].join('\n')
    expect(handoffLine(text, 'upload-redline')).toBe(6)
    expect(handoffLine(text, 'map')).toBe(8)
    expect(handoffLine(text, 'start')).toBeNull()
  })

  test('pages without a handoff report nothing', () => {
    expect(pageHandoff(journey, { ...samplePage, handoff: null })).toBeNull()
  })

  test('reads the deployed manifest in preference to git', () => {
    const manifest = {
      pages: {
        [`${journeyId}/${samplePage.id}`]: {
          stampedAt: '2026-09-17T09:00:00Z',
          stampCommit: 'abc123',
          lastChanged: '2026-09-18T10:00:00Z',
          changed: true,
          uncommitted: false
        }
      }
    }
    const result = pageHandoff(journey, samplePage, { manifest })
    expect(result.source).toBe('manifest')
    expect(result.changed).toBe(true)
    expect(result.label).toBe(LABELS.changed)
    expect(result.lastChangedOn).toBe('2026-09-18')
    expect(result.tag).toBe(`handoff/${journeyId}/${samplePage.handoff}`)
  })

  test('with no manifest and no git it still says ready for dev', () => {
    const noGit = () => {
      throw new Error('git: not found')
    }
    const result = pageHandoff(journey, samplePage, {
      manifest: null,
      exec: noGit
    })
    expect(result.label).toBe(LABELS.ready)
    expect(result.changed).toBe(false)
    expect(result.source).toBe('git')
  })

  test('a commit after the stamp means changed since handoff', () => {
    const exec = (cmd, args) => {
      const joined = args.join(' ')
      if (joined.startsWith('blame')) {
        return `abc123 1 1 1\ncommitter-time 1789000000\n\thandoff: ${samplePage.handoff}\n`
      }
      if (joined.startsWith('log -1 --format=%H abc123..HEAD')) {
        return 'def456\n'
      }
      if (joined.startsWith('log -1 --format=%cI')) {
        return '2026-09-18T10:00:00+01:00\n'
      }
      if (joined.startsWith('status')) {
        return ''
      }
      return ''
    }
    const result = pageHandoff(journey, samplePage, { manifest: null, exec })
    expect(result.changed).toBe(true)
    expect(result.stampCommit).toBe('abc123')
    expect(result.label).toBe(LABELS.changed)
  })
})
