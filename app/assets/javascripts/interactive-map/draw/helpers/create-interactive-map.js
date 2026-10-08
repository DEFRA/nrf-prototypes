import {
  DEFAULT_MAP_CENTER,
  DRAW_MAP_MAX_ZOOM,
  ENGLAND_MAX_BOUNDS
} from '../../shared-helpers/constants.js'
import { transformRequest } from '../../shared-helpers/transform-request.js'

const DEFAULT_ZOOM = 8.5

/**
 * @param {string} mapElementId
 * @param {{ mapStyles: object[], plugins: object[], bounds: number[]|null, center: number[]|null, production?: boolean }} params
 */
export function createInteractiveMap(
  mapElementId,
  { mapStyles, plugins, bounds, center, production = false }
) {
  const { InteractiveMap, maplibreProvider } = window.defra

  return new InteractiveMap(mapElementId, {
    behaviour: 'inline',
    mapProvider: maplibreProvider(),
    mapStyle: mapStyles[0],
    center: center || DEFAULT_MAP_CENTER,
    bounds,
    // Production's limits, on quote V7.1's map only
    ...(production
      ? { maxBounds: ENGLAND_MAX_BOUNDS, maxZoom: DRAW_MAP_MAX_ZOOM }
      : {}),
    zoom: DEFAULT_ZOOM,
    containerHeight: '100%',
    // Avoids a spurious history.replaceState() on the initial map move
    urlPosition: 'none',
    transformRequest,
    plugins
  })
}
