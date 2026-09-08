// Plugin factories come from the UMD globals (see draw/index.js)
const { interactPlugin: createInteractPlugin, drawPlugin: createDrawPlugin } =
  window.defra
import { EDIT_ACTION, PANEL_ROOT_ID } from './boundary-info-panel.js'
import { wireDrawStartPanel } from './draw-start-panel.js'
import { buildDrawToolsMenuItems } from './draw-tools-menu.js'

const FILL_LAYER_ID = 'fill-inactive.cold'
const STROKE_LAYER_ID = 'stroke-inactive.cold'
const DRAW_LAYERS = new Set([FILL_LAYER_ID, STROKE_LAYER_ID])
const DRAW_FEATURE_ID_PROPERTY = 'id'

export function createDrawToolsPlugins() {
  const interactPlugin = createInteractPlugin({
    layers: [
      { layerId: FILL_LAYER_ID, idProperty: DRAW_FEATURE_ID_PROPERTY },
      { layerId: STROKE_LAYER_ID, idProperty: DRAW_FEATURE_ID_PROPERTY }
    ],
    interactionModes: ['selectFeature'],
    multiSelect: true,
    deselectOnClickOutside: true
  })

  const drawPlugin = createDrawPlugin()

  return { interactPlugin, drawPlugin }
}

function noop() {}

/**
 * @param {object} interactiveMap
 * @param {{ interactPlugin: object }} params
 */
function wireDrawStateEvents(interactiveMap, { interactPlugin }) {
  function onDrawStarted() {
    interactPlugin.disable()
  }

  function onDrawFinished() {
    interactiveMap.toggleButtonState('drawTools', 'hidden', false)
    interactPlugin.enable()
  }

  interactiveMap.on('draw:started', onDrawStarted)
  interactiveMap.on('draw:created', onDrawFinished)
  interactiveMap.on('draw:edited', onDrawFinished)
  interactiveMap.on('draw:cancelled', onDrawFinished)
}

/**
 * @param {object} interactiveMap
 * @param {{ setSelectedFeatureIds: Function, getHasBoundary: Function }} params
 */
function wireSelectionEvents(
  interactiveMap,
  { setSelectedFeatureIds, getHasBoundary }
) {
  function onSelectionChange(selectionChangeEvent) {
    const selectedFeatures = selectionChangeEvent.selectedFeatures
    const singleFeature = selectedFeatures.length === 1
    const anyFeature = selectedFeatures.length > 0
    const isDrawFeature =
      singleFeature && DRAW_LAYERS.has(selectedFeatures[0].layerId)
    const allDrawFeatures =
      anyFeature && selectedFeatures.every((f) => DRAW_LAYERS.has(f.layerId))
    setSelectedFeatureIds(selectedFeatures.map((f) => f.featureId))
    interactiveMap.toggleButtonState(
      'drawPolygon',
      'disabled',
      singleFeature || getHasBoundary()
    )
    interactiveMap.toggleButtonState('drawLine', 'disabled', singleFeature)
    interactiveMap.toggleButtonState('editFeature', 'disabled', !isDrawFeature)
    interactiveMap.toggleButtonState(
      'deleteFeature',
      'disabled',
      !allDrawFeatures
    )
  }

  interactiveMap.on('interact:selectionchange', onSelectionChange)
}

/**
 * Lets the boundary info panel's Edit button select and edit the current
 * boundary feature, tracking its id across the draw session (and across a
 * boundary hydrated from a previous session, via initialBoundaryFeatureId)
 * since the panel has no direct reference to the drawn feature itself.
 *
 * @param {object} interactiveMap
 * @param {{ interactPlugin: object, drawPlugin: object, initialBoundaryFeatureId: string|null, setBoundaryState: Function }} params
 */
