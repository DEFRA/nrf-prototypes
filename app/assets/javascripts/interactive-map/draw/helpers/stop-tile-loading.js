// MapLibre's removeSource() aborts any pending tile requests for that source
// (it calls AbortController.abort() on each in-flight tile fetch). Removing
// the dataset layers/sources when navigating away frees up the browser's
// per-origin connection pool for the destination page's own requests, rather
// than leaving them to compete with tiles still loading from panning/zooming
// during boundary drawing.
export function stopTileLoading(map, layerIds) {
  if (!map) {
    return
  }

  const sourceIds = new Set()
  layerIds.forEach((layerId) => {
    const layer = map.getLayer?.(layerId)
    if (layer) {
      sourceIds.add(layer.source)
      map.removeLayer(layerId)
    }
  })

  sourceIds.forEach((sourceId) => {
    if (map.getSource?.(sourceId)) {
      map.removeSource(sourceId)
    }
  })
}
