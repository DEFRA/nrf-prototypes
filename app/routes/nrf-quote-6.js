//
// NRF Quote Journey Routes - Get a quote for Nature Restoration Fund levy
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const turf = require('@turf/turf')

const validators = require('../lib/nrf-estimate-3/validators')
const { ROUTES, TEMPLATES } = require('../config/nrf-quote-6/routes')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }
})

// ============================================================================
// EDP DATA
// ============================================================================

let nutrientEdpData = null
let gcnEdpData = null

function loadEdpData() {
  try {
    const nutrientPath = path.join(
      __dirname,
      '../assets/map-layers/catchments_nn_catchments_03_2024.geojson'
    )
    const gcnPath = path.join(
      __dirname,
      '../assets/map-layers/gcn_edp_all_regions.geojson'
    )
    nutrientEdpData = JSON.parse(fs.readFileSync(nutrientPath, 'utf8'))
    gcnEdpData = JSON.parse(fs.readFileSync(gcnPath, 'utf8'))
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
    if (
      closedCoords[0][0] !== closedCoords[closedCoords.length - 1][0] ||
      closedCoords[0][1] !== closedCoords[closedCoords.length - 1][1]
    ) {
      closedCoords.push(closedCoords[0])
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
          intersections.push({ type: 'nutrient', name, properties: feature.properties })
          if (!nutrientIntersection) nutrientIntersection = name
        }
      }
    }
    if (gcnEdpData && gcnEdpData.features) {
      for (const feature of gcnEdpData.features) {
        if (turf.booleanIntersects(boundaryPolygon, feature)) {
          const name = feature.properties.NAME || 'GCN EDP Area'
          intersections.push({ type: 'gcn', name, properties: feature.properties })
          if (!gcnIntersection) gcnIntersection = name
        }
      }
    }
    return { nutrient: nutrientIntersection, gcn: gcnIntersection, intersections }
  } catch (error) {
    console.error('Error checking EDP intersections:', error)
    return { nutrient: null, gcn: null, intersections: [] }
  }
}

// ============================================================================
// API ENDPOINT
// ============================================================================

router.post(ROUTES.API_CHECK_EDP_INTERSECTION, (req, res) => {
  try {
    const { coordinates } = req.body
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 3) {
      return res.status(400).json({ success: false, error: 'Invalid boundary data.' })
    }
    if (coordinates.length > 10000) {
      return res.status(400).json({ success: false, error: 'Too many coordinates.' })
    }
    const valid = coordinates.every(
      (c) => Array.isArray(c) && c.length === 2 && typeof c[0] === 'number' && typeof c[1] === 'number'
    )
    if (!valid) {
      return res.status(400).json({ success: false, error: 'Invalid coordinate format.' })
    }
    return res.json({ success: true, intersections: checkEDPIntersections(coordinates) })
  } catch (error) {
    return res.status(500).json({ success: false, error: 'An error occurred.' })
  }
})

// Catchments GeoJSON pass-through
router.get(ROUTES.CATCHMENTS_GEOJSON, (req, res) => {
  try {
    const catchmentsPath = path.join(
      __dirname,
      '../assets/map-layers/catchments_nn_catchments_03_2024.geojson'
    )
    const data = fs.readFileSync(catchmentsPath, 'utf8')
    res.setHeader('Content-Type', 'application/json')
    res.send(data)
  } catch (error) {
    res.status(500).json({ error: 'Could not load catchments data' })
  }
})

// ============================================================================
// PAGE ROUTES
// ============================================================================

// Start page
router.get(ROUTES.START, (req, res) => {
  res.render(TEMPLATES.START, { data: req.session.data || {} })
})
router.post(ROUTES.START, (req, res) => {
  res.redirect(ROUTES.PLANNING_TYPE)
})

// Planning permission type
router.get(ROUTES.PLANNING_TYPE, (req, res) => {
  res.render(TEMPLATES.PLANNING_TYPE, { data: req.session.data || {} })
})
router.post(ROUTES.PLANNING_TYPE, (req, res) => {
  const planningType = req.body['planning-type']
  if (!planningType) {
    return res.render(TEMPLATES.PLANNING_TYPE, {
      error: 'Select a planning application type to continue',
      data: req.session.data || {}
    })
  }
  req.session.data = req.session.data || {}
  req.session.data.planningType = planningType

  const allowedTypes = ['Full (including any variations)', 'Outline (including any variations)', 'Hybrid (including any variations)']
  if (!allowedTypes.includes(planningType)) {
    return res.redirect(ROUTES.WRONG_PERMISSION)
  }
  res.redirect(ROUTES.HOUSING)
})

// Wrong permission exit page
router.get(ROUTES.WRONG_PERMISSION, (req, res) => {
  res.render(TEMPLATES.WRONG_PERMISSION, { data: req.session.data || {} })
})

