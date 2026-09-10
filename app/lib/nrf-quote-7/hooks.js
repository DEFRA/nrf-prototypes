/**
 * Bespoke behaviour for the nrf-quote-7 journey.
 *
 * Everything declarative lives in content/nrf-quote-7. These hooks cover the
 * three things that need real code: the red line boundary map (EDP
 * intersection check), parsing an uploaded GeoJSON file, and minting the
 * NRF reference. All user-facing wording still comes from the page files.
 *
 * The map page uses the production map component (@defra/interactive-map,
 * see app/views/layouts/interactive-map.html). Its boundary check API and
 * response shape mirror the production frontend so the client glue under
 * app/assets/javascripts/interactive-map/ stays diffable against production.
 */

const path = require('path')
const fs = require('fs')
const turf = require('@turf/turf')
const { message } = require('../journey-engine/validation')
const edpData = require('../map/edp-data')

// ============================================================================
// EDP DATA (loaded once at startup)
// ============================================================================

// Nutrient EDPs (dissolved catchments) and excluded areas come from the shared
// app/lib/map/edp-data.js; the great crested newt EDP areas are loaded here.
const MAP_LAYERS = path.join(__dirname, '../../assets/map-layers')
const GCN_FILE = path.join(MAP_LAYERS, 'gcn_edp_all_regions.geojson')

const MAX_BOUNDARY_POINTS = 10000
const SQUARE_METRES_PER_HECTARE = 10000
const SQUARE_METRES_PER_ACRE = 4046.8564224
const MILES_PER_KILOMETRE = 0.621371
// Production shows four decimal places in the boundary information panel
const METADATA_DECIMAL_PLACES = 4

let gcnEdpData = null

function loadEdpData() {
  try {
    gcnEdpData = JSON.parse(fs.readFileSync(GCN_FILE, 'utf8'))
    edpData.getEdps()
  } catch (error) {
    console.error('Error loading EDP data:', error)
  }
}

loadEdpData()

function closeRing(coordinates) {
  const closed = [...coordinates]
  const first = closed[0]
  const last = closed[closed.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) {
    closed.push(first)
  }
  return closed
}

function openRing(coordinates) {
  if (coordinates.length < 2) {
    return [...coordinates]
  }
  const first = coordinates[0]
  const last = coordinates[coordinates.length - 1]
  if (first[0] === last[0] && first[1] === last[1]) {
    return coordinates.slice(0, -1)
  }
  return [...coordinates]
}

/**
 * Which EDPs a boundary falls in. Like production, nutrient EDPs are whole
 * plans (one entry per EDP, not per catchment).
 * @returns {{ nutrient: string|null, gcn: string|null, intersections: Array, excludedAreas: Array }}
 */
function checkEDPIntersections(coordinates) {
  if (!coordinates || coordinates.length < 3) {
    return { nutrient: null, gcn: null, intersections: [], excludedAreas: [] }
  }
  try {
    const boundaryPolygon = turf.polygon([closeRing(coordinates)])
    const intersections = []
    let nutrientIntersection = null
    let gcnIntersection = null

    for (const edp of edpData.findIntersectingEdps(boundaryPolygon)) {
      intersections.push({
        type: 'nutrient',
        name: edp.label,
        id: edp.id,
        live: edp.live
      })
      if (!nutrientIntersection) {
        nutrientIntersection = edp.label
      }
    }
    const excludedAreas = edpData.findIntersectingExcludedAreas(boundaryPolygon)

    if (gcnEdpData && gcnEdpData.features) {
      for (const feature of gcnEdpData.features) {
        if (turf.booleanIntersects(boundaryPolygon, feature)) {
          const name = feature.properties.NAME || 'GCN EDP Area'
          intersections.push({
            type: 'gcn',
            name,
            properties: feature.properties
          })
          if (!gcnIntersection) {
            gcnIntersection = name
          }
        }
      }
    }
    return {
      nutrient: nutrientIntersection,
      gcn: gcnIntersection,
      intersections,
      excludedAreas
    }
  } catch (error) {
    console.error('Error checking EDP intersections:', error)
    return { nutrient: null, gcn: null, intersections: [], excludedAreas: [] }
  }
}

function polygonCoordinatesFromGeoJson(geojson) {
  const fromGeometry = (geometry) => {
    if (!geometry) {
      return []
    }
    if (geometry.type === 'Polygon') {
      return geometry.coordinates[0]
    }
    if (geometry.type === 'MultiPolygon') {
      return geometry.coordinates[0][0]
    }
    return []
  }
  if (geojson.type === 'FeatureCollection') {
    const feature = (geojson.features || [])[0]
    return feature ? fromGeometry(feature.geometry) : []
  }
  if (geojson.type === 'Feature') {
    return fromGeometry(geojson.geometry)
  }
  return fromGeometry(geojson)
}

