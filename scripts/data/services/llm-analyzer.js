/**
 * LLM Analyzer service for Planning Data Analyzer
 */

const Logger = require('../utils/logger');
const HttpClient = require('../utils/http-client');
const { LLM_CONFIG } = require('../config');
const OpenAI = require('openai');

class LLMAnalyzer {
    // OpenAI API limits
    static BATCH_LIMITS = {
        MAX_TOKENS_PER_REQUEST: 4000, // OpenAI limit for response tokens
        MAX_PROMPT_TOKENS: 128000, // GPT-4 context window
        MAX_BATCH_SIZE: 50, // Conservative batch size to avoid token limits
        MAX_DESCRIPTION_LENGTH: 500, // Max characters per description to keep within limits
        CONCURRENCY_LIMIT: 20, // Parallel requests per chunk (increased from 5)
        RATE_LIMIT_DELAY: 50 // Delay between batches in ms (reduced from 100)
    };

    static async analyzePlanningDescription(description) {
        Logger.info('Analyzing planning description with LLM...');

        try {
            const analysis = await this.callLLMAPI(description);
            Logger.success('LLM analysis completed');
            return analysis;
        } catch (error) {
            Logger.error('LLM analysis failed', error);
            return {
                houseCount: 0,
                developmentCategory: 'unknown'
            };
        }
    }

    static async analyzePlanningDescriptionsBatch(descriptions) {
        Logger.info(`Analyzing ${descriptions.length} planning descriptions with parallel LLM processing...`);

        try {
            const analyses = await this.callLLMAPIParallel(descriptions);
            Logger.success(`LLM parallel analysis completed for ${descriptions.length} descriptions`);
            return analyses;
        } catch (error) {
            Logger.error('LLM parallel analysis failed', error);
            // Fallback to individual mock analysis for each description
            return descriptions.map(desc => this.mockLLMAnalysis(desc));
        }
    }

    static async callLLMAPIParallel(descriptions) {
        if (!LLM_CONFIG.apiKey || LLM_CONFIG.apiKey === 'mock-key') {
            Logger.warn('OpenAI API key not configured, falling back to mock analysis');
            return descriptions.map(desc => this.mockLLMAnalysis(desc));
        }

        // Process in chunks to avoid overwhelming the API
        const chunkSize = this.BATCH_LIMITS.MAX_BATCH_SIZE;
        const results = [];

        for (let i = 0; i < descriptions.length; i += chunkSize) {
            const chunk = descriptions.slice(i, i + chunkSize);
            Logger.info(`Processing chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(descriptions.length / chunkSize)} (${chunk.length} items)`);

            try {
                // Process chunk in parallel
                const chunkResults = await this.processChunkInParallel(chunk);
                results.push(...chunkResults);
            } catch (error) {
                Logger.error(`Chunk processing failed, using mock analysis for chunk ${Math.floor(i / chunkSize) + 1}`, error);
                // Fallback to mock analysis for this chunk
                const mockResults = chunk.map(desc => this.mockLLMAnalysis(desc));
                results.push(...mockResults);
            }
        }

        return results;
    }

