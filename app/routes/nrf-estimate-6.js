const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const turf = require('@turf/turf')
const validators = require('../lib/nrf-estimate-3/validators')
const { ROUTES, TEMPLATES } = require('../config/nrf-estimate-6/routes')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024
  }
})

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
          const name = feature.properties.NAME || 'GCN EDP Area'
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

  if (journeyType === 'commit') {
    return res.redirect(ROUTES.DO_YOU_HAVE_A_NRF_REF)
  }

  if (journeyType === 'payment') {
    return res.redirect(ROUTES.PAY_HOW_WOULD_YOU_LIKE_TO_SIGN_IN)
  }

  res.redirect(ROUTES.REDLINE_MAP)
})

router.get(ROUTES.REDLINE_MAP, (req, res) => {
  const data = req.session.data || {}
  const backLink = ROUTES.WHAT_WOULD_YOU_LIKE_TO_DO
  res.render(TEMPLATES.REDLINE_MAP, { data: data, backLink: backLink })
})

router.post(ROUTES.REDLINE_MAP, (req, res) => {
  const redlineBoundaryChoice = req.body['redline-boundary-choice']

  if (!redlineBoundaryChoice) {
    return res.render(TEMPLATES.REDLINE_MAP, {
      error: 'Select if you would like to draw a map or upload a file',
      data: req.session.data || {},
      backLink: ROUTES.WHAT_WOULD_YOU_LIKE_TO_DO
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.redlineBoundaryChoice = redlineBoundaryChoice
  req.session.data.hasRedlineBoundaryFile = redlineBoundaryChoice === 'Upload a file'

  if (redlineBoundaryChoice === 'Upload a file') {
    res.redirect(ROUTES.UPLOAD_REDLINE)
  } else {
    req.session.data.mapReferrer = 'redline-map'
    req.session.data.hasRedlineBoundaryFile = false
    res.redirect(ROUTES.MAP)
  }
})

router.get(ROUTES.UPLOAD_REDLINE, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.UPLOAD_REDLINE, { data: data, backLink: ROUTES.REDLINE_MAP })
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

router.get(ROUTES.MAP, (req, res) => {
  const data = req.session.data || {}
  const navFromSummary = (req.query.nav === 'summary' || req.query.nav === 'check-your-answers')

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
      center: parsedData.center,
      coordinates: parsedData.coordinates,
      intersections: {
        nutrient: intersectionResults.nutrient,
        gcn: intersectionResults.gcn
      },
      intersectingCatchment: intersectionResults.nutrient
    }

    const hasAnyEdpIntersection = Boolean(
      intersectionResults.nutrient || intersectionResults.gcn
    )

    if (!hasAnyEdpIntersection) {
      res.redirect(ROUTES.NO_EDP)
    } else if (navFromSummary) {
      res.redirect(ROUTES.CHECK_YOUR_ANSWERS)
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

router.get(ROUTES.NO_EDP, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.NO_EDP, { data: data, backLink: ROUTES.MAP })
})

router.get(ROUTES.BUILDING_TYPE, (req, res) => {
  const data = req.session.data || {}
  const isChange = req.query.change === 'true'
  const navFromSummary = (req.query.nav === 'summary' || req.query.nav === 'check-your-answers')
  const backLink = (isChange && navFromSummary) ? ROUTES.CHECK_YOUR_ANSWERS : ROUTES.MAP

  res.render(TEMPLATES.BUILDING_TYPE, {
    data: data,
    isChange: isChange,
    navFromSummary: navFromSummary,
    backLink: backLink
  })
})

router.post(ROUTES.BUILDING_TYPE, (req, res) => {
  const buildingTypes = req.body['building-types']
  const isChange = req.body.isChange === 'true'
  const navFromSummary = req.body.navFromSummary === 'true'

  const raw = buildingTypes
  let buildingTypesArray = []
  if (Array.isArray(raw)) {
    buildingTypesArray = raw.filter((t) => t && t !== '_unchecked')
  } else if (raw && raw !== '_unchecked') {
    buildingTypesArray = [raw]
  }

  if (buildingTypesArray.length === 0) {
    return res.render(TEMPLATES.BUILDING_TYPE, {
      error: 'Select a development type to continue',
      data: req.session.data || {},
      isChange: isChange,
      navFromSummary: navFromSummary
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.buildingTypes = buildingTypesArray
  const hasHousing = buildingTypesArray.includes('Housing')
  const hasOtherResidential = buildingTypesArray.includes('Other residential')

  if (isChange && navFromSummary) {
    if (!hasOtherResidential) {
      delete req.session.data.peopleCount
    }
    if (!hasHousing) {
      delete req.session.data.residentialBuildingCount
    }
    if (hasHousing && !req.session.data.residentialBuildingCount) {
      res.redirect(`${ROUTES.RESIDENTIAL}?change=true&nav=summary`)
      return
    }
    if (hasOtherResidential && req.session.data.peopleCount == null) {
      res.redirect(`${ROUTES.PEOPLE_COUNT}?change=true&nav=summary`)
      return
    }
    res.redirect(ROUTES.CHECK_YOUR_ANSWERS)
    return
  }

  if (isChange) {
    res.redirect(ROUTES.CHECK_YOUR_ANSWERS)
    return
  }

  if (hasHousing) {
    res.redirect(ROUTES.RESIDENTIAL)
    return
  }
  if (hasOtherResidential) {
    res.redirect(ROUTES.PEOPLE_COUNT)
    return
  }
  res.redirect(ROUTES.ESTIMATE_EMAIL)
})

router.get(ROUTES.PEOPLE_COUNT, (req, res) => {
  const data = req.session.data || {}
  const isChange = req.query.change === 'true'
  const navFromSummary = req.query.nav === 'summary' || req.query.nav === 'check-your-answers'
  let backLink = ROUTES.BUILDING_TYPE
  if (data.buildingTypes && data.buildingTypes.includes('Housing')) {
    backLink = ROUTES.RESIDENTIAL
  }
  res.render(TEMPLATES.PEOPLE_COUNT, {
    data: data,
    isChange: isChange,
    navFromSummary: navFromSummary,
    backLink: backLink
  })
})

router.post(ROUTES.PEOPLE_COUNT, (req, res) => {
  const peopleCount = req.body['people-count']
  const isChange = req.body.isChange === 'true'
  const navFromSummary = req.body.navFromSummary === 'true'
  const data = req.session.data || {}

  if (!peopleCount || isNaN(peopleCount) || parseInt(peopleCount, 10) < 1) {
    let backLink = ROUTES.BUILDING_TYPE
    if (data.buildingTypes && data.buildingTypes.includes('Housing')) {
      backLink = ROUTES.RESIDENTIAL
    }
    return res.render(TEMPLATES.PEOPLE_COUNT, {
      error: 'Enter the maximum number of people to continue',
      data: data,
      isChange: isChange,
      navFromSummary: navFromSummary,
      backLink: backLink
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.peopleCount = parseInt(peopleCount, 10)

  if (isChange && navFromSummary) {
    res.redirect(ROUTES.CHECK_YOUR_ANSWERS)
    return
  }
  res.redirect(ROUTES.WASTE_WATER)
})

router.get(ROUTES.WASTE_WATER, (req, res) => {
  const data = req.session.data || {}
  const isChange = req.query.change === 'true'
  const navFromSummary = req.query.nav === 'summary' || req.query.nav === 'check-your-answers'
  let backLink = ROUTES.PEOPLE_COUNT
  if (isChange && navFromSummary) {
    backLink = ROUTES.CHECK_YOUR_ANSWERS
  } else if (data.buildingTypes && data.buildingTypes.includes('Housing') && !data.buildingTypes.includes('Other residential')) {
    backLink = ROUTES.RESIDENTIAL
  } else if (data.buildingTypes && data.buildingTypes.includes('Housing')) {
    backLink = ROUTES.PEOPLE_COUNT
  } else {
    backLink = ROUTES.BUILDING_TYPE
  }
  res.render(TEMPLATES.WASTE_WATER, {
    data: data,
    isChange: isChange,
    navFromSummary: navFromSummary,
    backLink: backLink
  })
})

router.post(ROUTES.WASTE_WATER, (req, res) => {
  const wasteWaterTreatmentWorks = req.body['waste-water-treatment-works']
  const isChange = req.body.isChange === 'true'
  const navFromSummary = req.body.navFromSummary === 'true'
  const data = req.session.data || {}

  if (!wasteWaterTreatmentWorks) {
    let backLink = ROUTES.PEOPLE_COUNT
    if (data.buildingTypes && data.buildingTypes.includes('Housing') && !data.buildingTypes.includes('Other residential')) {
      backLink = ROUTES.RESIDENTIAL
    } else if (data.buildingTypes && data.buildingTypes.includes('Housing')) {
      backLink = ROUTES.PEOPLE_COUNT
    } else {
      backLink = ROUTES.BUILDING_TYPE
    }
    return res.render(TEMPLATES.WASTE_WATER, {
      error: 'Select the waste water treatment works or tell us you don\'t know yet to continue',
      data: data,
      isChange: isChange,
      navFromSummary: navFromSummary,
      backLink: backLink
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.wasteWaterTreatmentWorks = wasteWaterTreatmentWorks

  if (isChange && navFromSummary) {
    res.redirect(ROUTES.CHECK_YOUR_ANSWERS)
    return
  }
  res.redirect(ROUTES.ESTIMATE_EMAIL)
})

router.get(ROUTES.RESIDENTIAL, (req, res) => {
  const data = req.session.data || {}
  const isChange = req.query.change === 'true'
  const navFromSummary = (req.query.nav === 'summary' || req.query.nav === 'check-your-answers')
  const backLink = (isChange && navFromSummary) ? ROUTES.CHECK_YOUR_ANSWERS : ROUTES.BUILDING_TYPE

  res.render(TEMPLATES.RESIDENTIAL, {
    data: data,
    isChange: isChange,
    navFromSummary: navFromSummary,
    backLink: backLink
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

  if (isChange && navFromSummary) {
    res.redirect(ROUTES.CHECK_YOUR_ANSWERS)
    return
  } else if (isChange) {
    res.redirect(ROUTES.CHECK_YOUR_ANSWERS)
    return
  }

  if (req.session.data.buildingTypes && req.session.data.buildingTypes.includes('Other residential')) {
    res.redirect(ROUTES.PEOPLE_COUNT)
    return
  }
  res.redirect(ROUTES.WASTE_WATER)
})

router.get(ROUTES.ESTIMATE_EMAIL, (req, res) => {
  const data = req.session.data || {}
  const isChange = req.query.change === 'true'
  const navFromSummary = (req.query.nav === 'summary' || req.query.nav === 'check-your-answers')

  let backLink = ROUTES.BUILDING_TYPE
  if (data.wasteWaterTreatmentWorks) {
    backLink = ROUTES.WASTE_WATER
  } else if (data.buildingTypes) {
    if (data.buildingTypes.includes('Housing')) {
      backLink = ROUTES.RESIDENTIAL
    } else if (data.buildingTypes.includes('Other residential')) {
      backLink = ROUTES.PEOPLE_COUNT
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
  const email = req.body['estimate-email']
  const isChange = req.body.isChange === 'true'
  const navFromSummary = req.body.navFromSummary === 'true'
  const data = req.session.data || {}

  let backLink = ROUTES.BUILDING_TYPE
  if (data.wasteWaterTreatmentWorks) {
    backLink = ROUTES.WASTE_WATER
  } else if (data.buildingTypes) {
    if (data.buildingTypes.includes('Housing')) {
      backLink = ROUTES.RESIDENTIAL
    } else if (data.buildingTypes.includes('Other residential')) {
      backLink = ROUTES.PEOPLE_COUNT
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
  req.session.data.estimateEmail = email

  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err)
    }
    res.redirect(303, ROUTES.CHECK_YOUR_ANSWERS)
  })
})

router.get(ROUTES.CHECK_YOUR_ANSWERS, (req, res) => {
  const data = req.session.data || {}

  if (!data.estimateEmail) {
    return res.redirect(ROUTES.ESTIMATE_EMAIL)
  }

  res.render(TEMPLATES.CHECK_YOUR_ANSWERS, {
    data: data
  })
})

router.post(ROUTES.CHECK_YOUR_ANSWERS, (req, res) => {
  const timestampSuffix = Date.now().toString().slice(-6)
  const nrfReference = 'NRF-' + timestampSuffix

  req.session.data = req.session.data || {}
  req.session.data.nrfReference = nrfReference
  req.session.data.levyAmount = req.session.data.levyAmount || '2,500'

  res.redirect(ROUTES.CONFIRMATION)
})

router.get(ROUTES.CONFIRMATION, (req, res) => {
  const data = req.session.data || {}

  res.render(TEMPLATES.CONFIRMATION, {
    data: data
  })
})

router.get(ROUTES.DELETE_QUOTE, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.DELETE_QUOTE, { data: data, backLink: ROUTES.CHECK_YOUR_ANSWERS })
})

router.post(ROUTES.DELETE_QUOTE, (req, res) => {
  const confirmDelete = req.body['confirm-delete-quote']
  if (confirmDelete === 'Yes') {
    const keysToRemove = [
      'redlineBoundaryPolygon', 'redlineFile', 'hasRedlineBoundaryFile', 'mapReferrer',
      'buildingTypes', 'residentialBuildingCount', 'peopleCount', 'wasteWaterTreatmentWorks',
      'estimateEmail', 'nrfReference', 'levyAmount'
    ]
    req.session.data = req.session.data || {}
    keysToRemove.forEach((k) => delete req.session.data[k])
    res.redirect(ROUTES.DELETE_CONFIRMATION)
  } else {
    res.redirect(ROUTES.CHECK_YOUR_ANSWERS)
  }
})

router.get(ROUTES.DELETE_CONFIRMATION, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.DELETE_CONFIRMATION, { data: data, deleteContext: 'quote' })
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
    return res.redirect(ROUTES.CHECK_YOUR_ANSWERS)
  }

  res.render(TEMPLATES.ESTIMATE_EMAIL_CONTENT, {
    data: data,
    backLink: ROUTES.CONFIRMATION
  })
})

router.get(ROUTES.ESTIMATE_EMAIL_CONTENT_RANGE, (req, res) => {
  const data = req.session.data || {}
  if (!data.nrfReference) {
    return res.redirect(ROUTES.CHECK_YOUR_ANSWERS)
  }

  res.render(TEMPLATES.ESTIMATE_EMAIL_CONTENT_RANGE, {
    data: data,
    backLink: ROUTES.CONFIRMATION
  })
})

router.get(ROUTES.DO_YOU_HAVE_A_NRF_REF, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.DO_YOU_HAVE_A_NRF_REF, {
    data,
    backLink: ROUTES.WHAT_WOULD_YOU_LIKE_TO_DO
  })
})

router.post(ROUTES.DO_YOU_HAVE_A_NRF_REF, (req, res) => {
  const hasNrfReference = req.body['has-nrf-reference']
  if (!hasNrfReference) {
    return res.render(TEMPLATES.DO_YOU_HAVE_A_NRF_REF, {
      error: 'Select yes if you have an NRF reference',
      data: req.session.data || {},
      backLink: ROUTES.WHAT_WOULD_YOU_LIKE_TO_DO
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.hasNrfReference = hasNrfReference
  res.redirect(ROUTES.START)
})

router.get(ROUTES.PAY_HOW_WOULD_YOU_LIKE_TO_SIGN_IN, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.PAY_HOW_WOULD_YOU_LIKE_TO_SIGN_IN, {
    data,
    backLink: ROUTES.WHAT_WOULD_YOU_LIKE_TO_DO
  })
})

router.post(ROUTES.PAY_HOW_WOULD_YOU_LIKE_TO_SIGN_IN, (req, res) => {
  const option = req.body['sign-in-option']
  if (!option) {
    return res.render(TEMPLATES.PAY_HOW_WOULD_YOU_LIKE_TO_SIGN_IN, {
      error: 'Select if you want to log in with One Login or Government Gateway',
      data: req.session.data || {},
      backLink: ROUTES.WHAT_WOULD_YOU_LIKE_TO_DO
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.paySignInOption = option
  res.redirect(ROUTES.START)
})

module.exports = router
