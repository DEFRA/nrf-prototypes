// Mock application data for the levy calculator
// In a real implementation, this would come from a database

const mockApplications = [
  {
    id: 'APP-001',
    userId: 'user-001',
    status: 'pending_payment',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T14:45:00Z',
    developmentName: 'Riverside Housing Development',
    location: {
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
    },
    houseCount: 150,
    applicableEDPs: [
      {
        id: 'dll-001',
        name: 'District Level Licensing - Thames Valley',
        type: 'DLL',
        rate: 2500,
        impact: 375000,
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [-0.6, 51.3],
              [-0.2, 51.3],
              [-0.2, 51.7],
              [-0.6, 51.7],
              [-0.6, 51.3]
            ]
          ]
        }
      }
    ],
    quote: {
      total: 375000,
      breakdown: [
        {
          edpType: 'DLL',
          description: 'District Level Licensing - Thames Valley',
          rate: 2500,
          houseCount: 150,
          amount: 375000
        }
      ]
    },
    paymentStatus: 'pending',
    paymentReference: 'PAY-REF-001',
    auditTrail: [
      {
        timestamp: '2024-01-15T10:30:00Z',
        userId: 'user-001',
        userRole: 'developer',
        action: 'create',
        field: 'application',
        oldValue: null,
        newValue: 'APP-001',
        reason: 'Application created by developer',
        impact: {
          quoteChanged: false,
          oldQuoteTotal: 0,
          newQuoteTotal: 375000,
          difference: 375000
        },
        metadata: {
          ipAddress: '192.168.1.100',
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          sessionId: 'session-001'
        }
      },
      {
        timestamp: '2024-01-15T14:45:00Z',
        userId: 'staff-001',
        userRole: 'ne_staff',
        action: 'update',
        field: 'status',
        oldValue: 'draft',
        newValue: 'pending_payment',
        reason: 'Application reviewed and ready for payment',
        impact: {
          quoteChanged: false,
          oldQuoteTotal: 375000,
          newQuoteTotal: 375000,
          difference: 0
        },
        metadata: {
          ipAddress: '10.0.0.50',
          userAgent: 'Natural England Staff Portal',
          sessionId: 'session-002'
        }
      }
    ]
  },
  {
    id: 'APP-002',
    userId: 'user-001',
    status: 'paid',
    createdAt: '2024-01-10T09:15:00Z',
    updatedAt: '2024-01-12T16:20:00Z',
    developmentName: 'South East Residential Complex',
    location: {
      center: [0.2, 51.1],
      boundary: {
        type: 'Polygon',
        coordinates: [
          [
            [0.18, 51.08],
            [0.22, 51.08],
            [0.22, 51.12],
            [0.18, 51.12],
            [0.18, 51.08]
          ]
        ]
      }
    },
    houseCount: 200,
    applicableEDPs: [
      {
        id: 'dll-002',
        name: 'District Level Licensing - South East',
        type: 'DLL',
        rate: 3000,
        impact: 600000,
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [-0.1, 50.8],
              [0.6, 50.8],
              [0.6, 51.4],
              [-0.1, 51.4],
              [-0.1, 50.8]
            ]
          ]
        }
      },
      {
        id: 'nm-001',
        name: 'Nutrient Mitigation - Hampshire',
        type: 'Nutrient Mitigation',
        rate: 1500,
        impact: 300000,
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [-1.2, 50.6],
              [-0.4, 50.6],
              [-0.4, 51.4],
              [-1.2, 51.4],
              [-1.2, 50.6]
            ]
          ]
        }
      }
    ],
    quote: {
      total: 900000,
      breakdown: [
        {
          edpType: 'DLL',
          description: 'District Level Licensing - South East',
          rate: 3000,
          houseCount: 200,
          amount: 600000
        },
        {
          edpType: 'Nutrient Mitigation',
          description: 'Nutrient Mitigation - Hampshire',
          rate: 1500,
          houseCount: 200,
          amount: 300000
        }
      ]
    },
    paymentStatus: 'completed',
    paymentReference: 'PAY-REF-002',
    wastewaterTreatmentSite: 'wwt-002',
    auditTrail: [
      {
        timestamp: '2024-01-10T09:15:00Z',
        userId: 'user-001',
        userRole: 'developer',
        action: 'create',
        field: 'application',
        oldValue: null,
        newValue: 'APP-002',
        reason: 'Application created by developer',
        impact: {
          quoteChanged: false,
          oldQuoteTotal: 0,
          newQuoteTotal: 900000,
          difference: 900000
        },
        metadata: {
          ipAddress: '192.168.1.100',
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          sessionId: 'session-003'
        }
      },
      {
        timestamp: '2024-01-12T16:20:00Z',
        userId: 'staff-001',
        userRole: 'ne_staff',
        action: 'payment_update',
        field: 'payment_status',
        oldValue: 'pending',
        newValue: 'completed',
        reason: 'Payment received and processed',
        impact: {
          quoteChanged: false,
          oldQuoteTotal: 900000,
          newQuoteTotal: 900000,
          difference: 0
        },
        metadata: {
          ipAddress: '10.0.0.50',
          userAgent: 'Natural England Staff Portal',
          sessionId: 'session-004'
        }
      }
    ],
    pondBoundaries: {
      type: 'Polygon',
      coordinates: [
        [
          [0.19, 51.09],
          [0.21, 51.09],
          [0.21, 51.11],
          [0.19, 51.11],
          [0.19, 51.09]
        ]
      ]
    }
  },
  {
    id: 'APP-003',
    userId: 'user-001',
    status: 'approved',
    createdAt: '2024-01-05T11:00:00Z',
    updatedAt: '2024-01-08T13:30:00Z',
    developmentName: 'Hampshire Coastal Development',
    location: {
      center: [-0.7, 51.0],
      boundary: {
        type: 'Polygon',
        coordinates: [
          [
            [-0.72, 50.98],
            [-0.68, 50.98],
            [-0.68, 51.02],
            [-0.72, 51.02],
            [-0.72, 50.98]
          ]
        ]
      }
    },
    houseCount: 75,
    applicableEDPs: [
      {
        id: 'nm-001',
        name: 'Nutrient Mitigation - Hampshire',
        type: 'Nutrient Mitigation',
        rate: 1500,
        impact: 112500,
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [-1.2, 50.6],
              [-0.4, 50.6],
              [-0.4, 51.4],
              [-1.2, 51.4],
              [-1.2, 50.6]
            ]
          ]
        }
      }
    ],
    quote: {
      total: 112500,
      breakdown: [
        {
          edpType: 'Nutrient Mitigation',
          description: 'Nutrient Mitigation - Hampshire',
          rate: 1500,
          houseCount: 75,
          amount: 112500
        }
      ]
    },
    paymentStatus: 'completed',
    paymentReference: 'PAY-REF-003',
    wastewaterTreatmentSite: 'wwt-003',
    auditTrail: [
      {
        timestamp: '2024-01-05T11:00:00Z',
        userId: 'user-001',
        userRole: 'developer',
        action: 'create',
        field: 'application',
        oldValue: null,
        newValue: 'APP-003',
        reason: 'Application created by developer',
        impact: {
          quoteChanged: false,
          oldQuoteTotal: 0,
          newQuoteTotal: 112500,
          difference: 112500
        },
        metadata: {
          ipAddress: '192.168.1.100',
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          sessionId: 'session-005'
        }
      },
      {
        timestamp: '2024-01-08T13:30:00Z',
        userId: 'staff-002',
        userRole: 'ne_manager',
        action: 'approval',
        field: 'status',
        oldValue: 'paid',
        newValue: 'approved',
        reason: 'Application approved by manager',
        impact: {
          quoteChanged: false,
          oldQuoteTotal: 112500,
          newQuoteTotal: 112500,
          difference: 0
        },
        metadata: {
          ipAddress: '10.0.0.51',
          userAgent: 'Natural England Staff Portal',
          sessionId: 'session-006'
        }
      }
    ]
  }
]

