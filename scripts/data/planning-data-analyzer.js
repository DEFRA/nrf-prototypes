#!/usr/bin/env node

/**
 * Planning Data Analyzer - Main Application
 * 
 * This script extracts, enhances, and analyzes planning application data
 * from the planning.data.gov.uk platform to support environmental planning decisions.
 * 
 * Usage: node planning-data-analyzer.js
 */

const path = require('path');

// Import configuration and utilities
const { CONFIG } = require('./config');
const Logger = require('./utils/logger');
const FileManager = require('./utils/file-manager');

// Import services
const DataExtractor = require('./services/data-extractor');
const DataEnhancer = require('./services/data-enhancer');
const StatisticalAnalyzer = require('./services/statistical-analyzer');
const CSVGenerator = require('./services/csv-generator');

/**
 * Main Application Class
 */
class PlanningDataAnalyzer {
    static async run() {
        Logger.info('Starting Planning Data Analyzer...');

        try {
            // Ensure directories exist
            await FileManager.ensureDirectory(CONFIG.dataDir);
            await FileManager.ensureDirectory(CONFIG.rawDir);
            await FileManager.ensureDirectory(CONFIG.enhancedDir);
            await FileManager.ensureDirectory(CONFIG.analysisDir);
            await FileManager.ensureDirectory(CONFIG.outputDir);

            const planningApplicationsJson = path.join(CONFIG.rawDir, 'planning-applications.json');
            const localAuthoritiesJson = path.join(CONFIG.rawDir, 'local-authorities.json');
            const localPlanningAuthoritiesJson = path.join(CONFIG.rawDir, 'local-planning-authorities.json');

            // Step 1: Extract raw data
            Logger.info('=== Step 1: Data Extraction ===');

            let planningApplications;
            if (!await FileManager.fileExists(planningApplicationsJson)) {
                planningApplications = await DataExtractor.extractPlanningApplications();
                await FileManager.saveJson(planningApplications, planningApplicationsJson);
            } else {
                planningApplications = await FileManager.loadJson(planningApplicationsJson);
            }

            let localAuthorities;
            if (!await FileManager.fileExists(localAuthoritiesJson)) {
                localAuthorities = await DataExtractor.extractLocalAuthorities();
                await FileManager.saveJson(localAuthorities, localAuthoritiesJson);
            } else {
                localAuthorities = await FileManager.loadJson(localAuthoritiesJson);
            }

            let localPlanningAuthorities;
            if (!await FileManager.fileExists(localPlanningAuthoritiesJson)) {
                localPlanningAuthorities = await DataExtractor.extractLocalPlanningAuthorities();
                await FileManager.saveJson(localPlanningAuthorities, localPlanningAuthoritiesJson);
            } else {
                localPlanningAuthorities = await FileManager.loadJson(localPlanningAuthoritiesJson);
            }

            // Step 2: Enhance data with LLM analysis
            Logger.info('=== Step 2: Data Enhancement ===');
            const enhancedApplications = await DataEnhancer.enhancePlanningData(
                planningApplications,
                localAuthorities,
                localPlanningAuthorities
            );

            // Save enhanced data
            await FileManager.saveJson(enhancedApplications, path.join(CONFIG.enhancedDir, 'enhanced-planning-applications.json'));

            // Step 3: Statistical analysis
            Logger.info('=== Step 3: Statistical Analysis ===');
            const analysis = StatisticalAnalyzer.analyzePlanningData(enhancedApplications);

            // Save analysis data
            await FileManager.saveJson(analysis, path.join(CONFIG.analysisDir, 'planning-analysis.json'));

            // Step 4: Generate CSV files
            Logger.info('=== Step 4: CSV Generation ===');
            const csvResults = await CSVGenerator.generateCSVFiles(
                enhancedApplications,
                localPlanningAuthorities,
                analysis
            );

            // Summary
            Logger.success('=== Planning Data Analyzer Completed Successfully ===');
            Logger.info(`Raw data files saved in: ${CONFIG.rawDir}`);
            Logger.info(`Enhanced data saved in: ${CONFIG.enhancedDir}`);
            Logger.info(`Analysis data saved in: ${CONFIG.analysisDir}`);
            Logger.info(`CSV output files saved in: ${CONFIG.outputDir}`);

            csvResults.forEach(result => {
                if (result.success) {
                    Logger.success(`✓ ${result.file} generated successfully`);
                } else {
                    Logger.error(`✗ Failed to generate ${result.file}`);
                }
            });

        } catch (error) {
            Logger.error('Planning Data Analyzer failed', error);
            process.exit(1);
        }
    }
}

// Run the application if this file is executed directly
if (require.main === module) {
    PlanningDataAnalyzer.run().catch(error => {
        Logger.error('Application failed to start', error);
        process.exit(1);
    });
}

module.exports = PlanningDataAnalyzer; 