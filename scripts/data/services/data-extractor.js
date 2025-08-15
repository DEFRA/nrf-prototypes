/**
 * Data Extractor service for Planning Data Analyzer
 */

const Logger = require('../utils/logger');
const HttpClient = require('../utils/http-client');
const { CONFIG } = require('../config');

class DataExtractor {
    /**
     * Extract planning applications with improved error handling and progress tracking
     * @returns {Promise<Array>} Array of planning applications
     */
    static async extractPlanningApplications() {
        Logger.info('Starting planning applications data extraction...');

        const allApplications = [];
        let offset = 0;
        let hasMoreData = true;
        let totalRetrieved = 0;
        let failedRequests = 0;
        const maxFailedRequests = 5; // Stop after 5 consecutive failures

        while (hasMoreData && failedRequests < maxFailedRequests) {
            const url = `${CONFIG.baseUrl}?dataset=planning-application&limit=${CONFIG.chunkSize}&offset=${offset}&entry_date_day=06&entry_date_month=08&entry_date_year=2024&entry_date_match=since`;

            try {
                Logger.info(`Fetching planning applications (offset: ${offset}, total retrieved: ${totalRetrieved})...`);

                const startTime = Date.now();
                const response = await HttpClient.makeRequest(url);
                const requestTime = Date.now() - startTime;

                if (response && response.entities && Array.isArray(response.entities)) {
                    const newApplications = response.entities;
                    allApplications.push(...newApplications);
                    totalRetrieved += newApplications.length;
                    failedRequests = 0; // Reset failure counter on success

                    Logger.info(`Retrieved ${newApplications.length} applications in ${requestTime}ms`);

                    if (newApplications.length < CONFIG.chunkSize) {
                        hasMoreData = false;
                        Logger.info('Reached end of data (received fewer records than chunk size)');
                    } else {
                        offset += CONFIG.chunkSize;
                    }
                } else {
                    Logger.error('Invalid response format for planning applications');
                    Logger.error(`Response structure: ${JSON.stringify(response, null, 2)}`);
                    failedRequests++;
                    hasMoreData = false;
                }
            } catch (error) {
                failedRequests++;
                Logger.error(`Failed to extract planning applications at offset ${offset}: ${error.message}`);

                if (failedRequests >= maxFailedRequests) {
                    Logger.error(`Stopping extraction after ${maxFailedRequests} consecutive failures`);
                    break;
                }

                // Wait before retrying
                await HttpClient.delay(CONFIG.http.retryDelay * failedRequests);
            }
        }

        Logger.success(`Extracted ${allApplications.length} planning applications (${failedRequests} failed requests)`);
        return allApplications;
    }

    /**
     * Extract local authorities with improved error handling
     * @returns {Promise<Array>} Array of local authorities
     */
    static async extractLocalAuthorities() {
        Logger.info('Starting local authorities data extraction...');

        const url = `${CONFIG.baseUrl}?dataset=local-authority&limit=${CONFIG.chunkSize}&offset=0`;

        try {
            const startTime = Date.now();
            const response = await HttpClient.makeRequest(url);
            const requestTime = Date.now() - startTime;

            if (response && response.entities && Array.isArray(response.entities)) {
                Logger.success(`Extracted ${response.entities.length} local authorities in ${requestTime}ms`);
                return response.entities;
            } else {
                Logger.error('Invalid response format for local authorities');
                Logger.error(`Response structure: ${JSON.stringify(response, null, 2)}`);
                return [];
            }
        } catch (error) {
            Logger.error('Failed to extract local authorities', error);
            return [];
        }
    }

    /**
     * Extract local planning authorities with improved error handling
     * @returns {Promise<Array>} Array of local planning authorities
     */
    static async extractLocalPlanningAuthorities() {
        Logger.info('Starting local planning authorities data extraction...');

        const url = `${CONFIG.baseUrl}?dataset=local-planning-authority&limit=${CONFIG.chunkSize}&offset=0`;

        try {
            const startTime = Date.now();
            const response = await HttpClient.makeRequest(url);
            const requestTime = Date.now() - startTime;

            if (response && response.entities && Array.isArray(response.entities)) {
                Logger.success(`Extracted ${response.entities.length} local planning authorities in ${requestTime}ms`);
                return response.entities;
            } else {
                Logger.error('Invalid response format for local planning authorities');
                Logger.error(`Response structure: ${JSON.stringify(response, null, 2)}`);
                return [];
            }
        } catch (error) {
            Logger.error('Failed to extract local planning authorities', error);
            return [];
        }
    }

    /**
     * Get extraction statistics
     * @returns {Object} Statistics about the extraction process
     */
    static getExtractionStats() {
        return {
            rateLimitStatus: HttpClient.getRateLimitStatus(),
            config: {
                timeout: CONFIG.http.timeout,
                retryAttempts: CONFIG.http.retryAttempts,
                rateLimit: CONFIG.http.rateLimit
            }
        };
    }
}

module.exports = DataExtractor; 