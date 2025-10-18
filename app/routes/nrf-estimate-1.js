//
// NRF Estimate Journey Routes - Nature Restoration Fund Levy Estimate
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const path = require('path')
const fs = require('fs')

// Mock EDP boundary data for validation
const edpBoundaries = [
    {
        name: "Thames Valley EDP",
        coordinates: [
            [-0.5, 51.3],
            [-0.3, 51.3],
            [-0.3, 51.7],
            [-0.5, 51.7],
            [-0.5, 51.3]
        ]
    },
    {
        name: "Greater Manchester EDP",
        coordinates: [
            [-2.5, 53.3],
            [-2.1, 53.3],
            [-2.1, 53.7],
            [-2.5, 53.7],
            [-2.5, 53.3]
        ]
    },
    {
        name: "West Midlands EDP",
        coordinates: [
            [-2.0, 52.3],
            [-1.6, 52.3],
            [-1.6, 52.7],
            [-2.0, 52.7],
            [-2.0, 52.3]
        ]
    },
    {
        name: "South West EDP",
        coordinates: [
            [-3.0, 50.5],
            [-2.5, 50.5],
            [-2.5, 51.0],
            [-3.0, 51.0],
            [-3.0, 50.5]
        ]
    },
    {
        name: "North East EDP",
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
    const x = point[0], y = point[1]
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        if (((polygon[i][1] > y) !== (polygon[j][1] > y)) &&
            (x < (polygon[j][0] - polygon[i][0]) * (y - polygon[i][1]) / (polygon[j][1] - polygon[i][1]) + polygon[i][0])) {
            inside = !inside
        }
    }
    return inside
}

// Helper function to check if development is within EDP boundary
function checkEDPIntersection(boundary) {
    if (!boundary || !boundary.coordinates) return null
    
    const center = boundary.center || [boundary.coordinates[0][0], boundary.coordinates[0][1]]
    
    for (const edp of edpBoundaries) {
        if (isPointInPolygon(center, edp.coordinates)) {
            return edp
        }
    }
    return null
}

// Start page
router.get('/nrf-estimate-1/start', (req, res) => {
    res.render('nrf-estimate-1/start')
})

// Handle start page submission
router.post('/nrf-estimate-1/start', (req, res) => {
    res.redirect('/nrf-estimate-1/what-would-you-like-to-do')
})

// What would you like to do page
router.get('/nrf-estimate-1/what-would-you-like-to-do', (req, res) => {
    res.render('nrf-estimate-1/what-would-you-like-to-do')
})

// Handle what would you like to do
router.post('/nrf-estimate-1/what-would-you-like-to-do', (req, res) => {
    const journeyType = req.body['journey-type']
    
    if (!journeyType) {
        return res.render('nrf-estimate-1/what-would-you-like-to-do', {
            error: 'Select if you want an estimate or if you are ready to pay the Nature Restoration Fund levy'
        })
    }
    
    // Store in session
    req.session.data = req.session.data || {}
    req.session.data.journeyType = journeyType
    
    // Route based on journey type
    if (journeyType === 'estimate') {
        res.redirect('/nrf-estimate-1/redline-map')
    } else if (journeyType === 'payment') {
        res.redirect('/nrf-estimate-1/do-you-have-an-estimate-ref')
    }
})

// Redline boundary file question
router.get('/nrf-estimate-1/redline-map', (req, res) => {
    res.render('nrf-estimate-1/redline-map')
})

// Handle redline boundary file question
router.post('/nrf-estimate-1/redline-map', (req, res) => {
    const hasRedlineBoundaryFile = req.body['has-redline-boundary-file']
    
    if (!hasRedlineBoundaryFile) {
        return res.render('nrf-estimate-1/redline-map', {
            error: 'Select yes if you have a red line boundary file'
        })
    }
    
    // Store in session
    req.session.data = req.session.data || {}
    req.session.data.hasRedlineBoundaryFile = hasRedlineBoundaryFile
    
    if (hasRedlineBoundaryFile === 'yes') {
        res.redirect('/nrf-estimate-1/upload-redline')
    } else {
        res.redirect('/nrf-estimate-1/map')
    }
})

