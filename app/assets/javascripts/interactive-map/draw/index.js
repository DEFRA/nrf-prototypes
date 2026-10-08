/**
 * Draw a red line boundary – entry point for the nrf-quote-7 map page.
 *
 * Ported from the production frontend (nrf-frontend
 * src/client/javascripts/map/draw/index.js). The file layout under
 * app/assets/javascripts/interactive-map/ mirrors production so the two can
 * be diffed. The deliberate differences are:
 *   - @defra/interactive-map is read from window.defra (its UMD builds are
 *     served by the Prototype Kit from /plugin-assets/...) instead of being
 *     bundled with webpack
 *   - "Save and continue" submits the page's form; the journey engine then
 *     runs the EDP check and branching (no JSON save endpoint)
 *   - no CSRF token and no Google Tag Manager events
 *
 * Load order: this file is a <script type="module">, which the browser defers
 * until the document has been parsed, so it always runs after the classic
 * <script> tags in layouts/interactive-map.html that populate window.defra.
 * Never add defer or async to those UMD tags.
 */

import { createCommonMapPlugins } from '../shared-helpers/common-map-plugins.js'
import { wireBoundaryInfoPanel } from './helpers/boundary-info.js'
import { createDrawToolsPlugins, wireDrawTools } from './helpers/draw-tools.js'
import { ALL_LAYER_IDS, FILL_LAYER_IDS } from '../shared-helpers/datasets.js'
import { wireFillOpacityOnZoom } from '../shared-helpers/fill-opacity-on-zoom.js'
import { wireHideLayersOnDraw } from './helpers/hide-layers-on-draw.js'
import { wireBackButton } from './helpers/back-button.js'
import { readExistingBoundary } from '../shared-helpers/read-boundary-metadata.js'
import { wireSavedBoundary } from './helpers/saved-boundary.js'
import { createInteractiveMap } from './helpers/create-interactive-map.js'
import { createMapControlsButtonPlugin } from './helpers/map-controls-button.js'
import { wireMapErrorLogging } from '../shared-helpers/map-error-logging.js'
import { toAbsoluteUrl } from '../shared-helpers/to-absolute-url.js'

const MAP_ELEMENT_ID = 'draw-boundary-map'
// Page config lives on a separate element: interactive-map JSON-parses every
// data-* attribute on its own root element as component config.
const CONFIG_ELEMENT_ID = 'draw-boundary-config'

// Moves the styles button into the same top-right slot as the zoom
// controls, above them (buttons render before the zoom group when neither
// specifies an explicit order — see interactive-map's slot ordering), and
// drops its label so it matches the icon-only zoom buttons beside it.
const TOP_RIGHT_NO_LABEL = { slot: 'right-top', showLabel: false }

// Moves the styles panel to open beside its (now top-right) button on
// tablet/desktop, using the button-adjacent slot so it tracks the button
// rather than duplicating 'right-top' — see interactive-map's
// button-adjacent panel slots. Mobile keeps the default drawer.
const STYLES_PANEL_DRAWER = { slot: 'drawer', modal: true, dismissible: true }
const STYLES_PANEL_TOP_RIGHT = {
  slot: 'map-styles-button',
  modal: true,
  width: '400px',
  dismissible: true
}

// Orders the search button after the back button (order: 1) in the shared
// top-left slot on tablet/desktop, so it renders before the Layers and Key
// buttons — which keep their default, unordered position and so naturally
// fall after any explicitly-ordered buttons. See interactive-map's slot
// ordering.
const TOP_LEFT_SEARCH_SECOND = { slot: 'top-left', showLabel: false, order: 2 }

// ---------------------------------------------------------------------------
// Prototype experiment (not in production), only on a map page whose config
// element has data-map-experiment="true" (nrf-quote-7-1). Every other map
// keeps production's buttons above.

// Renames the styles button "Map type" and puts it in the top-left slot
// straight after the Key button. Neither the Key nor this button sets an
// order, so they keep plugin order (map-key is listed before map-styles
// below) and both fall after the explicitly ordered back and search buttons.
// The label shows on tablet and desktop, like the Key's; mobile has room only
// for the icon.
const MAP_TYPE_LABEL = 'Map type'
const TOP_LEFT_ICON_ONLY = { slot: 'top-left', showLabel: false }
const TOP_LEFT_WITH_LABEL = { slot: 'top-left', showLabel: true }

