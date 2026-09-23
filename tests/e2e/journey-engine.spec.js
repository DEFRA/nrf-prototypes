const { test, expect } = require('@playwright/test')
const {
  loadJourney,
  getJourneyIds,
  validateChoiceValues
} = require('../../app/lib/journey-engine')

/**
 * The loader's guard on the answers a journey branches on: a rule in
 * journey.yaml that compares a choice with a value none of the page's
 * options can store is a content mistake (a reworded label, a mistyped
 * `store:` key) that would send the journey the wrong way, so it fails at
 * load time with a message naming the page.
 */

// A minimal journey the way the loader builds one, with the parts the
// guard reads
function journeyWith(pages, preview = {}) {
  return {
    id: 'test',
    preview: { data: preview },
    pages: pages.map((page) => ({
      type: 'content',
      contentFile: `content/test/pages/${page.id}.md`,
      next: [],
      content: { options: [], rows: [], body: '' },
      ...page,
      content: { options: [], rows: [], body: '', ...(page.content || {}) }
    }))
  }
}

const options = (...values) =>
  values.map((value) => ({ label: `Label ${value}`, value }))

function problemsOf(journey) {
  const problems = []
  validateChoiceValues(journey, problems)
  return problems
}

test.describe('journey engine: choice values', () => {
  test('every real journey passes', () => {
    for (const id of getJourneyIds()) {
      expect(() => loadJourney(id), id).not.toThrow()
    }
  })

  test('a rule comparing an answer with a value no option stores is refused', () => {
    const problems = problemsOf(
      journeyWith([
        {
          id: 'housing',
          type: 'radios',
          sessionKey: 'isHousing',
          content: { options: options('Yes', 'No') },
          next: [
            { when: { key: 'isHousing', equals: 'Nope' }, goto: 'not-housing' },
            { goto: 'units' }
          ]
        }
      ])
    )
    expect(problems).toEqual([
      "pages.housing.next[0].when: 'isHousing' is compared with 'Nope' but no option on housing can store it (the options store 'Yes', 'No')"
    ])
  })

  test('a store: key that matches no option is refused', () => {
    const problems = problemsOf(
      journeyWith([
        {
          id: 'redline-map',
          type: 'radios',
          sessionKey: 'hasFile',
          store: { uploads: true, draw: false },
          content: { options: options('upload', 'draw') }
        }
      ])
    )
    expect(problems).toEqual([
      "pages.redline-map.store: 'uploads' matches no option in content/test/pages/redline-map.md (the options' values are 'upload', 'draw')"
    ])
  })

  test('values are checked as strings, through store: and set:', () => {
    const problems = problemsOf(
      journeyWith([
        {
          id: 'redline-map',
          type: 'radios',
          sessionKey: 'hasFile',
          store: { upload: true, draw: false },
          content: { options: options('upload', 'draw') },
          next: [
            { when: { key: 'hasFile', equals: true }, goto: 'upload' },
            { goto: 'map', set: { referrer: 'redline-map' } }
          ]
        },
        {
          id: 'referrer',
          type: 'radios',
          sessionKey: 'referrer',
          content: { options: options('upload-redline') },
          next: [
            {
              when: { key: 'referrer', in: ['redline-map', 'upload-redline'] },
              goto: 'map'
            },
            { goto: 'map' }
          ]
        }
      ])
    )
    expect(problems).toEqual([])
  })

  test('guards, back rules, summary rows and :::if blocks are checked too', () => {
    const problems = problemsOf(
      journeyWith([
        {
          id: 'user-type',
          type: 'radios',
          sessionKey: 'userType',
          content: { options: options('individual', 'agent') }
        },
        {
          id: 'guidance',
          guard: {
            key: 'userType',
            equals: 'organisation',
            redirect: 'user-type'
          },
          back: [
            {
              when: { key: 'userType', notEquals: 'company' },
              goto: 'user-type'
            },
            { goto: 'user-type' }
          ],
          content: { body: ':::if userType equals business\nHello\n:::' }
        },
        {
          id: 'check',
          type: 'check-answers',
          content: {
            rows: [
              {
                key: 'Who',
                value: {
                  when: { key: 'userType', equals: 'individual' },
                  then: 'You',
                  else: {
                    when: { key: 'userType', equals: 'client' },
                    then: 'Them',
                    else: 'Other'
                  }
                },
                change: [
                  {
                    when: { key: 'userType', equals: 'agent' },
                    goto: 'user-type'
                  }
                ],
                changeHidden: {
                  when: { key: 'userType', equals: 'firm' },
                  then: 'a',
                  else: 'b'
                }
              }
            ]
          }
        }
      ])
    )
    const expected = [
      "pages.guidance.guard: 'userType' is compared with 'organisation'",
      "pages.guidance.back[0].when: 'userType' is compared with 'company'",
      "content/test/pages/guidance.md ':::if userType equals business': 'userType' is compared with 'business'",
      "pages.check.rows[0].value.when: 'userType' is compared with 'client'",
      "pages.check.rows[0].changeHidden.when: 'userType' is compared with 'firm'"
    ]
    expect(problems).toHaveLength(expected.length)
    for (const prefix of expected) {
      expect(
        problems.some((problem) => problem.startsWith(prefix)),
        prefix
      ).toBe(true)
    }
  })

  test('keys no choice page writes, engine values and paths are left alone', () => {
    const problems = problemsOf(
      journeyWith([
        {
          id: 'housing',
          type: 'radios',
          sessionKey: 'isHousing',
          content: { options: options('Yes', 'No') },
          next: [
            { when: { key: '$navFromSummary', truthy: true }, goto: 'check' },
            {
              when: { key: 'account.accountType', equals: 'agent' },
              goto: 'check'
            },
            { when: { key: 'accountCreated', equals: 'Yes' }, goto: 'check' },
            { when: { key: 'isHousing', gt: 3 }, goto: 'check' },
            { when: { key: 'isHousing', isSet: true }, goto: 'check' },
            {
              when: { all: [{ key: 'isHousing', equals: 'No' }] },
              goto: 'check'
            },
            {
              when: { not: { key: 'isHousing', equals: 'Yes' } },
              goto: 'check'
            },
            { goto: 'check' }
          ]
        },
        {
          id: 'units',
          type: 'number',
          sessionKey: 'units',
          next: [
            { when: { key: 'units', equals: 'lots' }, goto: 'check' },
            { goto: 'check' }
          ]
        },
        // A select is a fixture list (addresses), not a branch
        {
          id: 'address',
          type: 'select',
          sessionKey: 'address',
          content: { options: options('1 Meadow Lane') },
          next: [
            { when: { key: 'address', equals: 'anywhere' }, goto: 'check' },
            { goto: 'check' }
          ]
        }
      ])
    )
    expect(problems).toEqual([])
  })

  test('a sample answer no option can give is refused', () => {
    const problems = problemsOf(
      journeyWith(
        [
          {
            id: 'housing',
            type: 'radios',
            sessionKey: 'isHousing',
            content: { options: options('Yes', 'No') }
          }
        ],
        { isHousing: 'Maybe', units: 120 }
      )
    )
    expect(problems).toEqual([
      "preview.data.isHousing: 'Maybe' is not an answer housing can store (the options store 'Yes', 'No')"
    ])
  })
})

