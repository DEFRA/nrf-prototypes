/**
 * Prototype experiment (not in production): shows the "Map controls" label
 * on desktop, to match the labelled buttons along the top of the map.
 *
 * The button is one of interactive-map's own defaults (src/config/appConfig.js),
 * not a plugin's, so there is no manifest override for it. Plugins register
 * after the defaults and a button with the same id replaces the default
 * outright, so this re-declares the whole button — copied from the library
 * as of 0.0.49-alpha — with only the desktop showLabel changed. Re-check it
 * against the library's appConfig.js when upgrading.
 *
 * The D-pad it opens stays in the library's 'right-bottom' slot: it is a
 * core control whose component is not exported, so it cannot be moved.
 */

const ICON_ONLY = { slot: 'right-top', showLabel: false }
const WITH_LABEL = { slot: 'right-top', showLabel: true }

const MAP_CONTROLS_BUTTON = {
  id: 'mapControls',
  label: 'Map controls',
  iconId: 'move',
  keepFocus: true,
  isExpanded: false,
  ariaControls: ({ appConfig }) => `${appConfig.id}-map-controls-content`,
  onClick: (_e, { appState }) =>
    appState.dispatch({
      type: 'TOGGLE_BUTTON_EXPANDED',
      payload: {
        id: 'mapControls',
        isExpanded: !appState.expandedButtons.has('mapControls')
      }
    }),
  excludeWhen: ({ appConfig }) => !appConfig.enableMapControls,
  mobile: ICON_ONLY,
  tablet: ICON_ONLY,
  desktop: WITH_LABEL
}

export function createMapControlsButtonPlugin() {
  return {
    id: 'mapControlsButton',
    load: async () => ({ buttons: [MAP_CONTROLS_BUTTON] })
  }
}
