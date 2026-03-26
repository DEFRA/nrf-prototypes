const { ProxyAgent } = require('undici')

/**
 * Fetch with optional proxy support
 * Uses HTTP_PROXY environment variable if set
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @returns {Promise<Response>}
 */
async function proxyFetch(url, options) {
  const proxyUrlConfig = process.env.HTTP_PROXY

  if (!proxyUrlConfig) {
    return await fetch(url, options)
  }

  return await fetch(url, {
    ...options,
    dispatcher: new ProxyAgent({
      uri: proxyUrlConfig,
      keepAliveTimeout: 10,
      keepAliveMaxTimeout: 10
    })
  })
}

module.exports = { proxyFetch }