// Helper function to get applications for a user
function getUserApplications(userId) {
  return mockApplications.filter((app) => app.userId === userId)
}

// Helper function to get application by ID
function getApplicationById(id) {
  return mockApplications.find((app) => app.id === id)
}

// Helper function to get all applications (for staff view)
function getAllApplications() {
  return mockApplications
}

// Helper function to create new application
function createApplication(applicationData) {
  const newApplication = {
    id: `APP-${String(mockApplications.length + 1).padStart(3, '0')}`,
    userId: applicationData.userId || 'user-001',
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    developmentName: applicationData.developmentName || 'New Development',
    location: applicationData.location,
    houseCount: applicationData.houseCount,
    applicableEDPs: applicationData.applicableEDPs || [],
    quote: applicationData.quote,
    paymentStatus: null,
    paymentReference: null,
    wastewaterTreatmentSite: applicationData.wastewaterTreatmentSite,
    pondBoundaries: applicationData.pondBoundaries
  }

  mockApplications.push(newApplication)
  return newApplication
}

// Helper function to update application
function updateApplication(id, updates) {
  const index = mockApplications.findIndex((app) => app.id === id)
  if (index !== -1) {
    mockApplications[index] = {
      ...mockApplications[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    return mockApplications[index]
  }
  return null
}

module.exports = {
  mockApplications,
  getUserApplications,
  getApplicationById,
  getAllApplications,
  createApplication,
  updateApplication
}
