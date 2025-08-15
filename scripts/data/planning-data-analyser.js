#!/usr/bin/env node

/**
 * Planning Data Analyser - Main Application
 * 
 * This script extracts, enhances, and analyses planning application data
 * from the planning.data.gov.uk platform to support environmental planning decisions.
 * 
 * Usage: node planning-data-analyser.js
 */

const path = require('path');

// Import configuration and utilities
const { CONFIG } = require('./config');
const Logger = require('./utils/logger');
const FileManager = require('./utils/file-manager');

// Import services
const DataExtractor = require('./services/data-extractor');
const DataEnhancer = require('./services/data-enhancer');
const DataStandardiser = require('./services/data-standardiser');
const StatisticalAnalyser = require('./services/statistical-analyser');
const CSVGenerator = require('./services/csv-generator');

/**
 * Main Application Class
 */
class PlanningDataAnalyser {
    static async run() {
        const startTime = Date.now();
        Logger.info('Starting Planning Data Analyser...');
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

            // Step 3: Data Standardisation and Authority Name Population
            Logger.info('=== Step 3: Data Standardisation and Enhancement ===');

            // Standardise development categories
            const standardisedApplications = DataStandardiser.standardiseDevelopmentCategories(enhancedApplications);

            // Populate local authority names
            const applicationsWithAuthorityNames = DataStandardiser.populateLocalAuthorityNames(
                standardisedApplications,
                localAuthorities
            );

            // Populate local planning authority names
            const fullyEnhancedApplications = DataStandardiser.populateLocalPlanningAuthorityNames(
                applicationsWithAuthorityNames,
                localAuthorities,
                localPlanningAuthorities
            );

            // Save fully enhanced and standardised data
            const standardisedDataPath = path.join(CONFIG.enhancedDir, 'enhanced-planning-applications-standardised.json');
            DataStandardiser.saveStandardisedData(fullyEnhancedApplications, standardisedDataPath);

            // Step 4: Statistical analysis
            Logger.info('=== Step 4: Statistical Analysis ===');
            const analysis = StatisticalAnalyser.analyzePlanningData(fullyEnhancedApplications);

            // Save analysis data
            const analysisPath = path.join(CONFIG.analysisDir, 'planning-analysis.json');
            await FileManager.saveJson(analysis, analysisPath);
            Logger.success('Statistical analysis completed and saved to cache');

            // Step 5: Generate CSV files
            Logger.info('=== Step 5: CSV Generation ===');
            const csvResults = await CSVGenerator.generateCSVFiles(
                fullyEnhancedApplications,
                localPlanningAuthorities,
                analysis
            );

            // Summary
            const totalTime = Date.now() - startTime;
            Logger.success('=== Planning Data Analyser Completed Successfully ===');
            Logger.info(`Total execution time: ${(totalTime / 1000).toFixed(2)} seconds`);
            Logger.info(`Raw data files saved in: ${CONFIG.rawDir}`);
            Logger.info(`Enhanced data saved in: ${CONFIG.enhancedDir}`);
            Logger.info(`Analysis data saved in: ${CONFIG.analysisDir}`);
            Logger.info(`CSV output files saved in: ${CONFIG.outputDir}`);

            // Report CSV generation results
            let successfulCsvFiles = 0;
            csvResults.forEach(result => {
                if (result.success) {
                    Logger.success(`✓ ${result.file} generated successfully (${result.size} ${result.size.includes('MB') ? 'MB' : 'KB'})`);
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
            Logger.info(`RetryAttempts: ${extractionStats.config.retryAttempts}`);
            Logger.info(`Rate Limit: ${extractionStats.config.rateLimit.maxRequests} requests per ${extractionStats.config.rateLimit.perMilliseconds}ms`);

            // Report standardisation statistics
            const categoryStats = DataStandardiser.getDevelopmentCategoryStats(fullyEnhancedApplications);
            Logger.info('=== Development Category Statistics ===');
            Object.entries(categoryStats)
                .sort((a, b) => b[1] - a[1])
                .forEach(([category, count]) => {
                    Logger.info(`  ${category}: ${count} applications`);
                });

        } catch (error) {
            Logger.error('Planning Data Analyser failed', error);
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

    /**
     * Regenerate analysis and CSV from existing enhanced data (skip extraction and LLM analysis)
     * @param {string} enhancedDataPath - Path to existing enhanced data file
     */
    static async regenerateFromExistingData(enhancedDataPath = null) {
        const startTime = Date.now();
        Logger.info('Starting regeneration from existing enhanced data...');

        try {
            // Ensure directories exist
            await FileManager.ensureDirectory(CONFIG.dataDir);
            await FileManager.ensureDirectory(CONFIG.enhancedDir);
            await FileManager.ensureDirectory(CONFIG.analysisDir);
            await FileManager.ensureDirectory(CONFIG.outputDir);

            // Load existing enhanced data
            const dataPath = enhancedDataPath || path.join(CONFIG.enhancedDir, 'enhanced-planning-applications.json');
            Logger.info(`Loading enhanced data from: ${dataPath}`);

            if (!await FileManager.fileExists(dataPath)) {
                throw new Error(`Enhanced data file not found: ${dataPath}`);
            }

            const enhancedApplications = await FileManager.loadJson(dataPath);
            Logger.success(`Loaded ${enhancedApplications.length} enhanced applications`);

            // Load supporting data
            const localAuthoritiesJson = path.join(CONFIG.rawDir, 'local-authorities.json');
            const localPlanningAuthoritiesJson = path.join(CONFIG.rawDir, 'local-planning-authorities.json');

            let localAuthorities = [];
            let localPlanningAuthorities = [];

            if (await FileManager.fileExists(localAuthoritiesJson)) {
                localAuthorities = await FileManager.loadJson(localAuthoritiesJson);
                Logger.info(`Loaded ${localAuthorities.length} local authorities`);
            }

            if (await FileManager.fileExists(localPlanningAuthoritiesJson)) {
                localPlanningAuthorities = await FileManager.loadJson(localPlanningAuthoritiesJson);
                Logger.info(`Loaded ${localPlanningAuthorities.length} local planning authorities`);
            }

            // Step 1: Data Standardization and Authority Name Population
            Logger.info('=== Step 1: Data Standardization and Enhancement ===');

            // Standardise development categories
            const standardisedApplications = DataStandardiser.standardiseDevelopmentCategories(enhancedApplications);

            // Populate local authority names if data available
            let applicationsWithAuthorityNames = standardisedApplications;
            if (localAuthorities.length > 0) {
                applicationsWithAuthorityNames = DataStandardiser.populateLocalAuthorityNames(
                    standardisedApplications,
                    localAuthorities
                );
            }

            // Populate local planning authority names if data available
            let fullyEnhancedApplications = applicationsWithAuthorityNames;
            if (localAuthorities.length > 0 && localPlanningAuthorities.length > 0) {
                fullyEnhancedApplications = DataStandardiser.populateLocalPlanningAuthorityNames(
                    applicationsWithAuthorityNames,
                    localAuthorities,
                    localPlanningAuthorities
                );
            }

            // Save fully enhanced and standardised data
            const standardisedDataPath = path.join(CONFIG.enhancedDir, 'enhanced-planning-applications-standardised.json');
            DataStandardiser.saveStandardisedData(fullyEnhancedApplications, standardisedDataPath);

            // Step 2: Statistical analysis
            Logger.info('=== Step 2: Statistical Analysis ===');
            const analysis = StatisticalAnalyser.analyzePlanningData(fullyEnhancedApplications);

            // Save analysis data
            const analysisPath = path.join(CONFIG.analysisDir, 'planning-analysis.json');
            await FileManager.saveJson(analysis, analysisPath);
            Logger.success('Statistical analysis completed and saved to cache');

            // Step 3: Generate CSV files
            Logger.info('=== Step 3: CSV Generation ===');
            const csvResults = await CSVGenerator.generateCSVFiles(
                fullyEnhancedApplications,
                localPlanningAuthorities,
                analysis
            );

            // Summary
            const totalTime = Date.now() - startTime;
            Logger.success('=== Regeneration Completed Successfully ===');
            Logger.info(`Total execution time: ${(totalTime / 1000).toFixed(2)} seconds`);

            // Report CSV generation results
            let successfulCsvFiles = 0;
            csvResults.forEach(result => {
                if (result.success) {
                    Logger.success(`✓ ${result.file} generated successfully (${result.size} ${result.size.includes('MB') ? 'MB' : 'KB'})`);
                    successfulCsvFiles++;
                } else {
                    Logger.error(`✗ Failed to generate ${result.file}: ${result.error}`);
                }
            });

            Logger.info(`CSV Generation: ${successfulCsvFiles}/${csvResults.length} files created successfully`);

            // Report standardisation statistics
            const categoryStats = DataStandardiser.getDevelopmentCategoryStats(fullyEnhancedApplications);
            Logger.info('=== Development Category Statistics ===');
            Object.entries(categoryStats)
                .sort((a, b) => b[1] - a[1])
                .forEach(([category, count]) => {
                    Logger.info(`  ${category}: ${count} applications`);
                });

        } catch (error) {
            Logger.error('Regeneration failed', error);
            Logger.error('Stack trace:', error.stack);
            process.exit(1);
        }
    }
}

// Run the application if this file is executed directly
if (require.main === module) {
    // Check command line arguments
    const args = process.argv.slice(2);

    if (args.includes('--regenerate') || args.includes('-r')) {
        // Regenerate from existing data
        PlanningDataAnalyser.regenerateFromExistingData().catch(error => {
            Logger.error('Regeneration failed to start', error);
            process.exit(1);
        });
    } else {
        // Full run with extraction and LLM analysis
        PlanningDataAnalyser.run().catch(error => {
            Logger.error('Application failed to start', error);
            process.exit(1);
        });
    }
}

module.exports = PlanningDataAnalyser; 