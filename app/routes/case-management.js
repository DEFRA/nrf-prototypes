// Case Management - Natural England Staff Application Management

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const applicationsData = require('../data/applications.js')
const edpData = require('../data/edp-data.js')
const caseManagementData = require('../data/case-management.js')

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

// Helper function to check developer match
function checkDeveloperMatch(application, developerIdentifier) {
    // In a real implementation, this would check against actual developer data
    // For now, we'll use a simple mock check based on application ID patterns

    // Mock developer data based on application ID
    const mockDevelopers = {
        'APP-001': ['Riverside Developers Ltd', 'RDL001'],
        'APP-002': ['South East Properties', 'SEP002'],
        'APP-003': ['Hampshire Coastal Ltd', 'HCL003']
    }

    const expectedDevelopers = mockDevelopers[application.id] || []

    // Check for exact match or fuzzy match
    return expectedDevelopers.some(dev =>
        dev.toLowerCase() === developerIdentifier.toLowerCase() ||
        dev.toLowerCase().includes(developerIdentifier.toLowerCase()) ||
        developerIdentifier.toLowerCase().includes(dev.toLowerCase())
    )
}

module.exports = router