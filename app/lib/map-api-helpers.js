/**
 * Map API Helpers
 * Shared utilities for map API authentication and request transformation
 * Decouples map implementations from specific journey files
 */

// Auth token caches
const esriAuth = { token: null, expiresAt: 0 }
const osAuth = { token: null, expiresAt: 0 }

/**
 * Transform geocoding requests to add OS API key
 * @param {Object} request - Fetch API Request object
 * @returns {Object} Transformed request
 */
const transformGeocodeRequest = (request) => {
  if (request.url.startsWith('https://api.os.uk')) {
    const url = new URL(request.url)
    url.searchParams.set('key', process.env.OS_CLIENT_ID)
    return new Request(url.toString(), {
      method: request.method,
      headers: request.headers
    })
  }
  return request
}

/**
 * Transform tile requests to add API credentials and parameters
 * @param {string} url - Tile URL
 * @param {string} resourceType - Type of resource (e.g., 'Style')
 * @returns {Object} { url, headers }
 */
const transformTileRequest = (url, resourceType) => {
  let headers = {}

  // OS Vector Tile API
  if (resourceType !== 'Style' && url.startsWith('https://api.os.uk')) {
    url = new URL(url)
    if (!url.searchParams.has('key')) {
      url.searchParams.append('key', process.env.OS_CLIENT_ID)
    }
    if (!url.searchParams.has('srs')) {
      url.searchParams.append('srs', 3857)
    }
    url = new Request(url).url
  }

  return { url, headers }
}

/**
 * Transform data requests (e.g., GeoJSON datasets with bbox)
 * @param {string} url - Base URL
 * @param {Object} context - { bbox, zoom }
 * @returns {Object} { url, headers }
 */
const transformDataRequest = (url, { bbox, zoom }) => {
  const separator = url.includes('?') ? '&' : '?'
  return {
    url: `${url}${separator}bbox=${bbox.join(',')}`
  }
}

/**
 * Setup ESRI configuration with API key and OS token interceptor
 * @param {Object} esriConfig - ESRI configuration object
 */
const setupEsriConfig = async (esriConfig) => {
  esriConfig.apiKey = await getEsriToken()

  // Add OS Maps token interceptor
  esriConfig.request.interceptors.push({
    urls: 'https://api.os.uk/maps/vector/v1/vts',
    before: async (request) => {
      request.requestOptions.headers = {
        ...request.requestOptions.headers,
        Authorization: `Bearer ${await getOsToken()}`
      }
    }
  })
}

/**
 * Get cached ESRI token or fetch new one
 * @returns {Promise<string>} ESRI API token
 */
async function getEsriToken() {
  const expired = !esriAuth.token || Date.now() >= esriAuth.expiresAt

  if (expired) {
    try {
      const response = await fetch('/esri-token')
      const json = await response.json()
      esriAuth.token = json.token
      esriAuth.expiresAt = Date.now() + (json.expires_in - 30) * 1000
    } catch (err) {
      console.error('Failed to fetch ESRI token:', err)
      throw err
    }
  }

  return esriAuth.token
}

/**
 * Get cached OS token or fetch new one
 * @returns {Promise<string>} OS API access token
 */
async function getOsToken() {
  const expired = !osAuth.token || Date.now() >= osAuth.expiresAt

  if (expired) {
    try {
      const response = await fetch('/os-token')
      const json = await response.json()
      osAuth.token = json.access_token
      osAuth.expiresAt = Date.now() + (json.expires_in - 30) * 1000
    } catch (err) {
      console.error('Failed to fetch OS token:', err)
      throw err
    }
  }

  return osAuth.token
}

module.exports = {
  transformGeocodeRequest,
  transformTileRequest,
  transformDataRequest,
  setupEsriConfig,
  getEsriToken,
  getOsToken
}
