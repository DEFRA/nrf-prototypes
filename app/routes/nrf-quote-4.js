//
// NRF Quote Journey Routes - Nature Restoration Fund Levy Quote (v4)
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
const { ROUTES, TEMPLATES } = require('../config/nrf-quote-4/routes')
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
// EDP DATA LOADING - Load and cache GeoJSON files (reused from nrf-estimate-3)
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

    console.log(
      `Loaded ${nutrientEdpData.features.length} nutrient EDP areas and ${gcnEdpData.features.length} GCN EDP areas`
    )
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
          intersections.push({
            type: 'nutrient',
            name: name,
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
          const name =
            feature.properties.Label ||
            feature.properties.N2K_Site_N ||
            'GCN EDP Area'
          intersections.push({
            type: 'gcn',
            name: name,
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

router.post(ROUTES.API_CHECK_EDP_INTERSECTION, (req, res) => {
  try {
    const { coordinates } = req.body

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 3) {
      return res.status(400).json({
        success: false,
        error:
          'Invalid boundary data. Coordinates must be an array of at least 3 points.'
      })
    }

    const MAX_COORDINATES = 10000
    if (coordinates.length > MAX_COORDINATES) {
      return res.status(400).json({
        success: false,
        error: `Too many coordinates. Maximum ${MAX_COORDINATES} allowed.`
      })
    }

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

    const result = checkEDPIntersections(coordinates)

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

router.get(ROUTES.START, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.START, { data: data })
})

router.post(ROUTES.START, (req, res) => {
  res.redirect(ROUTES.WHAT_WOULD_YOU_LIKE_TO_DO)
})

router.get(ROUTES.WHAT_WOULD_YOU_LIKE_TO_DO, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.WHAT_WOULD_YOU_LIKE_TO_DO, { data: data })
})

router.post(ROUTES.WHAT_WOULD_YOU_LIKE_TO_DO, (req, res) => {
  const journeyType = req.body['journey-type']

  if (!journeyType) {
    return res.render(TEMPLATES.WHAT_WOULD_YOU_LIKE_TO_DO, {
      error: 'Select what you would like to do',
      data: req.session.data || {}
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.journeyType = journeyType

  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err)
    }
    if (journeyType === 'quote') {
      res.redirect(ROUTES.REDLINE_MAP)
    } else if (journeyType === 'commit') {
      res.redirect(ROUTES.DO_YOU_HAVE_A_NRF_REF)
    } else if (journeyType === 'payment') {
      res.redirect(ROUTES.PAY_HOW_WOULD_YOU_LIKE_TO_SIGN_IN)
    } else {
      res.redirect(ROUTES.REDLINE_MAP)
    }
  })
})

router.get(ROUTES.REDLINE_MAP, (req, res) => {
  const data = req.session.data || {}
  const backLink = ROUTES.WHAT_WOULD_YOU_LIKE_TO_DO
  res.render(TEMPLATES.REDLINE_MAP, { data: data, backLink: backLink })
})

router.post(ROUTES.REDLINE_MAP, (req, res) => {
  const hasRedlineBoundaryFile = req.body['has-redline-boundary-file']

  if (!hasRedlineBoundaryFile) {
    return res.render(TEMPLATES.REDLINE_MAP, {
      error: 'Select if you would like to draw a map or upload a file',
      data: req.session.data || {},
      backLink: ROUTES.WHAT_WOULD_YOU_LIKE_TO_DO
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.hasRedlineBoundaryFile =
    hasRedlineBoundaryFile === 'Upload a file'

  if (hasRedlineBoundaryFile === 'Upload a file') {
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err)
      }
      res.redirect(ROUTES.UPLOAD_REDLINE)
    })
  } else {
    req.session.data.mapReferrer = 'redline-map'
    req.session.data.hasRedlineBoundaryFile = false
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err)
      }
      res.redirect(ROUTES.MAP)
    })
  }
})

