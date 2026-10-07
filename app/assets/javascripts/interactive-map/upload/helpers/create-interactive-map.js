import {
  BOUNDARY_MAP_MAX_ZOOM,
  DEFAULT_MAP_CENTER,
  ENGLAND_MAX_BOUNDS
} from '../../shared-helpers/constants.js'
import { transformRequest } from '../../shared-helpers/transform-request.js'

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
    mapLabel: 'Red line boundary',
    mapStyle: mapStyles[0],
    center: center || DEFAULT_MAP_CENTER,
    bounds,
    // Production's bounds, on quote V7.1's preview only
    ...(production ? { maxBounds: ENGLAND_MAX_BOUNDS } : {}),
    maxZoom: BOUNDARY_MAP_MAX_ZOOM,
    containerHeight: '100%',
    enableZoomControls: true,
    enableFullscreen: true,
    // A read-only preview of an already-uploaded boundary has no use for a
    // shareable pan/zoom URL
    urlPosition: 'none',
    transformRequest,
    plugins
  })
}
