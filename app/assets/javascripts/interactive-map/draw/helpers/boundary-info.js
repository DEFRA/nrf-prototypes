import {
  PANEL_ROOT_ID,
  SAVE_ACTION,
  buildPanelHtml,
  renderPanel,
  setSaveButtonDisabled
} from './boundary-info-panel.js'
import { postJson } from './post-json.js'
import { stopTileLoading } from './stop-tile-loading.js'
import { ALL_LAYER_IDS } from '../../shared-helpers/datasets.js'

const PANEL_ID = 'boundaryInfo'

// The page form and hidden input the journey engine reads on POST. "Save and
// continue" writes the latest boundary check payload into the input and
// submits the form, so journey.yaml decides where the user goes next.
const FORM_ID = 'map-form'
const BOUNDARY_INPUT_ID = 'boundary-data'

// The library's own Done button ('drawDone' -> 'im-c-map-button--draw-done')
// re-derives its disabled state from the plugin's vertex count each render,
// so toggling it via interactiveMap.toggleButtonState gets immediately
// reverted. Blocking the click in the capture phase (before it reaches the
// library's own bubble-phase handler) and dimming it via a body class is the
// only way to hold it disabled for the duration of an in-flight check.
const DONE_BUTTON_SELECTOR = '.im-c-map-button--draw-done'
const CHECKING_BODY_CLASS = 'app-draw-boundary-checking'

/**
 * @param {{ state: object }} params
 */
function submitSaveAndContinue({ state }) {
  const form = document.getElementById(FORM_ID)
  const boundaryInput = document.getElementById(BOUNDARY_INPUT_ID)
  if (!form || !boundaryInput || !state.latestPayload) {
    return
  }

  setSaveButtonDisabled(true)
  boundaryInput.value = JSON.stringify(state.latestPayload)

  // Navigation is guaranteed from here, so it's safe to abort any tile
  // requests still in flight from panning/zooming while drawing — they'd
  // otherwise keep competing for the same-origin connection pool that the
  // destination page's own requests need.
  stopTileLoading(state.mapInstance, ALL_LAYER_IDS)
  form.requestSubmit()
}

/**
 * @param {object} interactiveMap
 * @param {{ checkUrl: string, state: object }} params
 * @param {object} feature
 */
async function runBoundaryCheck(interactiveMap, { checkUrl, state }, feature) {
  if (state.checkInFlight) {
    return
  }
  state.checkInFlight = true
  document.body.classList.add(CHECKING_BODY_CLASS)

  state.latestPayload = null
  interactiveMap.showPanel(PANEL_ID)
  renderPanel({ summary: 'Checking boundary...' })

  try {
    const { response, payload } = await postJson(checkUrl, {
      geometry: feature?.geometry
    })

    if (!response.ok) {
      renderPanel({
        error: payload?.error || 'An error occurred checking the boundary'
      })
      return
    }

    state.latestPayload = payload
    renderPanel({ results: payload })
  } catch {
    renderPanel({
      error: 'An error occurred checking the boundary'
    })
  } finally {
    state.checkInFlight = false
    document.body.classList.remove(CHECKING_BODY_CLASS)
  }
}

/**
 * @param {object} interactiveMap
 */
function onDrawModeStarted(interactiveMap) {
  setSaveButtonDisabled(true)
  interactiveMap.hidePanel(PANEL_ID)
}

/**
 * @param {object} interactiveMap
 */
function addBoundaryInfoPanel(interactiveMap) {
  interactiveMap.addPanel(PANEL_ID, {
    label: 'Boundary information',
    focus: false,
    html: buildPanelHtml(),
    // showLabel renders the library's own heading (also the panel's
    // aria-labelledby target) instead of a second, duplicate one in
    // buildPanelHtml - renderPanel toggles its visibility and moves focus to
    // it once a check completes.
    mobile: {
      slot: 'drawer',
      modal: false,
      open: false,
      dismissible: false,
      showLabel: true
    },
    tablet: {
      slot: 'right-bottom',
      modal: false,
      width: '340px',
      open: false,
      dismissible: false,
      showLabel: true
    },
    desktop: {
      slot: 'right-bottom',
      modal: false,
      width: '340px',
      open: false,
      dismissible: false,
      showLabel: true
    }
  })
}

/**
 * @param {object} state
 * @param {MouseEvent} clickEvent
 */
function onDoneClickCapture(state, clickEvent) {
  if (!state.checkInFlight) {
    return
  }
  if (clickEvent.target.closest(DONE_BUTTON_SELECTOR)) {
    clickEvent.preventDefault()
    clickEvent.stopImmediatePropagation()
  }
}

/**
 * @param {object} state
 * @param {MouseEvent} clickEvent
 */
function onSaveClick(state, clickEvent) {
  const button = clickEvent.target.closest(
    `#${PANEL_ROOT_ID} [data-boundary-action="${SAVE_ACTION}"]`
  )
  if (!button || button.disabled) {
    return
  }

  submitSaveAndContinue({ state })
}

/**
 * @param {object} interactiveMap
 * @param {object} state
 */
function onDrawCancelled(interactiveMap, state) {
  if (state.latestPayload) {
    setSaveButtonDisabled(false)
    interactiveMap.showPanel(PANEL_ID)
  }
}

/**
 * @param {object} interactiveMap
 * @param {object} state
 */
function onDrawDelete(interactiveMap, state) {
  state.latestPayload = null
  renderPanel({ summary: '' })
  interactiveMap.hidePanel(PANEL_ID)
}

/**
 * @param {object} interactiveMap
 * @param {{ checkUrl: string }} params
 */
export function wireBoundaryInfoPanel(interactiveMap, { checkUrl }) {
  const state = { latestPayload: null, checkInFlight: false, mapInstance: null }
  const runCheck = (feature) =>
    runBoundaryCheck(interactiveMap, { checkUrl, state }, feature)

  interactiveMap.on('map:ready', (mapReadyEvent) => {
    state.mapInstance = mapReadyEvent?.map ?? null
    addBoundaryInfoPanel(interactiveMap)
  })
  document.addEventListener('click', (clickEvent) =>
    onSaveClick(state, clickEvent)
  )
  document.addEventListener(
    'click',
    (clickEvent) => onDoneClickCapture(state, clickEvent),
    true
  )
  interactiveMap.on('draw:created', runCheck)
  interactiveMap.on('draw:edited', runCheck)
  interactiveMap.on('draw:started', () => onDrawModeStarted(interactiveMap))
  interactiveMap.on('draw:editstart', () => onDrawModeStarted(interactiveMap))
  interactiveMap.on('draw:cancelled', () =>
    onDrawCancelled(interactiveMap, state)
  )
  interactiveMap.on('draw:delete', () => onDrawDelete(interactiveMap, state))

  return {
    checkExistingBoundary: runCheck
  }
}
