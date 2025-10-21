/**
 * LLM Analyser service for Planning Data Analyser
 */

const Logger = require('../utils/logger')
const HttpClient = require('../utils/http-client')
const { LLM_CONFIG } = require('../config')
const OpenAI = require('openai')

class LLMAnalyser {
  // OpenAI API limits
  static BATCH_LIMITS = {
    MAX_TOKENS_PER_REQUEST: 4000, // OpenAI limit for response tokens
    MAX_PROMPT_TOKENS: 128000, // GPT-4 context window
    MAX_BATCH_SIZE: 50, // Conservative batch size to avoid token limits
    MAX_DESCRIPTION_LENGTH: 500, // Max characters per description to keep within limits
    CONCURRENCY_LIMIT: 5, // Reduced for LMStudio compatibility
    RATE_LIMIT_DELAY: 100 // Increased delay for LMStudio
  }

  // Track if function calling is not supported by the current model
  static functionCallingNotSupported = false

  static async analyzePlanningDescription(description) {
    Logger.info('Analyzing planning description with LLM...')

    try {
      const analysis = await this.callLLMAPI(description)
      Logger.success('LLM analysis completed')
      return analysis
    } catch (error) {
      Logger.error('LLM analysis failed', error)
      return {
        houseCount: 0,
        developmentCategory: 'unknown'
      }
    }
  }

  static async analyzePlanningDescriptionsBatch(descriptions) {
    Logger.info(
      `Analyzing ${descriptions.length} planning descriptions with parallel LLM processing...`
    )

    try {
      const analyses = await this.callLLMAPIParallel(descriptions)
      Logger.success(
        `LLM parallel analysis completed for ${descriptions.length} descriptions`
      )
      return analyses
    } catch (error) {
      Logger.error('LLM parallel analysis failed', error)
      // Fallback to individual mock analysis for each description
      return descriptions.map((desc) => this.mockLLMAnalysis(desc))
    }
  }

  static async callLLMAPIParallel(descriptions) {
    if (!this.isLLMConfigured()) {
      Logger.info('Using enhanced mock analysis for planning data extraction')
      return descriptions.map((desc) => this.mockLLMAnalysis(desc))
    }

    // Process in chunks to avoid overwhelming the API
    const chunkSize = this.BATCH_LIMITS.MAX_BATCH_SIZE
    const results = []

    for (let i = 0; i < descriptions.length; i += chunkSize) {
      const chunk = descriptions.slice(i, i + chunkSize)
      Logger.info(
        `Processing chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(descriptions.length / chunkSize)} (${chunk.length} items)`
      )

      try {
        // Process chunk in parallel
        const chunkResults = await this.processChunkInParallel(chunk)
        results.push(...chunkResults)
      } catch (error) {
        Logger.error(
          `Chunk processing failed, using mock analysis for chunk ${Math.floor(i / chunkSize) + 1}`,
          error
        )
        // Fallback to mock analysis for this chunk
        const mockResults = chunk.map((desc) => this.mockLLMAnalysis(desc))
        results.push(...mockResults)
      }
    }

    return results
  }

