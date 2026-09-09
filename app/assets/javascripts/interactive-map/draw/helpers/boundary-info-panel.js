import { EDP_BOUNDARY_STROKE_COLOUR } from '../../shared-helpers/datasets.js'

export const PANEL_ROOT_ID = 'draw-boundary-boundary-info'
export const EDIT_ACTION = 'edit'
export const SAVE_ACTION = 'save'
const NOT_AVAILABLE_TEXT = 'Not available'
const UNSUPPORTED_AREA_MESSAGE =
  'An area not supported by an Environmental Delivery Plan (EDP)'
const EDP_HEADING = 'Environmental Delivery Plan (EDP)'

export function buildPanelHtml() {
  return `
    <div id="${PANEL_ROOT_ID}" class="app-boundary-info-panel">
      <p class="govuk-body-s app-boundary-info-panel__summary" data-boundary-info-summary>Draw a boundary to check it.</p>
      <p class="govuk-body-s app-boundary-info-panel__error govuk-!-margin-top-3" data-boundary-info-error hidden></p>
      <dl class="app-boundary-info-panel__stats" data-boundary-info-results hidden>
        <div class="app-boundary-info-panel__stats-row">
          <dt class="govuk-body-s app-boundary-info-panel__stats-key">Area</dt>
          <dd class="govuk-body-s app-boundary-info-panel__stats-value" data-boundary-info-area>${NOT_AVAILABLE_TEXT}</dd>
        </div>
        <div class="app-boundary-info-panel__stats-row">
          <dt class="govuk-body-s app-boundary-info-panel__stats-key">Perimeter</dt>
          <dd class="govuk-body-s app-boundary-info-panel__stats-value" data-boundary-info-perimeter>${NOT_AVAILABLE_TEXT}</dd>
        </div>
      </dl>
      <div class="app-boundary-info-panel__edps" data-boundary-info-edps hidden>
        <p class="govuk-body-s govuk-!-margin-bottom-2 app-boundary-info-panel__edps-intro">Your red line boundary is in:</p>
        <ul class="app-boundary-info-panel__edp-list" data-boundary-info-intersections></ul>
      </div>
      <div class="app-boundary-info-panel__actions">
      <button class="govuk-button govuk-button--secondary app-boundary-info-panel__action-button" data-boundary-action="${EDIT_ACTION}" type="button" hidden>Edit</button>
      <button class="govuk-button app-boundary-info-panel__action-button" data-boundary-action="${SAVE_ACTION}" type="button" hidden>Save and continue</button>
      </div>
    </div>
  `
}

/**
 * @param {{ hectares: number, acres: number }} area
 */
function formatArea(area) {
  if (area?.hectares == null || area?.acres == null) {
    return NOT_AVAILABLE_TEXT
  }
  return `${area.hectares}ha (${area.acres} acres)`
}

/**
 * @param {{ kilometres: number, miles: number }} perimeter
 */
function formatPerimeter(perimeter) {
  if (perimeter?.kilometres == null || perimeter?.miles == null) {
    return NOT_AVAILABLE_TEXT
  }
  return `${perimeter.kilometres}km (${perimeter.miles} miles)`
}

/**
 * Every EDP in the boundary check payload carries a label, so this normally
 * just reads it. The string form and the null fallback are defensive: a
 * malformed entry omits the name line instead of dumping raw JSON into the
 * panel.
 *
 * @param {string|{ label?: string }} edp
 * @returns {string|null}
 */
function formatEdp(edp) {
  if (typeof edp === 'string') {
    return edp
  }
  return edp?.label || null
}

/**
 * @param {string|{ label?: string }} edp
 */
function buildEdpListItem(edp) {
  const item = document.createElement('li')
  item.className = 'app-boundary-info-panel__edp-item'

  const swatchWrap = document.createElement('span')
  swatchWrap.className = 'app-boundary-info-panel__edp-swatch-wrap'

  const swatch = document.createElement('span')
  swatch.className = 'app-boundary-info-panel__edp-swatch'
  swatch.style.backgroundColor = EDP_BOUNDARY_STROKE_COLOUR
  swatch.setAttribute('aria-hidden', 'true')
  swatchWrap.append(swatch)

  const text = document.createElement('div')
  text.className = 'app-boundary-info-panel__edp-text'

  const name = document.createElement('span')
  name.className = 'govuk-body-s app-boundary-info-panel__edp-name'
  name.textContent = EDP_HEADING

  const edpName = formatEdp(edp)
  text.append(name)
  if (edpName) {
    const descriptionEl = document.createElement('p')
    descriptionEl.className =
      'govuk-body-s app-boundary-info-panel__edp-description'
    descriptionEl.textContent = edpName
    text.append(descriptionEl)
  }

  item.append(swatchWrap, text)

  return item
}

