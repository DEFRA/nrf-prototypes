/**
 * Statistical Analyzer service for Planning Data Analyzer
 */

const Logger = require('../utils/logger');

class StatisticalAnalyzer {
    static analyzePlanningData(enhancedApplications) {
        Logger.info('Starting statistical analysis...');

        const analysis = {
            summary: {
                totalApplications: enhancedApplications.length,
                applicationsWithHouseCount: enhancedApplications.filter(app => app.houseCount > 0).length,
                applicationsWithCommercialCount: enhancedApplications.filter(app => app.commercialBuildingCount > 0).length,
                applicationsWithInfrastructureCount: enhancedApplications.filter(app => app.infrastructureBuildCount > 0).length,
                totalHouses: enhancedApplications.reduce((sum, app) => sum + (app.houseCount || 0), 0),
                totalCommercialBuildings: enhancedApplications.reduce((sum, app) => sum + (app.commercialBuildingCount || 0), 0),
                totalInfrastructureProjects: enhancedApplications.reduce((sum, app) => sum + (app.infrastructureBuildCount || 0), 0)
            },
            byDevelopmentCategory: this.analyzeByDevelopmentCategory(enhancedApplications),
            houseBuildStatistics: this.analyzeHouseBuildStatistics(enhancedApplications),
            commercialBuildStatistics: this.analyzeCommercialBuildStatistics(enhancedApplications),
            infrastructureBuildStatistics: this.analyzeInfrastructureBuildStatistics(enhancedApplications),
            houseCountDistribution: this.analyzeHouseCountDistribution(enhancedApplications),
            commercialCountDistribution: this.analyzeCommercialCountDistribution(enhancedApplications),
            infrastructureCountDistribution: this.analyzeInfrastructureCountDistribution(enhancedApplications)
        };

        Logger.success('Statistical analysis completed');
        return analysis;
    }

    static analyzeByDevelopmentCategory(applications) {
        const categories = {};

        applications.forEach(app => {
            const category = app.developmentCategory || 'unknown';
            if (!categories[category]) {
                categories[category] = {
                    count: 0,
                    totalHouses: 0,
                    totalCommercialBuildings: 0,
                    totalInfrastructureProjects: 0,
                    averageHouses: 0,
                    averageCommercialBuildings: 0,
                    averageInfrastructureProjects: 0
                };
            }
            categories[category].count++;
            categories[category].totalHouses += app.houseCount || 0;
            categories[category].totalCommercialBuildings += app.commercialBuildingCount || 0;
            categories[category].totalInfrastructureProjects += app.infrastructureBuildCount || 0;
        });

        // Calculate averages
        Object.values(categories).forEach(cat => {
            cat.averageHouses = cat.count > 0 ? cat.totalHouses / cat.count : 0;
            cat.averageCommercialBuildings = cat.count > 0 ? cat.totalCommercialBuildings / cat.count : 0;
            cat.averageInfrastructureProjects = cat.count > 0 ? cat.totalInfrastructureProjects / cat.count : 0;
        });

        return categories;
    }

    static analyzeHouseBuildStatistics(applications) {
        const houseBuildApps = applications.filter(app =>
            app.developmentCategory === 'house_build' && app.houseCount > 0
        );

        if (houseBuildApps.length === 0) {
            return {
                count: 0,
                maxHouses: 0,
                minHouses: 0,
                averageHouses: 0,
                totalHouses: 0
            };
        }

        const houseCounts = houseBuildApps.map(app => app.houseCount);

        return {
            count: houseBuildApps.length,
            maxHouses: Math.max(...houseCounts),
            minHouses: Math.min(...houseCounts),
            averageHouses: houseCounts.reduce((sum, count) => sum + count, 0) / houseCounts.length,
            totalHouses: houseCounts.reduce((sum, count) => sum + count, 0)
        };
    }

