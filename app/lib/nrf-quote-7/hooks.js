/**
 * Bespoke behaviour for the nrf-quote-7 journey.
 *
 * Everything declarative lives in content/nrf-quote-7. These hooks cover the
 * things that need real code: the red line boundary map (EDP intersection
 * check), plotting an uploaded file, the file preview page that follows it,
 * and minting the NRL reference. All user-facing
 * wording still comes from the page files.
 *
 * The map page uses the production map component (@defra/interactive-map,
 * see app/views/layouts/interactive-map.html). Its boundary check API and
 * response shape mirror the production frontend so the client glue under
 * app/assets/javascripts/interactive-map/ stays diffable against production.
 */

const turf = require('@turf/turf')
const { message } = require('../journey-engine/validation')
const edpData = require('../map/edp-data')

// ============================================================================
// EDP DATA (loaded once at startup)
// ============================================================================

// Nutrient EDPs (dissolved catchments) and excluded areas come from the shared
// app/lib/map/edp-data.js. Like production, only nutrient EDPs are checked.

const MAX_BOUNDARY_POINTS = 10000
const SQUARE_METRES_PER_HECTARE = 10000
const SQUARE_METRES_PER_ACRE = 4046.8564224
const MILES_PER_KILOMETRE = 0.621371
// Production shows four decimal places in the boundary information panel
const METADATA_DECIMAL_PLACES = 4

