//
// Applications-1 Routes - Environmental Development Plan Levy Calculator (Updated Routes)
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

// Import data modules
const applicationsData = require('../data/applications.js')
const edpData = require('../data/edp-data.js')

// Main applications-1 dashboard
router.get('/applications-1', (req, res) => {
  const userId = 'user-001' // Mock user ID
  const applications = applicationsData.getUserApplications(userId)

  res.render('applications-1/index', {
    applications: applications
  })
})

// New application-1 start
router.get('/applications-1/new/start', (req, res) => {
  res.render('applications-1/new/start')
})

// Redirect /applications-1/new to /applications-1/new/start
router.get('/applications-1/new', (req, res) => {
  res.redirect('/applications-1/new/start')
})

// New application-1 location input
router.get('/applications-1/new/location', (req, res) => {
  res.render('applications-1/new/location')
})

// New application-1 location drawing
router.get('/applications-1/new/location-draw', (req, res) => {
  res.render('applications-1/new/location-draw')
})

// Handle boundary data submission from map drawing
router.post('/applications-1/new/location-draw', (req, res) => {
  const boundaryData = req.body['boundary-data']
  const developmentName = req.body['development-name']

  if (!boundaryData) {
    return res.render('applications-1/new/location-draw', {
      error: 'Please draw a boundary on the map before continuing'
    })
  }

  try {
    const parsedData = JSON.parse(boundaryData)

    // Store the boundary data in session
    req.session.userData = req.session.userData || {}
    req.session.userData.developmentLocation = {
      center: parsedData.center,
      boundary: {
        type: 'Polygon',
        coordinates: [parsedData.points]
      }
    }

    if (developmentName) {
      req.session.userData.developmentName = developmentName
    }

    res.redirect('/applications-1/new/data')
  } catch (error) {
    console.error('Error parsing boundary data:', error)
    res.render('applications-1/new/location-draw', {
      error: 'Invalid boundary data. Please try drawing again.'
    })
  }
})

// New application-1 location postcode input
router.get('/applications-1/new/location-postcode', (req, res) => {
  res.render('applications-1/new/location-postcode')
})

// Handle postcode submission
router.post('/applications-1/new/location-postcode', (req, res) => {
  const postcode = req.body.postcode

  if (!postcode) {
    return res.render('applications-1/new/location-postcode', {
      error: 'Please enter a postcode'
    })
  }

  // Store postcode in session
  req.session.userData = req.session.userData || {}
  req.session.userData.postcode = postcode

  // Mock coordinates for the postcode (in a real app, this would geocode the postcode)
  const mockCoordinates = {
    lat: 51.5074,
    lng: -0.1278
  }

  req.session.userData.developmentLocation = {
    center: [mockCoordinates.lng, mockCoordinates.lat],
    boundary: null // Will be drawn on map
  }

  res.redirect('/applications-1/new/location-draw')
})

// New application-1 location coordinates input
router.get('/applications-1/new/location-coordinates', (req, res) => {
  res.render('applications-1/new/location-coordinates')
})

// Handle coordinates submission
router.post('/applications-1/new/location-coordinates', (req, res) => {
  const latitude = parseFloat(req.body.latitude)
  const longitude = parseFloat(req.body.longitude)

  if (!latitude || !longitude) {
    return res.render('applications-1/new/location-coordinates', {
      error: 'Please enter valid coordinates'
    })
  }

  // Store coordinates in session
  req.session.userData = req.session.userData || {}
  req.session.userData.latitude = latitude
  req.session.userData.longitude = longitude

  req.session.userData.developmentLocation = {
    center: [longitude, latitude],
    boundary: null // Will be drawn on map
  }

  res.redirect('/applications-1/new/location-draw')
})

// New application-1 location file upload
router.get('/applications-1/new/location-file-upload', (req, res) => {
  res.render('applications-1/new/location-file-upload')
})

