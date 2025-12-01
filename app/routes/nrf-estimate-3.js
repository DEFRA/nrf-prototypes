//
// NRF Estimate Journey Routes - Nature Restoration Fund Levy Estimate (v3)
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const turf = require('@turf/turf')

// Import helpers and validators
const validators = require('../lib/nrf-estimate-3/validators')
const buildingTypeHelpers = require('../lib/nrf-estimate-3/building-type-helpers')
const { ROUTES, TEMPLATES } = require('../config/nrf-estimate-3/routes')
const {
  BUILDING_TYPES,
  BUILDING_TYPE_LABELS,
  BUILDING_TYPE_DATA_KEYS,
  BUILDING_TYPES_REQUIRING_ROOM_COUNT
} = require('../config/shared/building-types')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024
  }
})

// ============================================================================
// EDP DATA LOADING - Load and cache GeoJSON files
// ============================================================================

let nutrientEdpData = null
let gcnEdpData = null

/**
 * Load EDP GeoJSON data into memory
 * Called once at startup for performance
 */
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

    console.log(
      `Loaded ${nutrientEdpData.features.length} nutrient EDP areas and ${gcnEdpData.features.length} GCN EDP areas`
    )
  } catch (error) {
    console.error('Error loading EDP data:', error)
  }
}

// Load data at startup
loadEdpData()

/**
 * Check if a boundary intersects with EDP areas using turf.js
 * @param {Array} coordinates - Polygon coordinates [[lng, lat], ...]
 * @returns {Object} Intersection results with nutrient and GCN data
 */
function checkEDPIntersections(coordinates) {
  if (!coordinates || coordinates.length < 3) {
    return { nutrient: null, gcn: null, intersections: [] }
  }

  try {
    // Create polygon from boundary coordinates
    // Ensure polygon is closed
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

    // Check nutrient EDPs
    if (nutrientEdpData && nutrientEdpData.features) {
      for (const feature of nutrientEdpData.features) {
        if (turf.booleanIntersects(boundaryPolygon, feature)) {
          const name =
            feature.properties.Label ||
            feature.properties.N2K_Site_N ||
            'Nutrient EDP Area'
          intersections.push({
            type: 'nutrient',
            name: name,
            properties: feature.properties
          })
          // Store first nutrient intersection for legacy compatibility
          if (!nutrientIntersection) {
            nutrientIntersection = name
          }
        }
      }
    }

    // Check GCN EDPs
    if (gcnEdpData && gcnEdpData.features) {
      for (const feature of gcnEdpData.features) {
        if (turf.booleanIntersects(boundaryPolygon, feature)) {
          const name = feature.properties.NAME || 'GCN EDP Area'
          intersections.push({
            type: 'gcn',
            name: name,
            properties: feature.properties
          })
          // Store first GCN intersection
          if (!gcnIntersection) {
            gcnIntersection = name
          }
        }
      }
    }

    return {
      nutrient: nutrientIntersection,
      gcn: gcnIntersection,
      intersections: intersections
    }
  } catch (error) {
    console.error('Error checking EDP intersections:', error)
    return { nutrient: null, gcn: null, intersections: [] }
  }
}

// ============================================================================
// API ENDPOINT - Check EDP Intersection
// ============================================================================

/**
 * API endpoint to check if a boundary intersects with EDP areas
 * POST /nrf-estimate-3/api/check-edp-intersection
 * Body: { coordinates: [[lng, lat], ...] }
 * Returns: { success: true, intersections: { nutrient, gcn, intersections: [...] } }
 */
router.post(ROUTES.API_CHECK_EDP_INTERSECTION, (req, res) => {
  try {
    const { coordinates } = req.body

    // Validate input
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 3) {
      return res.status(400).json({
        success: false,
        error:
          'Invalid boundary data. Coordinates must be an array of at least 3 points.'
      })
    }

    // Limit maximum number of coordinates to prevent DoS
    const MAX_COORDINATES = 10000
    if (coordinates.length > MAX_COORDINATES) {
      return res.status(400).json({
        success: false,
        error: `Too many coordinates. Maximum ${MAX_COORDINATES} allowed.`
      })
    }

    // Validate coordinate format
    const validCoordinates = coordinates.every(
      (coord) =>
        Array.isArray(coord) &&
        coord.length === 2 &&
        typeof coord[0] === 'number' &&
        typeof coord[1] === 'number'
    )

    if (!validCoordinates) {
      return res.status(400).json({
        success: false,
        error:
          'Invalid coordinate format. Each coordinate must be [longitude, latitude].'
      })
    }

    // Check intersections using turf.js
    const result = checkEDPIntersections(coordinates)

    // Return results
    return res.json({
      success: true,
      intersections: result
    })
  } catch (error) {
    console.error('Error in API check-edp-intersection:', error.message)
    return res.status(500).json({
      success: false,
      error: 'An error occurred while checking the boundary. Please try again.'
    })
  }
})

// ============================================================================
// PAGE ROUTES
// ============================================================================

// Start page
router.get(ROUTES.START, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.START, { data: data })
})

// Handle start page submission
router.post(ROUTES.START, (req, res) => {
  res.redirect(ROUTES.WHAT_WOULD_YOU_LIKE_TO_DO)
})

// What would you like to do page
router.get(ROUTES.WHAT_WOULD_YOU_LIKE_TO_DO, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.WHAT_WOULD_YOU_LIKE_TO_DO, { data: data })
})