    static analyzeCommercialBuildStatistics(applications) {
        const commercialBuildApps = applications.filter(app =>
            app.developmentCategory === 'commercial_build' && app.commercialBuildingCount > 0
        );

        if (commercialBuildApps.length === 0) {
            return {
                count: 0,
                maxCommercialBuildings: 0,
                minCommercialBuildings: 0,
                averageCommercialBuildings: 0,
                totalCommercialBuildings: 0
            };
        }

        const commercialCounts = commercialBuildApps.map(app => app.commercialBuildingCount);

        return {
            count: commercialBuildApps.length,
            maxCommercialBuildings: Math.max(...commercialCounts),
            minCommercialBuildings: Math.min(...commercialCounts),
            averageCommercialBuildings: commercialCounts.reduce((sum, count) => sum + count, 0) / commercialCounts.length,
            totalCommercialBuildings: commercialCounts.reduce((sum, count) => sum + count, 0)
        };
    }

    static analyzeInfrastructureBuildStatistics(applications) {
        const infrastructureBuildApps = applications.filter(app =>
            app.developmentCategory === 'infrastructure_build' && app.infrastructureBuildCount > 0
        );

        if (infrastructureBuildApps.length === 0) {
            return {
                count: 0,
                maxInfrastructureProjects: 0,
                minInfrastructureProjects: 0,
                averageInfrastructureProjects: 0,
                totalInfrastructureProjects: 0
            };
        }

        const infrastructureCounts = infrastructureBuildApps.map(app => app.infrastructureBuildCount);

        return {
            count: infrastructureBuildApps.length,
            maxInfrastructureProjects: Math.max(...infrastructureCounts),
            minInfrastructureProjects: Math.min(...infrastructureCounts),
            averageInfrastructureProjects: infrastructureCounts.reduce((sum, count) => sum + count, 0) / infrastructureCounts.length,
            totalInfrastructureProjects: infrastructureCounts.reduce((sum, count) => sum + count, 0)
        };
    }

    static analyzeHouseCountDistribution(applications) {
        const ranges = [
            { name: '1-5', min: 1, max: 5 },
            { name: '5-10', min: 5, max: 10 },
            { name: '10-20', min: 10, max: 20 },
            { name: '20-50', min: 20, max: 50 },
            { name: '50-100', min: 50, max: 100 },
            { name: '100-200', min: 100, max: 200 },
            { name: '200-500', min: 200, max: 500 },
            { name: '500+', min: 500, max: Infinity }
        ];

        const distribution = {};
        ranges.forEach(range => {
            distribution[range.name] = applications.filter(app =>
                app.houseCount >= range.min && app.houseCount < range.max
            ).length;
        });

        return distribution;
    }

    static analyzeCommercialCountDistribution(applications) {
        const ranges = [
            { name: '1-5', min: 1, max: 5 },
            { name: '5-10', min: 5, max: 10 },
            { name: '10-20', min: 10, max: 20 },
            { name: '20-50', min: 20, max: 50 },
            { name: '50-100', min: 50, max: 100 },
            { name: '100+', min: 100, max: Infinity }
        ];

        const distribution = {};
        ranges.forEach(range => {
            distribution[range.name] = applications.filter(app =>
                app.commercialBuildingCount >= range.min && app.commercialBuildingCount < range.max
            ).length;
        });

        return distribution;
    }

    static analyzeInfrastructureCountDistribution(applications) {
        const ranges = [
            { name: '1-5', min: 1, max: 5 },
            { name: '5-10', min: 5, max: 10 },
            { name: '10-20', min: 10, max: 20 },
            { name: '20-50', min: 20, max: 50 },
            { name: '50+', min: 50, max: Infinity }
        ];

        const distribution = {};
        ranges.forEach(range => {
            distribution[range.name] = applications.filter(app =>
                app.infrastructureBuildCount >= range.min && app.infrastructureBuildCount < range.max
            ).length;
        });

        return distribution;
    }
}

module.exports = StatisticalAnalyzer; 