function buildUnsupportedAreaListItem() {
  const item = document.createElement('li')
  item.className = 'app-boundary-info-panel__edp-item'

  const name = document.createElement('span')
  name.className = 'govuk-body-s app-boundary-info-panel__edp-name'
  name.textContent = UNSUPPORTED_AREA_MESSAGE

  item.append(name)
  return item
}

function getPanelRoot() {
  return document.getElementById(PANEL_ROOT_ID)
}

// The panel's own heading is rendered by interactive-map (outside this
// module's markup) as a sibling of our content, inside the same landmark
// element it labels via aria-labelledby — so it's reached via the nearest
// ancestor with a role, not as a descendant of PANEL_ROOT_ID.
function getPanelHeading(panelRoot) {
  return panelRoot.closest('[role]')?.querySelector('h2') ?? null
}

export function setSaveButtonDisabled(disabled) {
  const panelRoot = getPanelRoot()
  const saveButton = panelRoot?.querySelector(
    `[data-boundary-action="${SAVE_ACTION}"]`
  )
  if (saveButton) {
    saveButton.disabled = disabled
  }
}

function getPanelElements(panelRoot) {
  return {
    headingEl: getPanelHeading(panelRoot),
    summaryEl: panelRoot.querySelector('[data-boundary-info-summary]'),
    errorEl: panelRoot.querySelector('[data-boundary-info-error]'),
    resultsEl: panelRoot.querySelector('[data-boundary-info-results]'),
    areaEl: panelRoot.querySelector('[data-boundary-info-area]'),
    perimeterEl: panelRoot.querySelector('[data-boundary-info-perimeter]'),
    edpsEl: panelRoot.querySelector('[data-boundary-info-edps]'),
    intersectionsEl: panelRoot.querySelector(
      '[data-boundary-info-intersections]'
    ),
    editButton: panelRoot.querySelector(
      `[data-boundary-action="${EDIT_ACTION}"]`
    ),
    saveButton: panelRoot.querySelector(
      `[data-boundary-action="${SAVE_ACTION}"]`
    )
  }
}

function renderResults(results, { areaEl, perimeterEl, intersectionsEl }) {
  areaEl.textContent = formatArea(results.boundaryMetadata?.area)
  perimeterEl.textContent = formatPerimeter(results.boundaryMetadata?.perimeter)

  intersectionsEl.textContent = ''
  const edps = Array.isArray(results.intersectingEdps)
    ? results.intersectingEdps
    : []
  const items = edps.length
    ? edps.map(buildEdpListItem)
    : [buildUnsupportedAreaListItem()]
  items.forEach((item) => intersectionsEl.appendChild(item))
}

/**
 * @param {{ summary?: string, error?: string, results?: object }} params
 */
export function renderPanel({ summary, error, results }) {
  const panelRoot = getPanelRoot()
  if (!panelRoot) {
    return
  }

  const elements = getPanelElements(panelRoot)
  const {
    headingEl,
    summaryEl,
    errorEl,
    resultsEl,
    edpsEl,
    editButton,
    saveButton
  } = elements

  summaryEl.textContent = summary || ''
  summaryEl.hidden = !summary

  errorEl.textContent = error || ''
  errorEl.hidden = !error

  headingEl?.classList.toggle('govuk-visually-hidden', Boolean(error))

  resultsEl.hidden = !results
  edpsEl.hidden = !results
  editButton.hidden = !results && !error
  saveButton.hidden = !results
  saveButton.disabled = false

  // A completed check (success or failure) updates the panel without any
  // user interaction that would naturally move focus there, so screen
  // reader users get no indication anything changed unless we move focus
  // to the heading ourselves. tabindex is set here rather than in
  // buildPanelHtml/statically, since the heading isn't ours - it's
  // interactive-map's own <h2>, only reachable once the panel has mounted.
  if ((results || error) && headingEl) {
    headingEl.setAttribute('tabindex', '-1')
    headingEl.focus()
  }

  if (!results) {
    return
  }

  renderResults(results, elements)
}