// Handle what would you like to do
router.post(ROUTES.WHAT_WOULD_YOU_LIKE_TO_DO, (req, res) => {
  const journeyType = req.body['journey-type']

  if (!journeyType) {
    return res.render(TEMPLATES.WHAT_WOULD_YOU_LIKE_TO_DO, {
      error: 'Select what you would like to do',
      data: req.session.data || {}
    })
  }

  // Store in session
  req.session.data = req.session.data || {}
  req.session.data.journeyType = journeyType

  // Route based on journey type
  if (journeyType === 'estimate') {
    res.redirect(ROUTES.REDLINE_MAP)
  } else if (journeyType === 'payment') {
    res.redirect(ROUTES.DO_YOU_HAVE_A_COMMITMENT_REF)
  } else if (journeyType === 'commit') {
    res.redirect(ROUTES.DO_YOU_HAVE_AN_ESTIMATE_REF)
  } else {
    res.redirect(ROUTES.REDLINE_MAP)
  }
})

// Redline boundary file question
router.get(ROUTES.REDLINE_MAP, (req, res) => {
  const data = req.session.data || {}
  const backLink = ROUTES.WHAT_WOULD_YOU_LIKE_TO_DO
  res.render(TEMPLATES.REDLINE_MAP, { data: data, backLink: backLink })
})

// Handle redline boundary file question
router.post(ROUTES.REDLINE_MAP, (req, res) => {
  const hasRedlineBoundaryFile = req.body['has-redline-boundary-file']

  if (!hasRedlineBoundaryFile) {
    return res.render(TEMPLATES.REDLINE_MAP, {
      error: 'Select if you would like to draw a map or upload a file',
      data: req.session.data || {},
      backLink: ROUTES.WHAT_WOULD_YOU_LIKE_TO_DO
    })
  }

  // Store in session
  req.session.data = req.session.data || {}
  req.session.data.hasRedlineBoundaryFile =
    hasRedlineBoundaryFile === 'Upload a file'

  if (hasRedlineBoundaryFile === 'Upload a file') {
    res.redirect(ROUTES.UPLOAD_REDLINE)
  } else {
    req.session.data.mapReferrer = 'redline-map'
    req.session.data.hasRedlineBoundaryFile = false
    res.redirect(ROUTES.MAP)
  }
})

// Upload redline boundary file
router.get(ROUTES.UPLOAD_REDLINE, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.UPLOAD_REDLINE, { data: data })
})

// Handle redline file upload
router.post(
  ROUTES.UPLOAD_REDLINE,
  (req, res, next) => {
    upload.single('redline-file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.render(TEMPLATES.UPLOAD_REDLINE, {
            error: 'The [file] must be smaller than 2MB',
            data: req.session.data || {}
          })
        }
        return res.render(TEMPLATES.UPLOAD_REDLINE, {
          error: 'There was a problem uploading the file',
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

    const uploadedFile = req.file
    const allowedTypes = ['.shp', '.geojson']
    const fileName = uploadedFile.originalname.toLowerCase()
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'))

    if (!allowedTypes.includes(fileExtension)) {
      return res.render(TEMPLATES.UPLOAD_REDLINE, {
        error: 'The selected file must be a .shp or .geojson file',
        data: req.session.data || {}
      })
    }

    if (uploadedFile.size === 0) {
      return res.render(TEMPLATES.UPLOAD_REDLINE, {
        error: 'The selected file is empty',
        data: req.session.data || {}
      })
    }

    let boundaryData = null

    if (fileExtension === '.geojson') {
      try {
        const fileContent = uploadedFile.buffer.toString('utf8')
        const geojson = JSON.parse(fileContent)
        let coordinates = []

        if (
          geojson.type === 'FeatureCollection' &&
          geojson.features &&
          geojson.features.length > 0
        ) {
          const firstFeature = geojson.features[0]
          if (
            firstFeature.geometry &&
            firstFeature.geometry.type === 'Polygon'
          ) {
            coordinates = firstFeature.geometry.coordinates[0]
          } else if (
            firstFeature.geometry &&
            firstFeature.geometry.type === 'MultiPolygon'
          ) {
            coordinates = firstFeature.geometry.coordinates[0][0]
          }
        } else if (geojson.type === 'Feature') {
          if (geojson.geometry && geojson.geometry.type === 'Polygon') {
            coordinates = geojson.geometry.coordinates[0]
          } else if (
            geojson.geometry &&
            geojson.geometry.type === 'MultiPolygon'
          ) {
            coordinates = geojson.geometry.coordinates[0][0]
          }
        } else if (geojson.type === 'Polygon') {
          coordinates = geojson.coordinates[0]
        } else if (geojson.type === 'MultiPolygon') {
          coordinates = geojson.coordinates[0][0]
        }

        if (coordinates.length === 0) {
          return res.render(TEMPLATES.UPLOAD_REDLINE, {
            error:
              'The GeoJSON file does not contain valid polygon coordinates',
            data: req.session.data || {}
          })
        }

        boundaryData = {
          coordinates: coordinates
        }
      } catch (error) {
        console.error('Error parsing GeoJSON:', error)
        return res.render(TEMPLATES.UPLOAD_REDLINE, {
          error: 'The selected file is not a valid GeoJSON file',
          data: req.session.data || {}
        })
      }
    } else if (fileExtension === '.shp') {
      return res.render(TEMPLATES.UPLOAD_REDLINE, {
        error:
          'Shapefile parsing is not yet supported. Please use GeoJSON format.',
        data: req.session.data || {}
      })
    }

    req.session.data = req.session.data || {}
    req.session.data.redlineFile = uploadedFile.originalname
    req.session.data.hasRedlineBoundaryFile = true
    req.session.data.redlineBoundaryPolygon = boundaryData
    req.session.data.mapReferrer = 'upload-redline'

    req.session.save((err) => {
      if (err) {
        console.error('Error saving session:', err)
        return res.render(TEMPLATES.UPLOAD_REDLINE, {
          error: 'There was a problem processing your file. Please try again.',
          data: req.session.data || {}
        })
      }
      res.redirect(ROUTES.MAP)
    })
  }
)

