//
// Applications-2 Routes - Enhanced Environmental Development Plan Levy Calculator
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

// Import data modules
const applicationsData = require('../data/applications.js')
const edpData = require('../data/edp-data.js')

// Main applications-2 dashboard
router.get('/applications-2', (req, res) => {
  const userId = 'user-001' // Mock user ID
  const applications = applicationsData.getUserApplications(userId)

  res.render('applications-2/index', {
    applications: applications
  })
})

// View specific application details
router.get('/applications-2/:id', (req, res) => {
  const applicationId = req.params.id
  const application = applicationsData.getApplicationById(applicationId)

  if (!application) {
    return res.status(404).render('error', {
      error: 'Application not found'
    })
  }

  res.render('applications-2/[id]', {
    application: application
  })
})

// New application start
router.get('/applications-2/new/start', (req, res) => {
  res.render('applications-2/new/start')
})

// Redirect /applications-2/new to /applications-2/new/start
router.get('/applications-2/new', (req, res) => {
  res.redirect('/applications-2/new/start')
})

// New application location input
router.get('/applications-2/new/location', (req, res) => {
  res.render('applications-2/new/location')
})

// New application location drawing
router.get('/applications-2/new/location-draw', (req, res) => {
  res.render('applications-2/new/location-draw', {
    userData: req.session.userData || {}
  })
})

// Handle boundary data submission from map drawing
router.post('/applications-2/new/location-draw', (req, res) => {
  const boundaryData = req.body['boundary-data']

  if (boundaryData) {
    try {
      const parsedData = JSON.parse(boundaryData)

      // Store in session
      req.session.userData = req.session.userData || {}
      req.session.userData.developmentLocation = {
        center: parsedData.center,
        boundary: {
          type: 'Polygon',
          coordinates: [parsedData.coordinates]
        }
      }

      // Check EDP intersection
      const applicableEDPs = edpData.checkEDPIntersection({
        center: req.session.userData.developmentLocation.center,
        boundary: req.session.userData.developmentLocation.boundary,
        houseCount: 0 // Will be set later when house count is known
      })

      req.session.userData.applicableEDPs = applicableEDPs

      res.redirect('/applications-2/new/data')
    } catch (error) {
      res.render('applications-2/new/location-draw', {
        error: 'Invalid boundary data. Please try drawing again.',
        userData: req.session.userData || {}
      })
    }
  } else {
    res.render('applications-2/new/location-draw', {
      error: 'Please draw a boundary for your development site.',
      userData: req.session.userData || {}
    })
  }
})

// New application location postcode input
router.get('/applications-2/new/location-postcode', (req, res) => {
  res.render('applications-2/new/location-postcode')
})

// Handle postcode submission
router.post('/applications-2/new/location-postcode', (req, res) => {
  const postcode = req.body.postcode

  if (!postcode) {
    return res.render('applications-2/new/location-postcode', {
      error: 'Please enter a valid postcode.'
    })
  }

  // Mock postcode to coordinates conversion
  const mockCoordinates = {
    'SW1A 1AA': [-0.1246, 51.4994], // Westminster
    'W1A 1AA': [-0.1431, 51.4994], // Westminster
    'M1 1AA': [-2.2426, 53.4808], // Manchester
    'B1 1AA': [-1.8904, 52.4862], // Birmingham
    default: [-0.4, 51.5] // Default to London area
  }

  const coordinates =
    mockCoordinates[postcode.toUpperCase()] || mockCoordinates['default']

  // Store in session
  req.session.userData = req.session.userData || {}
  req.session.userData.developmentLocation = {
    center: coordinates,
    boundary: {
      type: 'Polygon',
      coordinates: [
        [
          [coordinates[0] - 0.01, coordinates[1] - 0.01],
          [coordinates[0] + 0.01, coordinates[1] - 0.01],
          [coordinates[0] + 0.01, coordinates[1] + 0.01],
          [coordinates[0] - 0.01, coordinates[1] + 0.01],
          [coordinates[0] - 0.01, coordinates[1] - 0.01]
        ]
      ]
    }
  }

  // Store postcode for reference
  req.session.userData.postcode = postcode

  // Render drawing page directly with session data
  res.render('applications-2/new/location-draw', {
    userData: req.session.userData || {}
  })
})

