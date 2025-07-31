//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

// Add your routes here

// User Journey 1 - Digital Application Process
router.get('/user-journey-1/start', (req, res) => {
    res.render('user-journey-1/start')
})

// EDP Search - Development Site Assessment and Environmental Impact Calculation
router.get('/edp-search/start', (req, res) => {
    res.render('edp-search/start')
})

router.get('/edp-search/location', (req, res) => {
    res.render('edp-search/location')
})

router.get('/edp-search/location/file-upload', (req, res) => {
    res.render('edp-search/location-file-upload')
})

router.get('/edp-search/location/postcode', (req, res) => {
    res.render('edp-search/location-postcode')
})

router.get('/edp-search/location/coordinates', (req, res) => {
    res.render('edp-search/location-coordinates')
})

router.get('/edp-search/location/draw', (req, res) => {
    res.render('edp-search/location-draw')
})

router.get('/edp-search/details', (req, res) => {
    res.render('edp-search/details')
})

router.get('/edp-search/summary', (req, res) => {
    res.render('edp-search/summary')
})

router.get('/edp-search/print', (req, res) => {
    res.render('edp-search/print')
})

// Applications - Environmental Development Plan Levy Calculator
const applicationsData = require('./data/applications.js')
const edpData = require('./data/edp-data.js')
const caseManagementData = require('./data/case-management.js')

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

// Applications-1 - Environmental Development Plan Levy Calculator (Updated Routes)
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

    res.redirect('/applications-1/new/data');
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
    let developmentLocation;

    if (req.session.userData && req.session.userData.developmentLocation) {
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

    res.redirect('/applications-1/new/summary')
})

// New application-1 summary and quote
router.get('/applications-1/new/summary', (req, res) => {
    const userData = req.session.userData || {}

    if (!userData.quote) {
        return res.redirect('/applications-1/new/data')
    }

    // Serialize the objects as JSON strings for the template
    const developmentLocationJson = JSON.stringify(userData.developmentLocation || null);
    const applicableEDPsJson = JSON.stringify(userData.applicableEDPs || []);

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

// Applications-2 - Enhanced Environmental Development Plan Levy Calculator
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
                    coordinates: [parsedData.coordinates]
                }
            };

            // Check EDP intersection
            const applicableEDPs = edpData.checkEDPIntersection({
                center: req.session.userData.developmentLocation.center,
                boundary: req.session.userData.developmentLocation.boundary,
                houseCount: 0 // Will be set later when house count is known
            });

            req.session.userData.applicableEDPs = applicableEDPs;

            res.redirect('/applications-2/new/data');
        } catch (error) {
            res.render('applications-2/new/location-draw', {
                error: 'Invalid boundary data. Please try drawing again.',
                userData: req.session.userData || {}
            });
        }
    } else {
        res.render('applications-2/new/location-draw', {
            error: 'Please draw a boundary for your development site.',
            userData: req.session.userData || {}
        });
    }
});

// New application location postcode input
router.get('/applications-2/new/location-postcode', (req, res) => {
    res.render('applications-2/new/location-postcode')
})

// Handle postcode submission
router.post('/applications-2/new/location-postcode', (req, res) => {
    const postcode = req.body.postcode;

    if (!postcode) {
        return res.render('applications-2/new/location-postcode', {
            error: 'Please enter a valid postcode.'
        });
    }

    // Mock postcode to coordinates conversion
    const mockCoordinates = {
        'SW1A 1AA': [-0.1246, 51.4994], // Westminster
        'W1A 1AA': [-0.1431, 51.4994],  // Westminster
        'M1 1AA': [-2.2426, 53.4808],   // Manchester
        'B1 1AA': [-1.8904, 52.4862],   // Birmingham
        'default': [-0.4, 51.5]          // Default to London area
    };

    const coordinates = mockCoordinates[postcode.toUpperCase()] || mockCoordinates['default'];

    // Store in session
    req.session.userData = req.session.userData || {};
    req.session.userData.developmentLocation = {
        center: coordinates,
        boundary: {
            type: 'Polygon',
            coordinates: [[
                [coordinates[0] - 0.01, coordinates[1] - 0.01],
                [coordinates[0] + 0.01, coordinates[1] - 0.01],
                [coordinates[0] + 0.01, coordinates[1] + 0.01],
                [coordinates[0] - 0.01, coordinates[1] + 0.01],
                [coordinates[0] - 0.01, coordinates[1] - 0.01]
            ]]
        }
    };

    // Store postcode for reference
    req.session.userData.postcode = postcode;

    // Render drawing page directly with session data
    res.render('applications-2/new/location-draw', {
        userData: req.session.userData || {}
    });
});