    static async processChunkInParallel(descriptions) {
        // Use configurable concurrency limit
        const concurrencyLimit = this.BATCH_LIMITS.CONCURRENCY_LIMIT;
        const results = [];

        for (let i = 0; i < descriptions.length; i += concurrencyLimit) {
            const batch = descriptions.slice(i, i + concurrencyLimit);

            // Process this batch in parallel
            const batchPromises = batch.map(async (description, index) => {
                try {
                    return await this.callLLMAPI(description);
                } catch (error) {
                    Logger.error(`Failed to analyze description ${i + index + 1}`, error);
                    return this.mockLLMAnalysis(description);
                }
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);

            // Add a small delay between batches to avoid rate limits
            if (i + concurrencyLimit < descriptions.length) {
                await new Promise(resolve => setTimeout(resolve, this.BATCH_LIMITS.RATE_LIMIT_DELAY));
            }
        }

        return results;
    }

    static async callLLMAPI(description) {
        if (!LLM_CONFIG.apiKey || LLM_CONFIG.apiKey === 'mock-key') {
            Logger.warn('OpenAI API key not configured, falling back to mock analysis');
            return this.mockLLMAnalysis(description);
        }

        try {
            // Initialize OpenAI client
            const openai = new OpenAI({
                apiKey: LLM_CONFIG.apiKey
            });

            // Try function calling first
            try {
                const response = await openai.chat.completions.create({
                    model: LLM_CONFIG.model,
                    messages: [{
                        role: 'user',
                        content: `Analyze this planning application description and extract building counts and development categories.

Description: ${description}

Extract the following information:
1. Number of houses/dwellings mentioned (0 if none found)
2. Number of commercial buildings/units mentioned (0 if none found)
3. Number of infrastructure projects mentioned (0 if none found)
4. Primary development category based on the content

For development category, prioritize in this order: house_build > commercial_build > infrastructure_build > extension > renovation > other`
                    }],
                    functions: [{
                        name: "analyze_planning_application",
                        description: "Analyze a planning application description and extract building counts and development category",
                        parameters: {
                            type: "object",
                            properties: {
                                houseCount: {
                                    type: "number",
                                    description: "Number of houses/dwellings mentioned (0 if none found)"
                                },
                                commercialBuildingCount: {
                                    type: "number",
                                    description: "Number of commercial buildings/units mentioned (0 if none found)"
                                },
                                infrastructureBuildCount: {
                                    type: "number",
                                    description: "Number of infrastructure projects mentioned (0 if none found). Note, this category could include terms similar to infrastructure, pipeworks, substation, etc, so do your best but don't over-categorise."
                                },
                                developmentCategory: {
                                    type: "string",
                                    enum: ["house_build", "commercial_build", "infrastructure_build", "extension", "renovation", "other"],
                                    description: "Primary development category. Prioritize: house_build > commercial_build > infrastructure_build > extension > renovation > other"
                                }
                            },
                            required: ["houseCount", "commercialBuildingCount", "infrastructureBuildCount", "developmentCategory"]
                        }
                    }],
                    function_call: { name: "analyze_planning_application" },
                    max_tokens: LLM_CONFIG.maxTokens,
                    temperature: 0.0
                });

                if (!response.choices || !response.choices[0] || !response.choices[0].message) {
                    throw new Error('Invalid response format from OpenAI API');
                }

                const message = response.choices[0].message;

                // Check if function was called
                if (!message.function_call) {
                    Logger.warn('No function call in response, trying fallback model');
                    throw new Error('Function calling not supported');
                }

                // Parse the function arguments
                let analysis;
                try {
                    analysis = JSON.parse(message.function_call.arguments);
                } catch (parseError) {
                    Logger.error('Failed to parse function arguments:', parseError);
                    return this.mockLLMAnalysis(description);
                }

                // Log the response for debugging
                Logger.debug('Function call arguments:', message.function_call.arguments);
                Logger.debug('Parsed analysis:', analysis);

                // Validate the response structure with better error handling
                if (!analysis || typeof analysis !== 'object') {
                    Logger.error('Invalid analysis response: not an object', analysis);
                    return this.mockLLMAnalysis(description);
                }

                // Function calling guarantees the structure, but we'll do basic validation
                if (typeof analysis.houseCount !== 'number') {
                    Logger.warn(`Invalid houseCount type: ${typeof analysis.houseCount}, value: ${analysis.houseCount}`);
                    analysis.houseCount = 0;
                }

                if (typeof analysis.commercialBuildingCount !== 'number') {
                    Logger.warn(`Invalid commercialBuildingCount type: ${typeof analysis.commercialBuildingCount}, value: ${analysis.commercialBuildingCount}`);
                    analysis.commercialBuildingCount = 0;
                }

                if (typeof analysis.infrastructureBuildCount !== 'number') {
                    Logger.warn(`Invalid infrastructureBuildCount type: ${typeof analysis.infrastructureBuildCount}, value: ${analysis.infrastructureBuildCount}`);
                    analysis.infrastructureBuildCount = 0;
                }

                if (typeof analysis.developmentCategory !== 'string') {
                    Logger.warn(`Invalid developmentCategory type: ${typeof analysis.developmentCategory}, value: ${analysis.developmentCategory}`);
                    analysis.developmentCategory = 'other';
                }

                return {
                    houseCount: analysis.houseCount || 0,
                    commercialBuildingCount: analysis.commercialBuildingCount || 0,
                    infrastructureBuildCount: analysis.infrastructureBuildCount || 0,
                    developmentCategory: analysis.developmentCategory || 'other'
                };

            } catch (functionError) {
                // If function calling fails, try with fallback model using prompt-based approach
                Logger.warn(`Function calling failed, trying fallback model ${LLM_CONFIG.fallbackModel}`);

                const fallbackResponse = await openai.chat.completions.create({
                    model: LLM_CONFIG.fallbackModel,
                    messages: [{
                        role: 'user',
                        content: `Analyze this planning application description and extract building counts and development categories.

Description: ${description}

You must respond with a JSON object that has exactly these fields:
- houseCount: a number (0 if no houses/dwellings mentioned)
- commercialBuildingCount: a number (0 if no commercial buildings/units mentioned)
- infrastructureBuildCount: a number (0 if no infrastructure mentioned)
- developmentCategory: a string (one of: "house_build", "commercial_build", "infrastructure_build", "extension", "renovation", "other")

Respond with ONLY the JSON object, no other text.`
                    }],
                    max_tokens: LLM_CONFIG.maxTokens,
                    temperature: 0.0
                });

                if (!fallbackResponse.choices || !fallbackResponse.choices[0] || !fallbackResponse.choices[0].message) {
                    throw new Error('Invalid response format from OpenAI API');
                }

                const content = fallbackResponse.choices[0].message.content;

                // Try to parse JSON from the response
                try {
                    const analysis = JSON.parse(content);

                    // Basic validation for fallback
                    return {
                        houseCount: typeof analysis.houseCount === 'number' ? analysis.houseCount : 0,
                        commercialBuildingCount: typeof analysis.commercialBuildingCount === 'number' ? analysis.commercialBuildingCount : 0,
                        infrastructureBuildCount: typeof analysis.infrastructureBuildCount === 'number' ? analysis.infrastructureBuildCount : 0,
                        developmentCategory: typeof analysis.developmentCategory === 'string' ? analysis.developmentCategory : 'other'
                    };
                } catch (parseError) {
                    Logger.warn('Failed to parse JSON response, using mock analysis');
                    return this.mockLLMAnalysis(description);
                }
            }

        } catch (error) {
            Logger.error('OpenAI API call failed', error);

            // Handle specific OpenAI errors
            if (error.status === 400) {
                Logger.error('Bad Request - likely invalid request format or content');
            } else if (error.status === 401) {
                Logger.error('Unauthorized - check your API key');
            } else if (error.status === 429) {
                Logger.error('Rate limit exceeded - try again later');
            } else if (error.status === 500) {
                Logger.error('OpenAI server error - try again later');
            }

            Logger.warn('Falling back to mock analysis');
            return this.mockLLMAnalysis(description);
        }
    }

    static mockLLMAnalysis(description) {
        // Mock analysis logic - fallback when API is not available
        const lowerDesc = description.toLowerCase();

        let houseCount = 0;
        let commercialBuildingCount = 0;
        let infrastructureBuildCount = 0;
        let developmentCategory = 'other';

        // Extract house count
        const houseMatches = lowerDesc.match(/(\d+)\s*(houses?|dwellings?|units?|homes?)/);
        if (houseMatches) {
            houseCount = parseInt(houseMatches[1]);
        }

        // Extract commercial building count
        const commercialMatches = lowerDesc.match(/(\d+)\s*(commercial|office|retail|shop|store|business)/);
        if (commercialMatches) {
            commercialBuildingCount = parseInt(commercialMatches[1]);
        }

        // Extract infrastructure count
        const infrastructureMatches = lowerDesc.match(/(\d+)\s*(infrastructure|road|bridge|tunnel|station|facility)/);
        if (infrastructureMatches) {
            infrastructureBuildCount = parseInt(infrastructureMatches[1]);
        }

        // Determine development category
        if (lowerDesc.includes('house') || lowerDesc.includes('dwelling') || lowerDesc.includes('residential')) {
            developmentCategory = 'house_build';
        } else if (lowerDesc.includes('commercial') || lowerDesc.includes('office') || lowerDesc.includes('retail')) {
            developmentCategory = 'commercial_build';
        } else if (lowerDesc.includes('infrastructure') || lowerDesc.includes('road') || lowerDesc.includes('bridge')) {
            developmentCategory = 'infrastructure_build';
        } else if (lowerDesc.includes('extension') || lowerDesc.includes('addition')) {
            developmentCategory = 'extension';
        } else if (lowerDesc.includes('renovation') || lowerDesc.includes('refurbishment')) {
            developmentCategory = 'renovation';
        }

        return {
            houseCount,
            commercialBuildingCount,
            infrastructureBuildCount,
            developmentCategory
        };
    }
}

module.exports = LLMAnalyzer; 