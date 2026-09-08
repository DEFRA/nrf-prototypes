const EMPTY_FEATURE_PROPERTIES = Object.freeze({})

/**
 * @param {{ mapElement: HTMLElement, datasetKey: string, errorMessage: string }} params
 */
function parseDatasetJson({ mapElement, datasetKey, errorMessage }) {
  try {
    const value = mapElement.dataset?.[datasetKey]
    return value ? JSON.parse(value) : null
  } catch (error) {
    console.error(errorMessage, error)
    return null
  }
}

function normalizeInitialDrawFeature(value) {
  if (!value || typeof value !== 'object') {
    return null
  }

  if (value.type === 'FeatureCollection') {
    return normalizeInitialDrawFeature(value.features?.[0])
  }

  if (value.type === 'Feature') {
    return value.geometry
      ? {
          id: value.id,
          type: 'Feature',
          geometry: value.geometry,
          properties: value.properties ?? EMPTY_FEATURE_PROPERTIES
        }
      : null
  }

  if (value.type && value.coordinates) {
    return {
      type: 'Feature',
      geometry: value,
      properties: EMPTY_FEATURE_PROPERTIES
    }
  }

  return null
}

/**
 * @param {{ bottomLeft: number[], topRight: number[] }|null} bounds
 */
function getExistingBoundaryBounds(bounds) {
  return bounds
    ? [...(bounds.bottomLeft || {}), ...(bounds.topRight || {})]
    : null
}

/**
 * @param {HTMLElement} mapElement
 * @returns {{ initialFeature: object|null, bounds: number[]|null, center: number[]|null }}
 */
export function readExistingBoundary(mapElement) {
  const existingBoundaryGeojson = parseDatasetJson({
    mapElement,
    datasetKey: 'existingBoundaryGeojson',
    errorMessage: 'Failed to parse existing boundary GeoJSON'
  })
  const existingBoundaryMetadata = parseDatasetJson({
    mapElement,
    datasetKey: 'existingBoundaryMetadata',
    errorMessage: 'Failed to parse existing boundary metadata'
  })

  const initialFeature = normalizeInitialDrawFeature(existingBoundaryGeojson)

  // Resolved once here (rather than deferring to hydrateInitialDrawFeature)
  // so the same id is available immediately to callers — e.g. the draw map
  // hands it to wireDrawTools as initialBoundaryFeatureId, letting the
  // boundary info panel's Edit button address this feature before any
  // draw:created/edited event has fired.
  if (initialFeature) {
    initialFeature.id ??= crypto.randomUUID()
  }

  return {
    initialFeature,
    bounds: getExistingBoundaryBounds(existingBoundaryMetadata?.bounds),
    center: existingBoundaryMetadata?.centre ?? null
  }
}
