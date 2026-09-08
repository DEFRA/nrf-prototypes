const EMPTY_FEATURE_PROPERTIES = Object.freeze({})

// fitToBounds has no padding option of its own - it fits the exact bbox we
// give it, then the map's structural safe-zone padding is applied on top.
// Expanding the bbox itself is the only way to add extra visual breathing
// room around a saved boundary. A ratio of 0.5 (added per side) doubles the
// bbox's width and height, roughly doubling the empty space shown around it.
const BOUNDARY_FIT_BUFFER_RATIO = 0.5

function flattenCoordinates(coordinates, points = []) {
  if (typeof coordinates[0] === 'number') {
    points.push(coordinates)
  } else {
    coordinates.forEach((nested) => flattenCoordinates(nested, points))
  }
  return points
}

/**
 * @param {object} feature - GeoJSON Feature with a Polygon or MultiPolygon geometry.
 * @returns {[number, number, number, number]} Buffered bounds as [west, south, east, north].
 */
function getBufferedBounds(feature) {
  const points = flattenCoordinates(feature.geometry.coordinates)
  const lons = points.map(([lon]) => lon)
  const lats = points.map(([, lat]) => lat)
  const west = Math.min(...lons)
  const east = Math.max(...lons)
  const south = Math.min(...lats)
  const north = Math.max(...lats)
  const lonBuffer = (east - west) * BOUNDARY_FIT_BUFFER_RATIO
  const latBuffer = (north - south) * BOUNDARY_FIT_BUFFER_RATIO

  return [
    west - lonBuffer,
    south - latBuffer,
    east + lonBuffer,
    north + latBuffer
  ]
}

/**
 * @param {{ drawPlugin: object, initialFeature: object|null }} params
 * @returns {boolean}
 */
export function hydrateInitialDrawFeature({ drawPlugin, initialFeature }) {
  if (
    initialFeature?.type !== 'Feature' ||
    !initialFeature?.geometry ||
    typeof drawPlugin?.addFeature !== 'function'
  ) {
    return false
  }

  drawPlugin.addFeature({
    ...initialFeature,
    id: initialFeature.id || crypto.randomUUID(),
    properties: initialFeature.properties ?? EMPTY_FEATURE_PROPERTIES
  })

  return true
}

/**
 * @param {object} interactiveMap
 * @param {{ drawPlugin: object, initialFeature: object|null, boundaryInfoPanel: object }} params
 */
export function wireSavedBoundary(
  interactiveMap,
  { drawPlugin, initialFeature, boundaryInfoPanel }
) {
  // The draw-ml plugin creates its underlying MapboxDraw control asynchronously
  // (a React effect gated on the map being ready), so drawPlugin.addFeature is a
  // no-op if called straight from 'map:ready' — it silently drops the feature
  // because the control doesn't exist yet. 'draw:ready' fires once that control
  // has actually been created.
  function onDrawReady() {
    const hydrated = hydrateInitialDrawFeature({ drawPlugin, initialFeature })

    if (hydrated) {
      interactiveMap.fitToBounds(getBufferedBounds(initialFeature))
      boundaryInfoPanel.checkExistingBoundary(initialFeature)
    }
  }

  interactiveMap.on('draw:ready', onDrawReady)
}