// Are you developing housing?
router.get(ROUTES.HOUSING, (req, res) => {
  res.render(TEMPLATES.HOUSING, { data: req.session.data || {} })
})
router.post(ROUTES.HOUSING, (req, res) => {
  const isHousing = req.body['housing']
  if (!isHousing) {
    return res.render(TEMPLATES.HOUSING, {
      error: 'Select yes if you are developing housing',
      data: req.session.data || {}
    })
  }
  req.session.data = req.session.data || {}
  req.session.data.isHousing = isHousing

  if (isHousing === 'No') {
    return res.redirect(ROUTES.NOT_HOUSING)
  }
  res.redirect(ROUTES.UNITS)
})

// Not housing exit page
router.get(ROUTES.NOT_HOUSING, (req, res) => {
  res.render(TEMPLATES.NOT_HOUSING, { data: req.session.data || {} })
})

// How many housing units
router.get(ROUTES.UNITS, (req, res) => {
  const isChange = req.query.change === 'true'
  const navFromSummary = req.query.nav === 'check-your-answers'
  const backLink = (isChange && navFromSummary) ? ROUTES.CHECK_YOUR_ANSWERS : ROUTES.HOUSING
  res.render(TEMPLATES.UNITS, {
    data: req.session.data || {},
    isChange,
    navFromSummary,
    backLink
  })
})
router.post(ROUTES.UNITS, (req, res) => {
  const unitCount = req.body['unit-count']
  const isChange = req.body.isChange === 'true'
  const navFromSummary = req.body.navFromSummary === 'true'

  if (!unitCount || isNaN(unitCount) || parseInt(unitCount, 10) < 1) {
    return res.render(TEMPLATES.UNITS, {
      error: 'Enter the number of housing units to continue',
      data: req.session.data || {},
      isChange,
      navFromSummary,
      backLink: (isChange && navFromSummary) ? ROUTES.CHECK_YOUR_ANSWERS : ROUTES.HOUSING
    })
  }
  req.session.data = req.session.data || {}
  req.session.data.residentialBuildingCount = parseInt(unitCount, 10)

  if (isChange && navFromSummary) {
    return res.redirect(ROUTES.CHECK_YOUR_ANSWERS)
  }
  res.redirect(ROUTES.REDLINE_MAP)
})

// Redline boundary method choice
router.get(ROUTES.REDLINE_MAP, (req, res) => {
  const backLink = ROUTES.UNITS
  res.render(TEMPLATES.REDLINE_MAP, { data: req.session.data || {}, backLink })
})
router.post(ROUTES.REDLINE_MAP, (req, res) => {
  const choice = req.body['has-redline-boundary-file']
  if (!choice) {
    return res.render(TEMPLATES.REDLINE_MAP, {
      error: 'Select if you would like to draw a map or upload a file',
      data: req.session.data || {},
      backLink: ROUTES.UNITS
    })
  }
  req.session.data = req.session.data || {}
  req.session.data.hasRedlineBoundaryFile = choice === 'Upload a file'

  if (choice === 'Upload a file') {
    res.redirect(ROUTES.UPLOAD_REDLINE)
  } else {
    req.session.data.mapReferrer = 'redline-map'
    req.session.data.hasRedlineBoundaryFile = false
    res.redirect(ROUTES.MAP)
  }
})