/**
 * Copy variants: `pages/<id>~<name>.md` beside a page is an alternative
 * copy of it, built from the same journey.yaml entry. The loader lists it
 * on the page and refuses one that would change what the page does. These
 * tests load a copy of content/ from a temporary folder, so nothing under
 * the real content/ is touched.
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const { copyVariants } = require('../../app/lib/journey-engine')

function withContentCopy(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nrf-content-'))
  const contentDir = path.join(dir, 'content')
  fs.cpSync(path.join(__dirname, '../../content'), contentDir, {
    recursive: true
  })
  try {
    return run(contentDir)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

const RADIOS = `---
variant: Other words
type: radios
options:
  - label: A full permission
    value: full
  - label: An outline permission
    value: outline
  - label: A hybrid permission
    value: hybrid
  - label: Something else
    value: other
errors:
  required: Choose one
---

# Which one is it?
`

test.describe('journey engine: copy variants', () => {
  test('a sibling <id>~<name>.md is listed on the page, copy only', () => {
    withContentCopy((contentDir) => {
      const pagesDir = path.join(contentDir, 'nrf-quote-7', 'pages')
      fs.writeFileSync(path.join(pagesDir, 'planning-type~words.md'), RADIOS)
      const journey = loadJourney('nrf-quote-7', { contentDir })
      const page = journey.byId.get('planning-type')
      const variant = page.copyVariants.find((item) => item.id === 'words')
      expect(variant).toMatchObject({
        id: 'words',
        label: 'Other words',
        contentFile: 'content/nrf-quote-7/pages/planning-type~words.md'
      })
      expect(variant.page.content.heading).toBe('Which one is it?')
      expect(variant.page.content.options.map((o) => o.label)).toContain(
        'Something else'
      )
      expect(variant.page.path).toBe(page.path)
      expect(variant.page.next).toEqual(page.next)
      expect(variant.page.copyVariant).toEqual({
        id: 'words',
        label: 'Other words'
      })
      // Only the page itself is a page of the journey
      expect(
        journey.pages.filter((item) => item.id === 'planning-type')
      ).toHaveLength(1)
      expect(copyVariants(page).map((item) => item.id)).toContain('words')
      expect(copyVariants(variant.page)).toEqual([])
    })
  })

  test('a variant that changes what the page does is refused', () => {
    withContentCopy((contentDir) => {
      const pagesDir = path.join(contentDir, 'nrf-quote-7', 'pages')
      fs.writeFileSync(
        path.join(pagesDir, 'planning-type~values.md'),
        RADIOS.replace('value: other', 'value: something-else')
      )
      fs.writeFileSync(
        path.join(pagesDir, 'planning-type~Type.md'),
        '---\ntype: content\n---\n\n# Heading\n'
      )
      let message = ''
      try {
        loadJourney('nrf-quote-7', { contentDir })
      } catch (error) {
        message = error.message
      }
      expect(message).toContain(
        "pages.planning-type~values: a variant keeps the options' values (full, hybrid, other, outline); reword the labels, not the values"
      )
      expect(message).toContain(
        "pages.planning-type~Type: a variant keeps the page's type ('radios', not 'content')"
      )
      expect(message).toContain(
        "pages.planning-type~Type: a variant's name (after the ~) uses lower-case letters, digits and hyphens only"
      )
    })
  })

  test('a shared page varies from the shared folder', () => {
    withContentCopy((contentDir) => {
      const source = fs.readFileSync(
        path.join(contentDir, 'shared', 'pages', 'start.md'),
        'utf8'
      )
      // Reword the heading, which is the first H1 after the frontmatter
      // (the frontmatter has `# ` comments of its own)
      const [frontmatter, body] = source.split(/\n---\n/).slice(0, 2)
      fs.writeFileSync(
        path.join(contentDir, 'shared', 'pages', 'start~b.md'),
        `${frontmatter}\n---\n${body.replace(/^# .*$/m, '# Another start')}`
      )
      for (const id of ['nrf-quote-7', 'nrf-request-to-use-1']) {
        const page = loadJourney(id, { contentDir }).byId.get('start')
        expect(copyVariants(page)).toEqual([
          {
            id: 'b',
            label: 'b',
            contentFile: 'content/shared/pages/start~b.md'
          }
        ])
        expect(page.copyVariants[0].page.content.heading).toBe('Another start')
      }
    })
  })
})

/**
 * Markdown tables: a GOV.UK table, with a bold first cell as the row's
 * header and a right-aligned column as a numeric column, the way the
 * design system's tables are marked up.
 */