// Upload redline boundary file
router.get('/nrf-estimate-1/upload-redline', (req, res) => {
    res.render('nrf-estimate-1/upload-redline')
})

// Handle redline file upload
router.post('/nrf-estimate-1/upload-redline', (req, res) => {
    // For prototype purposes, we'll mock the file upload
    // In a real implementation, this would use multer or similar middleware
    const fileName = req.body['file-name']
    
    if (!fileName || fileName.trim() === '') {
        console.log('No file name provided - showing error')
        return res.render('nrf-estimate-1/upload-redline', {
            error: 'Select a file to upload'
        })
    }
    
    // Check file type
    const allowedTypes = ['.shp', '.geojson']
    const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
    if (!allowedTypes.includes(fileExtension)) {
        console.log('Invalid file type:', fileExtension)
        return res.render('nrf-estimate-1/upload-redline', {
            error: 'The selected file must be a [shp,geojson]'
        })
    }
    
    // Check file size (2MB limit)
    if (redlineFile.size > 2 * 1024 * 1024) {
        return res.render('nrf-estimate-1/upload-redline', {
            error: 'The [file] must be smaller than 2MB'
        })
    }
    
    // Check if file is empty
    if (redlineFile.size === 0) {
        return res.render('nrf-estimate-1/upload-redline', {
            error: 'The selected file is empty'
        })
    }
    
    // Mock file processing - in a real implementation, this would process the uploaded file
    const mockBoundaryData = {
        center: [-0.4, 51.5],
        coordinates: [
            [-0.42, 51.48],
            [-0.38, 51.48],
            [-0.38, 51.52],
            [-0.42, 51.52],
            [-0.42, 51.48]
        ]
    }
    
    // Store in session
    req.session.data = req.session.data || {}
    req.session.data.redlineFile = fileName
    req.session.data.hasRedlineBoundaryFile = 'yes'
    req.session.data.redlineBoundaryPolygon = mockBoundaryData
    
    // Check EDP intersection
    const edpIntersection = checkEDPIntersection(mockBoundaryData)
    if (!edpIntersection) {
        res.redirect('/nrf-estimate-1/no-edp')
    } else {
        res.redirect('/nrf-estimate-1/building-type')
    }
})

// Draw polygon on map
router.get('/nrf-estimate-1/map', (req, res) => {
    const data = req.session.data || {}
    console.log('=== MAP ROUTE DEBUG ===')
    console.log('Map route - full session data:', JSON.stringify(data, null, 2))
    console.log('Map route - redlineBoundaryPolygon exists:', !!data.redlineBoundaryPolygon)
    console.log('Map route - redlineBoundaryPolygon:', data.redlineBoundaryPolygon)
    console.log('Map route - hasRedlineBoundaryFile:', data.hasRedlineBoundaryFile)
    console.log('Map route - redlineFile:', data.redlineFile)
    
    const existingBoundaryData = data.redlineBoundaryPolygon ? JSON.stringify(data.redlineBoundaryPolygon) : ''
    console.log('Map route - existingBoundaryData length:', existingBoundaryData.length)
    console.log('Map route - existingBoundaryData:', existingBoundaryData)
    console.log('=== END MAP ROUTE DEBUG ===')
    
    res.render('nrf-estimate-1/map', {
        data: data,
        existingBoundaryData: existingBoundaryData
    })
})