// New application location coordinates input
router.get('/applications-2/new/location-coordinates', (req, res) => {
  res.render('applications-2/new/location-coordinates')
})

// Handle coordinates submission
router.post('/applications-2/new/location-coordinates', (req, res) => {
  const latitude = parseFloat(req.body.latitude)
  const longitude = parseFloat(req.body.longitude)

  if (isNaN(latitude) || isNaN(longitude)) {
    return res.render('applications-2/new/location-coordinates', {
      error: 'Please enter valid coordinates.'
    })
  }

  // Store in session
  req.session.userData = req.session.userData || {}
  req.session.userData.developmentLocation = {
    center: [longitude, latitude],
    boundary: {
      type: 'Polygon',
      coordinates: [
        [
          [longitude - 0.01, latitude - 0.01],
          [longitude + 0.01, latitude - 0.01],
          [longitude + 0.01, latitude + 0.01],
          [longitude - 0.01, latitude + 0.01],
          [longitude - 0.01, latitude - 0.01]
        ]
      ]
    }
  }

  // Check EDP intersection
  const intersectionResult = edpData.checkEDPIntersection({
    location: req.session.userData.developmentLocation
  })

  req.session.userData.applicableEDPs = intersectionResult.applicableEDPs
  req.session.userData.intersectionDetails = intersectionResult.details

  res.redirect('/applications-2/new/data')
})

// New application location file upload
router.get('/applications-2/new/location-file-upload', (req, res) => {
  res.render('applications-2/new/location-file-upload')
})

// Handle file upload submission
router.post('/applications-2/new/location-file-upload', (req, res) => {
  const fileData = req.body['file-data']

  if (!fileData) {
    return res.render('applications-2/new/location-file-upload', {
      error: 'Please upload a valid shape file.'
    })
  }

  try {
    // Mock file processing - in real implementation would parse actual file
    const mockBoundary = {
      center: [-0.4, 51.5],
      boundary: {
        type: 'Polygon',
        coordinates: [
          [
            [-0.42, 51.48],
            [-0.38, 51.48],
            [-0.38, 51.52],
            [-0.42, 51.52],
            [-0.42, 51.48]
          ]
        ]
      }
    }

    // Store in session
    req.session.userData = req.session.userData || {}
    req.session.userData.developmentLocation = mockBoundary

    // Check EDP intersection
    const applicableEDPs = edpData.checkEDPIntersection({
      center: req.session.userData.developmentLocation.center,
      boundary: req.session.userData.developmentLocation.boundary,
      houseCount: 0 // Will be set later when house count is known
    })

    req.session.userData.applicableEDPs = applicableEDPs

    res.redirect('/applications-2/new/data')
  } catch (error) {
    res.render('applications-2/new/location-file-upload', {
      error: 'Invalid file format. Please upload a valid shape file.'
    })
  }
})

// New application data collection
router.get('/applications-2/new/data', (req, res) => {
  const userData = req.session.userData || {}

  if (!userData.developmentLocation) {
    return res.redirect('/applications-2/new/location')
  }

  const applicableEDPs = userData.applicableEDPs || []
  const wastewaterSites = edpData.getWastewaterTreatmentSites(
    userData.developmentLocation
  )

  res.render('applications-2/new/data', {
    applicableEDPs: applicableEDPs,
    wastewaterSites: wastewaterSites,
    userData: userData
  })
})