// Opens the Map type panel down the left of the map, under the top-left
// buttons, as the Key panel does (and as the plugin does by default). A
// button-adjacent slot ('map-styles-button') only opens rightwards for a
// button in a left-* slot; from the top-left bar it opens leftwards over the
// Back and Key buttons. Mobile keeps the drawer.
const STYLES_PANEL_LEFT = {
  slot: 'left-top',
  modal: true,
  width: '400px',
  dismissible: true
}

// The search label shows on desktop, to match the labelled Key and Map type
// buttons beside it
const TOP_LEFT_SEARCH_SECOND_WITH_LABEL = {
  ...TOP_LEFT_SEARCH_SECOND,
  showLabel: true
}

// The search plugin also uses its placeholder as the input's visually hidden
// label. The width keeps the whole placeholder visible on tablet and desktop.
const SEARCH_PLACEHOLDER = 'Search by address or postcode'
const SEARCH_WIDTH = '320px'

/**
 * The styles plugin's manifest: production's, or the experiment's Map type
 *
 * @param {boolean} experiment
 */
function mapStylesManifest(experiment) {
  if (!experiment) {
    return {
      buttons: [
        {
          id: 'mapStyles',
          mobile: TOP_RIGHT_NO_LABEL,
          tablet: TOP_RIGHT_NO_LABEL,
          desktop: TOP_RIGHT_NO_LABEL
        }
      ],
      panels: [
        {
          id: 'mapStyles',
          mobile: STYLES_PANEL_DRAWER,
          tablet: STYLES_PANEL_TOP_RIGHT,
          desktop: STYLES_PANEL_TOP_RIGHT
        }
      ]
    }
  }
  return {
    buttons: [
      {
        id: 'mapStyles',
        label: MAP_TYPE_LABEL,
        mobile: TOP_LEFT_ICON_ONLY,
        tablet: TOP_LEFT_WITH_LABEL,
        desktop: TOP_LEFT_WITH_LABEL
      }
    ],
    panels: [
      {
        id: 'mapStyles',
        label: MAP_TYPE_LABEL,
        mobile: STYLES_PANEL_DRAWER,
        tablet: STYLES_PANEL_LEFT,
        desktop: STYLES_PANEL_LEFT
      }
    ]
  }
}

/**
 * @param {{ datasetsPlugin: object, mapKeyPlugin: object, mapStylesPlugin: object, scaleBarPlugin: object, interactPlugin: object, drawPlugin: object, searchPlugin: object, experiment?: boolean }} params
 */
function buildMapPlugins({
  datasetsPlugin,
  mapKeyPlugin,
  mapStylesPlugin,
  scaleBarPlugin,
  interactPlugin,
  drawPlugin,
  searchPlugin,
  experiment = false
}) {
  return [
    // Datasets before map key so the Key button follows the datasets buttons
    datasetsPlugin,
    mapKeyPlugin,
    { ...mapStylesPlugin, manifest: mapStylesManifest(experiment) },
    scaleBarPlugin,
    interactPlugin,
    drawPlugin,
    ...(experiment ? [createMapControlsButtonPlugin()] : []),
    {
      ...searchPlugin,
      manifest: {
        buttons: [
          {
            id: 'search',
            tablet: TOP_LEFT_SEARCH_SECOND,
            desktop: experiment
              ? TOP_LEFT_SEARCH_SECOND_WITH_LABEL
              : TOP_LEFT_SEARCH_SECOND
          }
        ]
      }
    }
  ]
}

const HINT_STEPS = [
  'idle',
  'start',
  'firstPoint',
  'addPoints',
  'finish',
  'edit',
  'pointSelected'
]

/**
 * Prototype experiment: the map hints' words, from the page's text:
 * frontmatter, where each step has hint<Step>Click and hint<Step>Tap fields
 * (see draw-hints.js)
 *
 * @param {HTMLElement} configElement
 */
function readHints(configElement) {
  let text = {}
  try {
    text = JSON.parse(configElement.dataset.text || '{}')
  } catch {
    console.error('[interactive-map] the page text is not valid JSON')
  }
  return Object.fromEntries(
    HINT_STEPS.map((step) => {
      const key = `hint${step[0].toUpperCase()}${step.slice(1)}`
      return [step, { click: text[`${key}Click`], tap: text[`${key}Tap`] }]
    })
  )
}

