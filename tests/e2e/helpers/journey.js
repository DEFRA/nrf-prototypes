const { expect } = require('@playwright/test')
const {
  loadJourney,
  interpolate,
  evaluate,
  answerLabels
} = require('../../../app/lib/journey-engine')

/**
 * Copy-aware helpers for a content-driven journey.
 *
 * Tests must not hard-code journey copy: headings, error messages, option
 * labels, field labels, button text, summary-row labels and body links all
 * come from content/<journey> through these helpers, so a reword by the
 * content designer never breaks a test. Pages are named by id, options by
 * their `value` and form fields by their `name`, which are the stable,
 * logic-bearing identifiers in the content files.
 *
 *   const { answer, submit, expectHeading } = copyOf('nrf-quote-7')
 *   await answer(page, 'housing', 'Yes')
 *   await submit(page, 'housing')
 *   await expectHeading(page, 'units')
 */
function copyOf(journeyId) {
  const journey = loadJourney(journeyId)
  const base = journey.basePath
  // Option labels by session key, so a `{{ planningType }}` placeholder
  // fills in as the option the user chose, the way the engine shows it
  const labels = answerLabels()

  function pageOf(id) {
    const page = journey.byId.get(id)
    if (!page) {
      throw new Error(`${journeyId} has no page '${id}'`)
    }
    return page
  }

  // Copy as the browser shows it: placeholders filled in when the test knows
  // the answers, otherwise cut at the first one; whitespace collapsed
  function plain(text, data) {
    const filled = data
      ? interpolate(text, data, { escape: false, labels })
      : String(text || '').split('{{')[0]
    return filled.replace(/\s+/g, ' ').trim()
  }

  function heading(id, data) {
    return plain(pageOf(id).content.heading, data)
  }

  function caption(id) {
    return pageOf(id).content.caption
  }

  function panelTitle(id, data) {
    const content = pageOf(id).content
    return plain(
      (content.panel && content.panel.title) || content.heading,
      data
    )
  }

  function error(id, key = 'required') {
    const page = pageOf(id)
    const message = page.content.errors[key]
    if (!message) {
      throw new Error(`${page.contentFile} has no '${key}' error message`)
    }
    return message
  }

  function field(id, name) {
    const page = pageOf(id)
    const found = page.content.fields.find((f) => f.name === name)
    if (!found) {
      throw new Error(
        `${page.contentFile} has no field '${name}' (fields: ${page.content.fields.map((f) => f.name).join(', ')})`
      )
    }
    return found
  }

  function fieldError(id, name, key = 'required') {
    const found = field(id, name)
    const message = found.errors[key]
    if (!message) {
      throw new Error(
        `${pageOf(id).contentFile} field '${name}' has no '${key}' error message`
      )
    }
    return message
  }

  // The label as govukInput renders it: optional fields say so
  function fieldLabel(id, name) {
    const found = field(id, name)
    return found.optional && !found.label.includes('(optional)')
      ? `${found.label} (optional)`
      : found.label
  }

  // An option by its `value` (or, for fixture lists, its index)
  function optionOf(id, valueOrIndex) {
    const page = pageOf(id)
    const options = page.content.options
    const found =
      typeof valueOrIndex === 'number'
        ? options[valueOrIndex]
        : options.find((o) => String(o.value) === String(valueOrIndex))
    if (!found) {
      throw new Error(
        `${page.contentFile} has no option '${valueOrIndex}' (values: ${options.map((o) => o.value).join(', ')})`
      )
    }
    return found
  }

  // An option's label as the browser shows it: a placeholder in it (the
  // research participant's organisation, say) is filled in from `data`
  function option(id, valueOrIndex, data = {}) {
    return plain(optionOf(id, valueOrIndex).label, data)
  }

  // The label of a page with one input: `label:` when set, else the question
  function answerLabel(id) {
    const content = pageOf(id).content
    return content.label || plain(content.heading)
  }

  // The text of the button that submits the page: a question's `button`, or
  // a content page's first submit-style action
  function button(id) {
    const page = pageOf(id)
    if (
      page.type !== 'check-answers' &&
      (page.content.fields.length || page.content.options.length)
    ) {
      return page.content.button
    }
    const submitting = page.content.actions.find(
      (a) =>
        !a.goto &&
        ['submit', 'secondary', 'warning', 'start'].includes(a.kind || 'submit')
    )
    if (submitting) {
      return submitting.text
    }
    return page.content.button
  }

  // An action by kind (the first of that kind) or index
  function actionOf(id, kindOrIndex) {
    const page = pageOf(id)
    const actions = page.content.actions
    const found =
      typeof kindOrIndex === 'number'
        ? actions[kindOrIndex]
        : actions.find((a) => (a.kind || 'submit') === kindOrIndex)
    if (!found) {
      throw new Error(
        `${page.contentFile} has no '${kindOrIndex}' action (actions: ${actions.map((a) => `${a.kind || 'submit'}: ${a.text}`).join(', ')})`
      )
    }
    return found
  }

  function action(id, kindOrIndex) {
    return actionOf(id, kindOrIndex).text
  }

  // The summary row whose Change link goes to `target` (a page id or path)
  function rowFor(id, target) {
    const page = pageOf(id)
    const row = page.content.rows.find((r) =>
      typeof r.change === 'string'
        ? r.change === target
        : Array.isArray(r.change) &&
          r.change.some((rule) => rule.goto === target)
    )
    if (!row) {
      throw new Error(`${page.contentFile} has no row that changes '${target}'`)
    }
    return row
  }

  function rowKey(id, target) {
    return plain(rowFor(id, target).key)
  }

  // A row's value for the given answers: a `when`/`then`/`else` chain is
  // followed the way the engine follows it, placeholders filled in
  function rowValue(id, target, data = {}) {
    let chosen = rowFor(id, target).value
    if (chosen && typeof chosen === 'object' && chosen.lines) {
      return chosen.lines.map((line) => plain(line, data)).filter(Boolean)
    }
    while (chosen && typeof chosen === 'object') {
      chosen = evaluate(chosen.when, { data }) ? chosen.then : chosen.else
    }
    return plain(chosen || '', data)
  }

  // The accessible name of a row's Change link, as govukSummaryList builds it
  function changeLinkName(id, target) {
    const row = rowFor(id, target)
    const hidden = row.changeHidden
    if (hidden && typeof hidden === 'object') {
      return new RegExp(`^Change (${hidden.then}|${hidden.else})$`)
    }
    return `Change ${hidden || plain(row.key)}`
  }

  // The text of the body link whose href is `target` (a page id, ./id,
  // ./$next or a full path or URL)
  function linkTo(id, target) {
    const page = pageOf(id)
    const links = [...page.content.body.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)]
    const found = links.find(
      ([, , href]) =>
        href === target || href === `./${target}` || href.endsWith(`/${target}`)
    )
    if (!found) {
      throw new Error(
        `${page.contentFile} has no link to '${target}' (links: ${links.map(([, , href]) => href).join(', ')})`
      )
    }
    return plain(found[1].replace(/\*+/g, ''))
  }

  // The footer's user research link on page `id` whose href is `target`
  // (a page id or a full path, query string ignored), by the name the
  // footer renders (with "(opens in new tab)" unless the journey says
  // `newTab: false`)
  function researchLink(page, id, target) {
    const def = pageOf(id)
    const links = def.research || []
    const found = links.find(({ href }) => {
      const path = href.replace(/[?#].*$/, '')
      return path === target || path.endsWith(`/${target}`)
    })
    if (!found) {
      throw new Error(
        `${id} has no research link to '${target}' (links: ${links.map(({ href }) => href).join(', ')})`
      )
    }
    const name = found.newTab ? `${found.text} (opens in new tab)` : found.text
    return page
      .locator('.app-footer--research')
      .getByRole('link', { name, exact: true })
  }

  // Open the research link's page in this tab (the footer would open a new
  // one), having checked the link is there
  async function followResearchLink(page, id, target) {
    const locator = researchLink(page, id, target)
    await expect(locator).toHaveCount(1)
    const href = await locator.getAttribute('href')
    await page.goto(href)
  }

  function notificationTitle(id) {
    const page = pageOf(id)
    const match = page.content.body.match(/^:{3,}notification\s+(.+)$/m)
    if (!match) {
      throw new Error(`${page.contentFile} has no notification banner`)
    }
    return match[1].trim()
  }

  // Named strings a custom template renders itself (`text:` frontmatter)
  function text(id, name) {
    const page = pageOf(id)
    const value = page.content.text[name]
    if (!value) {
      throw new Error(`${page.contentFile} has no text '${name}'`)
    }
    return value
  }

  function serviceName(id) {
    return pageOf(id).serviceName || journey.serviceName
  }

  // ---- Playwright actions and assertions ----

  async function answer(page, id, valueOrIndex, data = {}) {
    const def = pageOf(id)
    const label = option(id, valueOrIndex, data)
    if (def.type === 'select') {
      await page.getByLabel(answerLabel(id)).selectOption({ label })
      return
    }
    await page.getByLabel(label, { exact: true }).check()
  }

  function optionLocator(page, id, valueOrIndex, data = {}) {
    return page.getByLabel(option(id, valueOrIndex, data), { exact: true })
  }

  async function fillAnswer(page, id, value) {
    await page.getByLabel(answerLabel(id), { exact: true }).fill(value)
  }

  function answerBox(page, id) {
    return page.getByLabel(answerLabel(id), { exact: true })
  }

  // One box of a form page, by the field's `name`
  function fieldBox(page, id, name) {
    return page.getByLabel(fieldLabel(id, name), { exact: true })
  }

  async function fillField(page, id, name, value) {
    await page.getByLabel(fieldLabel(id, name), { exact: true }).fill(value)
  }

  async function submit(page, id) {
    await page.getByRole('button', { name: button(id), exact: true }).click()
  }

  // The link or button an `actions:` entry renders
  function actionLocator(page, id, kindOrIndex) {
    const found = actionOf(id, kindOrIndex)
    const kind = found.kind || 'submit'
    const role = kind === 'link' || kind === 'destructive' ? 'link' : 'button'
    const name = found.hidden ? `${found.text} ${found.hidden}` : found.text
    return page.getByRole(role, { name, exact: true })
  }

  async function act(page, id, kindOrIndex) {
    await actionLocator(page, id, kindOrIndex).click()
  }

  function link(page, id, target) {
    return page.getByRole('link', { name: linkTo(id, target), exact: true })
  }

  async function followLink(page, id, target) {
    await link(page, id, target).click()
  }

  function changeLink(page, id, target) {
    const name = changeLinkName(id, target)
    return page.getByRole('link', { name, exact: typeof name === 'string' })
  }

  async function expectOnPage(page, id, query) {
    const path = pageOf(id).path
    if (query) {
      await expect(page).toHaveURL(`${path}?${query}`)
      return
    }
    await expect(page).toHaveURL(path)
  }

  async function expectHeading(page, id, data) {
    const def = pageOf(id)
    if (def.type === 'confirmation') {
      await expect(page.locator('.govuk-panel__title')).toContainText(
        panelTitle(id, data)
      )
      return
    }
    await expect(page.getByRole('heading', { level: 1 }).first()).toContainText(
      heading(id, data)
    )
  }

  async function expectError(page, id, key = 'required') {
    await expect(page.locator('.govuk-error-summary')).toContainText(
      error(id, key)
    )
  }

  async function expectFieldError(page, id, name, key = 'required') {
    await expect(page.locator('.govuk-error-summary')).toContainText(
      fieldError(id, name, key)
    )
  }

  // A phrase of body copy that must be on screen. Checked against the
  // content file first (with any answers the phrase needs filled in), so a
  // reword fails naming the file to update
  async function expectBodyCopy(page, id, phrase, data) {
    const def = pageOf(id)
    const body = data
      ? interpolate(def.content.body, data, { escape: false })
      : def.content.body
    if (!body.replace(/\s+/g, ' ').includes(phrase)) {
      throw new Error(
        `'${phrase}' is no longer in ${def.contentFile}; update the test`
      )
    }
    await expect(page.locator('main')).toContainText(phrase)
  }

  return {
    journey,
    base,
    pageOf,
    heading,
    caption,
    panelTitle,
    error,
    field,
    fieldError,
    fieldLabel,
    option,
    answerLabel,
    button,
    action,
    rowKey,
    rowValue,
    changeLinkName,
    linkTo,
    researchLink,
    followResearchLink,
    notificationTitle,
    text,
    serviceName,
    answer,
    optionLocator,
    fillAnswer,
    answerBox,
    fieldBox,
    fillField,
    submit,
    actionLocator,
    act,
    link,
    followLink,
    changeLink,
    expectOnPage,
    expectHeading,
    expectError,
    expectFieldError,
    expectBodyCopy
  }
}

/**
 * Opens a journey's tools page (flow diagram and screen wall) with every
 * embedded screen answered by an empty document. The wall embeds each page
 * as a same-origin iframe, so once the Screens tab opens, dozens of preview
 * pages (maps included, with their tiles and WebGL) load in the wall's own
 * renderer process; on the CI runner that starves the wall's document until
 * assertions time out. The tests read only each iframe's attributes, so
 * nothing is lost. A test that must look inside a frame navigates itself.
 */
async function gotoTools(page, journeyId) {
  await page.route(/[?&]embed=1(&|$)/, (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '' })
  )
  return page.goto(`/tools/journeys/${journeyId}`)
}

module.exports = { copyOf, gotoTools }