// Draw polygon on map
router.get(ROUTES.MAP, (req, res) => {
  const data = req.session.data || {}
  const navFromSummary = req.query.nav === 'summary'

  const existingBoundaryData = data.redlineBoundaryPolygon
    ? JSON.stringify(data.redlineBoundaryPolygon)
    : ''

  let backLink = ROUTES.REDLINE_MAP
  if (data.mapReferrer === 'upload-redline') {
    backLink = ROUTES.UPLOAD_REDLINE
  }

  res.render(TEMPLATES.MAP, {
    data: data,
    existingBoundaryData: existingBoundaryData,
    backLink: backLink,
    navFromSummary: navFromSummary
  })
})

// Handle map polygon submission
router.post(ROUTES.MAP, (req, res) => {
  const boundaryData = req.body['boundary-data']
  const navFromSummary = req.body.navFromSummary === 'true'

  if (!boundaryData) {
    return res.render(TEMPLATES.MAP, {
      error: 'Draw a red line boundary to continue',
      navFromSummary: navFromSummary,
      data: req.session.data || {},
      existingBoundaryData: '',
      backLink:
        req.session.data?.mapReferrer === 'upload-redline'
          ? ROUTES.UPLOAD_REDLINE
          : ROUTES.REDLINE_MAP
    })
  }

  try {
    const parsedData = JSON.parse(boundaryData)

    // Validate coordinates to prevent client-side tampering
    if (
      !parsedData.coordinates ||
      !Array.isArray(parsedData.coordinates) ||
      parsedData.coordinates.length < 3
    ) {
      return res.render(TEMPLATES.MAP, {
        error: 'Invalid boundary data. Please draw a valid boundary.',
        navFromSummary: navFromSummary,
        data: req.session.data || {},
        existingBoundaryData: '',
        backLink:
          req.session.data?.mapReferrer === 'upload-redline'
            ? ROUTES.UPLOAD_REDLINE
            : ROUTES.REDLINE_MAP
      })
    }

    // Limit maximum number of coordinates
    const MAX_COORDINATES = 10000
    if (parsedData.coordinates.length > MAX_COORDINATES) {
      return res.render(TEMPLATES.MAP, {
        error: `Boundary is too complex. Maximum ${MAX_COORDINATES} points allowed.`,
        navFromSummary: navFromSummary,
        data: req.session.data || {},
        existingBoundaryData: '',
        backLink:
          req.session.data?.mapReferrer === 'upload-redline'
            ? ROUTES.UPLOAD_REDLINE
            : ROUTES.REDLINE_MAP
      })
    }

    // Check EDP intersections using turf.js
    const intersectionResults = checkEDPIntersections(parsedData.coordinates)

    req.session.data = req.session.data || {}
    req.session.data.redlineBoundaryPolygon = {
      center: parsedData.center,
      coordinates: parsedData.coordinates,
      // Store new intersection structure
      intersections: {
        nutrient: intersectionResults.nutrient,
        gcn: intersectionResults.gcn
      },
      // Keep legacy field for backward compatibility
      intersectingCatchment: intersectionResults.nutrient
    }

    // Current behavior: redirect to NO_EDP if no nutrient intersection
    if (!intersectionResults.nutrient) {
      res.redirect(ROUTES.NO_EDP)
    } else if (navFromSummary) {
      res.redirect(ROUTES.SUMMARY)
    } else {
      res.redirect(ROUTES.BUILDING_TYPE)
    }
  } catch (error) {
    console.error('Error parsing boundary data:', error)
    return res.render(TEMPLATES.MAP, {
      error: 'Draw a red line boundary to continue',
      navFromSummary: navFromSummary,
      data: req.session.data || {},
      existingBoundaryData: '',
      backLink:
        req.session.data?.mapReferrer === 'upload-redline'
          ? ROUTES.UPLOAD_REDLINE
          : ROUTES.REDLINE_MAP
    })
  }
})

// No EDP area page
router.get(ROUTES.NO_EDP, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.NO_EDP, { data: data })
})

// Building type selection
router.get(ROUTES.BUILDING_TYPE, (req, res) => {
  const data = req.session.data || {}
  const isChange = req.query.change === 'true'
  const navFromSummary = req.query.nav === 'summary'

  res.render(TEMPLATES.BUILDING_TYPE, {
    data: data,
    isChange: isChange,
    navFromSummary: navFromSummary
  })
})

