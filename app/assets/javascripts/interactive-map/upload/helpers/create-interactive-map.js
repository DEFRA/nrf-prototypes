import {
  BOUNDARY_MAP_MAX_ZOOM,
  DEFAULT_MAP_CENTER
} from '../../shared-helpers/constants.js'
import { transformRequest } from '../../shared-helpers/transform-request.js'

/**
 * @param {string} mapElementId
 * @param {{ mapStyles: object[], plugins: object[], bounds: number[]|null, center: number[]|null }} params
 */
export function createInteractiveMap(
  mapElementId,
  { mapStyles, plugins, bounds, center }
) {
  const { InteractiveMap, maplibreProvider } = window.defra

  return new InteractiveMap(mapElementId, {
    behaviour: 'inline',
    mapProvider: maplibreProvider(),
    mapLabel: 'Red line boundary',
    mapStyle: mapStyles[0],
    center: center || DEFAULT_MAP_CENTER,
    bounds,
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
