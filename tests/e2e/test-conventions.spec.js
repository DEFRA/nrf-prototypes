const { test, expect } = require('@playwright/test')
const fs = require('fs')
const path = require('path')

/**
 * The e2e specs must not hard-code journey copy: headings, error messages
 * and option labels come from content/ through tests/e2e/helpers/journey.js,
 * so a reword by the content designer never breaks a test. This spec reads
 * the other specs and fails on the idioms that used to break:
 *
 *   expect(page.locator('h1')).toHaveText('Some heading')
 *   expect(page.locator('.govuk-error-summary')).toContainText('Some error')
 *   page.getByLabel(/part of a label/)
 *
 * A line that really must keep a literal ends with `// copy-ok`.
 */

const SPEC_DIR = __dirname
const IGNORED = [path.basename(__filename)]

// Each pattern spans the line breaks prettier puts inside a long call
const RULES = [
  {
    name: 'a heading asserted against a literal string',
    pattern:
      /\.(?:locator\(\s*'h1[^']*'\s*\)|getByRole\(\s*'heading'[^)]*\))\s*(?:\.first\(\))?\s*\)\s*\.(?:toHaveText|toContainText)\(\s*['"`]/g,
    fix: 'use expectHeading(page, id) or heading(id) from helpers/journey.js'
  },
  {
    name: 'an error summary asserted against a literal string',
    pattern: /\.govuk-error-summary['"]\s*\)\s*\)\s*\.toContainText\(\s*['"`]/g,
    fix: 'use expectError(page, id, key) or error(id, key) from helpers/journey.js'
  },
  {
    name: 'a label matched with a regular expression',
    pattern: /getByLabel\(\s*\//g,
    fix: 'use answer(page, id, value), fillAnswer(page, id, text) or fillField(page, id, name, text) from helpers/journey.js'
  }
]

function lineOf(source, index) {
  return source.slice(0, index).split('\n').length
}

// The source lines a match spans, plus the rest of its last line (where a
// `// copy-ok` would be)
function excerpt(source, match) {
  const start = source.lastIndexOf('\n', match.index) + 1
  let end = source.indexOf('\n', match.index + match[0].length)
  if (end === -1) {
    end = source.length
  }
  return source.slice(start, end)
}

function findings(source, file) {
  const found = []
  for (const rule of RULES) {
    for (const match of source.matchAll(rule.pattern)) {
      const lines = excerpt(source, match)
      if (/\/\/\s*copy-ok\s*$/.test(lines)) {
        continue
      }
      found.push(
        `${file}:${lineOf(source, match.index)} ${rule.name}\n    ${lines.trim().split('\n').join('\n    ')}\n    → ${rule.fix}`
      )
    }
  }
  return found
}

test.describe('test conventions', () => {
  const specs = fs
    .readdirSync(SPEC_DIR)
    .filter((file) => file.endsWith('.spec.js') && !IGNORED.includes(file))

  test('specs derive journey copy from the content files', () => {
    const problems = specs.flatMap((file) =>
      findings(fs.readFileSync(path.join(SPEC_DIR, file), 'utf8'), file)
    )
    expect(
      problems,
      `Journey copy is hard-coded in:\n\n${problems.join('\n\n')}\n`
    ).toEqual([])
  })

  test('the rules catch the idioms they describe', () => {
    const bad = [
      "await expect(page.locator('h1')).toHaveText('Who is the levy for?')",
      "await expect(\n  page.getByRole('heading', { level: 1 })\n).toContainText('Your file')",
      "await expect(page.locator('h1, .govuk-fieldset__legend').first()).toContainText('What?')",
      "await expect(page.locator('.govuk-error-summary')).toContainText(\n  'Select an option'\n)",
      'await page.getByLabel(/client you act for/).check()'
    ]
    for (const statement of bad) {
      expect(findings(statement, 'x.spec.js').length, statement).toBe(1)
    }
    const good = [
      "await expect(page.locator('h1')).toHaveText(heading('start'))",
      "await expect(page.locator('.govuk-error-summary')).toBeVisible()",
      "await expect(page.locator('.govuk-error-summary')).toContainText(error('agreement'))",
      "await page.getByLabel('Yes', { exact: true }).check()",
      "await expect(page.locator('h1')).toHaveText('Kept on purpose') // copy-ok"
    ]
    for (const statement of good) {
      expect(findings(statement, 'x.spec.js'), statement).toEqual([])
    }
  })
})
