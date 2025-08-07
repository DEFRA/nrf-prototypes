/**
 * HTTP Client utility for Planning Data Analyzer
 */

const https = require('https');
const { URL } = require('url');
const Logger = require('./logger');
const { CONFIG } = require('../config');

class HttpClient {
    static async makeRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const requestOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port || 443,
                path: urlObj.pathname + urlObj.search,
                method: options.method || 'GET',
                headers: {
                    'User-Agent': 'Planning-Data-Analyzer/1.0',
                    ...options.headers
                },
                timeout: CONFIG.timeout
            };

            const req = https.request(requestOptions, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve(jsonData);
                    } catch (error) {
                        reject(new Error(`Invalid JSON response: ${error.message}`));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    static async makeRequestWithRetry(url, options = {}, retries = CONFIG.retryAttempts) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await this.makeRequest(url, options);
            } catch (error) {
                Logger.error(`Request attempt ${attempt} failed: ${error.message}`);
                if (attempt === retries) {
                    throw error;
                }
                await this.delay(CONFIG.retryDelay * attempt);
            }
        }
    }

    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = HttpClient; 