/**
 * @param {object} interactiveMap
 * @param {{ configElement: HTMLElement, interactPlugin: object, drawPlugin: object, initialFeature: object|null }} params
 */
function wireDrawBoundaryMap(
  interactiveMap,
  { configElement, interactPlugin, drawPlugin, initialFeature }
) {
  interactiveMap.on('map:ready', (mapReadyEvent) =>
    wireMapErrorLogging(mapReadyEvent.map)
  )

  // The datasets plugin adds a Layers button for toggling datasets. Nothing
  // here is toggleable (showInMenu is off) and production has no Layers
  // button, so hide it once the plugin has mounted it (its button does not
  // exist yet at map:ready).
  interactiveMap.on('datasets:ready', () =>
    interactiveMap.toggleButtonState('datasetsLayers', 'hidden', true)
  )

  const boundaryInfoPanel = wireBoundaryInfoPanel(interactiveMap, {
    checkUrl: toAbsoluteUrl(configElement.dataset.boundaryCheckUrl)
  })

  wireSavedBoundary(interactiveMap, {
    drawPlugin,
    initialFeature,
    boundaryInfoPanel
  })

  wireDrawTools(interactiveMap, {
    interactPlugin,
    drawPlugin,
    mapElementId: MAP_ELEMENT_ID,
    hasExistingBoundary: Boolean(initialFeature),
    initialBoundaryFeatureId: initialFeature?.id ?? null,
    hints:
      configElement.dataset.mapExperiment === 'true'
        ? readHints(configElement)
        : {}
  })

  wireFillOpacityOnZoom(interactiveMap, { fillLayerIds: FILL_LAYER_IDS })

  wireHideLayersOnDraw(interactiveMap, { layerIds: ALL_LAYER_IDS })

  wireBackButton(interactiveMap, {
    backLinkPath: configElement.dataset.backLinkPath
  })
}

function initDrawBoundaryMap() {
  const mapElement = document.getElementById(MAP_ELEMENT_ID)
  const configElement = document.getElementById(CONFIG_ELEMENT_ID) || mapElement

  if (!mapElement) {
    return
  }

  if (!window.defra?.InteractiveMap || !window.defra?.drawPlugin) {
    console.error(
      '[interactive-map] window.defra is missing. Check the UMD <script> tags in layouts/interactive-map.html load before this module and that @defra/interactive-map is installed.'
    )
    return
  }

  const { searchPlugin: createSearchPlugin } = window.defra

  const hasOsKey = configElement.dataset.hasOsKey === 'true'
  const hasAerial = configElement.dataset.hasAerial === 'true'
  // Quote V7.1's maps follow production: its basemaps, England bounds and
  // EDP tiles
  const production = configElement.dataset.productionMap === 'true'
  const {
    mapStyles,
    datasetsPlugin,
    mapKeyPlugin,
    mapStylesPlugin,
    scaleBarPlugin
  } = createCommonMapPlugins({
    hasOsKey,
    hasAerial,
    production
  })
  const { interactPlugin, drawPlugin } = createDrawToolsPlugins()
  const experiment = configElement.dataset.mapExperiment === 'true'
  const searchPlugin = createSearchPlugin({
    osNamesURL: '/os-names-search?query={query}',
    regions: ['england'],
    ...(experiment
      ? { placeholder: SEARCH_PLACEHOLDER, width: SEARCH_WIDTH }
      : {})
  })

  const { initialFeature, bounds, center } = readExistingBoundary(configElement)

  const interactiveMap = createInteractiveMap(MAP_ELEMENT_ID, {
    mapStyles,
    bounds,
    center,
    production,
    plugins: buildMapPlugins({
      datasetsPlugin,
      mapKeyPlugin,
      mapStylesPlugin,
      scaleBarPlugin,
      interactPlugin,
      drawPlugin,
      searchPlugin,
      experiment
    })
  })

  wireDrawBoundaryMap(interactiveMap, {
    configElement,
    interactPlugin,
    drawPlugin,
    initialFeature
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDrawBoundaryMap)
} else {
  initDrawBoundaryMap()
}
