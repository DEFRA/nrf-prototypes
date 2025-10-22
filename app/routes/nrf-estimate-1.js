//
// NRF Estimate Journey Routes - Nature Restoration Fund Levy Estimate
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const path = require('path')
const fs = require('fs')
const multer = require('multer')

// Import helpers and validators
const validators = require('../lib/nrf-estimate-1/validators')
const buildingTypeHelpers = require('../lib/nrf-estimate-1/building-type-helpers')
const { ROUTES, TEMPLATES } = require('../config/nrf-estimate-1/routes')
const {
  BUILDING_TYPES,
  BUILDING_TYPE_LABELS,
  BUILDING_TYPE_DATA_KEYS,
  BUILDING_TYPES_REQUIRING_ROOM_COUNT
} = require('../config/nrf-estimate-1/building-types')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024
  }
})

// Mock EDP boundary data for validation
const edpBoundaries = [
  {
    name: 'Thames Valley EDP',
    coordinates: [
      [-0.5, 51.3],
      [-0.3, 51.3],
      [-0.3, 51.7],
      [-0.5, 51.7],
      [-0.5, 51.3]
    ]
  },
  {
    name: 'Greater Manchester EDP',
    coordinates: [
      [-2.5, 53.3],
      [-2.1, 53.3],
      [-2.1, 53.7],
      [-2.5, 53.7],
      [-2.5, 53.3]
    ]
  },
  {
    name: 'West Midlands EDP',
    coordinates: [
      [-2.0, 52.3],
      [-1.6, 52.3],
      [-1.6, 52.7],
      [-2.0, 52.7],
      [-2.0, 52.3]
    ]
  },
  {
    name: 'South West EDP',
    coordinates: [
      [-3.0, 50.5],
      [-2.5, 50.5],
      [-2.5, 51.0],
      [-3.0, 51.0],
      [-3.0, 50.5]
    ]
  },
  {
    name: 'North East EDP',
    coordinates: [
      [-1.8, 54.5],
      [-1.2, 54.5],
      [-1.2, 55.0],
      [-1.8, 55.0],
      [-1.8, 54.5]
    ]
  }
]

// Helper function to check if a point is within a polygon
function isPointInPolygon(point, polygon) {
  const x = point[0],
    y = point[1]
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    if (
      polygon[i][1] > y !== polygon[j][1] > y &&
      x <
        ((polygon[j][0] - polygon[i][0]) * (y - polygon[i][1])) /
          (polygon[j][1] - polygon[i][1]) +
          polygon[i][0]
    ) {
      inside = !inside
    }
  }
  return inside
}

// Helper function to check if development is within EDP boundary
function checkEDPIntersection(boundary) {
  if (!boundary || !boundary.coordinates) return null

  const center = boundary.center || [
    boundary.coordinates[0][0],
    boundary.coordinates[0][1]
  ]

  for (const edp of edpBoundaries) {
    if (isPointInPolygon(center, edp.coordinates)) {
      return edp
    }
  }
  return null
}

// Helper function to determine next route after building details collected
function getNextRouteAfterBuildingDetails(sessionData) {
  // Check if this is a payment journey without an estimate ref
  if (
    sessionData.journeyType === 'payment' &&
    sessionData.hasEstimateRef === 'no'
  ) {
    // Planning ref comes before email for payment journey
    return ROUTES.PLANNING_REF
  }
  // Otherwise go to email
  return ROUTES.EMAIL
}

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

  // Store in session
  req.session.data = req.session.data || {}
  req.session.data.journeyType = journeyType

  // Route based on journey type
  if (journeyType === 'estimate') {
    res.redirect(ROUTES.REDLINE_MAP)
  } else {
    res.redirect(ROUTES.DO_YOU_HAVE_ESTIMATE_REF)
  }
})

// Redline boundary file question
router.get(ROUTES.REDLINE_MAP, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.REDLINE_MAP, { data: data })
})