  static async processChunkInParallel(descriptions) {
    // Use configurable concurrency limit
    const concurrencyLimit = this.BATCH_LIMITS.CONCURRENCY_LIMIT
    const results = []

    for (let i = 0; i < descriptions.length; i += concurrencyLimit) {
      const batch = descriptions.slice(i, i + concurrencyLimit)

      // Process this batch in parallel
      const batchPromises = batch.map(async (description, index) => {
        try {
          return await this.callLLMAPI(description)
        } catch (error) {
          Logger.error(`Failed to analyze description ${i + index + 1}`, error)
          return this.mockLLMAnalysis(description)
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Add a small delay between batches to avoid rate limits
      if (i + concurrencyLimit < descriptions.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.BATCH_LIMITS.RATE_LIMIT_DELAY)
        )
      }
    }

    return results
  }

  static isLLMConfigured() {
    const provider = LLM_CONFIG.getActiveProvider()
    if (provider === 'mock') {
      Logger.debug(
        'Mock analysis mode: Using enhanced pattern matching for planning data extraction'
      )
    }
    return provider !== 'mock'
  }

  static async callLLMAPI(description) {
    if (!this.isLLMConfigured()) {
      Logger.info('Using enhanced mock analysis for planning data extraction')
      return this.mockLLMAnalysis(description)
    }

    try {
      const config = LLM_CONFIG.getCurrentConfig()
      Logger.debug(`Using ${config.provider} with model: ${config.model}`)

      const clientConfig = {
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        timeout: config.timeout,
        ...(config.provider === 'lmstudio' && {
          maxRetries: 0,
          httpAgent: new (require('https').Agent)({
            keepAlive: true,
            timeout: config.timeout
          })
        })
      }

      const openai = new OpenAI(clientConfig)

      // Check if we've already determined this model doesn't support function calling
      if (this.functionCallingNotSupported && !LLM_CONFIG.skipFunctionCalling) {
        Logger.debug(
          'Function calling previously failed for this model, skipping to prompt-based approach'
        )
        throw new Error('Function calling not supported by this model')
      }

      try {
        if (LLM_CONFIG.skipFunctionCalling) {
          Logger.info('Skipping function calling as configured')
          throw new Error('Function calling disabled by configuration')
        }

        Logger.debug('Attempting function calling...')
        const response = await openai.chat.completions.create({
          model: config.model,
          messages: [
            {
              role: 'user',
              content: `Analyze this planning application description and extract building counts and development categories.

Description: ${description}

Extract the following information:
1. Number of houses/dwellings mentioned (0 if none found)
2. Number of commercial buildings/units mentioned (0 if none found)
3. Number of infrastructure projects mentioned (0 if none found)
4. Primary development category based on the content

For development category, prioritize in this order: house_build > commercial_build > infrastructure_build > extension > renovation > other`
            }
          ],
          tools: [
            {
              type: 'function',
              function: {
                name: 'analyze_planning_application',
                description:
                  'Analyze a planning application description and extract building counts and development category',
                parameters: {
                  type: 'object',
                  properties: {
                    houseCount: {
                      type: 'number',
                      description:
                        'Number of houses/dwellings mentioned (0 if none found)'
                    },
                    commercialBuildingCount: {
                      type: 'number',
                      description:
                        'Number of commercial buildings/units mentioned (0 if none found)'
                    },
                    infrastructureBuildCount: {
                      type: 'number',
                      description:
                        "Number of infrastructure projects mentioned (0 if none found). Note, this category could include terms similar to infrastructure, pipeworks, substation, etc, so do your best but don't over-categorise."
                    },
                    developmentCategory: {
                      type: 'string',
                      enum: [
                        'house_build',
                        'commercial_build',
                        'infrastructure_build',
                        'extension',
                        'renovation',
                        'other'
                      ],
                      description:
                        'Primary development category. Prioritize: house_build > commercial_build > infrastructure_build > extension > renovation > other'
                    }
                  },
                  required: [
                    'houseCount',
                    'commercialBuildingCount',
                    'infrastructureBuildCount',
                    'developmentCategory'
                  ]
                }
              }
            }
          ],
          tool_choice: 'required',
          max_tokens: config.maxTokens,
          temperature: 0.0
        })

        if (
          !response.choices ||
          !response.choices[0] ||
          !response.choices[0].message
        ) {
          throw new Error('Invalid response format from LLM API')
        }

        const message = response.choices[0].message

        // Check for tool_calls first (newer format), then function_call (older format)
        if (!message.tool_calls && !message.function_call) {
          // Check if this is the vLLM bug where function calls are returned as plain text
          if (
            (message.content &&
              message.content.includes('"name"') &&
              message.content.includes('"parameters"')) ||
            message.content.includes('functions.analyze_planning_application')
          ) {
            Logger.warn(
              'Detected vLLM function calling bug - function call returned as plain text'
            )
            try {
              // Try to parse the function call from the content - multiple formats
              let functionCallMatch = null

              // Format 1: Standard JSON array format
              functionCallMatch = message.content.match(
                /\[\s*\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"parameters"\s*:\s*(\{[^}]*\})\s*\}\s*\]/
              )

              // Format 2: vLLM specific format with analysis in content
              if (
                !functionCallMatch &&
                message.content.includes(
                  'functions.analyze_planning_application'
                )
              ) {
                const analysisMatch = message.content.match(
                  /analysis:\s*\{([^}]+)\}/
                )
                if (analysisMatch) {
                  const analysisStr = '{' + analysisMatch[1] + '}'
                  try {
                    // Convert single quotes to double quotes for JSON parsing
                    const jsonStr = analysisStr.replace(/'/g, '"')
                    const analysis = JSON.parse(jsonStr)
                    Logger.debug(
                      'Successfully parsed analysis from vLLM content:',
                      analysis
                    )

                    const validatedAnalysis = {
                      houseCount: analysis.houseCount || 0,
                      commercialBuildingCount:
                        analysis.commercialBuildingCount || 0,
                      infrastructureBuildCount:
                        analysis.infrastructureBuildCount || 0,
                      developmentCategory:
                        typeof analysis.developmentCategory === 'string'
                          ? analysis.developmentCategory
                          : 'other'
                    }

                    const validCategories = [
                      'house_build',
                      'commercial_build',
                      'infrastructure_build',
                      'extension',
                      'renovation',
                      'other'
                    ]
                    if (
                      !validCategories.includes(
                        validatedAnalysis.developmentCategory
                      )
                    ) {
                      validatedAnalysis.developmentCategory = 'other'
                    }

                    Logger.debug(
                      'Successfully parsed analysis from vLLM content:',
                      validatedAnalysis
                    )
                    return validatedAnalysis
                  } catch (parseError) {
                    Logger.warn(
                      'Failed to parse analysis from vLLM content:',
                      parseError.message
                    )
                    Logger.debug('Raw analysis string:', analysisStr)
                  }
                }
              }

              if (functionCallMatch) {
                const functionName = functionCallMatch[1]
                const parameters = JSON.parse(functionCallMatch[2])

                Logger.debug(
                  'Successfully parsed function call from content:',
                  { functionName, parameters }
                )

                // Validate the parameters
                if (!parameters || typeof parameters !== 'object') {
                  throw new Error('Invalid parameters structure')
                }

                const validatedAnalysis = {
                  houseCount: parameters.houseCount || 0,
                  commercialBuildingCount:
                    parameters.commercialBuildingCount || 0,
                  infrastructureBuildCount:
                    parameters.infrastructureBuildCount || 0,
                  developmentCategory:
                    typeof parameters.developmentCategory === 'string'
                      ? parameters.developmentCategory
                      : 'other'
                }

                const validCategories = [
                  'house_build',
                  'commercial_build',
                  'infrastructure_build',
                  'extension',
                  'renovation',
                  'other'
                ]
                if (
                  !validCategories.includes(
                    validatedAnalysis.developmentCategory
                  )
                ) {
                  validatedAnalysis.developmentCategory = 'other'
                }

                Logger.debug(
                  'Successfully parsed analysis from vLLM content:',
                  validatedAnalysis
                )
                return validatedAnalysis
              }
            } catch (parseError) {
              Logger.warn(
                'Failed to parse function call from vLLM content:',
                parseError.message
              )
              Logger.debug('Raw content:', message.content)
            }
          }

          Logger.warn(
            'No function call in response, trying prompt-based approach'
          )
          throw new Error('Function calling not supported')
        }

        // Handle tool_calls (newer format)
        if (message.tool_calls && message.tool_calls.length > 0) {
          const toolCall = message.tool_calls[0]
          if (toolCall.function && toolCall.function.arguments) {
            let analysis
            try {
              analysis = JSON.parse(toolCall.function.arguments)
            } catch (parseError) {
              Logger.error('Failed to parse tool call arguments:', parseError)
              return this.mockLLMAnalysis(description)
            }

            Logger.debug('Tool call arguments:', toolCall.function.arguments)
            Logger.debug('Parsed analysis:', analysis)

            if (!analysis || typeof analysis !== 'object') {
              Logger.error('Invalid analysis response: not an object', analysis)
              return this.mockLLMAnalysis(description)
            }

            if (typeof analysis.houseCount !== 'number') {
              if (typeof analysis.houseCount === 'string') {
                analysis.houseCount = parseInt(analysis.houseCount) || 0
              } else {
                Logger.warn(
                  `Invalid houseCount type: ${typeof analysis.houseCount}, value: ${analysis.houseCount}`
                )
                analysis.houseCount = 0
              }
            }

            if (typeof analysis.commercialBuildingCount !== 'number') {
              if (typeof analysis.commercialBuildingCount === 'string') {
                analysis.commercialBuildingCount =
                  parseInt(analysis.commercialBuildingCount) || 0
              } else {
                Logger.warn(
                  `Invalid commercialBuildingCount type: ${typeof analysis.commercialBuildingCount}, value: ${analysis.commercialBuildingCount}`
                )
                analysis.commercialBuildingCount = 0
              }
            }

            if (typeof analysis.infrastructureBuildCount !== 'number') {
              if (typeof analysis.infrastructureBuildCount === 'string') {
                analysis.infrastructureBuildCount =
                  parseInt(analysis.infrastructureBuildCount) || 0
              } else {
                Logger.warn(
                  `Invalid infrastructureBuildCount type: ${typeof analysis.infrastructureBuildCount}, value: ${analysis.infrastructureBuildCount}`
                )
                analysis.infrastructureBuildCount = 0
              }
            }

            if (typeof analysis.developmentCategory !== 'string') {
              Logger.warn(
                `Invalid developmentCategory type: ${typeof analysis.developmentCategory}, value: ${analysis.developmentCategory}`
              )
              analysis.developmentCategory = 'other'
            }

            return {
              houseCount: analysis.houseCount || 0,
              commercialBuildingCount: analysis.commercialBuildingCount || 0,
              infrastructureBuildCount: analysis.infrastructureBuildCount || 0,
              developmentCategory: analysis.developmentCategory || 'other'
            }
          }
        }

        // Handle function_call (older format)
        if (message.function_call) {
          let analysis
          try {
            analysis = JSON.parse(message.function_call.arguments)
          } catch (parseError) {
            Logger.error('Failed to parse function arguments:', parseError)
            return this.mockLLMAnalysis(description)
          }

          Logger.debug(
            'Function call arguments:',
            message.function_call.arguments
          )
          Logger.debug('Parsed analysis:', analysis)

          if (!analysis || typeof analysis !== 'object') {
            Logger.error('Invalid analysis response: not an object', analysis)
            return this.mockLLMAnalysis(description)
          }

          if (typeof analysis.houseCount !== 'number') {
            Logger.warn(
              `Invalid houseCount type: ${typeof analysis.houseCount}, value: ${analysis.houseCount}`
            )
            analysis.houseCount =
              typeof analysis.houseCount === 'string'
                ? parseInt(analysis.houseCount) || 0
                : 0
          }

          if (typeof analysis.commercialBuildingCount !== 'number') {
            Logger.warn(
              `Invalid commercialBuildingCount type: ${typeof analysis.commercialBuildingCount}, value: ${analysis.commercialBuildingCount}`
            )
            analysis.commercialBuildingCount =
              typeof analysis.commercialBuildingCount === 'string'
                ? parseInt(analysis.commercialBuildingCount) || 0
                : 0
          }

          if (typeof analysis.infrastructureBuildCount !== 'number') {
            Logger.warn(
              `Invalid infrastructureBuildCount type: ${typeof analysis.infrastructureBuildCount}, value: ${analysis.infrastructureBuildCount}`
            )
            analysis.infrastructureBuildCount =
              typeof analysis.infrastructureBuildCount === 'string'
                ? parseInt(analysis.infrastructureBuildCount) || 0
                : 0
          }

          if (typeof analysis.developmentCategory !== 'string') {
            Logger.warn(
              `Invalid developmentCategory type: ${typeof analysis.developmentCategory}, value: ${analysis.developmentCategory}`
            )
            analysis.developmentCategory = 'other'
          }

          return {
            houseCount: analysis.houseCount || 0,
            commercialBuildingCount: analysis.commercialBuildingCount || 0,
            infrastructureBuildCount: analysis.infrastructureBuildCount || 0,
            developmentCategory: analysis.developmentCategory || 'other'
          }
        }
      } catch (functionError) {
        // Mark that function calling is not supported for this model
        this.functionCallingNotSupported = true
        Logger.warn(
          `Function calling failed, trying prompt-based approach with ${config.model}`
        )

        try {
          const promptResponse = await openai.chat.completions.create({
            model: config.model,
            messages: [
              {
                role: 'system',
                content: `You are a planning application analyser. Respond with ONLY a valid JSON object.`
              },
              {
                role: 'user',
                content: `Analyze this planning application description and extract building counts and development categories.

Description: ${description}

Respond with a JSON object containing:
- houseCount: number of houses/dwellings (0 if none)
- commercialBuildingCount: number of commercial buildings/units (0 if none)
- infrastructureBuildCount: number of infrastructure projects (0 if none)
- developmentCategory: one of ["house_build", "commercial_build", "infrastructure_build", "extension", "renovation", "other"]

Example: {"houseCount": 5, "commercialBuildingCount": 2, "infrastructureBuildCount": 1, "developmentCategory": "house_build"}`
              }
            ],
            max_tokens: config.maxTokens,
            temperature: 0.0
          })

          if (
            !promptResponse.choices ||
            !promptResponse.choices[0] ||
            !promptResponse.choices[0].message
          ) {
            throw new Error('Invalid response format from LLM API')
          }

          const content = promptResponse.choices[0].message.content

          try {
            let cleanContent = content.trim()
            const jsonMatch = cleanContent.match(/\{.*\}/s)
            if (jsonMatch) {
              cleanContent = jsonMatch[0]
            }

            const analysis = JSON.parse(cleanContent)

            if (!analysis || typeof analysis !== 'object') {
              throw new Error('Response is not a valid JSON object')
            }

            const validatedAnalysis = {
              houseCount: analysis.houseCount || 0,
              commercialBuildingCount: analysis.commercialBuildingCount || 0,
              infrastructureBuildCount: analysis.infrastructureBuildCount || 0,
              developmentCategory:
                typeof analysis.developmentCategory === 'string'
                  ? analysis.developmentCategory
                  : 'other'
            }

            const validCategories = [
              'house_build',
              'commercial_build',
              'infrastructure_build',
              'extension',
              'renovation',
              'other'
            ]
            if (
              !validCategories.includes(validatedAnalysis.developmentCategory)
            ) {
              validatedAnalysis.developmentCategory = 'other'
            }

            Logger.debug(
              'Successfully parsed JSON response:',
              validatedAnalysis
            )
            return validatedAnalysis
          } catch (parseError) {
            Logger.warn(
              'Failed to parse JSON response from prompt-based approach:',
              parseError.message
            )
            Logger.debug('Raw response content:', content)
            return this.mockLLMAnalysis(description)
          }
        } catch (promptError) {
          Logger.warn(
            `Prompt-based approach failed with ${config.model}:`,
            promptError.message
          )
          if (promptError.response) {
            Logger.error(`API Error Status: ${promptError.response.status}`)
            Logger.error(`API Error Data:`, promptError.response.data)
          }
          return this.mockLLMAnalysis(description)
        }
      }
    } catch (error) {
      Logger.error('LLM API call failed', error)

      if (error.status === 400) {
        Logger.error('Bad Request - likely invalid request format or content')
      } else if (error.status === 401) {
        Logger.error('Unauthorized - check your API key')
      } else if (error.status === 429) {
        Logger.error('Rate limit exceeded - try again later')
      } else if (error.status === 500) {
        Logger.error('Server error - try again later')
      } else if (error.code === 'ECONNREFUSED') {
        Logger.error(
          'Connection refused - check if LMStudio is running on the configured port'
        )
      } else if (error.code === 'ENOTFOUND') {
        Logger.error('Host not found - check the API URL configuration')
      }

      Logger.warn('Falling back to mock analysis')
      return this.mockLLMAnalysis(description)
    }
  }

  static mockLLMAnalysis(description) {
    // Enhanced mock analysis logic - more sophisticated fallback when API is not available
    const lowerDesc = description.toLowerCase()

    let houseCount = 0
    let commercialBuildingCount = 0
    let infrastructureBuildCount = 0
    let developmentCategory = 'other'

    // Enhanced house count extraction
    const housePatterns = [
      /(\d+)\s*(houses?|dwellings?|units?|homes?|residential)/,
      /(\d+)\s*(new|additional|proposed)\s*(houses?|dwellings?|units?|homes?)/,
      /construction\s*of\s*(\d+)\s*(houses?|dwellings?|units?|homes?)/,
      /(\d+)\s*(bedroom|bed)\s*(houses?|dwellings?|units?|homes?)/
    ]

    for (const pattern of housePatterns) {
      const match = lowerDesc.match(pattern)
      if (match) {
        houseCount = parseInt(match[1])
        break
      }
    }

    // Enhanced commercial building count extraction
    const commercialPatterns = [
      /(\d+)\s*(commercial|office|retail|shop|store|business|industrial)/,
      /(\d+)\s*(new|additional|proposed)\s*(commercial|office|retail|shop|store|business)/,
      /construction\s*of\s*(\d+)\s*(commercial|office|retail|shop|store|business)/,
      /(\d+)\s*(commercial|office|retail)\s*(units?|buildings?|spaces?)/
    ]

    for (const pattern of commercialPatterns) {
      const match = lowerDesc.match(pattern)
      if (match) {
        commercialBuildingCount = parseInt(match[1])
        break
      }
    }

    // Enhanced infrastructure count extraction
    const infrastructurePatterns = [
      /(\d+)\s*(infrastructure|road|bridge|tunnel|station|facility|substation)/,
      /(\d+)\s*(new|additional|proposed)\s*(infrastructure|road|bridge|tunnel|station|facility)/,
      /construction\s*of\s*(\d+)\s*(infrastructure|road|bridge|tunnel|station|facility)/,
      /(\d+)\s*(infrastructure|road|bridge)\s*(projects?|facilities?|structures?)/
    ]

    for (const pattern of infrastructurePatterns) {
      const match = lowerDesc.match(pattern)
      if (match) {
        infrastructureBuildCount = parseInt(match[1])
        break
      }
    }

    // Enhanced development category determination with priority
    if (
      lowerDesc.includes('house') ||
      lowerDesc.includes('dwelling') ||
      lowerDesc.includes('residential') ||
      lowerDesc.includes('home') ||
      lowerDesc.includes('housing') ||
      houseCount > 0
    ) {
      developmentCategory = 'house_build'
    } else if (
      lowerDesc.includes('commercial') ||
      lowerDesc.includes('office') ||
      lowerDesc.includes('retail') ||
      lowerDesc.includes('shop') ||
      lowerDesc.includes('store') ||
      lowerDesc.includes('business') ||
      lowerDesc.includes('industrial') ||
      commercialBuildingCount > 0
    ) {
      developmentCategory = 'commercial_build'
    } else if (
      lowerDesc.includes('infrastructure') ||
      lowerDesc.includes('road') ||
      lowerDesc.includes('bridge') ||
      lowerDesc.includes('tunnel') ||
      lowerDesc.includes('station') ||
      lowerDesc.includes('facility') ||
      lowerDesc.includes('substation') ||
      lowerDesc.includes('pipework') ||
      infrastructureBuildCount > 0
    ) {
      developmentCategory = 'infrastructure_build'
    } else if (
      lowerDesc.includes('extension') ||
      lowerDesc.includes('addition') ||
      lowerDesc.includes('expand')
    ) {
      developmentCategory = 'extension'
    } else if (
      lowerDesc.includes('renovation') ||
      lowerDesc.includes('refurbishment') ||
      lowerDesc.includes('refurb') ||
      lowerDesc.includes('upgrade') ||
      lowerDesc.includes('modernization')
    ) {
      developmentCategory = 'renovation'
    }

    return {
      houseCount,
      commercialBuildingCount,
      infrastructureBuildCount,
      developmentCategory
    }
  }
}

module.exports = LLMAnalyser
