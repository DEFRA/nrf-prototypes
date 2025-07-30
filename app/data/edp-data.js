// Mock data for EDP boundaries and wastewater treatment sites
// In a real implementation, this would come from a spatial database or API

const edpBoundaries = {
    dll: [
        {
            id: 'dll-001',
            name: 'District Level Licensing - Thames Valley',
            type: 'DLL',
            boundary: {
                type: 'Polygon',
                coordinates: [[
                    [-0.6, 51.3],
                    [-0.2, 51.3],
                    [-0.2, 51.7],
                    [-0.6, 51.7],
                    [-0.6, 51.3]
                ]]
            },
            rate: 2500 // £2,500 per house
        },
        {
            id: 'dll-002',
            name: 'District Level Licensing - South East',
            type: 'DLL',
            boundary: {
                type: 'Polygon',
                coordinates: [[
                    [-0.1, 50.8],
                    [0.6, 50.8],
                    [0.6, 51.4],
                    [-0.1, 51.4],
                    [-0.1, 50.8]
                ]]
            },
            rate: 3000 // £3,000 per house
        },
        {
            id: 'dll-003',
            name: 'District Level Licensing - Midlands',
            type: 'DLL',
            boundary: {
                type: 'Polygon',
                coordinates: [[
                    [-2.0, 52.0],
                    [-1.5, 52.0],
                    [-1.5, 52.5],
                    [-2.0, 52.5],
                    [-2.0, 52.0]
                ]]
            },
            rate: 2000 // £2,000 per house
        }
    ],
    nutrientMitigation: [
        {
            id: 'nm-001',
            name: 'Nutrient Mitigation - Hampshire',
            type: 'Nutrient Mitigation',
            boundary: {
                type: 'Polygon',
                coordinates: [[
                    [-1.2, 50.6],
                    [-0.4, 50.6],
                    [-0.4, 51.4],
                    [-1.2, 51.4],
                    [-1.2, 50.6]
                ]]
            },
            rate: 1500 // £1,500 per house
        },
        {
            id: 'nm-002',
            name: 'Nutrient Mitigation - Sussex',
            type: 'Nutrient Mitigation',
            boundary: {
                type: 'Polygon',
                coordinates: [[
                    [-0.8, 50.7],
                    [-0.2, 50.7],
                    [-0.2, 51.1],
                    [-0.8, 51.1],
                    [-0.8, 50.7]
                ]]
            },
            rate: 1800 // £1,800 per house
        }
    ]
}

const wastewaterTreatmentSites = [
    {
        id: 'wwt-001',
        name: 'Thames Valley Treatment Works',
        location: { lat: 51.5, lng: -0.4 },
        capacity: 50000,
        distance: 5 // miles from reference point
    },
    {
        id: 'wwt-002',
        name: 'South East Regional Treatment',
        location: { lat: 51.2, lng: 0.2 },
        capacity: 75000,
        distance: 12
    },
    {
        id: 'wwt-003',
        name: 'Hampshire Coastal Treatment',
        location: { lat: 50.9, lng: -0.7 },
        capacity: 30000,
        distance: 25
    },
    {
        id: 'wwt-004',
        name: 'Berkshire Treatment Facility',
        location: { lat: 51.4, lng: -0.8 },
        capacity: 40000,
        distance: 35
    },
    {
        id: 'wwt-005',
        name: 'Surrey Treatment Works',
        location: { lat: 51.3, lng: -0.2 },
        capacity: 60000,
        distance: 45
    }
]

// Helper function to check if a point is within a polygon
function isPointInPolygon(point, polygon) {
    const x = point[0]
    const y = point[1]
    let inside = false

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0]
        const yi = polygon[i][1]
        const xj = polygon[j][0]
        const yj = polygon[j][1]

        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside
        }
    }

    return inside
}

// Helper function to check if a development site intersects with EDP boundaries
function checkEDPIntersection(developmentSite) {
    const applicableEDPs = []

    // Check DLL boundaries
    edpBoundaries.dll.forEach(dll => {
        // Check if any point of the development boundary is within the EDP boundary
        // or if the development center is within the EDP boundary
        let intersects = false;

        if (developmentSite.boundary && developmentSite.boundary.coordinates) {
            // Check each point of the development boundary
            for (let point of developmentSite.boundary.coordinates[0]) {
                if (isPointInPolygon(point, dll.boundary.coordinates[0])) {
                    intersects = true;
                    break;
                }
            }
        }

        // Also check the center point as fallback
        if (!intersects && developmentSite.center) {
            intersects = isPointInPolygon(developmentSite.center, dll.boundary.coordinates[0]);
        }

        if (intersects) {
            applicableEDPs.push({
                ...dll,
                impact: (developmentSite.houseCount || 0) * dll.rate
            })
        }
    })

    // Check Nutrient Mitigation boundaries
    edpBoundaries.nutrientMitigation.forEach(nm => {
        // Check if any point of the development boundary is within the EDP boundary
        // or if the development center is within the EDP boundary
        let intersects = false;

        if (developmentSite.boundary && developmentSite.boundary.coordinates) {
            // Check each point of the development boundary
            for (let point of developmentSite.boundary.coordinates[0]) {
                if (isPointInPolygon(point, nm.boundary.coordinates[0])) {
                    intersects = true;
                    break;
                }
            }
        }

        // Also check the center point as fallback
        if (!intersects && developmentSite.center) {
            intersects = isPointInPolygon(developmentSite.center, nm.boundary.coordinates[0]);
        }

        if (intersects) {
            applicableEDPs.push({
                ...nm,
                impact: (developmentSite.houseCount || 0) * nm.rate
            })
        }
    })

    return applicableEDPs
}

// Helper function to get wastewater treatment sites within 50 miles
function getWastewaterTreatmentSites(developmentSite) {
    return wastewaterTreatmentSites.filter(site => site.distance <= 50)
}

module.exports = {
    edpBoundaries,
    wastewaterTreatmentSites,
    checkEDPIntersection,
    getWastewaterTreatmentSites
} 