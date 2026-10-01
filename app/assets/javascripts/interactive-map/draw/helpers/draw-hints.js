/**
 * Prototype-only toast hints, shown through interactive-map's built-in
 * showHint()/dismissHint() API (not in production). The library renders the
 * hint centred just above the actions bar, which is where the "Draw" button
 * sits, so no positioning of our own is needed.
 *
 *   - Clicking or tapping the map before pressing "Draw" points the user at
 *     the "Draw" button, worded for the way they just touched the map.
 *   - Once a new boundary has 3 points (enough to finish a polygon) a hint
 *     says how to finish it. Return is not offered: with the map focused it
 *     adds a point at the crosshair rather than finishing the shape.
 */

const MIN_POLYGON_POINTS = 3

// Persist until dismissed (see interactive-map's showHint options)
const UNTIL_DISMISSED = { duration: 0 }

function finishHintText(isTouch) {
  return isTouch
    ? 'Double tap or tap "Done" to finish'
    : 'Double click or click "Done" to finish'
}

/**
 * @param {object} interactiveMap
 * @param {{ mapElementId: string, getHasBoundary: Function }} params
 * @returns {{ onGeometryChange: Function }} hand onGeometryChange to newPolygon
 */
export function wireDrawHints(
  interactiveMap,
  { mapElementId, getHasBoundary }
) {
  let isDrawing = false
  let isShowingFinishHint = false
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

  function onMapClick() {
    if (isDrawing || getHasBoundary()) {
      return
    }
    interactiveMap.showHint(
      isTouch() ? 'Tap "Draw" to start' : 'Click "Draw" to start'
    )
  }

  function showFinishHint() {
    isShowingFinishHint = true
    interactiveMap.showHint(finishHintText(isTouch()), UNTIL_DISMISSED)
  }

  function dismissFinishHint() {
    if (isShowingFinishHint) {
      isShowingFinishHint = false
      interactiveMap.dismissHint()
    }
  }

  // Called by the draw plugin on every change to the shape being drawn
  function onGeometryChange(geometryChangeEvent) {
    const { phase, mode, numVertices, vertexIndex } = geometryChangeEvent
    // A last preview can arrive just after the shape is finished
    if (!isDrawing || mode !== 'draw_polygon') {
      return undefined
    }
    if (phase !== 'preview' && phase !== 'commit-add') {
      return undefined
    }
    const points = phase === 'preview' ? numVertices : vertexIndex + 1
    if (points >= MIN_POLYGON_POINTS && !isShowingFinishHint) {
      showFinishHint()
    } else if (points < MIN_POLYGON_POINTS) {
      // e.g. the user pressed Undo
      dismissFinishHint()
    }
    return undefined
  }

  function onDrawStarted() {
    isDrawing = true
    interactiveMap.dismissHint()
  }

  function onDrawFinished() {
    isDrawing = false
    dismissFinishHint()
  }

  interactiveMap.on('map:click', onMapClick)
  interactiveMap.on('draw:started', onDrawStarted)
  interactiveMap.on('draw:editstart', onDrawStarted)
  interactiveMap.on('draw:created', onDrawFinished)
  interactiveMap.on('draw:edited', onDrawFinished)
  interactiveMap.on('draw:cancelled', onDrawFinished)

  return { onGeometryChange }
}