// Handle redline boundary file question
router.post(ROUTES.REDLINE_MAP, (req, res) => {
  const hasRedlineBoundaryFile = req.body['has-redline-boundary-file']

  if (!hasRedlineBoundaryFile) {
    return res.render(TEMPLATES.REDLINE_MAP, {
      error: 'Select yes if you have a red line boundary file'
    })
  }

  // Store in session
  req.session.data = req.session.data || {}
  req.session.data.hasRedlineBoundaryFile = hasRedlineBoundaryFile

  if (hasRedlineBoundaryFile === 'yes') {
    res.redirect(ROUTES.UPLOAD_REDLINE)
  } else {
    req.session.data.mapReferrer = 'redline-map'
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
            error: 'The selected file must be smaller than 2MB'
          })
        }
        return res.render(TEMPLATES.UPLOAD_REDLINE, {
          error: 'There was a problem uploading the file'
        })
      } else if (err) {
        return res.render(TEMPLATES.UPLOAD_REDLINE, {
          error: 'There was a problem uploading the file'
        })
      }
      next()
    })
  },
  (req, res) => {
    if (!req.file) {
      return res.render(TEMPLATES.UPLOAD_REDLINE, {
        error: 'Select a file'
      })
    }

    const uploadedFile = req.file
    const allowedTypes = ['.shp', '.geojson']
    const fileName = uploadedFile.originalname.toLowerCase()
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'))

    if (!allowedTypes.includes(fileExtension)) {
      return res.render(TEMPLATES.UPLOAD_REDLINE, {
        error: 'The selected file must be a .shp or .geojson file'
      })
    }

    if (uploadedFile.size === 0) {
      return res.render(TEMPLATES.UPLOAD_REDLINE, {
        error: 'The selected file is empty'
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
            error: 'The GeoJSON file does not contain valid polygon coordinates'
          })
        }

        boundaryData = {
          coordinates: coordinates
        }
      } catch (error) {
        console.error('Error parsing GeoJSON:', error)
        return res.render(TEMPLATES.UPLOAD_REDLINE, {
          error: 'The selected file is not a valid GeoJSON file'
        })
      }
    } else if (fileExtension === '.shp') {
      return res.render(TEMPLATES.UPLOAD_REDLINE, {
        error:
          'Shapefile parsing is not yet supported. Please use GeoJSON format.'
      })
    }

    req.session.data = req.session.data || {}
    req.session.data.redlineFile = uploadedFile.originalname
    req.session.data.hasRedlineBoundaryFile = 'yes'
    req.session.data.redlineBoundaryPolygon = boundaryData
    req.session.data.mapReferrer = 'upload-redline'

    req.session.save((err) => {
      if (err) {
        console.error('Error saving session:', err)
        return res.render(TEMPLATES.UPLOAD_REDLINE, {
          error: 'There was a problem processing your file. Please try again.'
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

  const backLink =
    data.mapReferrer === 'upload-redline'
      ? ROUTES.UPLOAD_REDLINE
      : ROUTES.REDLINE_MAP

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
      navFromSummary: navFromSummary
    })
  }

  try {
    const parsedData = JSON.parse(boundaryData)

    req.session.data = req.session.data || {}
    req.session.data.redlineBoundaryPolygon = {
      center: parsedData.center,
      coordinates: parsedData.coordinates,
      intersectingCatchment: parsedData.intersectingCatchment
    }

    let edpIntersection = null
    if (parsedData.intersectingCatchment) {
      edpIntersection = {
        name: parsedData.intersectingCatchment,
        type: 'catchment'
      }
    } else {
      edpIntersection = checkEDPIntersection({
        center: parsedData.center,
        coordinates: parsedData.coordinates
      })
    }

    if (!edpIntersection) {
      res.redirect(ROUTES.NO_EDP)
    } else if (navFromSummary) {
      res.redirect(ROUTES.SUMMARY)
    } else {
      res.redirect(ROUTES.BUILDING_TYPE)
    }
  } catch (error) {
    console.error('Error parsing boundary data:', error)
    res.render(TEMPLATES.MAP, {
      error: 'Draw a red line boundary to continue',
      navFromSummary: navFromSummary
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

  // Check if no building types are selected
  // When no checkboxes are selected, buildingTypes will be undefined
  // When checkboxes are selected, buildingTypes will be a string (single) or array (multiple)
  if (!buildingTypes || buildingTypes === '_unchecked') {
    return res.render(TEMPLATES.BUILDING_TYPE, {
      error: 'Select a building type to continue',
      data: req.session.data || {},
      isChange: isChange,
      navFromSummary: navFromSummary
    })
  }

  // Store in session - preserve existing data
  if (!req.session.data) {
    req.session.data = {}
  }
  const previousBuildingTypes = req.session.data.buildingTypes || []

  // Normalize building types to always be an array
  const buildingTypesArray =
    buildingTypeHelpers.normalizeBuildingTypes(buildingTypes)
  req.session.data.buildingTypes = buildingTypesArray

  // If this is a change from summary, handle adding/removing associated values
  if (isChange && navFromSummary) {
    const roomCountTypes = BUILDING_TYPES_REQUIRING_ROOM_COUNT
    const residentialType = BUILDING_TYPES.DWELLINGHOUSE

    // Initialize roomCounts if it doesn't exist
    if (!req.session.data.roomCounts) {
      req.session.data.roomCounts = {}
    }

    // Check for removed building types and clear their associated data
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

    // Check if there are actual changes to building types
    const hasChanges =
      JSON.stringify(previousBuildingTypes.sort()) !==
      JSON.stringify(buildingTypesArray.sort())

    // Only proceed with data collection if there are actual changes
    if (!hasChanges) {
      res.redirect(ROUTES.SUMMARY)
      return
    }

    // Check for newly added building types that need data collection
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

    // If there are newly added building types that need data collection, collect them first
    if (needsRoomCount || needsResidentialCount) {
      if (needsResidentialCount) {
        res.redirect(`${ROUTES.RESIDENTIAL}?change=true&nav=summary`)
        return
      } else if (needsRoomCount) {
        // Store only the newly added building types that need room counts for processing
        req.session.data.roomCountTypes = newlyAddedRoomCountTypes
        req.session.data.currentRoomCountIndex = 0
        res.redirect(`${ROUTES.ROOM_COUNT}?change=true&nav=summary`)
        return
      }
    }

    // If no new data collection needed, go back to summary
    res.redirect(ROUTES.SUMMARY)
    return
  }

  // If this is a change from summary, redirect back to summary
  if (isChange) {
    res.redirect(ROUTES.SUMMARY)
    return
  }

  // Check if non-residential development selected
  if (buildingTypesArray.includes(BUILDING_TYPES.NON_RESIDENTIAL)) {
    res.redirect(ROUTES.NON_RESIDENTIAL)
  } else {
    // Check if any building types require room counts
    const hasRoomCountTypes = buildingTypesArray.some((type) =>
      BUILDING_TYPES_REQUIRING_ROOM_COUNT.includes(type)
    )

    if (hasRoomCountTypes) {
      // Store the building types that need room counts for processing
      req.session.data.roomCountTypes = buildingTypesArray.filter((type) =>
        BUILDING_TYPES_REQUIRING_ROOM_COUNT.includes(type)
      )
      req.session.data.currentRoomCountIndex = 0
      res.redirect(ROUTES.ROOM_COUNT)
    } else if (buildingTypesArray.includes(BUILDING_TYPES.DWELLINGHOUSE)) {
      res.redirect(ROUTES.RESIDENTIAL)
    } else {
      res.redirect(getNextRouteAfterBuildingDetails(req.session.data))
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
    // All room counts collected, move to next step
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
      res.redirect(getNextRouteAfterBuildingDetails(data))
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

  // Normal flow with multiple room types
  const roomCountTypes = data.roomCountTypes || []
  const currentIndex = data.currentRoomCountIndex || 0
  const currentBuildingType = roomCountTypes[currentIndex]

  // Map building types to their data keys
  const typeMapping = {
    Hotel: 'hotelCount',
    'House of multiple occupation (HMO)': 'hmoCount',
    'Residential institution': 'residentialInstitutionCount'
  }

  const dataKey = typeMapping[currentBuildingType]
  if (dataKey) {
    req.session.data.roomCounts[dataKey] = parseInt(roomCount)
  }

  // Move to next building type or next step
  req.session.data.currentRoomCountIndex = currentIndex + 1

  // Check if this is a change from summary - only redirect to summary after collecting ALL room counts
  if (isChange && navFromSummary && currentIndex + 1 >= roomCountTypes.length) {
    res.redirect(ROUTES.SUMMARY)
    return
  }

  if (currentIndex + 1 >= roomCountTypes.length) {
    // All room counts collected, move to next step
    if (isChange) {
      res.redirect(ROUTES.SUMMARY)
    } else if (
      data.buildingTypes &&
      data.buildingTypes.includes('Dwellinghouse')
    ) {
      res.redirect(ROUTES.RESIDENTIAL)
    } else {
      res.redirect(getNextRouteAfterBuildingDetails(req.session.data))
    }
  } else {
    // Move to next building type
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
      error: 'Enter the number of dwellinghouse buildings to continue',
      data: req.session.data || {},
      isChange: isChange,
      navFromSummary: navFromSummary
    })
  }

  // Store in session
  req.session.data = req.session.data || {}
  req.session.data.residentialBuildingCount = parseInt(residentialBuildingCount)

  // If this is a change from summary, redirect back to summary
  if (isChange && navFromSummary) {
    res.redirect(ROUTES.SUMMARY)
    return
  } else if (isChange) {
    res.redirect(ROUTES.SUMMARY)
    return
  }

  res.redirect(getNextRouteAfterBuildingDetails(req.session.data))
})

// Residential institution room count
router.get(ROUTES.RESIDENTIAL_INSTITUTION, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.RESIDENTIAL_INSTITUTION, { data: data })
})

// Handle residential institution room count
router.post(ROUTES.RESIDENTIAL_INSTITUTION, (req, res) => {
  const data = req.session.data || {}
  const buildingTypes = data.buildingTypes || []

  let error = null
  let hmoCount = null
  let residentialInstitutionCount = null

  // Check HMO count if HMO is selected
  if (buildingTypes.includes('House of multiple occupation (HMO)')) {
    hmoCount = req.body['hmo-count']
    if (!hmoCount || isNaN(hmoCount) || hmoCount < 1) {
      error = 'Enter the number of rooms to continue'
    }
  }

  // Check residential institution count if residential institution is selected
  if (
    buildingTypes.includes('Residential institution') ||
    buildingTypes.includes('Secure residential institution')
  ) {
    residentialInstitutionCount = req.body['residential-accommodation-count']
    if (
      !residentialInstitutionCount ||
      isNaN(residentialInstitutionCount) ||
      residentialInstitutionCount < 1
    ) {
      error = 'Enter the number of rooms to continue'
    }
  }

  if (error) {
    return res.render(TEMPLATES.RESIDENTIAL_INSTITUTION, {
      error: error,
      buildingTypes: buildingTypes
    })
  }

  // Store in session
  req.session.data = req.session.data || {}
  if (hmoCount) {
    req.session.data.hmoCount = parseInt(hmoCount)
  }
  if (residentialInstitutionCount) {
    req.session.data.residentialInstitutionCount = parseInt(
      residentialInstitutionCount
    )
  }

  res.redirect(ROUTES.EMAIL)
})

// Email entry
router.get(ROUTES.EMAIL, (req, res) => {
  const data = req.session.data || {}
  const isChange = req.query.change === 'true'
  const navFromSummary = req.query.nav === 'summary'

  // Determine back link based on journey type
  let backLink = ROUTES.BUILDING_TYPE

  // If this is a payment journey without an estimate ref, back should go to planning-ref
  if (data.journeyType === 'payment' && data.hasEstimateRef === 'no') {
    backLink = ROUTES.PLANNING_REF
  } else {
    // For estimate journey, determine back link based on what was collected
    if (data.buildingTypes) {
      if (data.buildingTypes.includes('Dwellinghouse')) {
        backLink = ROUTES.RESIDENTIAL
      } else if (data.roomCountTypes && data.roomCountTypes.length > 0) {
        backLink = ROUTES.ROOM_COUNT
      } else {
        backLink = ROUTES.BUILDING_TYPE
      }
    }
  }

  res.render(TEMPLATES.EMAIL, {
    data: data,
    isChange: isChange,
    navFromSummary: navFromSummary,
    backLink: backLink
  })
})

// Handle email submission
router.post(ROUTES.EMAIL, (req, res) => {
  const email = req.body['email']
  const isChange = req.body.isChange === 'true'
  const navFromSummary = req.body.navFromSummary === 'true'
  const data = req.session.data || {}

  // Calculate back link for error rendering
  let backLink = ROUTES.BUILDING_TYPE
  if (data.journeyType === 'payment' && data.hasEstimateRef === 'no') {
    backLink = ROUTES.PLANNING_REF
  } else {
    if (data.buildingTypes) {
      if (data.buildingTypes.includes('Dwellinghouse')) {
        backLink = ROUTES.RESIDENTIAL
      } else if (data.roomCountTypes && data.roomCountTypes.length > 0) {
        backLink = ROUTES.ROOM_COUNT
      } else {
        backLink = ROUTES.BUILDING_TYPE
      }
    }
  }

  // Validate email
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

  // Store in session
  req.session.data = req.session.data || {}
  req.session.data.email = email

  // If this is a change from summary, redirect back to summary
  if (isChange && navFromSummary) {
    res.redirect(ROUTES.SUMMARY)
    return
  } else if (isChange) {
    res.redirect(ROUTES.SUMMARY)
    return
  }

  res.redirect(ROUTES.SUMMARY)
})

// Summary page
router.get(ROUTES.SUMMARY, (req, res) => {
  const data = req.session.data || {}

  // Check if this is a payment journey
  if (data.journeyType === 'payment') {
    // Payment journey - check for planning reference
    if (!data.planningRef) {
      return res.redirect(ROUTES.PLANNING_REF)
    }
    // Render payment summary
    res.render(TEMPLATES.PAYMENT_SUMMARY, {
      data: data
    })
  } else {
    // Estimate journey - check for email
    if (!data.email) {
      return res.redirect(ROUTES.EMAIL)
    }
    // Render estimate summary
    res.render(TEMPLATES.SUMMARY, {
      data: data
    })
  }
})

// Handle summary submission
router.post(ROUTES.SUMMARY, (req, res) => {
  const data = req.session.data || {}

  // Check if this is a payment journey
  if (data.journeyType === 'payment') {
    // Payment journey - generate payment reference
    const paymentReference = 'PAY-' + Date.now().toString().slice(-6)

    // Store payment reference in session
    req.session.data = req.session.data || {}
    req.session.data.paymentReference = paymentReference

    res.redirect(ROUTES.PAYMENT_CONFIRMATION)
  } else {
    // Estimate journey - generate estimate reference
    const estimateReference = 'EST-' + Date.now().toString().slice(-6)

    // Store estimate reference in session
    req.session.data = req.session.data || {}
    req.session.data.estimateReference = estimateReference

    res.redirect(ROUTES.CONFIRMATION)
  }
})

// Confirmation page
router.get(ROUTES.CONFIRMATION, (req, res) => {
  const data = req.session.data || {}

  if (!data.estimateReference) {
    return res.redirect(ROUTES.SUMMARY)
  }

  res.render(TEMPLATES.CONFIRMATION, {
    data: data
  })
})

// Serve GeoJSON catchment data
router.get(ROUTES.CATCHMENTS_GEOJSON, (req, res) => {
  try {
    const geojsonPath = path.join(
      __dirname,
      '../assets/catchments_nn_catchments_03_2024.geojson'
    )

    // Check if file exists
    if (!fs.existsSync(geojsonPath)) {
      console.error('GeoJSON file not found at:', geojsonPath)
      return res.status(404).json({ error: 'Catchment data not found' })
    }

    // Read and serve the file
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

// ===== PAYMENT JOURNEY ROUTES =====

// Do you have an estimate reference?
router.get(ROUTES.DO_YOU_HAVE_ESTIMATE_REF, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.DO_YOU_HAVE_ESTIMATE_REF, { data: data })
})

// Handle estimate reference question
router.post(ROUTES.DO_YOU_HAVE_ESTIMATE_REF, (req, res) => {
  const hasEstimateRef = req.body['has-estimate-ref']

  if (!hasEstimateRef) {
    return res.render(TEMPLATES.DO_YOU_HAVE_ESTIMATE_REF, {
      error: 'Select yes if you have an estimate reference'
    })
  }

  // Store in session
  req.session.data = req.session.data || {}
  req.session.data.hasEstimateRef = hasEstimateRef

  if (hasEstimateRef === 'yes') {
    res.redirect(ROUTES.ENTER_ESTIMATE_REF)
  } else {
    res.redirect(ROUTES.REDLINE_MAP)
  }
})

// Enter your estimate reference
router.get(ROUTES.ENTER_ESTIMATE_REF, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.ENTER_ESTIMATE_REF, { data: data })
})

