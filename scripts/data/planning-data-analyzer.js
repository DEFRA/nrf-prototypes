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
        const startTime = Date.now();
        Logger.info('Starting Planning Data Analyzer...');
        Logger.info(`Configuration: Timeout=${CONFIG.http.timeout}ms, Retries=${CONFIG.http.retryAttempts}, Rate Limit=${CONFIG.http.rateLimit.maxRequests}/${CONFIG.http.rateLimit.perMilliseconds}ms`);

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
                Logger.info('Planning applications data not found, extracting from API...');
                planningApplications = await DataExtractor.extractPlanningApplications();
                await FileManager.saveJson(planningApplications, planningApplicationsJson);
                Logger.success(`Saved ${planningApplications.length} planning applications to cache`);
            } else {
                Logger.info('Loading planning applications from cache...');
                planningApplications = await FileManager.loadJson(planningApplicationsJson);
                Logger.success(`Loaded ${planningApplications.length} planning applications from cache`);
            }

            let localAuthorities;
            if (!await FileManager.fileExists(localAuthoritiesJson)) {
                Logger.info('Local authorities data not found, extracting from API...');
                localAuthorities = await DataExtractor.extractLocalAuthorities();
                await FileManager.saveJson(localAuthorities, localAuthoritiesJson);
                Logger.success(`Saved ${localAuthorities.length} local authorities to cache`);
            } else {
                Logger.info('Loading local authorities from cache...');
                localAuthorities = await FileManager.loadJson(localAuthoritiesJson);
                Logger.success(`Loaded ${localAuthorities.length} local authorities from cache`);
            }

            let localPlanningAuthorities;
            if (!await FileManager.fileExists(localPlanningAuthoritiesJson)) {
                Logger.info('Local planning authorities data not found, extracting from API...');
                localPlanningAuthorities = await DataExtractor.extractLocalPlanningAuthorities();
                await FileManager.saveJson(localPlanningAuthorities, localPlanningAuthoritiesJson);
                Logger.success(`Saved ${localPlanningAuthorities.length} local planning authorities to cache`);
            } else {
                Logger.info('Loading local planning authorities from cache...');
                localPlanningAuthorities = await FileManager.loadJson(localPlanningAuthoritiesJson);
                Logger.success(`Loaded ${localPlanningAuthorities.length} local planning authorities from cache`);
            }

            // Step 2: Enhance data with LLM analysis
            Logger.info('=== Step 2: Data Enhancement ===');
            const enhancedApplications = await DataEnhancer.enhancePlanningData(
                planningApplications,
                localAuthorities,
                localPlanningAuthorities
            );

            // Save enhanced data
            const enhancedDataPath = path.join(CONFIG.enhancedDir, 'enhanced-planning-applications.json');
            await FileManager.saveJson(enhancedApplications, enhancedDataPath);
            Logger.success(`Enhanced ${enhancedApplications.length} applications and saved to cache`);

            // Step 3: Statistical analysis
            Logger.info('=== Step 3: Statistical Analysis ===');
            const analysis = StatisticalAnalyzer.analyzePlanningData(enhancedApplications);

            // Save analysis data
            const analysisPath = path.join(CONFIG.analysisDir, 'planning-analysis.json');
            await FileManager.saveJson(analysis, analysisPath);
            Logger.success('Statistical analysis completed and saved to cache');

            // Step 4: Generate CSV files
            Logger.info('=== Step 4: CSV Generation ===');
            const csvResults = await CSVGenerator.generateCSVFiles(
                enhancedApplications,
                localPlanningAuthorities,
                analysis
            );

            // Summary
            const totalTime = Date.now() - startTime;
            Logger.success('=== Planning Data Analyzer Completed Successfully ===');
            Logger.info(`Total execution time: ${(totalTime / 1000).toFixed(2)} seconds`);
            Logger.info(`Raw data files saved in: ${CONFIG.rawDir}`);
            Logger.info(`Enhanced data saved in: ${CONFIG.enhancedDir}`);
            Logger.info(`Analysis data saved in: ${CONFIG.analysisDir}`);
            Logger.info(`CSV output files saved in: ${CONFIG.outputDir}`);

            // Report CSV generation results
            let successfulCsvFiles = 0;
            csvResults.forEach(result => {
                if (result.success) {
                    Logger.success(`✓ ${result.file} generated successfully`);
                    successfulCsvFiles++;
                } else {
                    Logger.error(`✗ Failed to generate ${result.file}: ${result.error}`);
                }
            });

            Logger.info(`CSV Generation: ${successfulCsvFiles}/${csvResults.length} files created successfully`);

            // Report extraction statistics
            const extractionStats = DataExtractor.getExtractionStats();
            Logger.info('=== Extraction Statistics ===');
            Logger.info(`HTTP Timeout: ${extractionStats.config.timeout}ms`);
            Logger.info(`Retry Attempts: ${extractionStats.config.retryAttempts}`);
            Logger.info(`Rate Limit: ${extractionStats.config.rateLimit.maxRequests} requests per ${extractionStats.config.rateLimit.perMilliseconds}ms`);

        } catch (error) {
            Logger.error('Planning Data Analyzer failed', error);
            Logger.error('Stack trace:', error.stack);
            process.exit(1);
        }
    }

    /**
     * Run with custom configuration
     * @param {Object} customConfig - Custom configuration overrides
     */
    static async runWithConfig(customConfig = {}) {
        // Merge custom config with default config
        const mergedConfig = {
            ...CONFIG,
            ...customConfig,
            http: {
                ...CONFIG.http,
                ...customConfig.http
            }
        };

        Logger.info('Running with custom configuration:', mergedConfig);

        // Update the global config temporarily
        Object.assign(CONFIG, mergedConfig);

        return this.run();
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