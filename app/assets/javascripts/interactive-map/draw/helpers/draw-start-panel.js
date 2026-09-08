const BUTTON_ID = 'drawStart'

// The 'actions' slot is where interactive-map renders its own primary,
// bottom-centred controls (e.g. the Cancel/Done buttons shown while
// drawing), so targeting it here gives the "Draw" call to action the same
// native positioning and styling at every breakpoint, with no custom DOM
// or CSS needed.
const ACTIONS_SLOT = { slot: 'actions' }

/**
 * @param {object} interactiveMap
 * @param {{ startDraw: Function, hasExistingBoundary: boolean, getHasBoundary: Function }} params
 */
export function wireDrawStartPanel(
  interactiveMap,
  { startDraw, hasExistingBoundary, getHasBoundary }
) {
  interactiveMap.addButton(BUTTON_ID, {
    label: 'Draw',
    variant: 'primary',
    mobile: ACTIONS_SLOT,
    tablet: ACTIONS_SLOT,
    desktop: ACTIONS_SLOT,
    onClick: startDraw
  })

  const setHidden = (hidden) => {
    interactiveMap.toggleButtonState(BUTTON_ID, 'hidden', hidden)
  }
  setHidden(hasExistingBoundary)

  function onDrawStarted() {
    setHidden(true)
  }

  function onDrawCancelled() {
    setHidden(getHasBoundary())
  }

  interactiveMap.on('draw:started', onDrawStarted)
  interactiveMap.on('draw:cancelled', onDrawCancelled)

  return { setHidden }
}
