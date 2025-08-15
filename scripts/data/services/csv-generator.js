/**
 * CSV Generator service for Planning Data Analyser
 */

const Logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class CSVGenerator {
    /**
     * Generate all CSV files from the provided data
     * @param {Array} enhancedApplications - Enhanced planning applications
     * @param {Array} localPlanningAuthorities - Local planning authorities
     * @param {Object} analysis - Statistical analysis data
     * @returns {Array} Array of result objects for each CSV file
     */
    static async generateCSVFiles(enhancedApplications, localPlanningAuthorities, analysis) {
        const results = [];

        // Generate enhanced planning data CSV
        const enhancedPlanningCSVPath = path.join(process.cwd(), 'data', 'output', 'enhanced-planning-data.csv');
        const enhancedPlanningResult = this.generateEnhancedPlanningCSV(enhancedApplications, enhancedPlanningCSVPath);
        results.push(enhancedPlanningResult);

        // Generate analysis CSV
        const analysisCSVPath = path.join(process.cwd(), 'data', 'output', 'planning-analysis.csv');
        const analysisResult = this.generateAnalysisCSV(analysis, analysisCSVPath);
        results.push(analysisResult);

        // Generate local planning authorities CSV
        const authoritiesCSVPath = path.join(process.cwd(), 'data', 'output', 'local-planning-authorities.csv');
        const authoritiesResult = this.generateLocalPlanningAuthoritiesCSV(localPlanningAuthorities, authoritiesCSVPath);
        results.push(authoritiesResult);

        return results;
    }

    /**
     * Generate enhanced planning applications CSV
     * @param {Array} planningApps - Enhanced planning applications
     * @param {string} outputPath - Output file path
     * @returns {Object} Result object with success status and file info
     */
    static generateEnhancedPlanningCSV(planningApps, outputPath) {
        try {
            Logger.info('Generating enhanced planning applications CSV...');

            const csvContent = this.convertPlanningAppsToCSV(planningApps);

            // Write CSV file
            fs.writeFileSync(outputPath, csvContent, 'utf8');

            const fileSize = (csvContent.length / 1024 / 1024).toFixed(2);
            Logger.success(`Enhanced planning CSV generated: ${outputPath} (${fileSize} MB)`);

            return {
                success: true,
                file: path.basename(outputPath),
                size: fileSize,
                path: outputPath
            };

        } catch (error) {
            Logger.error(`Failed to generate enhanced planning CSV: ${error.message}`);
            return {
                success: false,
                file: path.basename(outputPath),
                error: error.message
            };
        }
    }

    /**
     * Generate analysis CSV
     * @param {Object} analysis - Analysis data
     * @param {string} outputPath - Output file path
     * @returns {Object} Result object with success status and file info
     */
    static generateAnalysisCSV(analysis, outputPath) {
        try {
            Logger.info('Generating analysis CSV...');

            const csvContent = this.convertAnalysisToCSV(analysis);

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
     * Generate local planning authorities CSV
     * @param {Array} authorities - Local planning authorities
     * @param {string} outputPath - Output file path
     * @returns {Object} Result object with success status and file info
     */
    static generateLocalPlanningAuthoritiesCSV(authorities, outputPath) {
        try {
            Logger.info('Generating local planning authorities CSV...');

            const csvContent = this.convertAuthoritiesToCSV(authorities);

            // Write CSV file
            fs.writeFileSync(outputPath, csvContent, 'utf8');

            const fileSize = (csvContent.length / 1024).toFixed(2);
            Logger.success(`Authorities CSV generated: ${outputPath} (${fileSize} KB)`);

            return {
                success: true,
                file: path.basename(outputPath),
                size: fileSize,
                path: outputPath
            };

        } catch (error) {
            Logger.error(`Failed to generate authorities CSV: ${error.message}`);
            return {
                success: false,
                file: path.basename(outputPath),
                error: error.message
            };
        }
    }

    /**
     * Convert planning applications to CSV format
     * @param {Array} planningApps - Array of planning application objects
     * @returns {string} Complete CSV content
     */
    static convertPlanningAppsToCSV(planningApps) {
        const header = this.generatePlanningCSVHeader();
        const rows = planningApps.map((app, index) => {
            if (index % 10000 === 0) {
                Logger.info(`Processing CSV row ${index}/${planningApps.length}...`);
            }
            return this.convertPlanningAppToCSVRow(app);
        });

        return [header, ...rows].join('\n');
    }

    /**
     * Generate CSV header for planning applications
     * @returns {string} CSV header string
     */
    static generatePlanningCSVHeader() {
        const headers = [
            'id',
            'reference',
            'description',
            'houseCount',
            'commercialBuildingCount',
            'infrastructureBuildCount',
            'developmentCategory',
            'localAuthorityName',
            'localPlanningAuthorityName',
            'decision_date',
            'start_date',
            'end_date',
            'planning_decision',
            'planning_decision_type',
            'status',
            'entry_date'
        ];

        return headers.join(',');
    }

    /**
     * Convert planning application object to CSV row
     * @param {Object} app - Planning application object
     * @returns {string} CSV row string
     */
    static convertPlanningAppToCSVRow(app) {
        const fields = [
            app.entity || '',
            app.reference || '',
            (app.description || '').replace(/"/g, '""'), // Escape quotes in description
            app.houseCount || '',
            app.commercialBuildingCount || '',
            app.infrastructureBuildCount || '',
            app.developmentCategory || '',
            app.localAuthorityName || 'Unknown',
            app.localPlanningAuthorityName || 'Unknown',
            app['decision-date'] || '',
            app['start-date'] || '',
            app['end-date'] || '',
            app['planning-decision'] || '',
            app['planning-decision-type'] || '',
            app['decision-date'] ? 'decided' : 'pending',
            app['entry-date'] || ''
        ];

        // Wrap fields in quotes and join with commas
        return fields.map(field => `"${field}"`).join(',');
    }

    /**
     * Convert analysis data to CSV format
     * @param {Object} analysis - Analysis data
     * @returns {string} Complete CSV content
     */
    static convertAnalysisToCSV(analysis) {
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
        return [headers.join(','), ...csvRows].join('\n');
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

    /**
     * Convert authorities to CSV format
     * @param {Array} authorities - Array of authority objects
     * @returns {string} Complete CSV content
     */
    static convertAuthoritiesToCSV(authorities) {
        if (!authorities || authorities.length === 0) {
            return 'reference,name\n';
        }

        const headers = ['reference', 'name'];
        const rows = authorities.map(authority => {
            return [
                authority.reference || '',
                authority.name || ''
            ].map(field => `"${field}"`).join(',');
        });

        return [headers.join(','), ...rows].join('\n');
    }
}

module.exports = CSVGenerator; 