// New application location coordinates input
router.get('/applications-2/new/location-coordinates', (req, res) => {
    res.render('applications-2/new/location-coordinates')
})

// Handle coordinates submission
router.post('/applications-2/new/location-coordinates', (req, res) => {
    const latitude = parseFloat(req.body.latitude);
    const longitude = parseFloat(req.body.longitude);

    if (isNaN(latitude) || isNaN(longitude)) {
        return res.render('applications-2/new/location-coordinates', {
            error: 'Please enter valid coordinates.'
        });
    }

    // Store in session
    req.session.userData = req.session.userData || {};
    req.session.userData.developmentLocation = {
        center: [longitude, latitude],
        boundary: {
            type: 'Polygon',
            coordinates: [[
                [longitude - 0.01, latitude - 0.01],
                [longitude + 0.01, latitude - 0.01],
                [longitude + 0.01, latitude + 0.01],
                [longitude - 0.01, latitude + 0.01],
                [longitude - 0.01, latitude - 0.01]
            ]]
        }
    };

    // Check EDP intersection
    const intersectionResult = edpData.checkEDPIntersection({
        location: req.session.userData.developmentLocation
    });

    req.session.userData.applicableEDPs = intersectionResult.applicableEDPs;
    req.session.userData.intersectionDetails = intersectionResult.details;

    res.redirect('/applications-2/new/data');
});

// New application location file upload
router.get('/applications-2/new/location-file-upload', (req, res) => {
    res.render('applications-2/new/location-file-upload')
})