router.get(ROUTES.UPLOAD_REDLINE, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.UPLOAD_REDLINE, { data: data })
})

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
          'Shapefile upload is not yet supported. Please use a GeoJSON file.',
        data: req.session.data || {}
      })
    }

    if (!boundaryData || !boundaryData.coordinates) {
      return res.render(TEMPLATES.UPLOAD_REDLINE, {
        error: 'Could not extract boundary data from the file',
        data: req.session.data || {}
      })
    }

    const intersectionResults = checkEDPIntersections(boundaryData.coordinates)

    req.session.data = req.session.data || {}
    req.session.data.redlineBoundaryPolygon = {
      coordinates: boundaryData.coordinates,
      intersectingCatchment:
        intersectionResults.nutrient || intersectionResults.gcn || null,
      intersections: intersectionResults.intersections
    }
    req.session.data.mapReferrer = 'upload-redline'

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err)
      }
      if (!intersectionResults.nutrient && !intersectionResults.gcn) {
        res.redirect(ROUTES.NO_EDP)
      } else {
        res.redirect(ROUTES.BUILDING_TYPE)
      }
    })
  }
)

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
    navFromSummary: navFromSummary,
    backLink: backLink
  })
})

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

    const intersectionResults = checkEDPIntersections(parsedData.coordinates)

    req.session.data = req.session.data || {}
    req.session.data.redlineBoundaryPolygon = {
      coordinates: parsedData.coordinates,
      intersectingCatchment:
        intersectionResults.nutrient || intersectionResults.gcn || null,
      intersections: intersectionResults.intersections
    }

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err)
      }
      if (navFromSummary) {
        res.redirect(ROUTES.SUMMARY)
      } else if (!intersectionResults.nutrient && !intersectionResults.gcn) {
        res.redirect(ROUTES.NO_EDP)
      } else {
        res.redirect(ROUTES.BUILDING_TYPE)
      }
    })
  } catch (error) {
    console.error('Error processing boundary data:', error)
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
})

router.get(ROUTES.NO_EDP, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.NO_EDP, { data: data })
})

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
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err)
        }
        res.redirect(ROUTES.SUMMARY)
      })
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
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err)
          }
          res.redirect(`${ROUTES.RESIDENTIAL}?change=true&nav=summary`)
        })
        return
      } else if (needsRoomCount) {
        req.session.data.roomCountTypes = newlyAddedRoomCountTypes
        req.session.data.currentRoomCountIndex = 0
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err)
          }
          res.redirect(`${ROUTES.ROOM_COUNT}?change=true&nav=summary`)
        })
        return
      }
    }

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err)
      }
      res.redirect(ROUTES.SUMMARY)
    })
    return
  }

  if (isChange) {
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err)
      }
      res.redirect(ROUTES.SUMMARY)
    })
    return
  }

  if (buildingTypesArray.includes(BUILDING_TYPES.NON_RESIDENTIAL)) {
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err)
      }
      res.redirect(ROUTES.NON_RESIDENTIAL)
    })
  } else {
    const hasRoomCountTypes = buildingTypesArray.some((type) =>
      BUILDING_TYPES_REQUIRING_ROOM_COUNT.includes(type)
    )

    if (hasRoomCountTypes) {
      req.session.data.roomCountTypes = buildingTypesArray.filter((type) =>
        BUILDING_TYPES_REQUIRING_ROOM_COUNT.includes(type)
      )
      req.session.data.currentRoomCountIndex = 0
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err)
        }
        res.redirect(ROUTES.ROOM_COUNT)
      })
    } else if (buildingTypesArray.includes(BUILDING_TYPES.DWELLINGHOUSE)) {
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err)
        }
        res.redirect(ROUTES.RESIDENTIAL)
      })
    } else {
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err)
        }
        res.redirect(ROUTES.ESTIMATE_EMAIL)
      })
    }
  }
})