// Handle estimate reference entry
router.post(ROUTES.ENTER_ESTIMATE_REF, (req, res) => {
  const estimateRef = req.body['estimate-ref']

  if (!estimateRef || estimateRef.trim() === '') {
    return res.render(TEMPLATES.ENTER_ESTIMATE_REF, {
      error: 'Enter your estimate reference to continue'
    })
  }

  // Basic validation - should be a number
  if (isNaN(estimateRef)) {
    return res.render(TEMPLATES.ENTER_ESTIMATE_REF, {
      error: 'Enter a valid estimate reference number'
    })
  }

  // Store in session
  req.session.data = req.session.data || {}
  req.session.data.estimateRef = estimateRef

  res.redirect(ROUTES.RETRIEVE_ESTIMATE_EMAIL)
})

// Retrieve estimate email entry
router.get(ROUTES.RETRIEVE_ESTIMATE_EMAIL, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.RETRIEVE_ESTIMATE_EMAIL, { data: data })
})

// Handle retrieve estimate email
router.post(ROUTES.RETRIEVE_ESTIMATE_EMAIL, (req, res) => {
  const email = req.body['email']

  if (!email) {
    return res.render(TEMPLATES.RETRIEVE_ESTIMATE_EMAIL, {
      error: 'Enter your email address to continue'
    })
  }

  // Validate email
  const validation = validators.validateEmail(email)
  if (!validation.valid) {
    return res.render(TEMPLATES.RETRIEVE_ESTIMATE_EMAIL, {
      error: validation.error
    })
  }

  // Store in session
  req.session.data = req.session.data || {}
  req.session.data.email = email

  res.redirect(ROUTES.ESTIMATE_EMAIL_RETRIEVAL_CONTENT)
})