// Handle file upload submission
router.post('/applications-2/new/location-file-upload', (req, res) => {
    const fileData = req.body['file-data'];

    if (!fileData) {
        return res.render('applications-2/new/location-file-upload', {
            error: 'Please upload a valid shape file.'
        });
    }

    try {
        // Mock file processing - in real implementation would parse actual file
        const mockBoundary = {
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
        req.session.userData.developmentLocation = mockBoundary;

        // Check EDP intersection
        const applicableEDPs = edpData.checkEDPIntersection({
            center: req.session.userData.developmentLocation.center,
            boundary: req.session.userData.developmentLocation.boundary,
            houseCount: 0 // Will be set later when house count is known
        });

        req.session.userData.applicableEDPs = applicableEDPs;

        res.redirect('/applications-2/new/data');
    } catch (error) {
        res.render('applications-2/new/location-file-upload', {
            error: 'Invalid file format. Please upload a valid shape file.'
        });
    }
});

// New application data collection
router.get('/applications-2/new/data', (req, res) => {
    const userData = req.session.userData || {};

    if (!userData.developmentLocation) {
        return res.redirect('/applications-2/new/location');
    }

    const applicableEDPs = userData.applicableEDPs || [];
    const wastewaterSites = edpData.getWastewaterTreatmentSites(userData.developmentLocation);

    res.render('applications-2/new/data', {
        applicableEDPs: applicableEDPs,
        wastewaterSites: wastewaterSites,
        userData: userData
    });
});

// Handle data collection submission
router.post('/applications-2/new/data', (req, res) => {
    const developmentName = req.body['development-name'];
    const houseCount = parseInt(req.body['house-count']);
    const wastewaterSite = req.body['wastewater-site'];

    if (!developmentName || !houseCount || houseCount <= 0) {
        return res.render('applications-2/new/data', {
            error: 'Please provide a development name and valid house count.',
            userData: req.session.userData || {}
        });
    }

    // Store in session
    req.session.userData = req.session.userData || {};
    req.session.userData.developmentName = developmentName;
    req.session.userData.houseCount = houseCount;
    req.session.userData.wastewaterSite = wastewaterSite;

    // Recalculate EDP intersection with house count
    const developmentSite = {
        center: req.session.userData.developmentLocation.center,
        boundary: req.session.userData.developmentLocation.boundary,
        houseCount: houseCount
    };

    const applicableEDPs = edpData.checkEDPIntersection(developmentSite);
    let totalLevy = 0;
    const breakdown = [];

    applicableEDPs.forEach(edp => {
        const amount = edp.rate * houseCount;
        totalLevy += amount;
        breakdown.push({
            edpType: edp.type,
            description: edp.name,
            rate: edp.rate,
            houseCount: houseCount,
            amount: amount
        });
    });

    req.session.userData.quote = {
        total: totalLevy,
        breakdown: breakdown
    };

    // Store the recalculated EDPs with impact
    req.session.userData.applicableEDPs = applicableEDPs;

    res.redirect('/applications-2/new/summary');
});

// New application summary
router.get('/applications-2/new/summary', (req, res) => {
    const userData = req.session.userData || {};

    if (!userData.developmentLocation || !userData.quote) {
        return res.redirect('/applications-2/new/location');
    }

    res.render('applications-2/new/summary', {
        userData: userData
    });
});

// Handle quote acceptance
router.post('/applications-2/new/summary', (req, res) => {
    const userData = req.session.userData || {};

    if (!userData.developmentLocation || !userData.quote) {
        return res.redirect('/applications-2/new/location');
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
    };

    const newApplication = applicationsData.createApplication(applicationData);

    // Store application ID in session for payment
    req.session.userData.applicationId = newApplication.id;

    res.redirect('/applications-2/new/payment');
});

// New application payment
router.get('/applications-2/new/payment', (req, res) => {
    const userData = req.session.userData || {};
    const applicationId = userData.applicationId;

    if (!applicationId) {
        return res.redirect('/applications-2/new/start');
    }

    const application = applicationsData.getApplicationById(applicationId);

    if (!application) {
        return res.redirect('/applications-2/new/start');
    }

    res.render('applications-2/new/payment', {
        application: application
    });
});

// Handle payment submission
router.post('/applications-2/new/payment', (req, res) => {
    const userData = req.session.userData || {};
    const applicationId = userData.applicationId;

    if (!applicationId) {
        return res.redirect('/applications-2/new/start');
    }

    // Mock payment processing
    const paymentReference = 'PAY-REF-' + Date.now();

    // Update application status
    applicationsData.updateApplication(applicationId, {
        status: 'paid',
        paymentStatus: 'completed',
        paymentReference: paymentReference
    });

    res.redirect('/applications-2/new/payment-confirmation');
});

// New application payment confirmation
router.get('/applications-2/new/payment-confirmation', (req, res) => {
    const userData = req.session.userData || {};
    const applicationId = userData.applicationId;

    if (!applicationId) {
        return res.redirect('/applications-2/new/start');
    }

    const application = applicationsData.getApplicationById(applicationId);

    if (!application) {
        return res.redirect('/applications-2/new/start');
    }

    res.render('applications-2/new/payment-confirmation', {
        application: application
    });
});

// Case Management - Natural England Staff Application Management
// Main case management dashboard
router.get('/case-management', (req, res) => {
    const filters = {
        status: req.query.status || 'all',
        dateFrom: req.query.dateFrom || '',
        dateTo: req.query.dateTo || '',
        developmentName: req.query.developmentName || ''
    };

    const applications = caseManagementData.getFilteredApplications(filters);

    res.render('case-management/index', {
        applications: applications,
        filters: filters
    });
});

// Export applications to CSV (must come before :id route)
router.get('/case-management/export', (req, res) => {
    const filters = {
        status: req.query.status || 'all',
        dateFrom: req.query.dateFrom || '',
        dateTo: req.query.dateTo || '',
        developmentName: req.query.developmentName || ''
    };

    const applications = caseManagementData.getFilteredApplications(filters);
    const csvContent = caseManagementData.exportApplicationsToCSV(applications);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `applications-export-${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
});

// Individual application detail view
router.get('/case-management/:id', (req, res) => {
    const applicationId = req.params.id;
    const application = applicationsData.getApplicationById(applicationId);

    if (!application) {
        return res.status(404).render('error', {
            error: 'Application not found'
        });
    }

    res.render('case-management/[id]', {
        application: application
    });
});

// Edit application page
router.get('/case-management/:id/edit', (req, res) => {
    const applicationId = req.params.id;
    const application = applicationsData.getApplicationById(applicationId);

    if (!application) {
        return res.status(404).render('error', {
            error: 'Application not found'
        });
    }

    res.render('case-management/[id]/edit', {
        application: application
    });
});

// Handle application update
router.post('/case-management/:id/edit', (req, res) => {
    const applicationId = req.params.id;
    const updates = {
        developmentName: req.body.developmentName,
        houseCount: parseInt(req.body.houseCount),
        status: req.body.status
    };

    try {
        const updatedApplication = caseManagementData.updateApplicationWithAudit(
            applicationId,
            updates,
            'staff-001', // Mock staff user ID
            'ne_staff',
            req.body.reason || 'Application updated by staff'
        );

        res.redirect(`/case-management/${applicationId}`);
    } catch (error) {
        console.error('Error updating application:', error);
        res.status(500).render('error', {
            error: 'Failed to update application'
        });
    }
});

// Audit history page
router.get('/case-management/:id/audit', (req, res) => {
    const applicationId = req.params.id;
    const application = applicationsData.getApplicationById(applicationId);

    if (!application) {
        return res.status(404).render('error', {
            error: 'Application not found'
        });
    }

    const auditTrail = caseManagementData.getAuditTrail(applicationId);

    res.render('case-management/[id]/audit', {
        application: application,
        auditTrail: auditTrail
    });
});