// Handle map polygon submission
router.post('/nrf-estimate-1/map', (req, res) => {
    const boundaryData = req.body['boundary-data']
    
    if (!boundaryData) {
        return res.render('nrf-estimate-1/map', {
            error: 'Draw a red line boundary to continue'
        })
    }
    
    try {
        const parsedData = JSON.parse(boundaryData)
        console.log('=== MAP SUBMISSION DEBUG ===')
        console.log('Parsed boundary data:', parsedData)
        console.log('Intersecting catchment:', parsedData.intersectingCatchment)
        
        // Store in session
        req.session.data = req.session.data || {}
        req.session.data.redlineBoundaryPolygon = {
            center: parsedData.center,
            coordinates: parsedData.points,
            intersectingCatchment: parsedData.intersectingCatchment
        }
        
        // Check EDP intersection - use the intersectingCatchment from the map if available
        let edpIntersection = null
        if (parsedData.intersectingCatchment) {
            // Find the EDP by name - we'll treat any catchment intersection as an EDP intersection
            edpIntersection = {
                name: parsedData.intersectingCatchment,
                type: 'catchment'
            }
            console.log('EDP intersection found:', edpIntersection)
        } else {
            // Fallback to checking intersection
            edpIntersection = checkEDPIntersection({
                center: parsedData.center,
                coordinates: parsedData.points
            })
            console.log('Fallback EDP intersection:', edpIntersection)
        }
        
        console.log('Final EDP intersection:', edpIntersection)
        console.log('=== END MAP SUBMISSION DEBUG ===')
        
        if (!edpIntersection) {
            console.log('No EDP intersection - redirecting to no-edp')
            res.redirect('/nrf-estimate-1/no-edp')
        } else {
            console.log('EDP intersection found - redirecting to building-type')
            res.redirect('/nrf-estimate-1/building-type')
        }
    } catch (error) {
        console.error('Error parsing boundary data:', error)
        res.render('nrf-estimate-1/map', {
            error: 'Draw a red line boundary to continue'
        })
    }
})

// No EDP area page
router.get('/nrf-estimate-1/no-edp', (req, res) => {
    res.render('nrf-estimate-1/no-edp')
})

// Building type selection
router.get('/nrf-estimate-1/building-type', (req, res) => {
    const data = req.session.data || {}
    const isChange = req.query.change === 'true'
    const navFromSummary = req.query.nav === 'summary'
    
    console.log('=== BUILDING TYPE GET ROUTE ===')
    console.log('Session data:', data)
    console.log('Is change:', isChange)
    console.log('Nav from summary:', navFromSummary)
    console.log('=== END GET ROUTE DEBUG ===')
    
    res.render('nrf-estimate-1/building-type', {
        data: data,
        isChange: isChange,
        navFromSummary: navFromSummary
    })
})

