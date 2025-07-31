// Case Management Data - Natural England Staff Functions
// Extends the existing applications data with staff-specific functionality

const applicationsData = require('./applications.js')

// Get all applications for staff view (no user filtering)
function getAllApplications() {
    return applicationsData.getAllApplications()
}

// Get applications with filtering
function getFilteredApplications(filters = {}) {
    let applications = getAllApplications()

    // Filter by status
    if (filters.status && filters.status !== 'all') {
        applications = applications.filter(app => app.status === filters.status)
    }

    // Filter by date range
    if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom)
        applications = applications.filter(app => new Date(app.createdAt) >= fromDate)
    }

    if (filters.dateTo) {
        const toDate = new Date(filters.dateTo)
        applications = applications.filter(app => new Date(app.createdAt) <= toDate)
    }

    // Filter by development name
    if (filters.developmentName) {
        const searchTerm = filters.developmentName.toLowerCase()
        applications = applications.filter(app =>
            app.developmentName.toLowerCase().includes(searchTerm)
        )
    }

    return applications
}

// Update application with audit trail
function updateApplicationWithAudit(id, updates, userId, userRole, reason) {
    const application = applicationsData.getApplicationById(id)
    if (!application) {
        throw new Error('Application not found')
    }

    // Create audit entry
    const auditEntry = {
        timestamp: new Date().toISOString(),
        userId: userId,
        userRole: userRole,
        action: 'update',
        field: 'multiple',
        oldValue: null,
        newValue: null,
        reason: reason,
        impact: {
            quoteChanged: false,
            oldQuoteTotal: application.quote ? application.quote.total : 0,
            newQuoteTotal: 0,
            difference: 0
        },
        metadata: {
            ipAddress: '127.0.0.1', // Mock IP
            userAgent: 'Natural England Staff Portal',
            sessionId: 'session-001'
        }
    }

    // Update application
    const updatedApplication = applicationsData.updateApplication(id, updates)

    // Check if quote changed
    if (updatedApplication.quote && application.quote) {
        const quoteChanged = updatedApplication.quote.total !== application.quote.total
        if (quoteChanged) {
            auditEntry.action = 'quote_recalculation'
            auditEntry.impact.quoteChanged = true
            auditEntry.impact.newQuoteTotal = updatedApplication.quote.total
            auditEntry.impact.difference = updatedApplication.quote.total - application.quote.total
        }
    }

    // Add audit entry
    if (!updatedApplication.auditTrail) {
        updatedApplication.auditTrail = []
    }
    updatedApplication.auditTrail.push(auditEntry)

    return updatedApplication
}

// Get audit trail for an application
function getAuditTrail(id) {
    const application = applicationsData.getApplicationById(id)
    return application ? (application.auditTrail || []) : []
}

// Export applications to CSV format
function exportApplicationsToCSV(applications) {
    const headers = [
        'Application ID',
        'Development Name',
        'Status',
        'Submission Date',
        'House Count',
        'Total Levy',
        'Payment Status',
        'Payment Reference'
    ]

    const rows = applications.map(app => [
        app.id,
        app.developmentName,
        app.status,
        new Date(app.createdAt).toLocaleDateString('en-GB'),
        app.houseCount,
        app.quote ? app.quote.total : 0,
        app.paymentStatus,
        app.paymentReference || ''
    ])

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    return csvContent
}

// Mock staff user data
const staffUsers = {
    'staff-001': {
        id: 'staff-001',
        name: 'Sarah Johnson',
        role: 'ne_staff',
        email: 'sarah.johnson@naturalengland.org.uk'
    },
    'staff-002': {
        id: 'staff-002',
        name: 'Michael Chen',
        role: 'ne_manager',
        email: 'michael.chen@naturalengland.org.uk'
    }
}

function getStaffUser(userId) {
    return staffUsers[userId] || null
}

module.exports = {
    getAllApplications,
    getFilteredApplications,
    updateApplicationWithAudit,
    getAuditTrail,
    exportApplicationsToCSV,
    getStaffUser
} 