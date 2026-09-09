/**
 * Show the basemap copyright on mobile.
 *
 * @defra/interactive-map deliberately renders nothing in its attributions slot
 * at the mobile breakpoint (src/App/components/Attributions/Attributions.jsx
 * returns `breakpoint !== 'mobile' && ...`), so the OS/Esri copyright vanishes
 * on small screens. We are required to display it at every breakpoint, so this
 * injects our own copy of the same markup into the library's attributions
 * container and keeps it in step with the selected map style.
 *
 * The node is a plain DOM sibling of the (empty) React-rendered attributions —
 * React never touches nodes it did not create — and carries the library's own
 * `im-c-attributions` class so it inherits the production styling. It is hidden
 * again above the mobile breakpoint in app/assets/sass/_interactive-map.scss so
 * the two never both appear.
 *
 * This is an addition, not a fork: nothing in node_modules is patched, and if
 * the library later renders attributions on mobile itself, delete this file and
 * its stylesheet block.
 */

const CONTAINER_SELECTOR = '.im-o-app__attributions'
const CLASS_NAME = 'im-c-attributions app-c-attributions--mobile'

function findStyleAttribution(mapStyles, mapStyleId) {
  const style = mapStyles.find((mapStyle) => mapStyle.id === mapStyleId)
  return style?.attribution || ''
}

/**
 * @param {object} interactiveMap
 * @param {{ mapStyles: object[], mapElementId: string }} params
 */
export function wireMobileAttributions(
  interactiveMap,
  { mapStyles, mapElementId }
) {
  let element = null
  let currentStyleId = null

  // map:stylechange sometimes fires with no payload (a style reload rather than
  // a switch), so fall back to the style we last rendered.
  const render = (mapStyleId = currentStyleId) => {
    currentStyleId = mapStyleId

    const container = document
      .getElementById(mapElementId)
      ?.querySelector(CONTAINER_SELECTOR)

    if (!container) {
      return
    }

    if (!element) {
      element = document.createElement('div')
      element.className = CLASS_NAME
    }

    element.innerHTML = findStyleAttribution(mapStyles, mapStyleId)

    if (element.parentNode !== container) {
      container.appendChild(element)
    }
  }

  interactiveMap.on('map:ready', (event) => render(event?.mapStyleId))
  interactiveMap.on('map:stylechange', (event) => render(event?.mapStyleId))
}