// Handle building type selection
router.post('/nrf-estimate-1/building-type', (req, res) => {
    const buildingTypes = req.body['building-types']
    const isChange = req.body.isChange === 'true'
    const navFromSummary = req.body.navFromSummary === 'true'
        
    // Check if no building types are selected
    // When no checkboxes are selected, buildingTypes will be undefined
    // When checkboxes are selected, buildingTypes will be a string (single) or array (multiple)
    if (!buildingTypes || buildingTypes === '_unchecked') {
        return res.render('nrf-estimate-1/building-type', {
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
    
    // Ensure buildingTypes is always an array
    const buildingTypesArray = Array.isArray(buildingTypes) ? buildingTypes : [buildingTypes]
    req.session.data.buildingTypes = buildingTypesArray
    
    // If this is a change from summary, handle adding/removing associated values
    if (isChange && navFromSummary) {
        const roomCountTypes = ['Hotel', 'House of multiple occupation (HMO)', 'Residential institution']
        const residentialType = 'Dwellinghouse'
        
        // Initialize roomCounts if it doesn't exist
        if (!req.session.data.roomCounts) {
            req.session.data.roomCounts = {}
        }
        
        // Check for removed building types and clear their associated data
        const removedTypes = previousBuildingTypes.filter(type => !buildingTypesArray.includes(type))
        removedTypes.forEach(type => {
            if (type === 'Dwellinghouse') {
                delete req.session.data.residentialBuildingCount
            } else if (type === 'Hotel') {
                delete req.session.data.roomCounts.hotelCount
            } else if (type === 'House of multiple occupation (HMO)') {
                delete req.session.data.roomCounts.hmoCount
            } else if (type === 'Residential institution') {
                delete req.session.data.roomCounts.residentialInstitutionCount
            }
        })
        
        // Check if there are actual changes to building types
        const hasChanges = JSON.stringify(previousBuildingTypes.sort()) !== JSON.stringify(buildingTypesArray.sort())
        
        // Only proceed with data collection if there are actual changes
        if (!hasChanges) {
            res.redirect('/nrf-estimate-1/summary');
            return;
        }
        
        // Check for newly added building types that need data collection
        const newlyAddedTypes = buildingTypesArray.filter(type => !previousBuildingTypes.includes(type))
        const newlyAddedRoomCountTypes = newlyAddedTypes.filter(type => roomCountTypes.includes(type))
        const newlyAddedResidentialType = newlyAddedTypes.includes(residentialType)
        
        const needsRoomCount = newlyAddedRoomCountTypes.length > 0
        const needsResidentialCount = newlyAddedResidentialType
        
        // If there are newly added building types that need data collection, collect them first
        if (needsRoomCount || needsResidentialCount) {
            if (needsResidentialCount) {
                res.redirect('/nrf-estimate-1/residential?change=true&nav=summary')
                return
            } else if (needsRoomCount) {
                // Store only the newly added building types that need room counts for processing
                req.session.data.roomCountTypes = newlyAddedRoomCountTypes
                req.session.data.currentRoomCountIndex = 0
                res.redirect('/nrf-estimate-1/room-count?change=true&nav=summary')
                return
            }
        }
        
        // If no new data collection needed, go back to summary
        res.redirect('/nrf-estimate-1/summary')
        return
    }
    
    // If this is a change from summary, redirect back to summary
    if (isChange) {
        res.redirect('/nrf-estimate-1/summary')
        return
    }
    
    // Check if non-residential development selected
    if (buildingTypesArray.includes('Non-residential development')) {
        res.redirect('/nrf-estimate-1/non-residential')
    } else {
        // Check if any building types require room counts
        const roomCountTypes = ['Hotel', 'House of multiple occupation (HMO)', 'Residential institution']
        const hasRoomCountTypes = buildingTypesArray.some(type => roomCountTypes.includes(type))
        
        if (hasRoomCountTypes) {
            // Store the building types that need room counts for processing
            req.session.data.roomCountTypes = buildingTypesArray.filter(type => roomCountTypes.includes(type))
            req.session.data.currentRoomCountIndex = 0
            res.redirect('/nrf-estimate-1/room-count')
        } else if (buildingTypesArray.includes('Dwellinghouse')) {
            res.redirect('/nrf-estimate-1/residential')
        } else {
            res.redirect('/nrf-estimate-1/email')
        }
    }
})

// Non-residential development page
router.get('/nrf-estimate-1/non-residential', (req, res) => {
    res.render('nrf-estimate-1/non-residential')
})

// Room count page (for Hotel, HMO, Residential institution)
router.get('/nrf-estimate-1/room-count', (req, res) => {
    const data = req.session.data || {}
    const isChange = req.query.change === 'true'
    const navFromSummary = req.query.nav === 'summary'
    const error = req.query.error
    const roomCountTypes = data.roomCountTypes || []
    
    const currentIndex = data.currentRoomCountIndex || 0
    
    if (currentIndex >= roomCountTypes.length) {
        // All room counts collected, move to next step
        if (isChange && navFromSummary) {
            res.redirect('/nrf-estimate-1/summary')
        } else if (isChange) {
            res.redirect('/nrf-estimate-1/summary')
        } else if (data.buildingTypes && data.buildingTypes.includes('Dwellinghouse')) {
            res.redirect('/nrf-estimate-1/residential')
        } else {
            res.redirect('/nrf-estimate-1/email')
        }
        return
    }
    
    const currentBuildingType = roomCountTypes[currentIndex]
    res.render('nrf-estimate-1/room-count', {
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
router.post('/nrf-estimate-1/room-count', (req, res) => {
    const data = req.session.data || {}
    const roomCountTypes = data.roomCountTypes || []
    const currentIndex = data.currentRoomCountIndex || 0
    const currentBuildingType = roomCountTypes[currentIndex]
    const isChange = req.body.isChange === 'true'
    const navFromSummary = req.body.navFromSummary === 'true'
    
    let roomCount = req.body['room-count']
    
    if (!roomCount || isNaN(roomCount) || roomCount < 1) {
        // Build redirect URL with query parameters
        let redirectUrl = '/nrf-estimate-1/room-count?'
        if (isChange) redirectUrl += 'change=true&'
        if (navFromSummary) redirectUrl += 'nav=summary&'
        redirectUrl = redirectUrl.replace(/&$/, '') // Remove trailing &
        
        return res.redirect(redirectUrl + '&error=Enter the number of rooms to continue')
    }
    
    // Store the room count for this building type
    req.session.data = req.session.data || {}
    if (!req.session.data.roomCounts) {
        req.session.data.roomCounts = {}
    }
    
    // Map building types to their data keys
    const typeMapping = {
        'Hotel': 'hotelCount',
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
        res.redirect('/nrf-estimate-1/summary');
        return;
    }
    
    if (currentIndex + 1 >= roomCountTypes.length) {
        // All room counts collected, move to next step
        if (isChange) {
            res.redirect('/nrf-estimate-1/summary')
        } else if (data.buildingTypes && data.buildingTypes.includes('Dwellinghouse')) {
            res.redirect('/nrf-estimate-1/residential')
        } else {
            res.redirect('/nrf-estimate-1/email')
        }
    } else {
        // Move to next building type
        res.redirect('/nrf-estimate-1/room-count')
    }
})

// Residential building count
router.get('/nrf-estimate-1/residential', (req, res) => {
    const data = req.session.data || {}
    const isChange = req.query.change === 'true'
    const navFromSummary = req.query.nav === 'summary'
    
    res.render('nrf-estimate-1/residential', {
        data: data,
        isChange: isChange,
        navFromSummary: navFromSummary
    })
})

// Handle residential building count
router.post('/nrf-estimate-1/residential', (req, res) => {
    const residentialBuildingCount = req.body['residential-building-count']
    const isChange = req.body.isChange === 'true'
    const navFromSummary = req.body.navFromSummary === 'true'
    
    if (!residentialBuildingCount || isNaN(residentialBuildingCount) || residentialBuildingCount < 1) {
        return res.render('nrf-estimate-1/residential', {
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
        res.redirect('/nrf-estimate-1/summary')
        return
    } else if (isChange) {
        res.redirect('/nrf-estimate-1/summary')
        return
    }
    
    res.redirect('/nrf-estimate-1/email')
})

// Residential institution room count
router.get('/nrf-estimate-1/residential-institution', (req, res) => {
    res.render('nrf-estimate-1/residential-institution')
})

// Handle residential institution room count
router.post('/nrf-estimate-1/residential-institution', (req, res) => {
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
    if (buildingTypes.includes('Residential institution') || buildingTypes.includes('Secure residential institution')) {
        residentialInstitutionCount = req.body['residential-accommodation-count']
        if (!residentialInstitutionCount || isNaN(residentialInstitutionCount) || residentialInstitutionCount < 1) {
            error = 'Enter the number of rooms to continue'
        }
    }
    
    if (error) {
        return res.render('nrf-estimate-1/residential-institution', {
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
        req.session.data.residentialInstitutionCount = parseInt(residentialInstitutionCount)
    }
    
    res.redirect('/nrf-estimate-1/email')
})

// Email entry
router.get('/nrf-estimate-1/email', (req, res) => {
    const data = req.session.data || {}
    const isChange = req.query.change === 'true'
    const navFromSummary = req.query.nav === 'summary'
    
    res.render('nrf-estimate-1/email', {
        data: data,
        isChange: isChange,
        navFromSummary: navFromSummary
    })
})

// Handle email submission
router.post('/nrf-estimate-1/email', (req, res) => {
    const email = req.body['email']
    const isChange = req.body.isChange === 'true'
    const navFromSummary = req.body.navFromSummary === 'true'
    
    if (!email) {
        return res.render('nrf-estimate-1/email', {
            error: 'Enter your email address to continue',
            data: req.session.data || {},
            isChange: isChange,
            navFromSummary: navFromSummary
        })
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
        return res.render('nrf-estimate-1/email', {
            error: 'Enter an email address in the correct format, like name@example.com',
            data: req.session.data || {},
            isChange: isChange,
            navFromSummary: navFromSummary
        })
    }
    
    // Store in session
    req.session.data = req.session.data || {}
    req.session.data.email = email
    
    // If this is a change from summary, redirect back to summary
    if (isChange && navFromSummary) {
        res.redirect('/nrf-estimate-1/summary')
        return
    } else if (isChange) {
        res.redirect('/nrf-estimate-1/summary')
        return
    }
    
    res.redirect('/nrf-estimate-1/summary')
})

// Summary page
router.get('/nrf-estimate-1/summary', (req, res) => {
    const data = req.session.data || {}
    console.log('=== SUMMARY ROUTE DEBUG ===')
    console.log('Summary route - redlineBoundaryPolygon exists:', !!data.redlineBoundaryPolygon)
    console.log('Summary route - redlineBoundaryPolygon:', data.redlineBoundaryPolygon)
    console.log('Summary route - planningRef exists:', !!data.planningRef)
    console.log('Summary route - journeyType:', data.journeyType)
    console.log('=== END SUMMARY ROUTE DEBUG ===')
    
    // Check if this is a payment journey
    if (data.journeyType === 'payment') {
        // Payment journey - check for planning reference
        if (!data.planningRef) {
            return res.redirect('/nrf-estimate-1/planning-ref')
        }
        // Render payment summary
        res.render('nrf-estimate-1/payment-summary', {
            data: data
        })
    } else {
        // Estimate journey - check for email
        if (!data.email) {
            return res.redirect('/nrf-estimate-1/email')
        }
        // Render estimate summary
        res.render('nrf-estimate-1/summary', {
            data: data
        })
    }
})

// Handle summary submission
router.post('/nrf-estimate-1/summary', (req, res) => {
    const data = req.session.data || {}
    
    // Check if this is a payment journey
    if (data.journeyType === 'payment') {
        // Payment journey - generate payment reference
        const paymentReference = 'PAY-' + Date.now().toString().slice(-6)
        
        // Store payment reference in session
        req.session.data = req.session.data || {}
        req.session.data.paymentReference = paymentReference
        
        res.redirect('/nrf-estimate-1/payment-confirmation')
    } else {
        // Estimate journey - generate estimate reference
        const estimateReference = 'EST-' + Date.now().toString().slice(-6)
        
        // Store estimate reference in session
        req.session.data = req.session.data || {}
        req.session.data.estimateReference = estimateReference
        
        res.redirect('/nrf-estimate-1/confirmation')
    }
})

// Confirmation page
router.get('/nrf-estimate-1/confirmation', (req, res) => {
    const data = req.session.data || {}
    
    if (!data.estimateReference) {
        return res.redirect('/nrf-estimate-1/summary')
    }
    
    res.render('nrf-estimate-1/confirmation', {
        data: data
    })
})

// Serve GeoJSON catchment data
router.get('/nrf-estimate-1/catchments.geojson', (req, res) => {
    try {
        const geojsonPath = path.join(__dirname, '../assets/catchments_nn_catchments_03_2024.geojson')
        
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
router.get('/nrf-estimate-1/estimate-email-content', (req, res) => {
    const data = req.session.data || {}
    
    if (!data.estimateReference) {
        return res.redirect('/nrf-estimate-1/summary')
    }
    
    res.render('nrf-estimate-1/estimate-email-content', {
        data: data
    })
})

// ===== PAYMENT JOURNEY ROUTES =====

// Do you have an estimate reference?
router.get('/nrf-estimate-1/do-you-have-an-estimate-ref', (req, res) => {
    res.render('nrf-estimate-1/do-you-have-an-estimate-ref')
})

// Handle estimate reference question
router.post('/nrf-estimate-1/do-you-have-an-estimate-ref', (req, res) => {
    const hasEstimateRef = req.body['has-estimate-ref']
    
    if (!hasEstimateRef) {
        return res.render('nrf-estimate-1/do-you-have-an-estimate-ref', {
            error: 'Select yes if you have an estimate reference'
        })
    }
    
    // Store in session
    req.session.data = req.session.data || {}
    req.session.data.hasEstimateRef = hasEstimateRef
    
    if (hasEstimateRef === 'yes') {
        res.redirect('/nrf-estimate-1/enter-estimate-ref')
    } else {
        res.redirect('/nrf-estimate-1/retrieve-estimate-email')
    }
})

// Enter your estimate reference
router.get('/nrf-estimate-1/enter-estimate-ref', (req, res) => {
    res.render('nrf-estimate-1/enter-estimate-ref')
})

// Handle estimate reference entry
router.post('/nrf-estimate-1/enter-estimate-ref', (req, res) => {
    const estimateRef = req.body['estimate-ref']
    
    if (!estimateRef || estimateRef.trim() === '') {
        return res.render('nrf-estimate-1/enter-estimate-ref', {
            error: 'Enter your estimate reference to continue'
        })
    }
    
    // Basic validation - should be a number
    if (isNaN(estimateRef)) {
        return res.render('nrf-estimate-1/enter-estimate-ref', {
            error: 'Enter a valid estimate reference number'
        })
    }
    
    // Store in session
    req.session.data = req.session.data || {}
    req.session.data.estimateRef = estimateRef
    
    res.redirect('/nrf-estimate-1/retrieve-estimate-email')
})

// Retrieve estimate email entry
router.get('/nrf-estimate-1/retrieve-estimate-email', (req, res) => {
    res.render('nrf-estimate-1/retrieve-estimate-email')
})

// Handle retrieve estimate email
router.post('/nrf-estimate-1/retrieve-estimate-email', (req, res) => {
    const email = req.body['email']
    
    if (!email) {
        return res.render('nrf-estimate-1/retrieve-estimate-email', {
            error: 'Enter your email address to continue'
        })
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
        return res.render('nrf-estimate-1/retrieve-estimate-email', {
            error: 'Enter an email address in the correct format, like name@example.com'
        })
    }
    
    // Store in session
    req.session.data = req.session.data || {}
    req.session.data.email = email
    
    res.redirect('/nrf-estimate-1/estimate-email-retrieval-content')
})

// Email sent with magic link to estimate
router.get('/nrf-estimate-1/estimate-email-retrieval-content', (req, res) => {
    res.render('nrf-estimate-1/estimate-email-retrieval-content')
})

// Handle email retrieval content submission
router.post('/nrf-estimate-1/estimate-email-retrieval-content', (req, res) => {
    res.redirect('/nrf-estimate-1/planning-ref')
})

// Enter your planning reference
router.get('/nrf-estimate-1/planning-ref', (req, res) => {
    res.render('nrf-estimate-1/planning-ref')
})

// Handle planning reference entry
router.post('/nrf-estimate-1/planning-ref', (req, res) => {
    const planningRef = req.body['planning-ref']
    
    if (!planningRef || planningRef.trim() === '') {
        return res.render('nrf-estimate-1/planning-ref', {
            error: 'Enter your planning reference to continue'
        })
    }
    
    // Store in session
    req.session.data = req.session.data || {}
    req.session.data.planningRef = planningRef
    
    res.redirect('/nrf-estimate-1/summary')
})


// Payment confirmation page
router.get('/nrf-estimate-1/payment-confirmation', (req, res) => {
    const data = req.session.data || {}
    
    if (!data.paymentReference) {
        return res.redirect('/nrf-estimate-1/summary')
    }
    
    res.render('nrf-estimate-1/payment-confirmation', {
        data: data
    })
})

// Estimate confirmation email page
router.get('/nrf-estimate-1/estimate-confirmation-email', (req, res) => {
    const data = req.session.data || {}
    
    res.render('nrf-estimate-1/estimate-confirmation-email', {
        data: data
    })
})

// Payment email page
router.get('/nrf-estimate-1/payment-email', (req, res) => {
    const data = req.session.data || {}
    
    res.render('nrf-estimate-1/payment-email', {
        data: data
    })
})

module.exports = router
