/**
 * TileServer Proxy Routes
 * Proxies requests to the tileserver to avoid CORS and port issues in production
 */

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const axios = require('axios')

// Get tileserver URL from environment or default
const TILESERVER_URL = process.env.TILESERVER_URL || 'http://localhost:8080'

/**
 * Proxy all tileserver requests through /tiles/*
 * This allows the frontend to request tiles from the same origin (port 3000)
 */
router.get('/tiles/*', async (req, res) => {
  try {
    // Extract the path after /tiles/
    const tilePath = req.params[0]

    // Validate that the path matches expected tile URL patterns
    // This prevents SSRF attacks by ensuring only legitimate tile requests are proxied
    if (!/^data\/[\w_]+\/\d+\/\d+\/\d+\.pbf$/.test(tilePath)) {
      console.warn(`[Tileserver Proxy] Invalid tile path rejected: ${tilePath}`)
      return res.status(400).json({ error: 'Invalid tile path' })
    }

    const targetUrl = `${TILESERVER_URL}/${tilePath}`

    // Log for debugging
    console.log(
      `[Tileserver Proxy] ${req.method} /tiles/${tilePath} -> ${targetUrl}`
    )

    // Forward the request to the tileserver
    const response = await axios.get(targetUrl, {
      responseType: 'arraybuffer', // Important for binary tile data
      headers: {
        'Accept-Encoding': 'gzip, deflate'
      }
    })

    // Forward response headers
    if (response.headers['content-type']) {
      res.set('Content-Type', response.headers['content-type'])
    }
    if (response.headers['content-encoding']) {
      res.set('Content-Encoding', response.headers['content-encoding'])
    }
    if (response.headers['cache-control']) {
      res.set('Cache-Control', response.headers['cache-control'])
    }

    // Add CORS headers (if needed)
    res.set('Access-Control-Allow-Origin', '*')

    // Send the tile data
    res.status(response.status).send(response.data)
  } catch (error) {
    console.error('[Tileserver Proxy] Error:', error.message)

    // Handle 404s from tileserver (empty tiles)
    if (error.response && error.response.status === 404) {
      res.status(404).send('Tile not found')
    } else if (error.response && error.response.status === 204) {
      // 204 No Content - empty tile
      res.status(204).end()
    } else {
      // Other errors
      res.status(500).json({
        error: 'Failed to fetch tile from tileserver',
        message: error.message
      })
    }
  }
})

module.exports = router