// Handle data collection submission
router.post('/applications-2/new/data', (req, res) => {
  const developmentName = req.body['development-name']
  const houseCount = parseInt(req.body['house-count'])
  const wastewaterSite = req.body['wastewater-site']

  if (!developmentName || !houseCount || houseCount <= 0) {
    return res.render('applications-2/new/data', {
      error: 'Please provide a development name and valid house count.',
      userData: req.session.userData || {}
    })
  }

  // Store in session
  req.session.userData = req.session.userData || {}
  req.session.userData.developmentName = developmentName
  req.session.userData.houseCount = houseCount
  req.session.userData.wastewaterSite = wastewaterSite

  // Recalculate EDP intersection with house count
  const developmentSite = {
    center: req.session.userData.developmentLocation.center,
    boundary: req.session.userData.developmentLocation.boundary,
    houseCount: houseCount
  }

  const applicableEDPs = edpData.checkEDPIntersection(developmentSite)
  let totalLevy = 0
  const breakdown = []

  applicableEDPs.forEach((edp) => {
    const amount = edp.rate * houseCount
    totalLevy += amount
    breakdown.push({
      edpType: edp.type,
      description: edp.name,
      rate: edp.rate,
      houseCount: houseCount,
      amount: amount
    })
  })

  req.session.userData.quote = {
    total: totalLevy,
    breakdown: breakdown
  }

  // Store the recalculated EDPs with impact
  req.session.userData.applicableEDPs = applicableEDPs

  res.redirect('/applications-2/new/summary')
})

// New application summary
router.get('/applications-2/new/summary', (req, res) => {
  const userData = req.session.userData || {}

  if (!userData.developmentLocation || !userData.quote) {
    return res.redirect('/applications-2/new/location')
  }

  res.render('applications-2/new/summary', {
    userData: userData
  })
})

// Handle quote acceptance
router.post('/applications-2/new/summary', (req, res) => {
  const userData = req.session.userData || {}

  if (!userData.developmentLocation || !userData.quote) {
    return res.redirect('/applications-2/new/location')
  }

  // Create application
  const applicationData = {
    userId: 'user-001',
    developmentName: userData.developmentName,
    houseCount: userData.houseCount,
    location: userData.developmentLocation,
    applicableEDPs: userData.applicableEDPs || [],
    quote: userData.quote,
    wastewaterSite: userData.wastewaterSite
  }

  const newApplication = applicationsData.createApplication(applicationData)

  // Store application ID in session for payment
  req.session.userData.applicationId = newApplication.id

  res.redirect('/applications-2/new/payment')
})

// New application payment
router.get('/applications-2/new/payment', (req, res) => {
  const userData = req.session.userData || {}
  const applicationId = userData.applicationId

  if (!applicationId) {
    return res.redirect('/applications-2/new/start')
  }

  const application = applicationsData.getApplicationById(applicationId)

  if (!application) {
    return res.redirect('/applications-2/new/start')
  }

  res.render('applications-2/new/payment', {
    application: application
  })
})

// Handle payment submission
router.post('/applications-2/new/payment', (req, res) => {
  const userData = req.session.userData || {}
  const applicationId = userData.applicationId

  if (!applicationId) {
    return res.redirect('/applications-2/new/start')
  }

  // Mock payment processing
  const paymentReference = 'PAY-REF-' + Date.now()

  // Update application status
  applicationsData.updateApplication(applicationId, {
    status: 'paid',
    paymentStatus: 'completed',
    paymentReference: paymentReference
  })

  res.redirect('/applications-2/new/payment-confirmation')
})

// New application payment confirmation
router.get('/applications-2/new/payment-confirmation', (req, res) => {
  const userData = req.session.userData || {}
  const applicationId = userData.applicationId

  if (!applicationId) {
    return res.redirect('/applications-2/new/start')
  }

  const application = applicationsData.getApplicationById(applicationId)

  if (!application) {
    return res.redirect('/applications-2/new/start')
  }

  res.render('applications-2/new/payment-confirmation', {
    application: application
  })
})

module.exports = router
