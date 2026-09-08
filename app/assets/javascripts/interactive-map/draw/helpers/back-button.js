const TOP_LEFT_FIRST = { slot: 'top-left', order: 1 }

/**
 * @param {object} interactiveMap
 * @param {{ backLinkPath: string }} params
 */
export function wireBackButton(interactiveMap, { backLinkPath }) {
  function onBackClick() {
    window.location.assign(backLinkPath)
  }

  function addBackButton() {
    interactiveMap.addButton('back', {
      label: 'Back',
      iconSvgContent: '<path d="M17 22 7 12 17 2"/>',
      mobile: TOP_LEFT_FIRST,
      tablet: TOP_LEFT_FIRST,
      desktop: TOP_LEFT_FIRST,
      onClick: onBackClick
    })
  }

  interactiveMap.on('map:ready', addBackButton)
}