router.get(ROUTES.NON_RESIDENTIAL, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.NON_RESIDENTIAL, { data: data })
})

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

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err)
      }
      res.redirect(ROUTES.SUMMARY)
    })
    return
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
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err)
      }
      res.redirect(ROUTES.SUMMARY)
    })
    return
  }

  if (currentIndex + 1 >= roomCountTypes.length) {
    if (isChange) {
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err)
        }
        res.redirect(ROUTES.SUMMARY)
      })
    } else if (
      data.buildingTypes &&
      data.buildingTypes.includes('Dwellinghouse')
    ) {
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err)
        }
        res.redirect(ROUTES.RESIDENTIAL)
      })
    } else {
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err)
        }
        res.redirect(ROUTES.ESTIMATE_EMAIL)
      })
    }
  } else {
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err)
      }
      res.redirect(ROUTES.ROOM_COUNT)
    })
  }
})

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

  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err)
    }
    if (isChange && navFromSummary) {
      res.redirect(ROUTES.SUMMARY)
    } else if (isChange) {
      res.redirect(ROUTES.SUMMARY)
    } else {
      res.redirect(ROUTES.ESTIMATE_EMAIL)
    }
  })
})

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
    return res.render(TEMPLATES.ESTIMATE_EMAIL, {
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

router.post(ROUTES.SUMMARY, (req, res) => {
  const nrfReference = 'NRF-' + Date.now().toString().slice(-6)

  req.session.data = req.session.data || {}
  req.session.data.nrfReference = nrfReference
  req.session.data.levyAmount = req.session.data.levyAmount || '2,500'

  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err)
    }
    res.redirect(ROUTES.QUOTE_CONFIRMATION)
  })
})

router.get(ROUTES.QUOTE_CONFIRMATION, (req, res) => {
  const data = req.session.data || {}

  res.render(TEMPLATES.QUOTE_CONFIRMATION, {
    data: data
  })
})

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

router.get(ROUTES.ESTIMATE_EMAIL_CONTENT, (req, res) => {
  const data = req.session.data || {}

  if (!data.nrfReference) {
    return res.redirect(ROUTES.SUMMARY)
  }

  res.render(TEMPLATES.ESTIMATE_EMAIL_CONTENT, {
    data: data,
    backLink: ROUTES.QUOTE_CONFIRMATION
  })
})

// ============================================================================
// Commit journey routes
// ============================================================================

router.get(ROUTES.DO_YOU_HAVE_A_NRF_REF, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.DO_YOU_HAVE_A_NRF_REF, {
    data: data
  })
})