// Handle building type selection
router.post(ROUTES.BUILDING_TYPE, (req, res) => {
  const buildingTypes = req.body['building-types']
  const isChange = req.body.isChange === 'true'
  const navFromSummary = req.body.navFromSummary === 'true'

  if (!buildingTypes || buildingTypes === '_unchecked') {
    return res.render(TEMPLATES.BUILDING_TYPE, {
      error: 'Select a building type to continue',
      data: req.session.data || {},
      isChange: isChange,
      navFromSummary: navFromSummary
    })
  }

  if (!req.session.data) {
    req.session.data = {}
  }
  const previousBuildingTypes = req.session.data.buildingTypes || []

  const buildingTypesArray =
    buildingTypeHelpers.normalizeBuildingTypes(buildingTypes)
  req.session.data.buildingTypes = buildingTypesArray

  if (isChange && navFromSummary) {
    const roomCountTypes = BUILDING_TYPES_REQUIRING_ROOM_COUNT
    const residentialType = BUILDING_TYPES.DWELLINGHOUSE

    if (!req.session.data.roomCounts) {
      req.session.data.roomCounts = {}
    }

    const removedTypes = buildingTypeHelpers.getRemovedBuildingTypes(
      previousBuildingTypes,
      buildingTypesArray
    )
    removedTypes.forEach((type) => {
      if (type === BUILDING_TYPES.DWELLINGHOUSE) {
        delete req.session.data.residentialBuildingCount
      } else if (type === BUILDING_TYPES.HOTEL) {
        delete req.session.data.roomCounts.hotelCount
      } else if (type === BUILDING_TYPES.HMO) {
        delete req.session.data.roomCounts.hmoCount
      } else if (type === BUILDING_TYPES.RESIDENTIAL_INSTITUTION) {
        delete req.session.data.roomCounts.residentialInstitutionCount
      }
    })

    const hasChanges =
      JSON.stringify(previousBuildingTypes.sort()) !==
      JSON.stringify(buildingTypesArray.sort())

    if (!hasChanges) {
      res.redirect(ROUTES.SUMMARY)
      return
    }

    const newlyAddedTypes = buildingTypeHelpers.getNewlyAddedBuildingTypes(
      previousBuildingTypes,
      buildingTypesArray
    )
    const newlyAddedRoomCountTypes = newlyAddedTypes.filter((type) =>
      roomCountTypes.includes(type)
    )
    const newlyAddedResidentialType = newlyAddedTypes.includes(residentialType)

    const needsRoomCount = newlyAddedRoomCountTypes.length > 0
    const needsResidentialCount = newlyAddedResidentialType

    if (needsRoomCount || needsResidentialCount) {
      if (needsResidentialCount) {
        res.redirect(`${ROUTES.RESIDENTIAL}?change=true&nav=summary`)
        return
      } else if (needsRoomCount) {
        req.session.data.roomCountTypes = newlyAddedRoomCountTypes
        req.session.data.currentRoomCountIndex = 0
        res.redirect(`${ROUTES.ROOM_COUNT}?change=true&nav=summary`)
        return
      }
    }

    res.redirect(ROUTES.SUMMARY)
    return
  }

  if (isChange) {
    res.redirect(ROUTES.SUMMARY)
    return
  }

  if (buildingTypesArray.includes(BUILDING_TYPES.NON_RESIDENTIAL)) {
    res.redirect(ROUTES.NON_RESIDENTIAL)
  } else {
    const hasRoomCountTypes = buildingTypesArray.some((type) =>
      BUILDING_TYPES_REQUIRING_ROOM_COUNT.includes(type)
    )

    if (hasRoomCountTypes) {
      req.session.data.roomCountTypes = buildingTypesArray.filter((type) =>
        BUILDING_TYPES_REQUIRING_ROOM_COUNT.includes(type)
      )
      req.session.data.currentRoomCountIndex = 0
      res.redirect(ROUTES.ROOM_COUNT)
    } else if (buildingTypesArray.includes(BUILDING_TYPES.DWELLINGHOUSE)) {
      res.redirect(ROUTES.RESIDENTIAL)
    } else {
      res.redirect(ROUTES.ESTIMATE_EMAIL)
    }
  }
})

// Non-residential development page
router.get(ROUTES.NON_RESIDENTIAL, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.NON_RESIDENTIAL, { data: data })
})

// Room count page (for Hotel, HMO, Residential institution)
router.get(ROUTES.ROOM_COUNT, (req, res) => {
  const data = req.session.data || {}
  const isChange = req.query.change === 'true'
  const navFromSummary = req.query.nav === 'summary'
  const error = req.query.error
  const buildingType = req.query.type

  if (isChange && navFromSummary && buildingType) {
    const displayName = BUILDING_TYPE_LABELS[buildingType] || null

    if (displayName) {
      return res.render(TEMPLATES.ROOM_COUNT, {
        buildingType: displayName,
        currentIndex: 0,
        totalCount: 1,
        data: data,
        isChange: isChange,
        navFromSummary: navFromSummary,
        error: error,
        buildingTypeKey: buildingType
      })
    }
  }

  const roomCountTypes = data.roomCountTypes || []
  const currentIndex = data.currentRoomCountIndex || 0

  if (currentIndex >= roomCountTypes.length) {
    if (isChange && navFromSummary) {
      res.redirect(ROUTES.SUMMARY)
    } else if (isChange) {
      res.redirect(ROUTES.SUMMARY)
    } else if (
      data.buildingTypes &&
      data.buildingTypes.includes('Dwellinghouse')
    ) {
      res.redirect(ROUTES.RESIDENTIAL)
    } else {
      res.redirect(ROUTES.ESTIMATE_EMAIL)
    }
    return
  }

  const currentBuildingType = roomCountTypes[currentIndex]
  res.render(TEMPLATES.ROOM_COUNT, {
    buildingType: currentBuildingType,
    currentIndex: currentIndex,
    totalCount: roomCountTypes.length,
    data: data,
    isChange: isChange,
    navFromSummary: navFromSummary,
    error: error
  })
})

