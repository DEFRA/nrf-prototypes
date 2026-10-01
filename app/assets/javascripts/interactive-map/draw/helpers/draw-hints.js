/**
 * Prototype-only toast hints, shown through interactive-map's built-in
 * showHint()/dismissHint() API (not in production). The library renders the
 * hint centred just above the actions bar, which is where the "Draw" button
 * sits, so no positioning of our own is needed.
 *
 * One hint per step of drawing a boundary, much as nrf-estimate-5/6 and
 * nrf-quote-6 did with their "Tip" banner:
 *
 *   idle           the map has loaded and there is no boundary yet
 *   start          the map was clicked or tapped before pressing "Draw"
 *                  (shown briefly, then the map falls quiet). When its text
 *                  is the same as idle's, the idle hint simply stays up.
 *   firstPoint     "Draw" was pressed and no point is placed yet
 *   addPoints      1 or 2 points placed
 *   finish         3 or more points placed, enough to finish the shape.
 *                  Return is not offered: with the map focused it adds a
 *                  point at the crosshair rather than finishing the shape.
 *   edit           editing an existing boundary
 *   pointSelected  a point of that boundary is selected
 *
 * Each step has a click and a tap version, picked by how the user last
 * touched the map. The words come from the page's text: frontmatter
 * (content/nrf-quote-7/pages/map.md), handed over on the page's config
 * element. A step whose text is missing shows no hint.
 */

const MIN_POLYGON_POINTS = 3

// Persist until dismissed (see interactive-map's showHint options)
const UNTIL_DISMISSED = { duration: 0 }

/**
 * @param {number} points placed so far
 */
function stepForPoints(points) {
  if (points >= MIN_POLYGON_POINTS) {
    return 'finish'
  }
  return points > 0 ? 'addPoints' : 'firstPoint'
}

/**
 * @param {object} interactiveMap
 * @param {{ mapElementId: string, getHasBoundary: Function, hints?: Record<string, { click?: string, tap?: string }> }} params
 * @returns {{ onGeometryChange: Function }} hand onGeometryChange to newPolygon
 */
export function wireDrawHints(
  interactiveMap,
  { mapElementId, getHasBoundary, hints = {} }
) {
  let isDrawing = false
  let currentStep = null
  let lastPointerType = 'mouse'

  // map:click carries no pointer type, so remember the last one used on the map
  document.getElementById(mapElementId)?.addEventListener(
    'pointerdown',
    (pointerEvent) => {
      lastPointerType = pointerEvent.pointerType
    },
    { capture: true, passive: true }
  )

  const isTouch = () => ['touch', 'pen'].includes(lastPointerType)

  function textFor(step) {
    const versions = hints[step] || {}
    return isTouch() ? versions.tap : versions.click
  }

  /**
   * @param {string} step
   * @param {{ options?: object, force?: boolean }} [params] showHint options
   *   (steps persist by default); force shows the step again even if it is
   *   the current one
   */
  function showStep(step, { options = UNTIL_DISMISSED, force = false } = {}) {
    if (step === currentStep && !force) {
      return
    }
    const text = textFor(step)
    if (!text) {
      clearStep()
      return
    }
    // A timed hint dismisses itself, so it never counts as the current step
    currentStep = options.duration === 0 ? step : null
    interactiveMap.showHint(text, options)
  }

  function clearStep() {
    if (currentStep) {
      currentStep = null
      interactiveMap.dismissHint()
    }
  }

  function onMapReady() {
    if (!getHasBoundary()) {
      showStep('idle')
    }
  }

  // The map's viewport clears every hint when it loses focus, which a click
  // on the map can cause, so a click shows the step it interrupted again
  function onMapClick() {
    if (isDrawing) {
      if (currentStep) {
        showStep(currentStep, { force: true })
      }
      return
    }
    if (getHasBoundary()) {
      return
    }
    if (textFor('start') === textFor('idle')) {
      showStep('idle', { force: true })
      return
    }
    // Library default duration: the hint fades after a few seconds
    showStep('start', { options: {} })
  }

  // Called by the draw plugin on every change to the shape being drawn
  function onGeometryChange(geometryChangeEvent) {
    const { phase, mode, numVertices, vertexIndex } = geometryChangeEvent
    // A last preview can arrive just after the shape is finished
    if (!isDrawing || mode !== 'draw_polygon') {
      return undefined
    }
    if (phase === 'preview') {
      showStep(stepForPoints(numVertices))
    } else if (phase === 'commit-add') {
      showStep(stepForPoints(vertexIndex + 1))
    } else {
      // Nothing to show for the other phases
    }
    return undefined
  }

  function onDrawStarted() {
    isDrawing = true
    showStep('firstPoint')
  }

  function onEditStarted() {
    isDrawing = true
    showStep('edit')
  }

  function onVertexSelection({ index }) {
    if (isDrawing) {
      showStep(index === -1 ? 'edit' : 'pointSelected')
    }
  }

  function onDrawFinished() {
    isDrawing = false
    clearStep()
  }

  function onDrawCancelled() {
    onDrawFinished()
    onMapReady()
  }

  interactiveMap.on('map:ready', onMapReady)
  interactiveMap.on('map:click', onMapClick)
  interactiveMap.on('draw:started', onDrawStarted)
  interactiveMap.on('draw:editstart', onEditStarted)
  interactiveMap.on('draw:vertexselection', onVertexSelection)
  interactiveMap.on('draw:created', onDrawFinished)
  interactiveMap.on('draw:edited', onDrawFinished)
  interactiveMap.on('draw:cancelled', onDrawCancelled)

  return { onGeometryChange }
}