router.post(ROUTES.DO_YOU_HAVE_A_NRF_REF, (req, res) => {
  const hasNrfReference = req.body['has-nrf-reference']

  if (!hasNrfReference) {
    return res.render(TEMPLATES.DO_YOU_HAVE_A_NRF_REF, {
      error: 'Select yes if you have an NRF reference',
      data: req.session.data || {}
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.hasNrfReference = hasNrfReference

  if (hasNrfReference === 'yes') {
    res.redirect(ROUTES.ENTER_ESTIMATE_REF)
  } else {
    res.redirect(ROUTES.WHAT_WOULD_YOU_LIKE_TO_DO)
  }
})

router.get(ROUTES.ENTER_ESTIMATE_REF, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.ENTER_ESTIMATE_REF, {
    data: data,
    backLink: ROUTES.DO_YOU_HAVE_A_NRF_REF
  })
})

router.post(ROUTES.ENTER_ESTIMATE_REF, (req, res) => {
  const nrfReference = req.body['nrf-reference']?.trim()

  if (!nrfReference) {
    return res.render(TEMPLATES.ENTER_ESTIMATE_REF, {
      error: 'Enter your NRF reference to continue',
      data: req.session.data || {},
      backLink: ROUTES.DO_YOU_HAVE_A_NRF_REF
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.nrfReference = nrfReference

  res.redirect(ROUTES.RETRIEVE_ESTIMATE_EMAIL)
})

router.get(ROUTES.RETRIEVE_ESTIMATE_EMAIL, (req, res) => {
  const data = req.session.data || {}

  let backLink = ROUTES.DO_YOU_HAVE_A_NRF_REF
  if (data.hasNrfReference === 'yes' && data.nrfReference) {
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

  let backLink = ROUTES.DO_YOU_HAVE_A_NRF_REF
  if (data.hasNrfReference === 'yes' && data.nrfReference) {
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

router.get(ROUTES.ESTIMATE_EMAIL_RETRIEVAL_CONTENT, (req, res) => {
  const data = req.session.data || {}

  let backLink = ROUTES.DO_YOU_HAVE_A_NRF_REF
  if (data.hasNrfReference === 'yes' && data.nrfReference) {
    backLink = ROUTES.ENTER_ESTIMATE_REF
  } else {
    backLink = ROUTES.RETRIEVE_ESTIMATE_EMAIL
  }

  res.render(TEMPLATES.ESTIMATE_EMAIL_RETRIEVAL_CONTENT, {
    data: data,
    backLink: backLink
  })
})

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
  res.redirect(ROUTES.COMMIT_HOW_WOULD_YOU_LIKE_TO_SIGN_IN)
})

router.get(ROUTES.COMMIT_HOW_WOULD_YOU_LIKE_TO_SIGN_IN, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.COMMIT_HOW_WOULD_YOU_LIKE_TO_SIGN_IN, {
    data: data
  })
})

router.post(ROUTES.COMMIT_HOW_WOULD_YOU_LIKE_TO_SIGN_IN, (req, res) => {
  const option = req.body['sign-in-option']

  if (!option) {
    return res.render(TEMPLATES.COMMIT_HOW_WOULD_YOU_LIKE_TO_SIGN_IN, {
      error:
        'Select if you want to log in with One Login or Government Gateway',
      data: req.session.data || {}
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.signInOption = option

  if (option === 'government-gateway') {
    res.redirect(ROUTES.COMMIT_SIGN_IN_GOVERNMENT_GATEWAY)
    return
  }

  res.redirect(ROUTES.COMPANY_DETAILS)
})

router.get(ROUTES.COMMIT_SIGN_IN_GOVERNMENT_GATEWAY, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.COMMIT_SIGN_IN_GOVERNMENT_GATEWAY, {
    data: data,
    errors: [],
    errorsByField: {},
    backLink: ROUTES.COMMIT_HOW_WOULD_YOU_LIKE_TO_SIGN_IN
  })
})

router.post(ROUTES.COMMIT_SIGN_IN_GOVERNMENT_GATEWAY, (req, res) => {
  const userId = req.body.userId
  const password = req.body.password
  const data = req.session.data || {}

  const errors = []
  const errorsByField = {}

  if (!userId || userId.trim() === '') {
    const message = 'Enter your Government Gateway user ID'
    errors.push({ text: message, href: '#user-id' })
    errorsByField.userId = { text: message }
  }

  if (!password || password.trim() === '') {
    const message = 'Enter your password'
    errors.push({ text: message, href: '#password' })
    errorsByField.password = { text: message }
  }

  if (errors.length > 0) {
    return res.render(TEMPLATES.COMMIT_SIGN_IN_GOVERNMENT_GATEWAY, {
      data: data,
      errors: errors,
      errorsByField: errorsByField,
      backLink: ROUTES.COMMIT_HOW_WOULD_YOU_LIKE_TO_SIGN_IN
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.governmentGatewayUserId = userId

  res.redirect(ROUTES.COMPANY_DETAILS)
})

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
  const purchaseOrderNumber = req.body.purchaseOrderNumber

  const sessionData = req.session.data || {}
  const formData = {
    ...sessionData,
    fullName,
    businessName,
    addressLine1,
    addressLine2,
    townOrCity,
    county,
    postcode,
    companyRegistrationNumber,
    vatRegistrationNumber,
    purchaseOrderNumber
  }

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
      errorsByField[error.field] = { text: error.message }
    })
    return res.render(TEMPLATES.COMPANY_DETAILS, {
      errors: errors,
      errorsByField: errorsByField,
      data: formData
    })
  }

  req.session.data = formData
  req.session.data.fullName = fullName
  req.session.data.businessName = businessName || ''
  req.session.data.addressLine1 = addressLine1
  req.session.data.addressLine2 = addressLine2 || ''
  req.session.data.townOrCity = townOrCity
  req.session.data.county = county || ''
  req.session.data.postcode = postcode
  req.session.data.companyRegistrationNumber = companyRegistrationNumber || ''
  req.session.data.vatRegistrationNumber = vatRegistrationNumber || ''
  req.session.data.purchaseOrderNumber = purchaseOrderNumber || ''

  res.redirect(ROUTES.LPA_CONFIRM)
})

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

  res.redirect(ROUTES.COMMIT_CONFIRMATION)
})

router.get(ROUTES.COMMIT_CONFIRMATION, (req, res) => {
  const data = req.session.data || {}

  res.render(TEMPLATES.COMMIT_CONFIRMATION, {
    data: data
  })
})

router.get(ROUTES.COMMIT_EMAIL_CONTENT, (req, res) => {
  const data = req.session.data || {}

  if (!data.commitmentReference) {
    return res.redirect(ROUTES.SUMMARY_AND_DECLARATION)
  }

  res.render(TEMPLATES.COMMIT_EMAIL_CONTENT, {
    data: data,
    backLink: ROUTES.COMMIT_CONFIRMATION
  })
})

// ============================================================================
// PAYMENT JOURNEY ROUTES
// ============================================================================

// Helper function to format building details for display
function formatPaymentBuildingDetails(data) {
  const parts = []
  if (data.residentialBuildingCount) {
    parts.push(
      `${data.residentialBuildingCount} dwelling building${data.residentialBuildingCount !== 1 ? 's' : ''}`
    )
  }
  if (data.roomCounts) {
    if (data.roomCounts.hotelCount) {
      parts.push(
        `${data.roomCounts.hotelCount} hotel room${data.roomCounts.hotelCount !== 1 ? 's' : ''}`
      )
    }
    if (data.roomCounts.hmoCount) {
      parts.push(
        `${data.roomCounts.hmoCount} multiple occupation room${data.roomCounts.hmoCount !== 1 ? 's' : ''}`
      )
    }
    if (data.roomCounts.residentialInstitutionCount) {
      parts.push(
        `${data.roomCounts.residentialInstitutionCount} residential institution room${data.roomCounts.residentialInstitutionCount !== 1 ? 's' : ''}`
      )
    }
  }
  return parts.length > 0 ? parts.join(' and ') : 'No building details provided'
}

// Payment: How would you like to sign in?
router.get(ROUTES.PAY_HOW_WOULD_YOU_LIKE_TO_SIGN_IN, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.PAY_HOW_WOULD_YOU_LIKE_TO_SIGN_IN, {
    data: data,
    backLink: ROUTES.WHAT_WOULD_YOU_LIKE_TO_DO
  })
})

