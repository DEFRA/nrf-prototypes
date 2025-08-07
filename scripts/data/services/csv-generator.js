/**
 * CSV Generator service for Planning Data Analyzer
 */

const path = require('path');
const Logger = require('../utils/logger');
const FileManager = require('../utils/file-manager');
const { CONFIG } = require('../config');

class CSVGenerator {
    static async generateCSVFiles(enhancedApplications, localPlanningAuthorities, analysis) {
        Logger.info('Generating CSV output files...');

        const results = [];

        // Generate local planning authorities CSV
        const lpaCsvPath = path.join(CONFIG.outputDir, 'local-planning-authorities.csv');
        const lpaHeaders = ['reference', 'name', 'type', 'region'];
        const lpaData = localPlanningAuthorities.map(auth => ({
            reference: auth.reference || auth.id || '',
            name: auth.name || auth.title || '',
            type: auth.type || '',
            region: auth.region || ''
        }));

        const lpaSuccess = await FileManager.saveCsv(lpaData, lpaCsvPath, lpaHeaders);
        results.push({ file: 'local-planning-authorities.csv', success: lpaSuccess });

        // Generate enhanced planning data CSV
        const enhancedCsvPath = path.join(CONFIG.outputDir, 'enhanced-planning-data.csv');
        const enhancedHeaders = [
            'id', 'reference', 'description', 'houseCount', 'developmentCategory',
            'localAuthorityName', 'localPlanningAuthorityName', 'status', 'entry_date'
        ];
        const enhancedData = enhancedApplications.map(app => ({
            id: app.entity || '',
            reference: app.reference || '',
            description: app.description || '',
            houseCount: app.houseCount || 0,
            developmentCategory: app.developmentCategory || 'unknown',
            localAuthorityName: app.localAuthorityName || 'Unknown',
            localPlanningAuthorityName: app.localPlanningAuthorityName || 'Unknown',
            status: app['decision-date'] ? 'decided' : 'pending',
            entry_date: app['entry-date'] || ''
        }));

        const enhancedSuccess = await FileManager.saveCsv(enhancedData, enhancedCsvPath, enhancedHeaders);
        results.push({ file: 'enhanced-planning-data.csv', success: enhancedSuccess });

        // Generate analysis results CSV
        const analysisCsvPath = path.join(CONFIG.outputDir, 'analysis-results.csv');
        const analysisData = this.flattenAnalysisData(analysis);
        const analysisHeaders = ['metric', 'category', 'value'];

        const analysisSuccess = await FileManager.saveCsv(analysisData, analysisCsvPath, analysisHeaders);
        results.push({ file: 'analysis-results.csv', success: analysisSuccess });

        Logger.success('CSV generation completed');
        return results;
    }

    static flattenAnalysisData(analysis) {
        const data = [];

        // Summary data
        Object.entries(analysis.summary).forEach(([key, value]) => {
            data.push({ metric: 'summary', category: key, value });
        });

        // Development category data
        Object.entries(analysis.byDevelopmentCategory).forEach(([category, stats]) => {
            Object.entries(stats).forEach(([key, value]) => {
                data.push({ metric: 'development_category', category: `${category}_${key}`, value });
            });
        });

        // House build statistics
        Object.entries(analysis.houseBuildStatistics).forEach(([key, value]) => {
            data.push({ metric: 'house_build_stats', category: key, value });
        });

        // House count distribution
        Object.entries(analysis.houseCountDistribution).forEach(([range, count]) => {
            data.push({ metric: 'house_count_distribution', category: range, value: count });
        });

        return data;
    }
}

module.exports = CSVGenerator; 