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
                coordinates: [[
                    [-0.42, 51.48],
                    [-0.38, 51.48],
                    [-0.38, 51.52],
                    [-0.42, 51.52],
                    [-0.42, 51.48]
                ]]
            }
        },
        houseCount: 150,
        applicableEDPs: [
            {
                id: 'dll-001',
                name: 'District Level Licensing - Thames Valley',
                type: 'DLL',
                rate: 2500,
                impact: 375000
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
        paymentReference: 'PAY-REF-001'
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
                coordinates: [[
                    [0.18, 51.08],
                    [0.22, 51.08],
                    [0.22, 51.12],
                    [0.18, 51.12],
                    [0.18, 51.08]
                ]]
            }
        },
        houseCount: 200,
        applicableEDPs: [
            {
                id: 'dll-002',
                name: 'District Level Licensing - South East',
                type: 'DLL',
                rate: 3000,
                impact: 600000
            },
            {
                id: 'nm-001',
                name: 'Nutrient Mitigation - Hampshire',
                type: 'Nutrient Mitigation',
                rate: 1500,
                impact: 300000
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
        pondBoundaries: {
            type: 'Polygon',
            coordinates: [[
                [0.19, 51.09],
                [0.21, 51.09],
                [0.21, 51.11],
                [0.19, 51.11],
                [0.19, 51.09]
            ]]
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
                coordinates: [[
                    [-0.72, 50.98],
                    [-0.68, 50.98],
                    [-0.68, 51.02],
                    [-0.72, 51.02],
                    [-0.72, 50.98]
                ]]
            }
        },
        houseCount: 75,
        applicableEDPs: [
            {
                id: 'nm-001',
                name: 'Nutrient Mitigation - Hampshire',
                type: 'Nutrient Mitigation',
                rate: 1500,
                impact: 112500
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
        wastewaterTreatmentSite: 'wwt-003'
    }
];

// Helper function to get applications for a user
function getUserApplications(userId) {
    return mockApplications.filter(app => app.userId === userId);
}

// Helper function to get application by ID
function getApplicationById(id) {
    return mockApplications.find(app => app.id === id);
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
    };

    mockApplications.push(newApplication);
    return newApplication;
}

// Helper function to update application
function updateApplication(id, updates) {
    const index = mockApplications.findIndex(app => app.id === id);
    if (index !== -1) {
        mockApplications[index] = {
            ...mockApplications[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        return mockApplications[index];
    }
    return null;
}

module.exports = {
    mockApplications,
    getUserApplications,
    getApplicationById,
    createApplication,
    updateApplication
}; 