// ============================================================================
// BOUNDARY CHECK (mirrors the production impact assessor response)
// ============================================================================

function isPosition(value) {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  )
}

/**
 * Validate a GeoJSON Polygon geometry from the client.
 * @returns {string|null} a failure reason, or null when valid
 */
function validatePolygonGeometry(geometry) {
  if (!geometry || geometry.type !== 'Polygon') {
    return 'not_a_polygon'
  }
  if (!Array.isArray(geometry.coordinates) || !geometry.coordinates.length) {
    return 'invalid_geometry'
  }
  const ring = geometry.coordinates[0]
  if (!Array.isArray(ring) || ring.length < 4) {
    return 'too_few_points'
  }
  if (ring.length > MAX_BOUNDARY_POINTS + 1) {
    return 'too_many_points'
  }
  if (!ring.every(isPosition)) {
    return 'invalid_coordinates'
  }
  return null
}

function round(value, decimalPlaces = METADATA_DECIMAL_PLACES) {
  const factor = 10 ** decimalPlaces
  return Math.round(value * factor) / factor
}

/**
 * Area, perimeter, bounds and centre in the shape the map panel expects.
 */
function buildBoundaryMetadata(geometry) {
  const polygon = turf.polygon(geometry.coordinates)
  const areaSquareMetres = turf.area(polygon)
  const kilometres = turf.length(turf.polygonToLine(polygon), {
    units: 'kilometers'
  })
  const [west, south, east, north] = turf.bbox(polygon)
  return {
    area: {
      hectares: round(areaSquareMetres / SQUARE_METRES_PER_HECTARE),
      acres: round(areaSquareMetres / SQUARE_METRES_PER_ACRE)
    },
    perimeter: {
      kilometres: round(kilometres),
      miles: round(kilometres * MILES_PER_KILOMETRE)
    },
    bounds: { bottomLeft: [west, south], topRight: [east, north] },
    centre: turf.centroid(polygon).geometry.coordinates
  }
}

/**
 * Run the EDP check for a Polygon geometry and return the production-shaped
 * payload the map's boundary information panel renders.
 */
function checkBoundary(geometry) {
  const results = checkEDPIntersections(geometry.coordinates[0])
  return {
    boundaryGeometryWgs84: geometry,
    boundaryGeometryOriginal: geometry,
    boundaryMetadata: buildBoundaryMetadata(geometry),
    // Nutrient EDPs only, one entry per plan, as production's panel expects
    intersectingEdps: results.intersections
      .filter((intersection) => intersection.type === 'nutrient')
      .map((intersection) => ({
        id: intersection.id,
        label: intersection.name,
        live: intersection.live
      })),
    intersectingExcludedAreas: results.excludedAreas
  }
}

function polygonFeatureFromCoordinates(coordinates) {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [closeRing(coordinates)] }
  }
}

/**
 * The hidden boundary-data input may hold the production check payload
 * (written by the map's Save and continue button), a GeoJSON Feature or
 * geometry, or the legacy { center, coordinates } shape.
 * @returns {{ center?: number[], coordinates: number[][], boundaryGeojson?: object }|null}
 */
function normaliseBoundaryData(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return null
  }
  if (parsed.boundaryGeometryWgs84) {
    const geometry = parsed.boundaryGeometryWgs84
    const ring = geometry.coordinates && geometry.coordinates[0]
    return {
      center: parsed.boundaryMetadata && parsed.boundaryMetadata.centre,
      coordinates: Array.isArray(ring) ? openRing(ring) : [],
      boundaryGeojson: parsed
    }
  }
  if (parsed.type === 'Feature' || parsed.type === 'Polygon') {
    const ring = polygonCoordinatesFromGeoJson(parsed)
    return { coordinates: openRing(ring) }
  }
  if (Array.isArray(parsed.coordinates)) {
    return { center: parsed.center, coordinates: openRing(parsed.coordinates) }
  }
  return null
}

// ============================================================================
// HOOKS
// ============================================================================