const { createMarkdown } = require('../../app/lib/journey-engine/markdown')

test.describe('journey engine: markdown tables', () => {
  const html = (markdown) => createMarkdown().render(markdown)

  test('a table gets the GOV.UK classes', () => {
    const out = html('| A | B |\n| - | - |\n| one | two |\n')
    expect(out).toContain('<table class="govuk-table">')
    expect(out).toContain('<thead class="govuk-table__head">')
    expect(out).toContain('<th class="govuk-table__header">A</th>')
    expect(out).toContain('<tbody class="govuk-table__body">')
    expect(out).toContain('<tr class="govuk-table__row">')
    expect(out).toContain('<td class="govuk-table__cell">one</td>')
  })

  test('a bold first cell is the row header', () => {
    const out = html('| A | B |\n| - | - |\n| **one** | **two** |\n')
    expect(out).toContain(
      '<th scope="row" class="govuk-table__header">one</th>'
    )
    // Only the first cell: other bold cells stay bold cells
    expect(out).toContain(
      '<td class="govuk-table__cell"><strong>two</strong></td>'
    )
  })

  test('a partly bold first cell is an ordinary cell', () => {
    const out = html('| A | B |\n| - | - |\n| **one** more | two |\n')
    expect(out).toContain(
      '<td class="govuk-table__cell"><strong>one</strong> more</td>'
    )
    expect(out).not.toContain('scope="row"')
  })

  test('a right-aligned column is numeric, without inline styles', () => {
    const out = html('| A | B |\n| - | -: |\n| **one** | 2 |\n')
    expect(out).toContain(
      '<th class="govuk-table__header govuk-table__header--numeric">B</th>'
    )
    expect(out).toContain(
      '<td class="govuk-table__cell govuk-table__cell--numeric">2</td>'
    )
    expect(out).not.toContain('style=')
  })
})
