/**
 * Map Routes - Generic tile and geocoding endpoints
 * Reusable across all journey routes to avoid duplication
 * Decouples map API proxying from journey-specific implementations
 */

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const zlib = require('zlib')
const axios = require('axios')

function getProxyConfig() {
  const proxyUrl = process.env.HTTP_PROXY || process.env.CDP_HTTPS_PROXY
  if (!proxyUrl) {
    return null
  }

  try {
    const parsed = new URL(proxyUrl)
    const config = {
      protocol: parsed.protocol.replace(':', ''),
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : parsed.protocol === 'http:' ? 80 : 443
    }

    if (parsed.username || parsed.password) {
      config.auth = {
        username: decodeURIComponent(parsed.username || ''),
        password: decodeURIComponent(parsed.password || '')
      }
    }

    return config
  } catch (error) {
    console.warn(`[OS Proxy] Invalid proxy URL in env: ${error.message}`)
    return null
  }
}

/**
 * GET /api/tile/:z/:y/:x.pbf
 * Proxy OS Vector Tile Service tiles with Bearer token authentication
 * Note: Tile coordinates are in z/y/x order (not z/x/y)
 */
router.get('/api/tile/:z/:y/:x.pbf', async (req, res) => {
  try {
    const { z, y, x } = req.params
    const zoom = parseInt(z, 10)
    const tileY = parseInt(y, 10)
    const tileX = parseInt(x, 10)

    // Validate tile coordinates
    if (isNaN(zoom) || isNaN(tileX) || isNaN(tileY)) {
      return res.status(400).end()
    }

    if (zoom < 0 || zoom > 28 || tileX < 0 || tileY < 0) {
      return res.status(400).end()
    }

    // Get OS API credentials from environment
    const osApiKey = process.env.OS_API_KEY

    if (!osApiKey) {
      console.warn('[OS Tile Proxy] Missing OS_API_KEY')
      return res.status(404).end()
    }

    // Construct OS VTS API URL with proper format
    // Use API key and srs parameter for spatial reference system
    const osUrl = `https://api.os.uk/maps/vector/v1/vts/tile/${zoom}/${tileY}/${tileX}.pbf?key=${osApiKey}&srs=3857`
    const proxyConfig = getProxyConfig()

    console.log(`[OS Tile Proxy] Fetching: ${zoom}/${tileY}/${tileX}`)
    if (proxyConfig) {
      console.log(`[OS Tile Proxy] Using outbound proxy ${proxyConfig.host}:${proxyConfig.port}`)
    }

    const osRes = await axios.get(osUrl, {
      timeout: 10000,
      responseType: 'stream',
      decompress: false,
      validateStatus: () => true,
      proxy: proxyConfig || false
    })

    // Handle error status codes
    if (osRes.status !== 200) {
      console.log(`[OS Tile Proxy] OS API returned ${osRes.status}`)
      osRes.data.resume()
      return res.status(osRes.status >= 500 ? 502 : 404).end()
    }

    // Set response headers
    res.set('Content-Type', 'application/x-protobuf')
    res.set('Cache-Control', 'public, max-age=86400')
    res.set('Access-Control-Allow-Origin', '*')

    // Check if response is gzipped and decompress if needed
    const contentEncoding = osRes.headers['content-encoding']
    if (contentEncoding === 'gzip') {
      osRes.data.pipe(zlib.createGunzip()).pipe(res)
    } else {
      osRes.data.pipe(res)
    }
  } catch (error) {
    console.error(`[OS Tile Proxy] Error: ${error.message}`)
    const isTimeout = error.code === 'ECONNABORTED'
    res.status(isTimeout ? 504 : 502).end()
  }
})

/**
 * GET /api/map-proxy?url={url}
 * Generic proxy for OS resources (fonts, sprites, etc)
 */
router.get('/api/map-proxy', async (req, res) => {
  try {
    const { url: targetUrl } = req.query

    if (!targetUrl) {
      return res.status(400).json({ error: 'url parameter required' })
    }

    // Decode the URL
    let urlToFetch
    try {
      urlToFetch = decodeURIComponent(targetUrl)
    } catch (error) {
      return res.status(400).json({ error: 'Invalid URL encoding' })
    }

    // Validate it's an OS URL
    if (!urlToFetch.includes('api.os.uk')) {
      return res.status(403).json({ error: 'Only OS URLs allowed' })
    }

    const osApiKey = process.env.OS_API_KEY

    if (!osApiKey) {
      console.warn('[OS Map Proxy] Missing OS_API_KEY')
      return res.status(404).end()
    }

    console.log(`[OS Map Proxy] Fetching: ${urlToFetch}`)

    // Add API key if not already present
    const proxyUrl = new URL(urlToFetch)
    proxyUrl.searchParams.set('key', osApiKey)
    const proxyConfig = getProxyConfig()

    if (proxyConfig) {
      console.log(`[OS Map Proxy] Using outbound proxy ${proxyConfig.host}:${proxyConfig.port}`)
    }

    const osRes = await axios.get(proxyUrl.toString(), {
      timeout: 10000,
      responseType: 'stream',
      decompress: false,
      validateStatus: () => true,
      proxy: proxyConfig || false
    })

    if (osRes.status !== 200) {
      console.log(`[OS Map Proxy] OS API returned ${osRes.status}`)
      osRes.data.resume()
      return res.status(osRes.status >= 500 ? 502 : 404).end()
    }

    // Set response headers based on content type
    const contentType = osRes.headers['content-type']
    if (contentType) {
      res.set('Content-Type', contentType)
    }
    res.set('Cache-Control', 'public, max-age=604800') // Cache for 7 days
    res.set('Access-Control-Allow-Origin', '*')

    // Check if response is gzipped and decompress if needed
    const contentEncoding = osRes.headers['content-encoding']
    if (contentEncoding === 'gzip') {
      osRes.data.pipe(zlib.createGunzip()).pipe(res)
    } else {
      osRes.data.pipe(res)
    }
  } catch (error) {
    console.error(`[OS Map Proxy] Error: ${error.message}`)
    const isTimeout = error.code === 'ECONNABORTED'
    res.status(isTimeout ? 504 : 502).end()
  }
})

