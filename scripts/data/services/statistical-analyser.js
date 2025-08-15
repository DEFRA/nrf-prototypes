/**
 * Statistical Analyser service for Planning Data Analyser
 */

const Logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class StatisticalAnalyser {
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
        const distribution = {
            '1-5': 0, '5-10': 0, '10-20': 0, '20-50': 0,
            '50-100': 0, '100-200': 0, '200-500': 0, '500+': 0
        };

        applications.forEach(app => {
            const count = app.houseCount || 0;
            if (count === 0) return;

            if (count <= 5) distribution['1-5']++;
            else if (count <= 10) distribution['5-10']++;
            else if (count <= 20) distribution['10-20']++;
            else if (count <= 50) distribution['20-50']++;
            else if (count <= 100) distribution['50-100']++;
            else if (count <= 200) distribution['100-200']++;
            else if (count <= 500) distribution['200-500']++;
            else distribution['500+']++;
        });

        return distribution;
    }

    static analyzeCommercialCountDistribution(applications) {
        const distribution = {
            '1-5': 0, '5-10': 0, '10-20': 0, '20-50': 0,
            '50-100': 0, '100+': 0
        };

        applications.forEach(app => {
            const count = app.commercialBuildingCount || 0;
            if (count === 0) return;

            if (count <= 5) distribution['1-5']++;
            else if (count <= 10) distribution['5-10']++;
            else if (count <= 20) distribution['10-20']++;
            else if (count <= 50) distribution['20-50']++;
            else if (count <= 100) distribution['50-100']++;
            else distribution['100+']++;
        });

        return distribution;
    }

    static analyzeInfrastructureCountDistribution(applications) {
        const distribution = {
            '1-5': 0, '5-10': 0, '10-20': 0, '20-50': 0, '50+': 0
        };

        applications.forEach(app => {
            const count = app.infrastructureBuildCount || 0;
            if (count === 0) return;

            if (count <= 5) distribution['1-5']++;
            else if (count <= 10) distribution['5-10']++;
            else if (count <= 20) distribution['10-20']++;
            else if (count <= 50) distribution['20-50']++;
            else distribution['50+']++;
        });

        return distribution;
    }

    /**
     * Generate CSV from analysis data
     * @param {Object} analysis - Analysis data
     * @param {string} outputPath - Output CSV file path
     * @returns {Object} Result object with success status and file info
     */
    static generateAnalysisCSV(analysis, outputPath) {
        try {
            Logger.info('Generating analysis CSV...');

            // Convert development categories to CSV rows
            const categoryRows = this.convertDevelopmentCategoriesToCSV(analysis.byDevelopmentCategory);

            // Add summary row
            const summaryRow = this.convertSummaryToCSV(analysis.summary);

            // Combine all rows
            const allRows = [summaryRow, ...categoryRows];

            // Generate CSV header
            const headers = [
                'category',
                'count',
                'totalHouses',
                'totalCommercialBuildings',
                'totalInfrastructureProjects',
                'averageHouses',
                'averageCommercialBuildings',
                'averageInfrastructureProjects'
            ];

            // Generate CSV rows
            const csvRows = allRows.map(row => {
                return headers.map(header => {
                    const value = row[header] || '';
                    return `"${value}"`;
                }).join(',');
            });

            // Combine header and rows
            const csvContent = [headers.join(','), ...csvRows].join('\n');

            // Write CSV file
            fs.writeFileSync(outputPath, csvContent, 'utf8');

            const fileSize = (csvContent.length / 1024).toFixed(2);
            Logger.success(`Analysis CSV generated: ${outputPath} (${fileSize} KB)`);

            return {
                success: true,
                file: path.basename(outputPath),
                size: fileSize,
                path: outputPath
            };

        } catch (error) {
            Logger.error(`Failed to generate analysis CSV: ${error.message}`);
            return {
                success: false,
                file: path.basename(outputPath),
                error: error.message
            };
        }
    }

    /**
     * Convert development category data to CSV rows
     * @param {Object} byDevelopmentCategory - Development category analysis data
     * @returns {Array} Array of CSV row objects
     */
    static convertDevelopmentCategoriesToCSV(byDevelopmentCategory) {
        const rows = [];

        Object.entries(byDevelopmentCategory).forEach(([category, data]) => {
            rows.push({
                category: category,
                count: data.count,
                totalHouses: data.totalHouses,
                totalCommercialBuildings: data.totalCommercialBuildings,
                totalInfrastructureProjects: data.totalInfrastructureProjects,
                averageHouses: data.averageHouses,
                averageCommercialBuildings: data.averageCommercialBuildings,
                averageInfrastructureProjects: data.averageInfrastructureProjects
            });
        });

        return rows;
    }

    /**
     * Convert summary data to CSV row
     * @param {Object} summary - Summary analysis data
     * @returns {Object} Summary CSV row object
     */
    static convertSummaryToCSV(summary) {
        return {
            category: 'TOTAL',
            count: summary.totalApplications,
            totalHouses: summary.totalHouses,
            totalCommercialBuildings: summary.totalCommercialBuildings,
            totalInfrastructureProjects: summary.totalInfrastructureProjects,
            averageHouses: (summary.totalHouses / summary.totalApplications).toFixed(2),
            averageCommercialBuildings: (summary.totalCommercialBuildings / summary.totalApplications).toFixed(2),
            averageInfrastructureProjects: (summary.totalInfrastructureProjects / summary.totalApplications).toFixed(2)
        };
    }
}

module.exports = StatisticalAnalyser; 