// Email sent with magic link to estimate
router.get(ROUTES.ESTIMATE_EMAIL_RETRIEVAL_CONTENT, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.ESTIMATE_EMAIL_RETRIEVAL_CONTENT, { data: data })
})

// Handle email retrieval content submission
router.post(ROUTES.ESTIMATE_EMAIL_RETRIEVAL_CONTENT, (req, res) => {
  res.redirect(ROUTES.PLANNING_REF)
})

// Enter your planning reference
router.get(ROUTES.PLANNING_REF, (req, res) => {
  const data = req.session.data || {}
  const isChange = req.query.change === 'true'
  const navFromSummary = req.query.nav === 'summary'

  // Determine back link based on journey type
  let backLink = ROUTES.ESTIMATE_EMAIL_RETRIEVAL_CONTENT

  // If this is a payment journey without an estimate ref, back should go to last building details page
  if (data.journeyType === 'payment' && data.hasEstimateRef === 'no') {
    if (data.buildingTypes) {
      if (data.buildingTypes.includes('Dwellinghouse')) {
        backLink = ROUTES.RESIDENTIAL
      } else if (data.roomCountTypes && data.roomCountTypes.length > 0) {
        backLink = ROUTES.ROOM_COUNT
      } else {
        backLink = ROUTES.BUILDING_TYPE
      }
    } else {
      backLink = ROUTES.BUILDING_TYPE
    }
  }

  res.render(TEMPLATES.PLANNING_REF, {
    data: data,
    isChange: isChange,
    navFromSummary: navFromSummary,
    backLink: backLink
  })
})

