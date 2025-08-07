/**
 * Data Extractor service for Planning Data Analyzer
 */

const Logger = require('../utils/logger');
const HttpClient = require('../utils/http-client');
const { CONFIG } = require('../config');

class DataExtractor {
    static async extractPlanningApplications() {
        Logger.info('Starting planning applications data extraction...');

        const allApplications = [];
        let offset = 0;
        let hasMoreData = true;

        while (hasMoreData) {
            const url = `${CONFIG.baseUrl}?dataset=planning-application&limit=${CONFIG.chunkSize}&offset=${offset}&entry_date_day=06&entry_date_month=08&entry_date_year=2024&entry_date_match=since`;

            try {
                Logger.info(`Fetching planning applications (offset: ${offset})...`);
                const response = await HttpClient.makeRequestWithRetry(url);

                if (response && response.entities && Array.isArray(response.entities)) {
                    allApplications.push(...response.entities);
                    Logger.info(`Retrieved ${response.entities.length} applications`);

                    if (response.entities.length < CONFIG.chunkSize) {
                        hasMoreData = false;
                    } else {
                        offset += CONFIG.chunkSize;
                    }
                } else {
                    Logger.error('Invalid response format for planning applications');
                    Logger.error(`Response structure: ${JSON.stringify(response, null, 2)}`);
                    hasMoreData = false;
                }
            } catch (error) {
                Logger.error('Failed to extract planning applications', error);
                hasMoreData = false;
            }
        }

        Logger.success(`Extracted ${allApplications.length} planning applications`);
        return allApplications;
    }

    static async extractLocalAuthorities() {
        Logger.info('Starting local authorities data extraction...');

        const url = `${CONFIG.baseUrl}?dataset=local-authority&limit=${CONFIG.chunkSize}&offset=0`;

        try {
            const response = await HttpClient.makeRequestWithRetry(url);

            if (response && response.entities && Array.isArray(response.entities)) {
                Logger.success(`Extracted ${response.entities.length} local authorities`);
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

    static async extractLocalPlanningAuthorities() {
        Logger.info('Starting local planning authorities data extraction...');

        const url = `${CONFIG.baseUrl}?dataset=local-planning-authority&limit=${CONFIG.chunkSize}&offset=0`;

        try {
            const response = await HttpClient.makeRequestWithRetry(url);

            if (response && response.entities && Array.isArray(response.entities)) {
                Logger.success(`Extracted ${response.entities.length} local planning authorities`);
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
}

module.exports = DataExtractor; 