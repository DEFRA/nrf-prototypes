//
// NRF Estimate Journey Routes - Nature Restoration Fund Levy Estimate (v3)
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const path = require('path')
const fs = require('fs')
const multer = require('multer')

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
  if (!boundary?.coordinates) return null

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
    // Coming soon - for now redirect back with a message or to a placeholder
    res.redirect(ROUTES.WHAT_WOULD_YOU_LIKE_TO_DO)
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
      res.redirect(ROUTES.EMAIL)
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
      res.redirect(ROUTES.EMAIL)
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
      res.redirect(ROUTES.EMAIL)
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

  res.redirect(ROUTES.EMAIL)
})

// Email entry
router.get(ROUTES.EMAIL, (req, res) => {
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
    return res.redirect(ROUTES.EMAIL)
  }

  res.render(TEMPLATES.SUMMARY, {
    data: data
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
      '../assets/catchments_nn_catchments_03_2024.geojson'
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

  if (isNaN(commitmentRef)) {
    return res.render(TEMPLATES.ENTER_COMMITMENT_REF, {
      error: 'Enter a valid commitment reference number',
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
    backLink: ROUTES.PLANNING_REF
  })
})

router.post(ROUTES.COMMIT_SUMMARY_SUBMIT, (req, res) => {
  const paymentReference = 'PAY-' + Date.now().toString().slice(-6)

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

module.exports = router