function wireBoundaryInfoEdit(
  interactiveMap,
  { interactPlugin, drawPlugin, initialBoundaryFeatureId, setBoundaryState }
) {
  let boundaryFeatureId = initialBoundaryFeatureId

  function editBoundaryFeature() {
    if (!boundaryFeatureId) {
      return
    }

    interactPlugin.selectFeature({
      featureId: boundaryFeatureId,
      layerId: FILL_LAYER_ID,
      idProperty: DRAW_FEATURE_ID_PROPERTY
    })

    if (!drawPlugin.editFeature(boundaryFeatureId)) {
      return
    }
    interactiveMap.toggleButtonState('drawTools', 'hidden', true)
    interactPlugin.disable()
    setBoundaryState(true)
  }

  /**
   * @param {MouseEvent} clickEvent
   */
  function onBoundaryInfoEditClick(clickEvent) {
    const button = clickEvent.target.closest(
      `#${PANEL_ROOT_ID} [data-boundary-action="${EDIT_ACTION}"]`
    )
    if (!button) {
      return
    }
    editBoundaryFeature()
  }

  /**
   * @param {object} feature
   */
  function onBoundaryFeatureSaved(feature) {
    boundaryFeatureId = feature?.id ?? boundaryFeatureId
    setBoundaryState(true)
  }

  function onBoundaryFeatureDeleted() {
    boundaryFeatureId = null
  }

  document.addEventListener('click', onBoundaryInfoEditClick)

  interactiveMap.on('draw:created', onBoundaryFeatureSaved)
  interactiveMap.on('draw:edited', onBoundaryFeatureSaved)
  interactiveMap.on('draw:delete', onBoundaryFeatureDeleted)
}

/**
 * @param {object} interactiveMap
 * @param {{ interactPlugin: object, drawPlugin: object, mapElementId: string, hasExistingBoundary?: boolean, initialBoundaryFeatureId?: string|null }} params
 */
export function wireDrawTools(
  interactiveMap,
  {
    interactPlugin,
    drawPlugin,
    mapElementId,
    hasExistingBoundary = false,
    initialBoundaryFeatureId = null
  }
) {
  let selectedFeatureIds = []
  let hasBoundary = hasExistingBoundary
  let setStartPanelHidden = noop

  const getSelectedFeatureIds = () => selectedFeatureIds
  const setSelectedFeatureIds = (ids) => {
    selectedFeatureIds = ids
  }
  const getHasBoundary = () => hasBoundary

  function setBoundaryState(boundaryExists) {
    hasBoundary = boundaryExists
    setStartPanelHidden(boundaryExists)
    interactiveMap.toggleButtonState('drawPolygon', 'disabled', boundaryExists)
  }

  function startDrawPolygon() {
    interactiveMap.toggleButtonState('drawTools', 'hidden', true)
    drawPlugin.newPolygon(crypto.randomUUID())

    // The library's own buttons refocus the map viewport after a click (see
    // mapButtons.js), which the draw plugin's keydown handler requires for
    // keyboard-placed vertices to register. Our custom "Draw" start-panel
    // button (built outside the library's button system) needs to do the
    // same refocus itself, or keyboard drawing silently does nothing.
    window.requestAnimationFrame(() => {
      document
        .getElementById(mapElementId)
        ?.querySelector('[role="application"]')
        ?.focus()
    })
  }

  function addDrawToolsButton() {
    interactPlugin.enable()

    const startPanel = wireDrawStartPanel(interactiveMap, {
      startDraw: startDrawPolygon,
      hasExistingBoundary: hasBoundary,
      getHasBoundary
    })
    setStartPanelHidden = startPanel.setHidden

    interactiveMap.addButton('drawTools', {
      label: 'Draw tools',
      mobile: { slot: 'bottom-right' },
      tablet: { slot: 'top-middle' },
      desktop: { slot: 'top-middle' },
      menuItems: buildDrawToolsMenuItems({
        interactiveMap,
        interactPlugin,
        drawPlugin,
        startDrawPolygon,
        getSelectedFeatureIds,
        setBoundaryState
      })
    })

    interactiveMap.toggleButtonState('drawPolygon', 'disabled', hasBoundary)
  }

  interactiveMap.on('map:ready', addDrawToolsButton)

  wireDrawStateEvents(interactiveMap, { interactPlugin })
  wireSelectionEvents(interactiveMap, { setSelectedFeatureIds, getHasBoundary })
  wireBoundaryInfoEdit(interactiveMap, {
    interactPlugin,
    drawPlugin,
    initialBoundaryFeatureId,
    setBoundaryState
  })
}