function loadEdpData() {
  try {
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
 * @returns {{ nutrient: string|null, intersections: Array, excludedAreas: Array }}
 */
function checkEDPIntersections(coordinates) {
  if (!coordinates || coordinates.length < 3) {
    return { nutrient: null, intersections: [], excludedAreas: [] }
  }
  try {
    const boundaryPolygon = turf.polygon([closeRing(coordinates)])
    const intersections = []
    let nutrientIntersection = null

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

    return {
      nutrient: nutrientIntersection,
      intersections,
      excludedAreas
    }
  } catch (error) {
    console.error('Error checking EDP intersections:', error)
    return { nutrient: null, intersections: [], excludedAreas: [] }
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
    // Nutrient EDPs only, one entry per plan, as production's panel expects.
    // The file preview page also shows how much of the boundary each EDP
    // covers, like production's impact assessor response.
    intersectingEdps: results.intersections
      .filter((intersection) => intersection.type === 'nutrient')
      .map((intersection) => ({
        id: intersection.id,
        label: intersection.name,
        live: intersection.live,
        ...edpOverlap(geometry, intersection.id)
      })),
    intersectingExcludedAreas: results.excludedAreas
  }
}

/**
 * Area of the boundary inside one EDP, in hectares and as a share of the
 * boundary: { overlap_area_ha, overlap_percentage }, or {} when it cannot
 * be worked out.
 */
function edpOverlap(geometry, edpId) {
  try {
    const edp = edpData.getEdps().find((item) => item.id === edpId)
    if (!edp) {
      return {}
    }
    const boundary = turf.polygon(geometry.coordinates)
    const overlap = turf.intersect(
      turf.featureCollection([boundary, turf.feature(edp.geometry)])
    )
    if (!overlap) {
      return {}
    }
    const boundaryArea = turf.area(boundary)
    const overlapArea = turf.area(overlap)
    return {
      overlap_area_ha: round(overlapArea / SQUARE_METRES_PER_HECTARE),
      overlap_percentage: boundaryArea
        ? Math.round((overlapArea / boundaryArea) * 100)
        : 0
    }
  } catch (error) {
    console.error('EDP overlap calculation failed:', error)
    return {}
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
// UPLOADED FILES
// ============================================================================

// The prototype does not check uploaded files. Whatever was uploaded, the
// user sees the spinner and then the preview. A GeoJSON polygon inside an
// EDP is plotted as uploaded; anything else (another format, a polygon
// outside every EDP, an unreadable file) stands in with this sample boundary
// inside the live Broads/Wensum EDP, so the preview always has something to
// show. The error states of the preview page are preview variants in
// journey.yaml, for the screen wall only.
const SAMPLE_BOUNDARY_RING = [
  [1.162, 52.6845],
  [1.165, 52.6845],
  [1.165, 52.6875],
  [1.162, 52.6875],
  [1.162, 52.6845]
]

function firstGeometry(geojson) {
  if (!geojson || typeof geojson !== 'object') {
    return null
  }
  if (geojson.type === 'FeatureCollection') {
    const feature = (geojson.features || [])[0]
    return feature ? feature.geometry || null : null
  }
  if (geojson.type === 'Feature') {
    return geojson.geometry || null
  }
  return geojson.type ? geojson : null
}

const SAMPLE_BOUNDARY = {
  type: 'Polygon',
  coordinates: [SAMPLE_BOUNDARY_RING]
}

/**
 * The polygon to plot for an uploaded file: the file's own first polygon
 * when it is GeoJSON with one that falls in an EDP, else the sample
 * boundary. Returns the geometry with its check result.
 */
function uploadedBoundary(file) {
  const geometry = uploadedGeometry(file)
  const result = checkBoundary(geometry)
  if (result.intersectingEdps.length) {
    return { geometry, boundaryGeojson: result }
  }
  return {
    geometry: SAMPLE_BOUNDARY,
    boundaryGeojson: checkBoundary(SAMPLE_BOUNDARY)
  }
}

function uploadedGeometry(file) {
  try {
    const geometry = firstGeometry(JSON.parse(file.buffer.toString('utf8')))
    const ring =
      geometry && geometry.type === 'Polygon'
        ? geometry.coordinates[0]
        : geometry && geometry.type === 'MultiPolygon'
          ? geometry.coordinates[0][0]
          : null
    if (Array.isArray(ring) && ring.length >= 4 && ring.every(isPosition)) {
      return { type: 'Polygon', coordinates: [closeRing(ring)] }
    }
  } catch (error) {
    // Not GeoJSON (a KML or zipped shapefile, say): use the sample
  }
  return SAMPLE_BOUNDARY
}

/**
 * Remember a checked boundary in the session in the shape every later page
 * reads (journey.yaml branches on `redlineBoundaryPolygon.intersections`).
 */
function storeBoundary(data, geometry, boundaryGeojson) {
  const coordinates = openRing(geometry.coordinates[0])
  const results = checkEDPIntersections(coordinates)
  data.redlineBoundaryPolygon = {
    center:
      (boundaryGeojson && boundaryGeojson.boundaryMetadata.centre) ||
      turf.centroid(polygonFeatureFromCoordinates(coordinates)).geometry
        .coordinates,
    coordinates,
    geometry,
    intersections: { nutrient: results.nutrient },
    intersectingCatchment: results.nutrient,
    intersectingExcludedAreas: results.excludedAreas,
    boundaryGeojson: boundaryGeojson || null
  }
  data.intersectingCatchment = results.nutrient
}

/**
 * The stored boundary as a Polygon geometry, whichever shape the session
 * (or the preview sample data) holds it in.
 */
function storedGeometry(polygon) {
  if (!polygon) {
    return null
  }
  if (polygon.geometry && polygon.geometry.type === 'Polygon') {
    return polygon.geometry
  }
  if (Array.isArray(polygon.coordinates) && polygon.coordinates.length >= 3) {
    return polygonFeatureFromCoordinates(openRing(polygon.coordinates)).geometry
  }
  return null
}

function safeMetadata(geometry) {
  try {
    return buildBoundaryMetadata(geometry)
  } catch (error) {
    return null
  }
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
    const geometry = polygonFeatureFromCoordinates(
      boundary.coordinates
    ).geometry
    storeBoundary(ctx.data, geometry, boundary.boundaryGeojson || null)
    delete ctx.data.boundaryFailureReason
  }
}

const uploadRedline = {
  process(ctx, file) {
    const { data } = ctx
    data.redlineFile = file.originalname
    data.hasRedlineBoundaryFile = true
    data.mapReferrer = 'upload-redline'
    delete data.boundaryFailureReason
    const { geometry, boundaryGeojson } = uploadedBoundary(file)
    storeBoundary(data, geometry, boundaryGeojson)
  }
}

// "Checking your file": production polls the uploader here and moves on when
// the check is done. The prototype checks nothing, so the page just shows
// the spinner for a moment and then continues.
const checkingFile = {
  get(ctx, model) {
    model.continueUrl = ctx.journey.byId.get('file-preview').path
    model.refreshSeconds = 3
  }
}

// "Your uploaded red line boundary file": the boundary drawn on a read-only
// map with the EDPs it falls in. Every upload reaches this page (see
// uploadedBoundary); the error states only ever come from the preview
// variants in journey.yaml (boundaryFailureReason is never set by an
// upload).
const filePreview = {
  load(ctx) {
    const { data, journey, preview } = ctx
    if (preview) {
      return undefined
    }
    if (data.boundaryFailureReason) {
      return undefined
    }
    const polygon = data.redlineBoundaryPolygon
    if (!polygon || !storedGeometry(polygon)) {
      return { redirect: journey.byId.get('upload-redline').path }
    }
    return undefined
  },

  get(ctx, model) {
    const { data, journey, page } = ctx
    const failureReason = data.boundaryFailureReason || null
    const geometry = storedGeometry(data.redlineBoundaryPolygon)
    const stored =
      data.redlineBoundaryPolygon && data.redlineBoundaryPolygon.boundaryGeojson
    // The preview sample data carries a shape but no check result, so run
    // the check now for a valid boundary
    const boundaryGeojson =
      stored || (geometry && !failureReason ? checkBoundary(geometry) : null)

    model.boundaryError = failureReason ? message(page, failureReason) : null
    model.intersectingEdps =
      !failureReason && boundaryGeojson ? boundaryGeojson.intersectingEdps : []
    model.showMap = Boolean(geometry)
    model.existingBoundaryGeojson = geometry
      ? JSON.stringify({ type: 'Feature', properties: {}, geometry })
      : ''
    model.existingBoundaryMetadata = geometry
      ? JSON.stringify(
          (boundaryGeojson && boundaryGeojson.boundaryMetadata) ||
            safeMetadata(geometry)
        )
      : ''
    model.hasOsKey = Boolean(process.env.OS_API_KEY)
    model.boundaryTypePath = journey.byId.get('redline-map').path
  },

  validate() {
    return { ok: true, value: null }
  },

  process(ctx) {
    const { data, journey } = ctx
    // Nothing to save: the upload hook already stored the boundary. A stray
    // submit while the file is invalid starts the boundary step again.
    if (data.boundaryFailureReason || !data.redlineBoundaryPolygon) {
      return { redirect: journey.byId.get('redline-map').path }
    }
    return undefined
  }
}

const checkYourAnswers = {
  process(ctx) {
    const suffix = Date.now().toString().slice(-6)
    ctx.data.nrfReference = `NRL-${suffix}`
    ctx.data.levyAmount = ctx.data.levyAmount || '2,500'
  }
}

module.exports = {
  map,
  'upload-redline': uploadRedline,
  'checking-file': checkingFile,
  'file-preview': filePreview,
  'check-your-answers': checkYourAnswers,
  checkEDPIntersections,
  checkBoundary,
  buildBoundaryMetadata
}
