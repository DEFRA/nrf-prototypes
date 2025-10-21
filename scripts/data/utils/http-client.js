/**
 * HTTP Client utility for Planning Data Analyser
 *
 * Uses Axios with retry logic, rate limiting, and timeout handling
 */

const axios = require('axios')
const axiosRetry = require('axios-retry').default
const rateLimit = require('axios-rate-limit')
const Logger = require('./logger')
const { CONFIG } = require('../config')

class HttpClient {
  constructor() {
    // Create base axios instance
    this.client = axios.create({
      timeout: CONFIG.http.timeout,
      headers: CONFIG.http.headers,
      validateStatus: (status) => {
        // Consider 2xx and 3xx as success
        return status >= 200 && status < 400
      }
    })

    // Apply rate limiting
    this.client = rateLimit(this.client, {
      maxRequests: CONFIG.http.rateLimit.maxRequests,
      perMilliseconds: CONFIG.http.rateLimit.perMilliseconds
    })

    // Apply retry logic
    axiosRetry(this.client, {
      retries: CONFIG.http.retryAttempts,
      retryDelay: (retryCount) => {
        const delay =
          CONFIG.http.retryDelay *
          Math.pow(CONFIG.http.retryDelayMultiplier, retryCount - 1)
        const maxDelay = CONFIG.http.maxRetryDelay
        return Math.min(delay, maxDelay)
      },
      retryCondition: (error) => {
        // Retry on network errors, 5xx server errors, and specific 4xx errors
        const axiosRetryUtils = require('axios-retry')
        return (
          axiosRetryUtils.isNetworkOrIdempotentRequestError(error) ||
          (error.response && error.response.status >= 500) ||
          (error.response && [408, 429].includes(error.response.status))
        )
      },
      onRetry: (retryCount, error, requestConfig) => {
        Logger.warn(
          `Request failed, retrying (${retryCount}/${CONFIG.http.retryAttempts}): ${error.message}`
        )
      }
    })

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        Logger.debug(`Making request to: ${config.url}`)
        return config
      },
      (error) => {
        Logger.error('Request interceptor error:', error)
        return Promise.reject(error)
      }
    )

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        Logger.debug(
          `Response received from: ${response.config.url} (${response.status})`
        )
        return response
      },
      (error) => {
        if (error.response) {
          Logger.error(
            `Response error from ${error.config.url}: ${error.response.status} - ${error.response.statusText}`
          )
        } else if (error.request) {
          Logger.error(`Request error: ${error.message}`)
        } else {
          Logger.error(`Request setup error: ${error.message}`)
        }
        return Promise.reject(error)
      }
    )
  }

  /**
   * Make a GET request with automatic retry and rate limiting
   * @param {string} url - The URL to request
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - The response data
   */
  async makeRequest(url, options = {}) {
    try {
      const response = await this.client.get(url, {
        ...options,
        timeout: options.timeout || CONFIG.http.timeout
      })

      // Validate JSON response
      if (typeof response.data === 'string') {
        try {
          return JSON.parse(response.data)
        } catch (parseError) {
          throw new Error(`Invalid JSON response: ${parseError.message}`)
        }
      }

      return response.data
    } catch (error) {
      // Enhanced error handling
      if (error.code === 'ECONNABORTED') {
        throw new Error(`Request timeout after ${CONFIG.http.timeout}ms`)
      } else if (error.code === 'ENOTFOUND') {
        throw new Error(`DNS lookup failed for ${url}`)
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error(`Connection refused to ${url}`)
      } else if (error.response) {
        const status = error.response.status
        const statusText = error.response.statusText
        throw new Error(`HTTP ${status}: ${statusText}`)
      } else {
        throw new Error(`Request failed: ${error.message}`)
      }
    }
  }

  /**
   * Make a request with custom retry logic (for backward compatibility)
   * @param {string} url - The URL to request
   * @param {Object} options - Additional options
   * @param {number} retries - Number of retry attempts
   * @returns {Promise<Object>} - The response data
   */
  async makeRequestWithRetry(
    url,
    options = {},
    retries = CONFIG.http.retryAttempts
  ) {
    // This method is now redundant since axios-retry handles retries automatically
    // But keeping for backward compatibility
    return this.makeRequest(url, options)
  }

  /**
   * Utility method to delay execution
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  static delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Get current rate limit status
   * @returns {Object} - Rate limit information
   */
  getRateLimitStatus() {
    // This would need to be implemented based on the specific rate limiting library
    // For now, return a placeholder
    return {
      requestsRemaining: 'Unknown',
      resetTime: 'Unknown'
    }
  }
}

// Create a singleton instance
const httpClient = new HttpClient()

module.exports = httpClient