const map = {
  routes(router, journey) {
    const routes = {
      API_BOUNDARY_CHECK: `${journey.basePath}/api/boundary/check`
    }

    router.post(routes.API_BOUNDARY_CHECK, (req, res) => {
      try {
        const geometry = req.body && req.body.geometry
        const failureReason = validatePolygonGeometry(geometry)
        if (failureReason) {
          return res.status(400).json({
            error: 'Draw a valid red line boundary to check it',
            failureReason
          })
        }
        return res.json(checkBoundary(geometry))
      } catch (error) {
        console.error('Boundary check failed:', error)
        return res.status(500).json({
          error: 'An error occurred checking the boundary',
          failureReason: 'server_error'
        })
      }
    })

    return routes
  },

  get(ctx, model) {
    const existing = ctx.data.redlineBoundaryPolygon
    model.existingBoundaryData = ''
    model.existingBoundaryGeojson = ''
    model.existingBoundaryMetadata = ''
    model.hasOsKey = Boolean(process.env.OS_API_KEY)

    if (existing && Array.isArray(existing.coordinates)) {
      const coordinates = openRing(existing.coordinates)
      if (coordinates.length >= 3) {
        const feature = polygonFeatureFromCoordinates(coordinates)
        const storedMetadata =
          existing.boundaryGeojson && existing.boundaryGeojson.boundaryMetadata
        model.existingBoundaryGeojson = JSON.stringify(feature)
        model.existingBoundaryMetadata = JSON.stringify(
          storedMetadata || buildBoundaryMetadata(feature.geometry)
        )
      }
    }
  },

  validate(ctx) {
    const { page } = ctx
    const raw = ctx.body[page.field]
    if (!raw) {
      return { ok: false, error: message(page, 'required') }
    }
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch (error) {
      return { ok: false, error: message(page, 'required') }
    }
    const boundary = normaliseBoundaryData(parsed)
    if (
      !boundary ||
      !Array.isArray(boundary.coordinates) ||
      boundary.coordinates.length < 3 ||
      !boundary.coordinates.every(isPosition)
    ) {
      return { ok: false, error: message(page, 'invalid') }
    }
    if (boundary.coordinates.length > MAX_BOUNDARY_POINTS) {
      return { ok: false, error: message(page, 'tooComplex') }
    }
    return { ok: true, value: boundary }
  },

  process(ctx, boundary) {
    // The server-side check is authoritative even when the client already
    // ran one; the result drives the journey.yaml branching.
    const results = checkEDPIntersections(boundary.coordinates)
    const center =
      boundary.center ||
      turf.centroid(polygonFeatureFromCoordinates(boundary.coordinates))
        .geometry.coordinates
    ctx.data.redlineBoundaryPolygon = {
      center,
      coordinates: boundary.coordinates,
      intersections: { nutrient: results.nutrient, gcn: results.gcn },
      intersectingCatchment: results.nutrient,
      intersectingExcludedAreas: results.excludedAreas,
      boundaryGeojson: boundary.boundaryGeojson || null
    }
    ctx.data.intersectingCatchment = results.nutrient
  }
}

const uploadRedline = {
  process(ctx, file) {
    const { page, data } = ctx
    const name = String(file.originalname || '').toLowerCase()
    const ext = name.slice(name.lastIndexOf('.'))
    // The prototype only parses GeoJSON. Other permitted formats fall back
    // to the production error wording from the page's `errors:` frontmatter.
    if (ext === '.zip') {
      return { error: message(page, 'noShapefile') }
    }
    if (ext === '.shp') {
      return { error: message(page, 'missingFiles') }
    }
    if (ext !== '.geojson' && ext !== '.json') {
      return { error: message(page, 'wrongType') }
    }
    let coordinates
    try {
      coordinates = polygonCoordinatesFromGeoJson(
        JSON.parse(file.buffer.toString('utf8'))
      )
    } catch (error) {
      return { error: message(page, 'wrongType') }
    }
    if (!coordinates || coordinates.length === 0) {
      return { error: message(page, 'wrongType') }
    }
    data.redlineFile = file.originalname
    data.hasRedlineBoundaryFile = true
    data.redlineBoundaryPolygon = { coordinates }
    data.mapReferrer = 'upload-redline'
  }
}

const checkYourAnswers = {
  process(ctx) {
    const suffix = Date.now().toString().slice(-6)
    ctx.data.nrfReference = `NRF-${suffix}`
    ctx.data.levyAmount = ctx.data.levyAmount || '2,500'
  }
}

module.exports = {
  map,
  'upload-redline': uploadRedline,
  'check-your-answers': checkYourAnswers,
  checkEDPIntersections,
  checkBoundary,
  buildBoundaryMetadata
}
