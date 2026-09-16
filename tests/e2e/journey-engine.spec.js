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
          content: { options: options('84 Hobson Street') },
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
