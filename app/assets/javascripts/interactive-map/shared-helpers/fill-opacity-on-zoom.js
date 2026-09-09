const ZOOM_THRESHOLD = 10
const REDUCED_FILL_OPACITY = 0.3
const DEFAULT_FILL_OPACITY = 1

/**
 * @param {object} interactiveMap
 * @param {{ fillLayerIds: string[] }} params
 */
export function wireFillOpacityOnZoom(interactiveMap, { fillLayerIds }) {
  let mapInstance = null

  function applyFillOpacity() {
    if (!mapInstance) {
      return
    }

    const zoom = mapInstance.getZoom?.() ?? 0
    const opacity =
      zoom >= ZOOM_THRESHOLD ? REDUCED_FILL_OPACITY : DEFAULT_FILL_OPACITY

    fillLayerIds.forEach((layerId) => {
      if (mapInstance.getLayer?.(layerId)) {
        mapInstance.setPaintProperty(layerId, 'fill-opacity', opacity)
      }
    })
  }

  function onMapReady(mapReadyEvent) {
    mapInstance = mapReadyEvent.map
    mapInstance.on('zoomend', applyFillOpacity)
    // Layers are recreated (at default opacity) whenever the basemap style
    // changes, and that happens asynchronously after 'map:stylechange'
    // fires, so re-apply on every 'idle' rather than trying to time it.
    mapInstance.on('idle', applyFillOpacity)
    applyFillOpacity()
  }

  interactiveMap.on('map:ready', onMapReady)
}