router.post(ROUTES.PAY_HOW_WOULD_YOU_LIKE_TO_SIGN_IN, (req, res) => {
  const signInOption = req.body['sign-in-option']

  if (!signInOption) {
    return res.render(TEMPLATES.PAY_HOW_WOULD_YOU_LIKE_TO_SIGN_IN, {
      error:
        'Select if you want to log in with One Login or Government Gateway',
      data: req.session.data || {},
      backLink: ROUTES.WHAT_WOULD_YOU_LIKE_TO_DO
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.paySignInOption = signInOption

  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err)
    }
    if (signInOption === 'government-gateway') {
      res.redirect(ROUTES.PAY_SIGN_IN_GOVERNMENT_GATEWAY)
    } else {
      // One Login - for now redirect to government gateway as placeholder
      res.redirect(ROUTES.PAY_SIGN_IN_GOVERNMENT_GATEWAY)
    }
  })
})

// Payment: Sign in Government Gateway
router.get(ROUTES.PAY_SIGN_IN_GOVERNMENT_GATEWAY, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.PAY_SIGN_IN_GOVERNMENT_GATEWAY, {
    data: data,
    backLink: ROUTES.PAY_HOW_WOULD_YOU_LIKE_TO_SIGN_IN
  })
})

router.post(ROUTES.PAY_SIGN_IN_GOVERNMENT_GATEWAY, (req, res) => {
  const userId = req.body.userId?.trim()
  const password = req.body.password?.trim()
  const errors = []
  const errorsByField = {}

  if (!userId) {
    errors.push({
      field: 'userId',
      message: 'Enter your Government Gateway user ID',
      href: '#user-id'
    })
    errorsByField.userId = { text: 'Enter your Government Gateway user ID' }
  }

  if (!password) {
    errors.push({
      field: 'password',
      message: 'Enter your password',
      href: '#password'
    })
    errorsByField.password = { text: 'Enter your password' }
  }

  if (errors.length > 0) {
    return res.render(TEMPLATES.PAY_SIGN_IN_GOVERNMENT_GATEWAY, {
      errors: errors,
      errorsByField: errorsByField,
      data: req.session.data || {},
      backLink: ROUTES.PAY_HOW_WOULD_YOU_LIKE_TO_SIGN_IN
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.payGovernmentGatewayUserId = userId
  req.session.data.payGovernmentGatewayPassword = password

  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err)
    }
    res.redirect(ROUTES.PAYMENT_SUMMARY)
  })
})

