// LPA Application Verification - Local Planning Authority Staff Application Verification

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const applicationsData = require('../data/applications.js')
const edpData = require('../data/edp-data.js')
const caseManagementData = require('../data/case-management.js')

// Helper function to check developer match
function checkDeveloperMatch(application, developerIdentifier) {
    // For this prototype, we'll do simple matching
    // In a real system, this would check against a database of developers
    
    // Check if the identifier matches any known developer patterns
    const identifier = developerIdentifier.toLowerCase().trim()
    
    // Simple pattern matching for demo purposes
    if (application.id === 'APP-001' && 
        (identifier.includes('riverside') || identifier.includes('rdl001'))) {
        return true
    }
    
    if (application.id === 'APP-002' && 
        (identifier.includes('south east') || identifier.includes('sep002'))) {
        return true
    }
    
    if (application.id === 'APP-003' && 
        (identifier.includes('hampshire') || identifier.includes('hcl003'))) {
        return true
    }
    
    return false
}

// Main verification landing page
router.get('/lpa-verify', (req, res) => {
    res.render('lpa-verify/index')
})

// Handle verification form submission
router.post('/lpa-verify', (req, res) => {
    const applicationReference = req.body['application-reference']?.trim()
    const developerIdentifier = req.body['developer-identifier']?.trim()
    const errors = []

    // Validation
    if (!applicationReference) {
        errors.push({
            field: 'application-reference',
            message: 'Application reference is required'
        })
    } else if (!/^APP-\d{3,6}$/.test(applicationReference)) {
        errors.push({
            field: 'application-reference',
            message: 'Application reference must be in format APP-XXX'
        })
    }

    if (!developerIdentifier) {
        errors.push({
            field: 'developer-identifier',
            message: 'Developer name or company ID is required'
        })
    }

    if (errors.length > 0) {
        return res.render('lpa-verify/index', {
            errors: errors,
            applicationReference: applicationReference,
            developerIdentifier: developerIdentifier
        })
    }

    // Search for application
    const application = applicationsData.getApplicationById(applicationReference)

    if (!application) {
        return res.redirect('/lpa-verify/error')
    }

    // Check developer identifier (fuzzy matching for names, exact for company IDs)
    const developerMatch = checkDeveloperMatch(application, developerIdentifier)

    if (!developerMatch) {
        return res.redirect('/lpa-verify/error')
    }

    // Store verification attempt in session for audit
    req.session.verificationAttempt = {
        timestamp: new Date().toISOString(),
        applicationReference: applicationReference,
        developerIdentifier: developerIdentifier,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    }

    res.redirect(`/lpa-verify/details?ref=${applicationReference}`)
})

// Application details page
router.get('/lpa-verify/details', (req, res) => {
    const applicationReference = req.query.ref
    const application = applicationsData.getApplicationById(applicationReference)

    if (!application) {
        return res.redirect('/lpa-verify/error')
    }

    res.render('lpa-verify/details', {
        application: application
    })
})

// Error page for application not found
router.get('/lpa-verify/error', (req, res) => {
    res.render('lpa-verify/error')
})

module.exports = router