/**
 * Uploaded boundary preview – entry point for the nrf-quote-7 file preview
 * page.
 *
 * Ported from the production frontend (nrf-frontend
 * src/client/javascripts/map/upload/index.js). The deliberate differences
 * are the same as the draw map's (see ../draw/index.js): the library is
 * read from window.defra, and page config lives on a separate element
 * (#boundary-map-config) rather than the map element's own data-*
 * attributes, which interactive-map reads as component config.
 */

import { createCommonMapPlugins } from '../shared-helpers/common-map-plugins.js'
import { FILL_LAYER_IDS } from '../shared-helpers/datasets.js'
import { wireFillOpacityOnZoom } from '../shared-helpers/fill-opacity-on-zoom.js'
import { readExistingBoundary } from '../shared-helpers/read-boundary-metadata.js'
import { wireSavedBoundary } from './helpers/saved-boundary.js'
import { wireMapErrorLogging } from '../shared-helpers/map-error-logging.js'
import { createInteractiveMap } from './helpers/create-interactive-map.js'

const MAP_ELEMENT_ID = 'boundary-map'
const CONFIG_ELEMENT_ID = 'boundary-map-config'

function initUploadPreviewMap() {
  const mapElement = document.getElementById(MAP_ELEMENT_ID)
  const configElement = document.getElementById(CONFIG_ELEMENT_ID) || mapElement

  if (!mapElement) {
    return
  }

  if (!window.defra?.InteractiveMap) {
    console.error(
      '[interactive-map] window.defra is missing. Check the UMD <script> tags in includes/interactive-map-scripts.html load before this module and that @defra/interactive-map is installed.'
    )
    return
  }

  const hasOsKey = configElement.dataset.hasOsKey === 'true'
  const { initialFeature, bounds, center } = readExistingBoundary(configElement)

  const {
    mapStyles,
    datasetsPlugin,
    mapKeyPlugin,
    mapStylesPlugin,
    scaleBarPlugin
  } = createCommonMapPlugins({ hasOsKey })

  const interactiveMap = createInteractiveMap(MAP_ELEMENT_ID, {
    mapStyles,
    bounds,
    center,
    plugins: [datasetsPlugin, mapKeyPlugin, mapStylesPlugin, scaleBarPlugin]
  })

  // Nothing here is toggleable and production has no Layers button, so hide
  // it once the datasets plugin has mounted it (see ../draw/index.js)
  interactiveMap.on('datasets:ready', () =>
    interactiveMap.toggleButtonState('datasetsLayers', 'hidden', true)
  )

  function onMapReady(mapReadyEvent) {
    wireMapErrorLogging(mapReadyEvent.map)
    wireSavedBoundary(mapReadyEvent.map, initialFeature)
  }

  interactiveMap.on('map:ready', onMapReady)

  wireFillOpacityOnZoom(interactiveMap, { fillLayerIds: FILL_LAYER_IDS })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUploadPreviewMap)
} else {
  initUploadPreviewMap()
}
