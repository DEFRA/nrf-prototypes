const TOGGLE_SELECTOR = '.app-map-attribution'
const WRAPPER_SELECTOR = '.im-o-app__attributions'
const EXPANDED_CLASS = 'app-map-attribution--expanded'
const APP_SELECTOR = '.im-o-app'
const CLEARANCE_VAR = '--app-map-attribution-clearance'

/**
 * Lets a truncated copyright notice expand to its full text on tap (and
 * collapse again). interactive-map renders the notice from the style's
 * attribution HTML (see styles.js) and, on the mobile layout, rebuilds that
 * HTML after a tap on it, so nothing set on the button itself survives. The
 * expanded state therefore lives as a class on the plugin's own wrapper
 * element, which persists (the plugin keeps its stacked class there the
 * same way), and the button's aria-expanded is re-synced from it whenever
 * the notice is rebuilt. The listeners are delegated in the capture phase
 * because the map stops clicks bubbling to the document on mobile, and the
 * tap is kept from the map altogether, which would otherwise treat it as a
 * tap on the map itself (on mobile that hides the Select action).
 *
 * interactive-map (0.0.48-alpha) positions its right-hand column from the
 * height of the bottom-right buttons alone, ignoring a notice stacked on
 * its own row beneath them, so a notice that grows on tap would slide the
 * scale bar under the Draw tools button. The extra height is set as a CSS
 * variable on the app container (as the plugin does with its own layout
 * variables) and added to that offset in _interactive-map.scss.
 */
export function enableAttributionToggle() {
  if (document.documentElement.dataset.mapAttributionToggle) {
    return
  }
  document.documentElement.dataset.mapAttributionToggle = 'true'

  const syncButton = (wrapper) => {
    const toggle = wrapper.querySelector(TOGGLE_SELECTOR)
    if (toggle) {
      toggle.setAttribute(
        'aria-expanded',
        String(wrapper.classList.contains(EXPANDED_CLASS))
      )
    }
  }

  const wrapperOf = (event) =>
    event.target.closest?.(TOGGLE_SELECTOR)?.closest(WRAPPER_SELECTOR)

  document.addEventListener(
    'click',
    (event) => {
      const wrapper = wrapperOf(event)
      if (!wrapper) {
        return
      }
      event.stopPropagation()
      const collapsedHeight = wrapper.classList.contains(EXPANDED_CLASS)
        ? null
        : wrapper.offsetHeight
      const isExpanded = wrapper.classList.toggle(EXPANDED_CLASS)
      syncButton(wrapper)
      const clearance = isExpanded ? wrapper.offsetHeight - collapsedHeight : 0
      wrapper
        .closest(APP_SELECTOR)
        ?.style.setProperty(CLEARANCE_VAR, `${Math.max(0, clearance)}px`)
    },
    true
  )

  for (const type of ['pointerdown', 'mousedown', 'touchstart']) {
    document.addEventListener(
      type,
      (event) => {
        if (wrapperOf(event)) {
          event.stopPropagation()
        }
      },
      true
    )
  }

  new MutationObserver(() => {
    document.querySelectorAll(WRAPPER_SELECTOR).forEach(syncButton)
  }).observe(document.body, { childList: true, subtree: true })
}