// Handle planning reference entry
router.post(ROUTES.PLANNING_REF, (req, res) => {
  const planningRef = req.body['planning-ref']
  const isChange = req.body.isChange === 'true'
  const navFromSummary = req.body.navFromSummary === 'true'
  const data = req.session.data || {}

  if (!planningRef || planningRef.trim() === '') {
    // Calculate back link for error rendering
    let backLink = ROUTES.ESTIMATE_EMAIL_RETRIEVAL_CONTENT
    if (data.journeyType === 'payment' && data.hasEstimateRef === 'no') {
      if (data.buildingTypes) {
        if (data.buildingTypes.includes('Dwellinghouse')) {
          backLink = ROUTES.RESIDENTIAL
        } else if (data.roomCountTypes && data.roomCountTypes.length > 0) {
          backLink = ROUTES.ROOM_COUNT
        } else {
          backLink = ROUTES.BUILDING_TYPE
        }
      } else {
        backLink = ROUTES.BUILDING_TYPE
      }
    }

    return res.render(TEMPLATES.PLANNING_REF, {
      error: 'Enter the planning application reference',
      data: data,
      isChange: isChange,
      navFromSummary: navFromSummary,
      backLink: backLink
    })
  }

  // Store in session
  req.session.data = req.session.data || {}
  req.session.data.planningRef = planningRef

  // If this is a change from summary, redirect back to summary
  if (isChange && navFromSummary) {
    res.redirect(ROUTES.SUMMARY)
    return
  } else if (isChange) {
    res.redirect(ROUTES.SUMMARY)
    return
  }

  // Check if this is a payment journey without estimate ref
  // If so, continue to email page
  if (data.journeyType === 'payment' && data.hasEstimateRef === 'no') {
    res.redirect(ROUTES.EMAIL)
  } else {
    // This path handles the case where user came from estimate retrieval
    res.redirect(ROUTES.SUMMARY)
  }
})

// Payment confirmation page
router.get(ROUTES.PAYMENT_CONFIRMATION, (req, res) => {
  const data = req.session.data || {}

  if (!data.paymentReference) {
    return res.redirect(ROUTES.SUMMARY)
  }

  res.render(TEMPLATES.PAYMENT_CONFIRMATION, {
    data: data
  })
})

// Estimate confirmation email page
router.get(ROUTES.ESTIMATE_CONFIRMATION_EMAIL, (req, res) => {
  const data = req.session.data || {}

  res.render(TEMPLATES.ESTIMATE_CONFIRMATION_EMAIL, {
    data: data
  })
})

// Payment email page
router.get(ROUTES.PAYMENT_EMAIL, (req, res) => {
  const data = req.session.data || {}

  res.render(TEMPLATES.PAYMENT_EMAIL, {
    data: data
  })
})

module.exports = router
