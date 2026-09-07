/**
 * Bespoke behaviour for the nrf-quote-7 journey.
 *
 * Everything declarative lives in content/nrf-quote-7. These hooks cover the
 * three things that need real code: the red line boundary map (EDP
 * intersection check), parsing an uploaded GeoJSON file, and minting the
 * NRF reference. All user-facing wording still comes from the page files.
 *
 * Copied, not moved, from app/routes/nrf-quote-6.js so quote-6 is untouched.
 */

const path = require('path')
const fs = require('fs')
const turf = require('@turf/turf')
const { message } = require('../journey-engine/validation')

// ============================================================================
// EDP DATA (loaded once at startup)
// ============================================================================

const MAP_LAYERS = path.join(__dirname, '../../assets/map-layers')
const NUTRIENT_FILE = path.join(
  MAP_LAYERS,
  'catchments_nn_catchments_03_2024.geojson'
)
const GCN_FILE = path.join(MAP_LAYERS, 'gcn_edp_all_regions.geojson')

let nutrientEdpData = null
let gcnEdpData = null

function loadEdpData() {
  try {
    nutrientEdpData = JSON.parse(fs.readFileSync(NUTRIENT_FILE, 'utf8'))
    gcnEdpData = JSON.parse(fs.readFileSync(GCN_FILE, 'utf8'))
  } catch (error) {
    console.error('Error loading EDP data:', error)
  }
}

loadEdpData()

function checkEDPIntersections(coordinates) {
  if (!coordinates || coordinates.length < 3) {
    return { nutrient: null, gcn: null, intersections: [] }
  }
  try {
    const closedCoords = [...coordinates]
    const first = closedCoords[0]
    const last = closedCoords[closedCoords.length - 1]
    if (first[0] !== last[0] || first[1] !== last[1]) {
      closedCoords.push(first)
    }
    const boundaryPolygon = turf.polygon([closedCoords])
    const intersections = []
    let nutrientIntersection = null
    let gcnIntersection = null

    if (nutrientEdpData && nutrientEdpData.features) {
      for (const feature of nutrientEdpData.features) {
        if (turf.booleanIntersects(boundaryPolygon, feature)) {
          const name =
            feature.properties.Label ||
            feature.properties.N2K_Site_N ||
            'Nutrient EDP Area'
          intersections.push({
            type: 'nutrient',
            name,
            properties: feature.properties
          })
          if (!nutrientIntersection) {
            nutrientIntersection = name
          }
        }
      }
    }
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
      intersections
    }
  } catch (error) {
    console.error('Error checking EDP intersections:', error)
    return { nutrient: null, gcn: null, intersections: [] }
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
// HOOKS
// ============================================================================

const map = {
  routes(router, journey) {
    const routes = {
      CATCHMENTS_GEOJSON: `${journey.basePath}/catchments.geojson`,
      API_CHECK_EDP_INTERSECTION: `${journey.basePath}/api/check-edp-intersection`
    }

    router.post(routes.API_CHECK_EDP_INTERSECTION, (req, res) => {
      try {
        const { coordinates } = req.body
        if (
          !coordinates ||
          !Array.isArray(coordinates) ||
          coordinates.length < 3
        ) {
          return res
            .status(400)
            .json({ success: false, error: 'Invalid boundary data.' })
        }
        if (coordinates.length > 10000) {
          return res
            .status(400)
            .json({ success: false, error: 'Too many coordinates.' })
        }
        const valid = coordinates.every(
          (c) =>
            Array.isArray(c) &&
            c.length === 2 &&
            typeof c[0] === 'number' &&
            typeof c[1] === 'number'
        )
        if (!valid) {
          return res
            .status(400)
            .json({ success: false, error: 'Invalid coordinate format.' })
        }
        return res.json({
          success: true,
          intersections: checkEDPIntersections(coordinates)
        })
      } catch (error) {
        return res
          .status(500)
          .json({ success: false, error: 'An error occurred.' })
      }
    })

    router.get(routes.CATCHMENTS_GEOJSON, (req, res) => {
      try {
        res.setHeader('Content-Type', 'application/json')
        res.send(fs.readFileSync(NUTRIENT_FILE, 'utf8'))
      } catch (error) {
        res.status(500).json({ error: 'Could not load catchments data' })
      }
    })

    return routes
  },

  get(ctx, model) {
    model.existingBoundaryData = ctx.data.redlineBoundaryPolygon
      ? JSON.stringify(ctx.data.redlineBoundaryPolygon)
      : ''
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
    if (
      !parsed.coordinates ||
      !Array.isArray(parsed.coordinates) ||
      parsed.coordinates.length < 3
    ) {
      return { ok: false, error: message(page, 'invalid') }
    }
    if (parsed.coordinates.length > 10000) {
      return { ok: false, error: message(page, 'tooComplex') }
    }
    return { ok: true, value: parsed }
  },

  process(ctx, parsed) {
    const results = checkEDPIntersections(parsed.coordinates)
    ctx.data.redlineBoundaryPolygon = {
      center: parsed.center,
      coordinates: parsed.coordinates,
      intersections: { nutrient: results.nutrient, gcn: results.gcn },
      intersectingCatchment: results.nutrient
    }
    ctx.data.intersectingCatchment = results.nutrient
  }
}

const uploadRedline = {
  process(ctx, file) {
    const { page, data } = ctx
    const name = String(file.originalname || '').toLowerCase()
    const ext = name.slice(name.lastIndexOf('.'))
    if (ext !== '.geojson') {
      return { error: message(page, 'unsupportedFormat') }
    }
    let coordinates
    try {
      coordinates = polygonCoordinatesFromGeoJson(
        JSON.parse(file.buffer.toString('utf8'))
      )
    } catch (error) {
      return { error: message(page, 'notGeoJson') }
    }
    if (!coordinates || coordinates.length === 0) {
      return { error: message(page, 'noPolygon') }
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
  checkEDPIntersections
}
