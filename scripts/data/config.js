/**
 * Configuration for Planning Data Analyzer
 */

// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const path = require('path');

const CONFIG = {
    baseUrl: 'https://www.planning.data.gov.uk/entity.json',
    chunkSize: 500, // API limit is 500 records per request
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    dataDir: path.join(__dirname, 'data'),
    rawDir: path.join(__dirname, 'data', 'raw'),
    enhancedDir: path.join(__dirname, 'data', 'enhanced'),
    analysisDir: path.join(__dirname, 'data', 'analysis'),
    outputDir: path.join(__dirname, 'data', 'output')
};

// LLM Configuration
const LLM_CONFIG = {
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    apiKey: process.env.OPENAI_API_KEY || 'mock-key',
    model: 'gpt-4o-mini', // Supports structured outputs
    fallbackModel: 'gpt-3.5-turbo', // Fallback for models without structured outputs
    maxTokens: 500
};

module.exports = {
    CONFIG,
    LLM_CONFIG
}; 