// Payment: Summary (Check your answers)
router.get(ROUTES.PAYMENT_SUMMARY, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.PAYMENT_SUMMARY, {
    data: data,
    buildingTypeLabels: BUILDING_TYPE_LABELS,
    backLink: ROUTES.PAY_SIGN_IN_GOVERNMENT_GATEWAY
  })
})

router.post(ROUTES.PAYMENT_SUMMARY, (req, res) => {
  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err)
    }
    res.redirect(ROUTES.PLANNING_REF)
  })
})

// Payment: Planning reference
router.get(ROUTES.PLANNING_REF, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.PLANNING_REF, {
    data: data,
    backLink: ROUTES.PAYMENT_SUMMARY
  })
})

router.post(ROUTES.PLANNING_REF, (req, res) => {
  const planningRef = req.body['planning-ref']?.trim()

  if (!planningRef) {
    return res.render(TEMPLATES.PLANNING_REF, {
      error: 'Enter the planning application reference',
      data: req.session.data || {},
      backLink: ROUTES.PAYMENT_SUMMARY
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.planningRef = planningRef

  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err)
    }
    res.redirect(ROUTES.PAYMENT_SUMMARY_SUBMIT)
  })
})

// Payment: Summary Submit (Check your answers with declaration)
router.get(ROUTES.PAYMENT_SUMMARY_SUBMIT, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.PAYMENT_SUMMARY_SUBMIT, {
    data: data,
    buildingTypeLabels: BUILDING_TYPE_LABELS,
    backLink: ROUTES.PLANNING_REF
  })
})

router.post(ROUTES.PAYMENT_SUMMARY_SUBMIT, (req, res) => {
  const data = req.session.data || {}

  // If decision notice has been uploaded, redirect to decision notice confirmation
  if (data.decisionNoticeUploaded) {
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err)
      }
      res.redirect(ROUTES.DECISION_NOTICE_CONFIRMATION)
    })
    return
  }

  // Otherwise, this is the first submission - create payment reference and redirect to payment confirmation
  const paymentReference = 'NRF-' + Date.now().toString().slice(-6)

  req.session.data = req.session.data || {}
  req.session.data.paymentReference = paymentReference
  req.session.data.levyAmount = req.session.data.levyAmount || '2,500'

  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err)
    }
    res.redirect(ROUTES.PAYMENT_CONFIRMATION)
  })
})

// Payment: Confirmation
router.get(ROUTES.PAYMENT_CONFIRMATION, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.PAYMENT_CONFIRMATION, {
    data: data,
    formatBuildingDetails: formatPaymentBuildingDetails
  })
})

// Payment: Request Email Content
router.get(ROUTES.PAYMENT_REQUEST_EMAIL_CONTENT, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.PAYMENT_REQUEST_EMAIL_CONTENT, {
    data: data,
    backLink: ROUTES.PAYMENT_CONFIRMATION
  })
})