// Upload redline file
router.get(ROUTES.UPLOAD_REDLINE, (req, res) => {
  res.render(TEMPLATES.UPLOAD_REDLINE, { data: req.session.data || {} })
})
router.post(
  ROUTES.UPLOAD_REDLINE,
  (req, res, next) => {
    upload.single('redline-file')(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.render(TEMPLATES.UPLOAD_REDLINE, {
          error: 'The [file] must be smaller than 2MB',
          data: req.session.data || {}
        })
      } else if (err) {
        return res.render(TEMPLATES.UPLOAD_REDLINE, {
          error: 'There was a problem uploading the file',
          data: req.session.data || {}
        })
      }
      next()
    })
  },
  (req, res) => {
    if (!req.file) {
      return res.render(TEMPLATES.UPLOAD_REDLINE, {
        error: 'Select a file',
        data: req.session.data || {}
      })
    }
    const fileName = req.file.originalname.toLowerCase()
    const ext = fileName.substring(fileName.lastIndexOf('.'))
    const allowedExtensions = ['.shp', '.geojson', '.kml']

    if (!allowedExtensions.includes(ext)) {
      return res.render(TEMPLATES.UPLOAD_REDLINE, {
        error: 'The selected file must be a .geojson file, .kml file or a .shp file',
        data: req.session.data || {}
      })
    }
    if (req.file.size === 0) {
      return res.render(TEMPLATES.UPLOAD_REDLINE, {
        error: 'The selected file is empty',
        data: req.session.data || {}
      })
    }

    let boundaryData = null

    if (ext === '.geojson') {
      try {
        const geojson = JSON.parse(req.file.buffer.toString('utf8'))
        let coordinates = []
        if (geojson.type === 'FeatureCollection' && geojson.features && geojson.features.length > 0) {
          const f = geojson.features[0]
          if (f.geometry && f.geometry.type === 'Polygon') coordinates = f.geometry.coordinates[0]
          else if (f.geometry && f.geometry.type === 'MultiPolygon') coordinates = f.geometry.coordinates[0][0]
        } else if (geojson.type === 'Feature') {
          if (geojson.geometry && geojson.geometry.type === 'Polygon') coordinates = geojson.geometry.coordinates[0]
          else if (geojson.geometry && geojson.geometry.type === 'MultiPolygon') coordinates = geojson.geometry.coordinates[0][0]
        } else if (geojson.type === 'Polygon') {
          coordinates = geojson.coordinates[0]
        } else if (geojson.type === 'MultiPolygon') {
          coordinates = geojson.coordinates[0][0]
        }
        if (coordinates.length === 0) {
          return res.render(TEMPLATES.UPLOAD_REDLINE, {
            error: 'The GeoJSON file does not contain valid polygon coordinates',
            data: req.session.data || {}
          })
        }
        boundaryData = { coordinates }
      } catch (e) {
        return res.render(TEMPLATES.UPLOAD_REDLINE, {
          error: 'The selected file is not a valid GeoJSON file',
          data: req.session.data || {}
        })
      }
    } else {
      return res.render(TEMPLATES.UPLOAD_REDLINE, {
        error: 'Shapefile and KML parsing is not yet supported. Please use GeoJSON format.',
        data: req.session.data || {}
      })
    }

    req.session.data = req.session.data || {}
    req.session.data.redlineFile = req.file.originalname
    req.session.data.hasRedlineBoundaryFile = true
    req.session.data.redlineBoundaryPolygon = boundaryData
    req.session.data.mapReferrer = 'upload-redline'

    req.session.save((err) => {
      if (err) {
        return res.render(TEMPLATES.UPLOAD_REDLINE, {
          error: 'There was a problem processing your file. Please try again.',
          data: req.session.data || {}
        })
      }
      res.redirect(ROUTES.MAP)
    })
  }
)

// Map page
router.get(ROUTES.MAP, (req, res) => {
  const data = req.session.data || {}
  const navFromSummary = req.query.nav === 'check-your-answers'
  const existingBoundaryData = data.redlineBoundaryPolygon
    ? JSON.stringify(data.redlineBoundaryPolygon)
    : ''
  const backLink = data.mapReferrer === 'upload-redline' ? ROUTES.UPLOAD_REDLINE : ROUTES.REDLINE_MAP
  res.render(TEMPLATES.MAP, { data, existingBoundaryData, backLink, navFromSummary })
})
router.post(ROUTES.MAP, (req, res) => {
  const boundaryData = req.body['boundary-data']
  const navFromSummary = req.body.navFromSummary === 'true'
  const backLink = req.session.data?.mapReferrer === 'upload-redline' ? ROUTES.UPLOAD_REDLINE : ROUTES.REDLINE_MAP

  if (!boundaryData) {
    return res.render(TEMPLATES.MAP, {
      error: 'Draw a red line boundary to continue',
      navFromSummary,
      data: req.session.data || {},
      existingBoundaryData: '',
      backLink
    })
  }

  try {
    const parsed = JSON.parse(boundaryData)
    if (!parsed.coordinates || !Array.isArray(parsed.coordinates) || parsed.coordinates.length < 3) {
      return res.render(TEMPLATES.MAP, {
        error: 'Invalid boundary data. Please draw a valid boundary.',
        navFromSummary,
        data: req.session.data || {},
        existingBoundaryData: '',
        backLink
      })
    }
    if (parsed.coordinates.length > 10000) {
      return res.render(TEMPLATES.MAP, {
        error: 'Boundary is too complex. Maximum 10000 points allowed.',
        navFromSummary,
        data: req.session.data || {},
        existingBoundaryData: '',
        backLink
      })
    }

    const intersectionResults = checkEDPIntersections(parsed.coordinates)
    req.session.data = req.session.data || {}
    req.session.data.redlineBoundaryPolygon = {
      center: parsed.center,
      coordinates: parsed.coordinates,
      intersections: { nutrient: intersectionResults.nutrient, gcn: intersectionResults.gcn },
      intersectingCatchment: intersectionResults.nutrient
    }

    if (!intersectionResults.nutrient) {
      return res.redirect(ROUTES.NO_EDP)
    }

    // Check capacity: over 15000 units → no capacity exit
    const units = req.session.data.residentialBuildingCount || 0
    if (units > 15000) {
      return res.redirect(ROUTES.NO_CAPACITY)
    }

    if (navFromSummary) {
      return res.redirect(ROUTES.CHECK_YOUR_ANSWERS)
    }
    res.redirect(ROUTES.ESTIMATE_EMAIL)
  } catch (e) {
    return res.render(TEMPLATES.MAP, {
      error: 'Draw a red line boundary to continue',
      navFromSummary,
      data: req.session.data || {},
      existingBoundaryData: '',
      backLink
    })
  }
})