/**
 * GET /api/maps/names
 * Proxy for OS Names API - location/place name search
 */
router.get('/api/maps/names', async (req, res) => {
  try {
    // Try multiple parameter names
    const { query, q, search, text, term, name } = req.query
    const searchText = query || q || search || text || term || name

    console.log('[OS Names Proxy] GET Request received')
    console.log('[OS Names Proxy] Full URL:', req.originalUrl)
    console.log('[OS Names Proxy] Query params:', JSON.stringify(req.query))
    console.log('[OS Names Proxy] Headers:', JSON.stringify(req.headers))

    if (!searchText) {
      console.error('[OS Names Proxy] No search text provided. Available params:', Object.keys(req.query))
      return res.status(400).json({ error: 'No search parameter found. Tried: query, q, search, text, term, name' })
    }

    const osApiKey = process.env.OS_API_KEY

    if (!osApiKey) {
      console.warn('[OS Names Proxy] Missing OS_API_KEY')
      return res.status(404).end()
    }

    // Build OS Names API URL
    const osNamesUrl = `https://api.os.uk/search/names/v1/find?query=${encodeURIComponent(searchText)}&key=${osApiKey}`
    const proxyConfig = getProxyConfig()

    console.log(`[OS Names Proxy] Proxying to OS API for search: "${searchText}"`)
    if (proxyConfig) {
      console.log(`[OS Names Proxy] Using outbound proxy ${proxyConfig.host}:${proxyConfig.port}`)
    }

    const osRes = await axios.get(osNamesUrl, {
      timeout: 10000,
      responseType: 'stream',
      decompress: false,
      validateStatus: () => true,
      proxy: proxyConfig || false
    })

    console.log(`[OS Names Proxy] OS API responded with status: ${osRes.status}`)

    if (osRes.status !== 200) {
      console.log(`[OS Names Proxy] OS API returned ${osRes.status}`)
      osRes.data.resume()
      return res.status(osRes.status >= 500 ? 502 : 404).end()
    }

    res.set('Content-Type', 'application/json')
    res.set('Cache-Control', 'public, max-age=3600')
    res.set('Access-Control-Allow-Origin', '*')

    const contentEncoding = osRes.headers['content-encoding']
    if (contentEncoding === 'gzip') {
      osRes.data.pipe(zlib.createGunzip()).pipe(res)
    } else {
      osRes.data.pipe(res)
    }
  } catch (error) {
    console.error(`[OS Names Proxy] Error: ${error.message}`)
    const isTimeout = error.code === 'ECONNABORTED'
    res.status(isTimeout ? 504 : 502).end()
  }
})

/**
 * POST /api/maps/names
 * Alternative POST handler for OS Names API
 */
router.post('/api/maps/names', async (req, res) => {
  try {
    const { query, q, search, text, term, name } = req.body || {}
    const searchText = query || q || search || text || term || name

    console.log('[OS Names Proxy] POST Request received')
    console.log('[OS Names Proxy] Full URL:', req.originalUrl)
    console.log('[OS Names Proxy] Body:', JSON.stringify(req.body))
    console.log('[OS Names Proxy] Query params:', JSON.stringify(req.query))

    if (!searchText) {
      console.error('[OS Names Proxy] No search text in POST body. Available params:', Object.keys(req.body || {}))
      return res.status(400).json({ error: 'No search parameter found in body' })
    }

    const osApiKey = process.env.OS_API_KEY

    if (!osApiKey) {
      console.warn('[OS Names Proxy] Missing OS_API_KEY')
      return res.status(404).end()
    }

    const osNamesUrl = `https://api.os.uk/search/names/v1/find?query=${encodeURIComponent(searchText)}&key=${osApiKey}`
    const proxyConfig = getProxyConfig()

    console.log(`[OS Names Proxy] POST - Proxying to OS API for search: "${searchText}"`)
    if (proxyConfig) {
      console.log(`[OS Names Proxy] POST - Using outbound proxy ${proxyConfig.host}:${proxyConfig.port}`)
    }

    const osRes = await axios.get(osNamesUrl, {
      timeout: 10000,
      responseType: 'stream',
      decompress: false,
      validateStatus: () => true,
      proxy: proxyConfig || false
    })

    console.log(`[OS Names Proxy] POST - OS API responded with status: ${osRes.status}`)

    if (osRes.status !== 200) {
      console.log(`[OS Names Proxy] POST - OS API returned ${osRes.status}`)
      osRes.data.resume()
      return res.status(osRes.status >= 500 ? 502 : 404).end()
    }

    res.set('Content-Type', 'application/json')
    res.set('Cache-Control', 'public, max-age=3600')
    res.set('Access-Control-Allow-Origin', '*')

    const contentEncoding = osRes.headers['content-encoding']
    if (contentEncoding === 'gzip') {
      osRes.data.pipe(zlib.createGunzip()).pipe(res)
    } else {
      osRes.data.pipe(res)
    }
  } catch (error) {
    console.error(`[OS Names Proxy] POST - Error: ${error.message}`)
    const isTimeout = error.code === 'ECONNABORTED'
    res.status(isTimeout ? 504 : 502).end()
  }
})

module.exports = router
