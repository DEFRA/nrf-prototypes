/**
 * @param {object} interactiveMap
 * @param {{ layerIds: string[] }} params
 */
export function wireHideLayersOnDraw(interactiveMap, { layerIds }) {
  let mapInstance = null

  function setVisibility(visible) {
    if (!mapInstance) {
      return
    }

    const value = visible ? 'visible' : 'none'
    layerIds.forEach((layerId) => {
      if (mapInstance.getLayer?.(layerId)) {
        mapInstance.setLayoutProperty(layerId, 'visibility', value)
      }
    })
  }

  function onMapReady(mapReadyEvent) {
    mapInstance = mapReadyEvent.map
  }

  function hideLayers() {
    setVisibility(false)
  }

  function showLayers() {
    setVisibility(true)
  }

  interactiveMap.on('map:ready', onMapReady)
  interactiveMap.on('draw:started', hideLayers)
  interactiveMap.on('draw:created', showLayers)
  interactiveMap.on('draw:edited', showLayers)
  interactiveMap.on('draw:cancelled', showLayers)
}