// No EDP exit
router.get(ROUTES.NO_EDP, (req, res) => {
  res.render(TEMPLATES.NO_EDP, { data: req.session.data || {} })
})

// No capacity exit
router.get(ROUTES.NO_CAPACITY, (req, res) => {
  res.render(TEMPLATES.NO_CAPACITY, { data: req.session.data || {} })
})

// Email entry
router.get(ROUTES.ESTIMATE_EMAIL, (req, res) => {
  const data = req.session.data || {}
  const isChange = req.query.change === 'true'
  const navFromSummary = req.query.nav === 'check-your-answers'
  const defaultBack = data.mapReferrer === 'upload-redline' ? ROUTES.UPLOAD_REDLINE : ROUTES.MAP
  const backLink = (isChange && navFromSummary) ? ROUTES.CHECK_YOUR_ANSWERS : defaultBack
  res.render(TEMPLATES.ESTIMATE_EMAIL, { data, isChange, navFromSummary, backLink })
})
router.post(ROUTES.ESTIMATE_EMAIL, (req, res) => {
  const email = req.body['email']
  const isChange = req.body.isChange === 'true'
  const navFromSummary = req.body.navFromSummary === 'true'
  const data = req.session.data || {}
  const defaultBack = data.mapReferrer === 'upload-redline' ? ROUTES.UPLOAD_REDLINE : ROUTES.MAP
  const backLink = (isChange && navFromSummary) ? ROUTES.CHECK_YOUR_ANSWERS : defaultBack

  const validation = validators.validateEmail(email)
  if (!validation.valid) {
    return res.render(TEMPLATES.ESTIMATE_EMAIL, {
      error: validation.error,
      data,
      isChange,
      navFromSummary,
      backLink
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.estimateEmail = email

  req.session.save((err) => {
    if (err) console.error('Session save error:', err)
    res.redirect(303, ROUTES.CHECK_YOUR_ANSWERS)
  })
})

// Check your answers
router.get(ROUTES.CHECK_YOUR_ANSWERS, (req, res) => {
  const data = req.session.data || {}
  if (!data.estimateEmail) {
    return res.redirect(ROUTES.ESTIMATE_EMAIL)
  }
  res.render(TEMPLATES.CHECK_YOUR_ANSWERS, { data })
})
router.post(ROUTES.CHECK_YOUR_ANSWERS, (req, res) => {
  const suffix = Date.now().toString().slice(-6)
  req.session.data = req.session.data || {}
  req.session.data.nrfReference = 'NRF-' + suffix
  req.session.data.levyAmount = req.session.data.levyAmount || '2,500'
  res.redirect(ROUTES.CONFIRMATION)
})

// Confirmation page
router.get(ROUTES.CONFIRMATION, (req, res) => {
  res.render(TEMPLATES.CONFIRMATION, { data: req.session.data || {} })
})

// Delete quote
router.get(ROUTES.DELETE_QUOTE, (req, res) => {
  res.render(TEMPLATES.DELETE_QUOTE, {
    data: req.session.data || {},
    backLink: ROUTES.CHECK_YOUR_ANSWERS
  })
})
router.post(ROUTES.DELETE_QUOTE, (req, res) => {
  const confirmDelete = req.body['confirm-delete-quote']
  if (confirmDelete === 'Yes') {
    req.session.data = req.session.data || {}
    const keysToRemove = [
      'planningType', 'isHousing', 'residentialBuildingCount',
      'hasRedlineBoundaryFile', 'redlineFile', 'redlineBoundaryPolygon', 'mapReferrer',
      'estimateEmail', 'nrfReference', 'levyAmount', 'intersectingCatchment'
    ]
    keysToRemove.forEach((k) => delete req.session.data[k])
    res.redirect(ROUTES.DELETE_CONFIRMATION)
  } else {
    res.redirect(ROUTES.CHECK_YOUR_ANSWERS)
  }
})

// Delete confirmation
router.get(ROUTES.DELETE_CONFIRMATION, (req, res) => {
  res.render(TEMPLATES.DELETE_CONFIRMATION, { data: req.session.data || {} })
})

// Estimate email content
router.get(ROUTES.ESTIMATE_EMAIL_CONTENT, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.ESTIMATE_EMAIL_CONTENT, { data, backLink: ROUTES.CONFIRMATION })
})

module.exports = router