// Handle room count submission
router.post(ROUTES.ROOM_COUNT, (req, res) => {
  const data = req.session.data || {}
  const isChange = req.body.isChange === 'true'
  const navFromSummary = req.body.navFromSummary === 'true'
  const buildingType = req.body.buildingType

  let roomCount = req.body['room-count']

  if (!roomCount || isNaN(roomCount) || roomCount < 1) {
    let redirectUrl = ROUTES.ROOM_COUNT + '?'
    if (isChange) redirectUrl += 'change=true&'
    if (navFromSummary) redirectUrl += 'nav=summary&'
    if (buildingType) redirectUrl += `type=${buildingType}&`
    redirectUrl = redirectUrl.replace(/&$/, '')

    return res.redirect(
      redirectUrl + '&error=Enter the number of rooms to continue'
    )
  }

  req.session.data = req.session.data || {}
  if (!req.session.data.roomCounts) {
    req.session.data.roomCounts = {}
  }

  if (isChange && navFromSummary && buildingType) {
    const dataKey = BUILDING_TYPE_DATA_KEYS[buildingType] || null

    if (dataKey) {
      req.session.data.roomCounts[dataKey] = parseInt(roomCount)
    }

    return res.redirect(ROUTES.SUMMARY)
  }

  const roomCountTypes = data.roomCountTypes || []
  const currentIndex = data.currentRoomCountIndex || 0
  const currentBuildingType = roomCountTypes[currentIndex]

  const typeMapping = {
    Hotel: 'hotelCount',
    'House of multiple occupation (HMO)': 'hmoCount',
    'Residential institution': 'residentialInstitutionCount'
  }

  const dataKey = typeMapping[currentBuildingType]
  if (dataKey) {
    req.session.data.roomCounts[dataKey] = parseInt(roomCount)
  }

  req.session.data.currentRoomCountIndex = currentIndex + 1

  if (isChange && navFromSummary && currentIndex + 1 >= roomCountTypes.length) {
    res.redirect(ROUTES.SUMMARY)
    return
  }

  if (currentIndex + 1 >= roomCountTypes.length) {
    if (isChange) {
      res.redirect(ROUTES.SUMMARY)
    } else if (
      data.buildingTypes &&
      data.buildingTypes.includes('Dwellinghouse')
    ) {
      res.redirect(ROUTES.RESIDENTIAL)
    } else {
      res.redirect(ROUTES.ESTIMATE_EMAIL)
    }
  } else {
    res.redirect(ROUTES.ROOM_COUNT)
  }
})

// Residential building count
router.get(ROUTES.RESIDENTIAL, (req, res) => {
  const data = req.session.data || {}
  const isChange = req.query.change === 'true'
  const navFromSummary = req.query.nav === 'summary'

  res.render(TEMPLATES.RESIDENTIAL, {
    data: data,
    isChange: isChange,
    navFromSummary: navFromSummary
  })
})

// Handle residential building count
router.post(ROUTES.RESIDENTIAL, (req, res) => {
  const residentialBuildingCount = req.body['residential-building-count']
  const isChange = req.body.isChange === 'true'
  const navFromSummary = req.body.navFromSummary === 'true'

  if (
    !residentialBuildingCount ||
    isNaN(residentialBuildingCount) ||
    residentialBuildingCount < 1
  ) {
    return res.render(TEMPLATES.RESIDENTIAL, {
      error: 'Enter the number of dwelling buildings to continue',
      data: req.session.data || {},
      isChange: isChange,
      navFromSummary: navFromSummary
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.residentialBuildingCount = parseInt(residentialBuildingCount)

  if (isChange && navFromSummary) {
    res.redirect(ROUTES.SUMMARY)
    return
  } else if (isChange) {
    res.redirect(ROUTES.SUMMARY)
    return
  }

  res.redirect(ROUTES.ESTIMATE_EMAIL)
})

// Email entry
router.get(ROUTES.ESTIMATE_EMAIL, (req, res) => {
  const data = req.session.data || {}
  const isChange = req.query.change === 'true'
  const navFromSummary = req.query.nav === 'summary'

  let backLink = ROUTES.BUILDING_TYPE
  if (data.buildingTypes) {
    if (data.buildingTypes.includes('Dwellinghouse')) {
      backLink = ROUTES.RESIDENTIAL
    } else if (data.roomCountTypes && data.roomCountTypes.length > 0) {
      backLink = ROUTES.ROOM_COUNT
    } else {
      backLink = ROUTES.BUILDING_TYPE
    }
  }

  res.render(TEMPLATES.ESTIMATE_EMAIL, {
    data: data,
    isChange: isChange,
    navFromSummary: navFromSummary,
    backLink: backLink
  })
})

// Handle email submission
router.post(ROUTES.ESTIMATE_EMAIL, (req, res) => {
  const email = req.body['email']
  const isChange = req.body.isChange === 'true'
  const navFromSummary = req.body.navFromSummary === 'true'
  const data = req.session.data || {}

  let backLink = ROUTES.BUILDING_TYPE
  if (data.buildingTypes) {
    if (data.buildingTypes.includes('Dwellinghouse')) {
      backLink = ROUTES.RESIDENTIAL
    } else if (data.roomCountTypes && data.roomCountTypes.length > 0) {
      backLink = ROUTES.ROOM_COUNT
    } else {
      backLink = ROUTES.BUILDING_TYPE
    }
  }

  const validation = validators.validateEmail(email)
  if (!validation.valid) {
    return res.render(TEMPLATES.EMAIL, {
      error: validation.error,
      data: data,
      isChange: isChange,
      navFromSummary: navFromSummary,
      backLink: backLink
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.email = email

  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err)
    }
    res.redirect(303, ROUTES.SUMMARY)
  })
})

// Summary page
router.get(ROUTES.SUMMARY, (req, res) => {
  const data = req.session.data || {}

  if (!data.email) {
    return res.redirect(ROUTES.ESTIMATE_EMAIL)
  }

  res.render(TEMPLATES.SUMMARY, {
    data: data,
    buildingTypeLabels: BUILDING_TYPE_LABELS
  })
})

// Handle summary submission
router.post(ROUTES.SUMMARY, (req, res) => {
  const estimateReference = 'EST-' + Date.now().toString().slice(-6)

  req.session.data = req.session.data || {}
  req.session.data.estimateReference = estimateReference

  res.redirect(ROUTES.CONFIRMATION)
})

// Confirmation page
router.get(ROUTES.CONFIRMATION, (req, res) => {
  const data = req.session.data || {}

  res.render(TEMPLATES.CONFIRMATION, {
    data: data
  })
})

// Serve GeoJSON catchment data
router.get(ROUTES.CATCHMENTS_GEOJSON, (req, res) => {
  try {
    const geojsonPath = path.join(
      __dirname,
      '../assets/map-layers/catchments_nn_catchments_03_2024.geojson'
    )

    if (!fs.existsSync(geojsonPath)) {
      console.error('GeoJSON file not found at:', geojsonPath)
      return res.status(404).json({ error: 'Catchment data not found' })
    }

    const geojsonData = fs.readFileSync(geojsonPath, 'utf8')

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.send(geojsonData)
  } catch (error) {
    console.error('Error serving GeoJSON:', error)
    res.status(500).json({ error: 'Failed to load catchment data' })
  }
})

// Estimate email content page
router.get(ROUTES.ESTIMATE_EMAIL_CONTENT, (req, res) => {
  const data = req.session.data || {}

  if (!data.estimateReference) {
    return res.redirect(ROUTES.SUMMARY)
  }

  res.render(TEMPLATES.ESTIMATE_EMAIL_CONTENT, {
    data: data
  })
})

// ============================================
// Payment Journey Routes
// ============================================

// Do you have a commitment reference?
router.get(ROUTES.DO_YOU_HAVE_A_COMMITMENT_REF, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.DO_YOU_HAVE_A_COMMITMENT_REF, {
    data: data,
    backLink: ROUTES.WHAT_WOULD_YOU_LIKE_TO_DO
  })
})