// Handle file upload submission
router.post('/applications-1/new/location-file-upload', (req, res) => {
  // Mock file processing - in a real implementation, this would process the uploaded file
  const mockBoundaryData = {
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
  req.session.userData.developmentLocation = mockBoundaryData

  res.redirect('/applications-1/new/data')
})

// Handle location method selection
router.post('/applications-1/new/location', (req, res) => {
  const locationMethod = req.body['location-method']

  if (!locationMethod) {
    return res.render('applications-1/new/location', {
      error: 'Please select a location method'
    })
  }

  // Store location method in session
  req.session.userData = req.session.userData || {}
  req.session.userData.locationMethod = locationMethod

  // Redirect to the appropriate location input method
  switch (locationMethod) {
    case 'draw':
      res.redirect('/applications-1/new/location-draw')
      break
    case 'postcode':
      res.redirect('/applications-1/new/location-postcode')
      break
    case 'coordinates':
      res.redirect('/applications-1/new/location-coordinates')
      break
    case 'file-upload':
      res.redirect('/applications-1/new/location-file-upload')
      break
    default:
      res.redirect('/applications-1/new/data')
  }
})

// New application-1 data collection
router.get('/applications-1/new/data', (req, res) => {
  // Get development location from session or use mock data
  let developmentLocation

  if (req.session.userData && req.session.userData.developmentLocation) {
    developmentLocation = req.session.userData.developmentLocation
  } else {
    // Mock development location for demo
    developmentLocation = {
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
  }

  // EDP intersection check
  const applicableEDPs = edpData.checkEDPIntersection({
    center: developmentLocation.center,
    boundary: developmentLocation.boundary,
    houseCount: 150
  })

  // Get wastewater treatment sites
  const wastewaterSites = edpData.getWastewaterTreatmentSites({
    center: developmentLocation.center
  })

  res.render('applications-1/new/data', {
    applicableEDPs: applicableEDPs,
    wastewaterSites: wastewaterSites,
    developmentLocation: developmentLocation
  })
})

// Handle data collection form submission
router.post('/applications-1/new/data', (req, res) => {
  const formData = req.body

  // Store form data in session
  req.session.userData = req.session.userData || {}
  req.session.userData.developmentName = formData['development-name']
  req.session.userData.houseCount = parseInt(formData['house-count'])
  req.session.userData.wastewaterTreatmentSite = formData['wastewater-site']

  // Get development location from session or use mock data
  let developmentLocation

  if (req.session.userData.developmentLocation) {
    developmentLocation = req.session.userData.developmentLocation
  } else {
    // Mock development location for demo
    developmentLocation = {
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
  }

  const applicableEDPs = edpData.checkEDPIntersection({
    center: developmentLocation.center,
    boundary: developmentLocation.boundary,
    houseCount: req.session.userData.houseCount
  })

  // Calculate quote
  const quote = {
    total: applicableEDPs.reduce((sum, edp) => sum + edp.impact, 0),
    breakdown: applicableEDPs.map((edp) => ({
      edpType: edp.type,
      description: edp.name,
      rate: edp.rate,
      houseCount: req.session.userData.houseCount,
      amount: edp.impact
    }))
  }

  // Store quote in session
  req.session.userData.quote = quote
  req.session.userData.applicableEDPs = applicableEDPs
  req.session.userData.developmentLocation = developmentLocation

  res.redirect('/applications-1/new/summary')
})

// New application-1 summary and quote
router.get('/applications-1/new/summary', (req, res) => {
  const userData = req.session.userData || {}

  if (!userData.quote) {
    return res.redirect('/applications-1/new/data')
  }

  // Serialize the objects as JSON strings for the template
  const developmentLocationJson = JSON.stringify(
    userData.developmentLocation || null
  )
  const applicableEDPsJson = JSON.stringify(userData.applicableEDPs || [])

  res.render('applications-1/new/summary', {
    quote: userData.quote,
    developmentName: userData.developmentName,
    houseCount: userData.houseCount,
    developmentLocation: developmentLocationJson,
    applicableEDPs: applicableEDPsJson
  })
})

// New application-1 payment
router.get('/applications-1/new/payment', (req, res) => {
  const userData = req.session.userData || {}

  if (!userData.quote) {
    return res.redirect('/applications-1/new/summary')
  }

  // Generate mock application ID
  const applicationId = 'APP-' + Date.now().toString().slice(-6)

  res.render('applications-1/new/payment', {
    quote: userData.quote,
    applicationId: applicationId,
    developmentName: userData.developmentName
  })
})

// Payment confirmation
router.get('/applications-1/new/payment-confirmation', (req, res) => {
  const userData = req.session.userData || {}

  if (!userData.quote) {
    return res.redirect('/applications-1/new/summary')
  }

  // Generate mock application and payment data
  const applicationId = 'APP-' + Date.now().toString().slice(-6)
  const paymentReference = 'PAY-REF-' + Date.now().toString().slice(-6)

  // Create application in mock database
  const applicationData = {
    userId: 'user-001',
    developmentName: userData.developmentName,
    houseCount: userData.houseCount,
    location: userData.developmentLocation,
    applicableEDPs: userData.applicableEDPs,
    quote: userData.quote,
    wastewaterTreatmentSite: userData.wastewaterTreatmentSite
  }

  const newApplication = applicationsData.createApplication(applicationData)

  // Update application status to paid
  applicationsData.updateApplication(newApplication.id, {
    status: 'paid',
    paymentStatus: 'completed',
    paymentReference: paymentReference
  })

  // Clear session data
  req.session.userData = {}

  res.render('applications-1/new/payment-confirmation', {
    applicationId: newApplication.id,
    developmentName: userData.developmentName,
    paymentReference: paymentReference,
    quote: userData.quote,
    submissionDate: new Date().toISOString()
  })
})

// Application-1 details view
router.get('/applications-1/:id', (req, res) => {
  const applicationId = req.params.id
  const application = applicationsData.getApplicationById(applicationId)

  if (!application) {
    return res.status(404).render('error', {
      message: 'Application not found'
    })
  }

  res.render('applications-1/[id]', {
    application: application
  })
})

// Application-1 payment (for existing applications)
router.get('/applications-1/:id/payment', (req, res) => {
  const applicationId = req.params.id
  const application = applicationsData.getApplicationById(applicationId)

  if (!application) {
    return res.status(404).render('error', {
      message: 'Application not found'
    })
  }

  if (application.status !== 'pending_payment') {
    return res.redirect(`/applications-1/${applicationId}`)
  }

  res.render('applications-1/new/payment', {
    quote: application.quote,
    applicationId: application.id,
    developmentName: application.developmentName
  })
})

module.exports = router
