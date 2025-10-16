//
// Applications Routes - Environmental Development Plan Levy Calculator
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

// Import data modules
const applicationsData = require('../data/applications.js')
const edpData = require('../data/edp-data.js')

// Main applications dashboard
router.get('/applications', (req, res) => {
    const userId = 'user-001' // Mock user ID
    const applications = applicationsData.getUserApplications(userId)

    res.render('applications/index', {
        applications: applications
    })
})

// New application start
router.get('/applications/new/start', (req, res) => {
    res.render('applications/new/start')
})

// Redirect /applications/new to /applications/new/start
router.get('/applications/new', (req, res) => {
    res.redirect('/applications/new/start')
})

// New application location input
router.get('/applications/new/location', (req, res) => {
    res.render('applications/new/location')
})

// New application location drawing
router.get('/applications/new/location-draw', (req, res) => {
    res.render('applications/new/location-draw')
})

// Handle boundary data submission from map drawing
router.post('/applications/new/location-draw', (req, res) => {
    const boundaryData = req.body['boundary-data'];

    if (boundaryData) {
        try {
            const parsedData = JSON.parse(boundaryData);

            // Store in session
            req.session.userData = req.session.userData || {};
            req.session.userData.developmentLocation = {
                center: parsedData.center,
                boundary: {
                    type: 'Polygon',
                    coordinates: [parsedData.points]
                }
            };

            res.redirect('/applications/new/data');
        } catch (error) {
            console.error('Error parsing boundary data:', error);
            res.redirect('/applications/new/location-draw');
        }
    } else {
        res.redirect('/applications/new/location-draw');
    }
})

// New application location postcode input
router.get('/applications/new/location-postcode', (req, res) => {
    res.render('applications/new/location-postcode')
})

// New application location coordinates input
router.get('/applications/new/location-coordinates', (req, res) => {
    res.render('applications/new/location-coordinates')
})

// New application location file upload
router.get('/applications/new/location-file-upload', (req, res) => {
    res.render('applications/new/location-file-upload')
})

// Handle file upload submission
router.post('/applications/new/location-file-upload', (req, res) => {
    // Mock file processing - in a real implementation, this would process the uploaded file
    const mockBoundaryData = {
        center: [-0.4, 51.5],
        boundary: {
            type: 'Polygon',
            coordinates: [[
                [-0.42, 51.48],
                [-0.38, 51.48],
                [-0.38, 51.52],
                [-0.42, 51.52],
                [-0.42, 51.48]
            ]]
        }
    };

    // Store in session
    req.session.userData = req.session.userData || {};
    req.session.userData.developmentLocation = mockBoundaryData;

    res.redirect('/applications/new/data');
})

// Handle location method selection
router.post('/applications/new/location', (req, res) => {
    const locationMethod = req.body['location-method']

    if (!locationMethod) {
        return res.render('applications/new/location', {
            error: 'Please select a location method'
        })
    }

    // Store location method in session
    req.session.userData = req.session.userData || {}
    req.session.userData.locationMethod = locationMethod

    // For demo purposes, redirect to data collection with mock EDP data
    res.redirect('/applications/new/data')
})

// New application data collection
router.get('/applications/new/data', (req, res) => {
    // Get development location from session or use mock data
    let developmentLocation;

    if (req.session.userData && req.session.userData.developmentLocation) {
        developmentLocation = req.session.userData.developmentLocation;
    } else {
        // Mock development location for demo - testing DLL boundaries
        developmentLocation = {
            center: [-0.4, 51.5], // This falls within Thames Valley DLL area
            boundary: {
                type: 'Polygon',
                coordinates: [[
                    [-0.42, 51.48],
                    [-0.38, 51.48],
                    [-0.38, 51.52],
                    [-0.42, 51.52],
                    [-0.42, 51.48]
                ]]
            }
        };
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

    res.render('applications/new/data', {
        applicableEDPs: applicableEDPs,
        wastewaterSites: wastewaterSites,
        developmentLocation: developmentLocation
    })
})

// Handle data collection form submission
router.post('/applications/new/data', (req, res) => {
    const formData = req.body

    // Store form data in session
    req.session.userData = req.session.userData || {}
    req.session.userData.developmentName = formData['development-name']
    req.session.userData.houseCount = parseInt(formData['house-count'])
    req.session.userData.wastewaterTreatmentSite = formData['wastewater-site']

    // Get development location from session or use mock data
    let developmentLocation;

    if (req.session.userData.developmentLocation) {
        developmentLocation = req.session.userData.developmentLocation;
    } else {
        // Mock development location for demo
        developmentLocation = {
            center: [-0.4, 51.5],
            boundary: {
                type: 'Polygon',
                coordinates: [[
                    [-0.42, 51.48],
                    [-0.38, 51.48],
                    [-0.38, 51.52],
                    [-0.42, 51.52],
                    [-0.42, 51.48]
                ]]
            }
        };
    }

    const applicableEDPs = edpData.checkEDPIntersection({
        center: developmentLocation.center,
        boundary: developmentLocation.boundary,
        houseCount: req.session.userData.houseCount
    })

    // Calculate quote
    const quote = {
        total: applicableEDPs.reduce((sum, edp) => sum + edp.impact, 0),
        breakdown: applicableEDPs.map(edp => ({
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

    res.redirect('/applications/new/summary')
})

// New application summary and quote
router.get('/applications/new/summary', (req, res) => {
    const userData = req.session.userData || {}

    if (!userData.quote) {
        return res.redirect('/applications/new/data')
    }

    res.render('applications/new/summary', {
        quote: userData.quote,
        developmentName: userData.developmentName,
        houseCount: userData.houseCount,
        developmentLocation: userData.developmentLocation,
        applicableEDPs: userData.applicableEDPs
    })
})

// New application payment
router.get('/applications/new/payment', (req, res) => {
    const userData = req.session.userData || {}

    if (!userData.quote) {
        return res.redirect('/applications/new/summary')
    }

    // Generate mock application ID
    const applicationId = 'APP-' + Date.now().toString().slice(-6)

    res.render('applications/new/payment', {
        quote: userData.quote,
        applicationId: applicationId,
        developmentName: userData.developmentName
    })
})

// Payment confirmation
router.get('/applications/new/payment-confirmation', (req, res) => {
    const userData = req.session.userData || {}

    if (!userData.quote) {
        return res.redirect('/applications/new/summary')
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

    res.render('applications/new/payment-confirmation', {
        applicationId: newApplication.id,
        developmentName: userData.developmentName,
        paymentReference: paymentReference,
        quote: userData.quote,
        submissionDate: new Date().toISOString()
    })
})

// Application details view
router.get('/applications/:id', (req, res) => {
    const applicationId = req.params.id
    const application = applicationsData.getApplicationById(applicationId)

    if (!application) {
        return res.status(404).render('error', {
            message: 'Application not found'
        })
    }

    res.render('applications/[id]', {
        application: application
    })
})

// Application payment (for existing applications)
router.get('/applications/:id/payment', (req, res) => {
    const applicationId = req.params.id
    const application = applicationsData.getApplicationById(applicationId)

    if (!application) {
        return res.status(404).render('error', {
            message: 'Application not found'
        })
    }

    if (application.status !== 'pending_payment') {
        return res.redirect(`/applications/${applicationId}`)
    }

    res.render('applications/new/payment', {
        quote: application.quote,
        applicationId: application.id,
        developmentName: application.developmentName
    })
})

module.exports = router