router.post(ROUTES.DO_YOU_HAVE_A_COMMITMENT_REF, (req, res) => {
  const hasCommitmentRef = req.body['has-commitment-ref']

  if (!hasCommitmentRef) {
    return res.render(TEMPLATES.DO_YOU_HAVE_A_COMMITMENT_REF, {
      error: 'Select whether you have a commitment reference',
      data: req.session.data || {},
      backLink: ROUTES.WHAT_WOULD_YOU_LIKE_TO_DO
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.hasCommitmentRef = hasCommitmentRef

  if (hasCommitmentRef === 'yes') {
    res.redirect(ROUTES.ENTER_COMMITMENT_REF)
  } else {
    res.redirect(ROUTES.RETRIEVE_COMMITMENT_EMAIL)
  }
})

// Enter your commitment reference
router.get(ROUTES.ENTER_COMMITMENT_REF, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.ENTER_COMMITMENT_REF, {
    data: data,
    backLink: ROUTES.DO_YOU_HAVE_A_COMMITMENT_REF
  })
})

router.post(ROUTES.ENTER_COMMITMENT_REF, (req, res) => {
  const commitmentRef = req.body['commitment-ref']

  if (!commitmentRef || commitmentRef.trim() === '') {
    return res.render(TEMPLATES.ENTER_COMMITMENT_REF, {
      error: 'Enter your commitment reference to continue',
      data: req.session.data || {},
      backLink: ROUTES.DO_YOU_HAVE_A_COMMITMENT_REF
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.commitmentRef = commitmentRef

  res.redirect(ROUTES.RETRIEVE_COMMITMENT_EMAIL)
})

// Retrieve commitment email
router.get(ROUTES.RETRIEVE_COMMITMENT_EMAIL, (req, res) => {
  const data = req.session.data || {}

  let backLink = ROUTES.DO_YOU_HAVE_A_COMMITMENT_REF
  if (data.hasCommitmentRef === 'yes' && data.commitmentRef) {
    backLink = ROUTES.ENTER_COMMITMENT_REF
  }

  res.render(TEMPLATES.RETRIEVE_COMMITMENT_EMAIL, {
    data: data,
    backLink: backLink
  })
})

router.post(ROUTES.RETRIEVE_COMMITMENT_EMAIL, (req, res) => {
  const commitmentRetrievalEmail = req.body['commitment-retrieval-email']
  const data = req.session.data || {}

  let backLink = ROUTES.DO_YOU_HAVE_A_COMMITMENT_REF
  if (data.hasCommitmentRef === 'yes' && data.commitmentRef) {
    backLink = ROUTES.ENTER_COMMITMENT_REF
  }

  const validation = validators.validateEmail(commitmentRetrievalEmail)
  if (!validation.valid) {
    return res.render(TEMPLATES.RETRIEVE_COMMITMENT_EMAIL, {
      error: validation.error,
      data: data,
      backLink: backLink
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.commitmentRetrievalEmail = commitmentRetrievalEmail

  res.redirect(ROUTES.COMMITMENT_EMAIL_RETRIEVAL_CONTENT)
})

// Commitment email retrieval content
router.get(ROUTES.COMMITMENT_EMAIL_RETRIEVAL_CONTENT, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.COMMITMENT_EMAIL_RETRIEVAL_CONTENT, {
    data: data,
    backLink: ROUTES.RETRIEVE_COMMITMENT_EMAIL
  })
})

// Commit summary (check your answers)
router.get(ROUTES.COMMIT_SUMMARY, (req, res) => {
  const data = req.session.data || {}

  if (!data.commitmentRef && !data.commitmentRetrievalEmail) {
    return res.redirect(ROUTES.DO_YOU_HAVE_A_COMMITMENT_REF)
  }

  res.render(TEMPLATES.COMMIT_SUMMARY, {
    data: data,
    buildingTypeLabels: BUILDING_TYPE_LABELS,
    backLink: data.commitmentRef
      ? ROUTES.ENTER_COMMITMENT_REF
      : ROUTES.COMMITMENT_EMAIL_RETRIEVAL_CONTENT
  })
})

router.post(ROUTES.COMMIT_SUMMARY, (req, res) => {
  res.redirect(ROUTES.PLANNING_REF)
})

// Planning reference entry
router.get(ROUTES.PLANNING_REF, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.PLANNING_REF, {
    data: data,
    backLink: ROUTES.COMMIT_SUMMARY
  })
})

router.post(ROUTES.PLANNING_REF, (req, res) => {
  const planningRef = req.body['planning-ref']

  if (!planningRef || planningRef.trim() === '') {
    return res.render(TEMPLATES.PLANNING_REF, {
      error: 'Enter the planning application reference',
      data: req.session.data || {},
      backLink: ROUTES.COMMIT_SUMMARY
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.planningRef = planningRef

  res.redirect(ROUTES.COMMIT_SUMMARY_SUBMIT)
})

// Commit summary submit (final check before submission)
router.get(ROUTES.COMMIT_SUMMARY_SUBMIT, (req, res) => {
  const data = req.session.data || {}

  if (!data.planningRef) {
    return res.redirect(ROUTES.PLANNING_REF)
  }

  res.render(TEMPLATES.COMMIT_SUMMARY_SUBMIT, {
    data: data,
    buildingTypeLabels: BUILDING_TYPE_LABELS,
    backLink: ROUTES.PLANNING_REF
  })
})

router.post(ROUTES.COMMIT_SUMMARY_SUBMIT, (req, res) => {
  const paymentReference = 'NRF-' + Date.now().toString().slice(-6)

  req.session.data = req.session.data || {}
  req.session.data.paymentReference = paymentReference
  req.session.data.levyAmount = req.session.data.levyAmount || '2,500'

  res.redirect(ROUTES.PAYMENT_CONFIRMATION)
})

// Payment confirmation page
router.get(ROUTES.PAYMENT_CONFIRMATION, (req, res) => {
  const data = req.session.data || {}

  if (!data.paymentReference) {
    return res.redirect(ROUTES.COMMIT_SUMMARY_SUBMIT)
  }

  res.render(TEMPLATES.PAYMENT_CONFIRMATION, {
    data: data
  })
})

// Invoice email content page
router.get(ROUTES.INVOICE_EMAIL_CONTENT, (req, res) => {
  const data = req.session.data || {}

  if (!data.paymentReference) {
    return res.redirect(ROUTES.PAYMENT_CONFIRMATION)
  }

  res.render(TEMPLATES.INVOICE_EMAIL_CONTENT, {
    data: data
  })
})

// ============================================
// Commit Journey Routes
// ============================================

// Do you have an estimate reference?
router.get(ROUTES.DO_YOU_HAVE_AN_ESTIMATE_REF, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.DO_YOU_HAVE_AN_ESTIMATE_REF, {
    data: data,
    backLink: ROUTES.WHAT_WOULD_YOU_LIKE_TO_DO
  })
})

router.post(ROUTES.DO_YOU_HAVE_AN_ESTIMATE_REF, (req, res) => {
  const hasEstimateReference = req.body['has-estimate-reference']

  if (!hasEstimateReference) {
    return res.render(TEMPLATES.DO_YOU_HAVE_AN_ESTIMATE_REF, {
      error: 'Select yes if you have an estimate reference',
      data: req.session.data || {},
      backLink: ROUTES.WHAT_WOULD_YOU_LIKE_TO_DO
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.hasEstimateReference = hasEstimateReference

  if (hasEstimateReference === 'yes') {
    res.redirect(ROUTES.ENTER_ESTIMATE_REF)
  } else {
    res.redirect(ROUTES.RETRIEVE_ESTIMATE_EMAIL)
  }
})

// Enter your estimate reference
router.get(ROUTES.ENTER_ESTIMATE_REF, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.ENTER_ESTIMATE_REF, {
    data: data,
    backLink: ROUTES.DO_YOU_HAVE_AN_ESTIMATE_REF
  })
})

router.post(ROUTES.ENTER_ESTIMATE_REF, (req, res) => {
  const estimateReference = req.body['estimate-reference']

  if (!estimateReference || estimateReference.trim() === '') {
    return res.render(TEMPLATES.ENTER_ESTIMATE_REF, {
      error: 'Enter your estimate reference to continue',
      data: req.session.data || {},
      backLink: ROUTES.DO_YOU_HAVE_AN_ESTIMATE_REF
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.estimateReference = estimateReference

  res.redirect(ROUTES.RETRIEVE_ESTIMATE_EMAIL)
})

// Retrieve estimate email
router.get(ROUTES.RETRIEVE_ESTIMATE_EMAIL, (req, res) => {
  const data = req.session.data || {}

  let backLink = ROUTES.DO_YOU_HAVE_AN_ESTIMATE_REF
  if (data.hasEstimateReference === 'yes' && data.estimateReference) {
    backLink = ROUTES.ENTER_ESTIMATE_REF
  }

  res.render(TEMPLATES.RETRIEVE_ESTIMATE_EMAIL, {
    data: data,
    backLink: backLink
  })
})

router.post(ROUTES.RETRIEVE_ESTIMATE_EMAIL, (req, res) => {
  const email = req.body['email']
  const data = req.session.data || {}

  let backLink = ROUTES.DO_YOU_HAVE_AN_ESTIMATE_REF
  if (data.hasEstimateReference === 'yes' && data.estimateReference) {
    backLink = ROUTES.ENTER_ESTIMATE_REF
  }

  const validation = validators.validateEmail(email)
  if (!validation.valid) {
    return res.render(TEMPLATES.RETRIEVE_ESTIMATE_EMAIL, {
      error: validation.error,
      data: data,
      backLink: backLink
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.email = email

  res.redirect(ROUTES.ESTIMATE_EMAIL_RETRIEVAL_CONTENT)
})

// Estimate email retrieval content
router.get(ROUTES.ESTIMATE_EMAIL_RETRIEVAL_CONTENT, (req, res) => {
  const data = req.session.data || {}

  let backLink = ROUTES.DO_YOU_HAVE_AN_ESTIMATE_REF
  if (data.hasEstimateReference === 'yes' && data.estimateReference) {
    backLink = ROUTES.ENTER_ESTIMATE_REF
  } else {
    backLink = ROUTES.RETRIEVE_ESTIMATE_EMAIL
  }

  res.render(TEMPLATES.ESTIMATE_EMAIL_RETRIEVAL_CONTENT, {
    data: data,
    backLink: backLink
  })
})

// Retrieved estimate summary
router.get(ROUTES.RETRIEVED_ESTIMATE_SUMMARY, (req, res) => {
  const data = req.session.data || {}

  if (!data.email) {
    return res.redirect(ROUTES.RETRIEVE_ESTIMATE_EMAIL)
  }

  res.render(TEMPLATES.RETRIEVED_ESTIMATE_SUMMARY, {
    data: data,
    buildingTypeLabels: BUILDING_TYPE_LABELS
  })
})

router.post(ROUTES.RETRIEVED_ESTIMATE_SUMMARY, (req, res) => {
  res.redirect(ROUTES.COMPANY_DETAILS)
})

// Company details
router.get(ROUTES.COMPANY_DETAILS, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.COMPANY_DETAILS, {
    data: data,
    errors: [],
    errorsByField: {}
  })
})

router.post(ROUTES.COMPANY_DETAILS, (req, res) => {
  const fullName = req.body.fullName
  const businessName = req.body.businessName
  const addressLine1 = req.body.addressLine1
  const addressLine2 = req.body.addressLine2
  const townOrCity = req.body.townOrCity
  const county = req.body.county
  const postcode = req.body.postcode
  const companyRegistrationNumber = req.body.companyRegistrationNumber
  const vatRegistrationNumber = req.body.vatRegistrationNumber

  const errors = []

  if (!fullName || fullName.trim() === '') {
    errors.push({ field: 'fullName', message: 'Enter your full name' })
  }

  if (!addressLine1 || addressLine1.trim() === '') {
    errors.push({ field: 'addressLine1', message: 'Enter address line 1' })
  }

  if (!townOrCity || townOrCity.trim() === '') {
    errors.push({ field: 'townOrCity', message: 'Enter a town or city' })
  }

  if (!postcode || postcode.trim() === '') {
    errors.push({ field: 'postcode', message: 'Enter a postcode' })
  }

  if (errors.length > 0) {
    const errorsByField = {}
    errors.forEach((error) => {
      errorsByField[error.field] = error
    })
    return res.render(TEMPLATES.COMPANY_DETAILS, {
      errors: errors,
      errorsByField: errorsByField,
      data: req.session.data || {}
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.fullName = fullName
  req.session.data.businessName = businessName || ''
  req.session.data.addressLine1 = addressLine1
  req.session.data.addressLine2 = addressLine2 || ''
  req.session.data.townOrCity = townOrCity
  req.session.data.county = county || ''
  req.session.data.postcode = postcode
  req.session.data.companyRegistrationNumber = companyRegistrationNumber || ''
  req.session.data.vatRegistrationNumber = vatRegistrationNumber || ''

  res.redirect(ROUTES.LPA_CONFIRM)
})

// LPA confirm
router.get(ROUTES.LPA_CONFIRM, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.LPA_CONFIRM, {
    data: data
  })
})

router.post(ROUTES.LPA_CONFIRM, (req, res) => {
  req.session.data = req.session.data || {}
  req.session.data.lpaName = 'Stockton-on-Tees Borough Council'
  res.redirect(ROUTES.SUMMARY_AND_DECLARATION)
})

// Summary and declaration
router.get(ROUTES.SUMMARY_AND_DECLARATION, (req, res) => {
  const data = req.session.data || {}

  if (!data.fullName) {
    return res.redirect(ROUTES.COMPANY_DETAILS)
  }

  res.render(TEMPLATES.SUMMARY_AND_DECLARATION, {
    data: data,
    buildingTypeLabels: BUILDING_TYPE_LABELS
  })
})

router.post(ROUTES.SUMMARY_AND_DECLARATION, (req, res) => {
  const commitmentReference = 'COM-' + Date.now().toString().slice(-6)

  req.session.data = req.session.data || {}
  req.session.data.commitmentReference = commitmentReference
  req.session.data.levyAmount = req.session.data.levyAmount || '2,500'
  req.session.data.lpaEmail = req.session.data.lpaEmail || 'lpa@example.com'

  res.redirect(ROUTES.CONFIRMATION)
})

// Commit email content page
router.get(ROUTES.COMMIT_EMAIL_CONTENT, (req, res) => {
  const data = req.session.data || {}

  if (!data.commitmentReference) {
    return res.redirect(ROUTES.CONFIRMATION)
  }

  res.render(TEMPLATES.COMMIT_EMAIL_CONTENT, {
    data: data
  })
})

module.exports = router