// PDN: How would you like to sign in?
router.get(ROUTES.PDN_HOW_WOULD_YOU_LIKE_TO_SIGN_IN, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.PDN_HOW_WOULD_YOU_LIKE_TO_SIGN_IN, {
    data: data,
    backLink: ROUTES.PAYMENT_REQUEST_EMAIL_CONTENT
  })
})

router.post(ROUTES.PDN_HOW_WOULD_YOU_LIKE_TO_SIGN_IN, (req, res) => {
  const signInOption = req.body['sign-in-option']

  if (!signInOption) {
    return res.render(TEMPLATES.PDN_HOW_WOULD_YOU_LIKE_TO_SIGN_IN, {
      error:
        'Select if you want to log in with One Login or Government Gateway',
      data: req.session.data || {},
      backLink: ROUTES.PAYMENT_REQUEST_EMAIL_CONTENT
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.pdnSignInOption = signInOption

  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err)
    }
    if (signInOption === 'government-gateway') {
      res.redirect(ROUTES.PDN_SIGN_IN_GOVERNMENT_GATEWAY)
    } else {
      res.redirect(ROUTES.PDN_SIGN_IN_GOVERNMENT_GATEWAY)
    }
  })
})

// PDN: Sign in Government Gateway
router.get(ROUTES.PDN_SIGN_IN_GOVERNMENT_GATEWAY, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.PDN_SIGN_IN_GOVERNMENT_GATEWAY, {
    data: data,
    backLink: ROUTES.PDN_HOW_WOULD_YOU_LIKE_TO_SIGN_IN
  })
})

router.post(ROUTES.PDN_SIGN_IN_GOVERNMENT_GATEWAY, (req, res) => {
  const userId = req.body.userId?.trim()
  const password = req.body.password?.trim()
  const errors = []
  const errorsByField = {}

  if (!userId) {
    errors.push({
      field: 'userId',
      message: 'Enter your Government Gateway user ID',
      href: '#user-id'
    })
    errorsByField.userId = { text: 'Enter your Government Gateway user ID' }
  }

  if (!password) {
    errors.push({
      field: 'password',
      message: 'Enter your password',
      href: '#password'
    })
    errorsByField.password = { text: 'Enter your password' }
  }

  if (errors.length > 0) {
    return res.render(TEMPLATES.PDN_SIGN_IN_GOVERNMENT_GATEWAY, {
      errors: errors,
      errorsByField: errorsByField,
      data: req.session.data || {},
      backLink: ROUTES.PDN_HOW_WOULD_YOU_LIKE_TO_SIGN_IN
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.pdnGovernmentGatewayUserId = userId
  req.session.data.pdnGovernmentGatewayPassword = password

  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err)
    }
    res.redirect(ROUTES.UPLOAD_DECISION_NOTICE)
  })
})

// PDN: Upload Decision Notice
router.get(ROUTES.UPLOAD_DECISION_NOTICE, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.UPLOAD_DECISION_NOTICE, {
    data: data,
    backLink: ROUTES.PDN_SIGN_IN_GOVERNMENT_GATEWAY
  })
})

router.post(ROUTES.UPLOAD_DECISION_NOTICE, (req, res) => {
  // Fake upload - no actual file validation needed for prototype
  // Just mark as uploaded and continue
  req.session.data = req.session.data || {}
  req.session.data.decisionNoticeUploaded = true
  req.session.data.decisionNoticeFileName = 'Planning Decision Notice.pdf'

  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err)
    }
    res.redirect(ROUTES.PAYMENT_SUMMARY_SUBMIT)
  })
})

// Decision Notice: Confirmation
router.get(ROUTES.DECISION_NOTICE_CONFIRMATION, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.DECISION_NOTICE_CONFIRMATION, {
    data: data,
    formatBuildingDetails: formatPaymentBuildingDetails
  })
})

// Payment: Pay Email Content
router.get(ROUTES.PAY_EMAIL_CONTENT, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.PAY_EMAIL_CONTENT, {
    data: data,
    backLink: ROUTES.DECISION_NOTICE_CONFIRMATION
  })
})

module.exports = router
