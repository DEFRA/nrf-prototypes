/**
 * Configuration for Planning Data Analyser
 */

// Load environment variables from .env file - try local first, then parent directory
const localEnvPath = require('path').join(__dirname, '.env');
const parentEnvPath = require('path').join(__dirname, '../../.env');

// Try to load local .env first, then fall back to parent directory
try {
    require('dotenv').config({ path: localEnvPath });
    console.log(`Loaded environment from: ${localEnvPath}`);
} catch (error) {
    try {
        require('dotenv').config({ path: parentEnvPath });
        console.log(`Loaded environment from: ${parentEnvPath}`);
    } catch (parentError) {
        console.log('No .env file found, using default configuration');
    }
}

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
    outputDir: path.join(__dirname, 'data', 'output'),
    // HTTP Client Configuration
    http: {
        timeout: 30000, // 30 seconds
        retryAttempts: 3,
        retryDelay: 1000, // Base delay in ms
        retryDelayMultiplier: 2, // Exponential backoff multiplier
        maxRetryDelay: 10000, // Maximum delay between retries
        rateLimit: {
            maxRequests: 10, // Max requests per time window
            perMilliseconds: 1000 // Time window in milliseconds (1 second)
        },
        headers: {
            'User-Agent': 'Planning-Data-Analyser/1.0',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    }
};

// LLM Configuration - Flexible setup that defaults to OpenAI but uses LMStudio when configured
const LLM_CONFIG = {
    // OpenAI configuration (default)
    openaiApiUrl: 'https://api.openai.com/v1/chat/completions',
    openaiApiKey: process.env.OPENAI_API_KEY || 'mock-key',
    openaiModel: 'gpt-4o-mini',
    openaiFallbackModel: 'gpt-4o-mini',
    openaiMaxTokens: 500,
    openaiTimeout: 30000,

    // Local LMStudio configuration (optional)
    lmApiUrl: process.env.LM_API_URL || null,
    lmApiKey: process.env.LM_API_KEY || 'lm-studio',
    lmModel: process.env.LM_MODEL || 'openai/gpt-oss-20b',
    lmFallbackModel: process.env.LM_FALLBACK_MODEL || 'openai/gpt-oss-20b',
    lmMaxTokens: parseInt(process.env.LM_MAX_TOKENS) || 500,
    lmTimeout: parseInt(process.env.LM_TIMEOUT) || 30000,

    // Force use of specific provider (optional)
    forceProvider: process.env.FORCE_LLM_PROVIDER || null, // 'openai' or 'lmstudio'

    // Skip function calling for models that don't support it (optional)
    skipFunctionCalling: process.env.SKIP_FUNCTION_CALLING === 'true' || false
};

// Helper function to determine which provider to use
LLM_CONFIG.getActiveProvider = function () {
    // If force provider is set, use it
    if (this.forceProvider) {
        return this.forceProvider.toLowerCase();
    }

    // Check if LMStudio is configured
    const lmstudioConfigured = this.lmApiUrl && this.lmApiUrl !== 'mock-url';

    // Check if OpenAI is configured
    const openaiConfigured = this.openaiApiKey && this.openaiApiKey !== 'mock-key';

    // Priority: LMStudio if configured, otherwise OpenAI if configured, otherwise mock
    if (lmstudioConfigured) {
        return 'lmstudio';
    } else if (openaiConfigured) {
        return 'openai';
    } else {
        return 'mock';
    }
};

// Helper function to get current configuration
LLM_CONFIG.getCurrentConfig = function () {
    const provider = this.getActiveProvider();

    switch (provider) {
        case 'lmstudio':
            return {
                provider: 'lmstudio',
                apiUrl: this.lmApiUrl,
                apiKey: this.lmApiKey,
                model: this.lmModel,
                fallbackModel: this.lmFallbackModel,
                maxTokens: this.lmMaxTokens,
                timeout: this.lmTimeout,
                baseURL: this.lmApiUrl // Keep the full URL including /v1
            };
        case 'openai':
            return {
                provider: 'openai',
                apiUrl: this.openaiApiUrl,
                apiKey: this.openaiApiKey,
                model: this.openaiModel,
                fallbackModel: this.openaiFallbackModel,
                maxTokens: this.openaiMaxTokens,
                timeout: this.openaiTimeout,
                baseURL: undefined
            };
        default:
            return {
                provider: 'mock',
                apiUrl: null,
                apiKey: null,
                model: 'mock-model',
                fallbackModel: 'mock-model',
                maxTokens: 500,
                timeout: 30000,
                baseURL: undefined
            };
    }
};

module.exports = {
    CONFIG,
    LLM_CONFIG
}; 