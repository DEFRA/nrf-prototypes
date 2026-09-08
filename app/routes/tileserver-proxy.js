/**
 * TileServer Routes
 * Serves vector tiles directly from MBTiles files
 *
 * Two URL schemes are served from the same MBTiles data:
 *   /tiles/data/{layer}/{z}/{x}/{y}.pbf            legacy journeys
 *   /impact-assessor-map/tiles/{layer}/{z}/{x}/{y}.mvt
 *     mirrors the production "impact assessor" tile service so the
 *     production map datasets config works unchanged (see
 *     app/assets/javascripts/interactive-map/shared-helpers/datasets.js).
 *     EDP layers are sliced on the fly with geojson-vt from the EDP data in
 *     app/lib/map/edp-data.js (dissolved EDP outlines and excluded areas),
 *     using production's layer names and working at every zoom level (the
 *     MBTiles stop at zoom 10-12).
 *     Set IMPACT_ASSESSOR_BASE_URL (and IMPACT_ASSESSOR_API_KEY) to proxy
 *     the real service instead.
 */

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const Database = require('better-sqlite3')
const path = require('path')
// geojson-vt 4 is an ES module; require() exposes it on .default
const geojsonvt = require('geojson-vt').default
const vtpbf = require('vt-pbf')
const edpData = require('../lib/map/edp-data')

const MVT_CONTENT_TYPE = 'application/vnd.mapbox-vector-tile'

// Production layer name -> GeoJSON FeatureCollection (see app/lib/map/edp-data.js),
// sliced into tiles on demand. An empty collection serves empty tiles (204)
// so the layer can stay in the map key.
const IMPACT_ASSESSOR_GEOJSON_LAYERS = {
  edp_boundaries: () => edpData.getEdpBoundaries(),
  edp_excluded_areas: () => edpData.getExcludedAreas()
}

// Production-style layer name -> local MBTiles file, for layers that only
// exist as pre-built tiles
const IMPACT_ASSESSOR_MBTILES_LAYERS = {
  gcn_edp: 'gcn_edp_all_regions'
}

// geojson-vt tile indexes, built on first request (cached per layer)
const geojsonTileIndexes = {}

/**
 * Get or build the geojson-vt index for a production layer name.
 * @returns {object|null} the index, or null when the layer has no features
 */
function getGeojsonTileIndex(layer) {
  if (!(layer in geojsonTileIndexes)) {
    const geojson = IMPACT_ASSESSOR_GEOJSON_LAYERS[layer]()
    if (!geojson || !geojson.features || !geojson.features.length) {
      console.warn(
        `[TileServer] No features for layer ${layer} - serving empty tiles`
      )
      geojsonTileIndexes[layer] = null
    } else {
      const started = Date.now()
      geojsonTileIndexes[layer] = geojsonvt(geojson, {
        maxZoom: 16, // keep detail when zoomed in to draw a site
        indexMaxZoom: 6,
        buffer: 64,
        extent: 4096
      })
      console.log(
        `[TileServer] Indexed ${layer} (${geojson.features.length} features) in ${Date.now() - started}ms`
      )
    }
  }
  return geojsonTileIndexes[layer]
}

/**
 * Slice one vector tile from a GeoJSON layer.
 * @returns {Buffer|null} MVT bytes (not compressed), or null when empty
 */
function readGeojsonTile(layer, zoom, tileX, tileY) {
  const index = getGeojsonTileIndex(layer)
  if (!index) {
    return null
  }
  const tile = index.getTile(zoom, tileX, tileY)
  if (!tile || !tile.features.length) {
    return null
  }
  return Buffer.from(vtpbf.fromGeojsonVt({ [layer]: tile }, { version: 2 }))
}

// MBTiles database connections (cached)
const mbtilesConnections = {}

// Clean up database connections on shutdown
function closeDatabases() {
  Object.keys(mbtilesConnections).forEach((layerName) => {
    if (mbtilesConnections[layerName]) {
      try {
        mbtilesConnections[layerName].close()
        console.log(`[TileServer] Closed MBTiles: ${layerName}`)
      } catch (err) {
        console.error(
          `[TileServer] Error closing MBTiles ${layerName}:`,
          err.message
        )
      }
    }
  })
}

process.on('SIGTERM', closeDatabases)
process.on('SIGINT', closeDatabases)

/**
 * Get or create an MBTiles database connection
 * @param {string} layerName - Name of the layer (e.g., 'gcn_edp_all_regions')
 * @returns {Database} SQLite database connection
 */
function getMBTilesDB(layerName) {
  if (!mbtilesConnections[layerName]) {
    const mbtilesPath = path.join(
      __dirname,
      '..',
      '..',
      'tileserver',
      'data',
      'mbtiles',
      `${layerName}.mbtiles`
    )

    try {
      mbtilesConnections[layerName] = new Database(mbtilesPath, {
        readonly: true,
        fileMustExist: true
      })
      console.log(`[TileServer] Opened MBTiles: ${layerName}`)
    } catch (error) {
      console.error(
        `[TileServer] Failed to open MBTiles ${layerName}:`,
        error.message
      )
      throw error
    }
  }

  return mbtilesConnections[layerName]
}

/**
 * Read one gzipped vector tile from an MBTiles file.
 * @param {string} layerName
 * @param {number} zoom
 * @param {number} tileX
 * @param {number} tileY - XYZ (top-left origin) tile row
 * @returns {Buffer|null} gzipped tile data, or null when the tile is empty
 */
function readTile(layerName, zoom, tileX, tileY) {
  const db = getMBTilesDB(layerName)

  // MBTiles uses TMS (Tile Map Service) coordinate system where Y is flipped
  // Convert from XYZ to TMS: tms_y = (2^zoom - 1) - y
  const tileYTMS = (1 << zoom) - 1 - tileY

  const stmt = db.prepare(
    'SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?'
  )
  const row = stmt.get(zoom, tileX, tileYTMS)
  return row ? row.tile_data : null
}

function sendTile(res, tileData, contentType, { gzipped = true } = {}) {
  if (!tileData) {
    // No tile found - return 204 No Content
    return res.status(204).end()
  }
  res.set('Content-Type', contentType)
  if (gzipped) {
    // Tile data is already gzipped in MBTiles
    res.set('Content-Encoding', 'gzip')
  }
  res.set('Cache-Control', 'public, max-age=86400') // Cache for 24 hours
  res.set('Access-Control-Allow-Origin', '*')
  return res.status(200).send(tileData)
}

function sendTileError(res, error) {
  // Log full error server-side for debugging
  console.error('[TileServer] Error:', error)

  if (error.message.includes('does not exist')) {
    return res.status(404).json({
      error: 'Layer not found',
      message: 'The requested layer does not exist'
    })
  }
  // Return generic error to client, don't leak internal details
  return res.status(500).json({
    error: 'Internal server error',
    message: 'An error occurred while processing your request'
  })
}

/**
 * Serve vector tiles directly from MBTiles files
 * Handles /tiles/data/{layer}/{z}/{x}/{y}.pbf
 */
router.get('/tiles/*', async (req, res) => {
  try {
    // Extract the path after /tiles/
    const tilePath = req.params[0]

    // Validate that the path matches expected tile URL patterns
    // This prevents path traversal attacks
    const tileMatch = tilePath.match(
      /^data\/([\w_]+)\/(\d+)\/(\d+)\/(\d+)\.pbf$/
    )

    if (!tileMatch) {
      console.warn(`[TileServer] Invalid tile path rejected: ${tilePath}`)
      return res.status(400).json({ error: 'Invalid tile path' })
    }

    const [, layerName, z, x, y] = tileMatch
    const zoom = parseInt(z, 10)
    const tileX = parseInt(x, 10)
    const tileY = parseInt(y, 10)

    console.log(
      `[TileServer] Serving tile: ${layerName}/${zoom}/${tileX}/${tileY}`
    )

    const tileData = readTile(layerName, zoom, tileX, tileY)
    return sendTile(res, tileData, 'application/x-protobuf')
  } catch (error) {
    return sendTileError(res, error)
  }
})

/**
 * Proxy one tile request to the real impact assessor service.
 */
async function proxyImpactAssessorTile(req, res, layer, z, x, y) {
  const baseUrl = process.env.IMPACT_ASSESSOR_BASE_URL.replace(/\/$/, '')
  const upstreamUrl = `${baseUrl}/tiles/${layer}/${z}/${x}/${y}.mvt`
  const headers = {}
  if (process.env.IMPACT_ASSESSOR_API_KEY) {
    headers['x-api-key'] = process.env.IMPACT_ASSESSOR_API_KEY
  }
  const upstream = await fetch(upstreamUrl, { headers })
  const payload = Buffer.from(await upstream.arrayBuffer())
  if (!upstream.ok) {
    return res.status(upstream.status).send(payload)
  }
  res.set(
    'Content-Type',
    upstream.headers.get('content-type') || MVT_CONTENT_TYPE
  )
  res.set('Cache-Control', 'public, max-age=86400')
  return res.status(200).send(payload)
}

/**
 * Production-shaped EDP overlay tiles
 * Handles /impact-assessor-map/tiles/{layer}/{z}/{x}/{y}.mvt
 */
router.get(
  '/impact-assessor-map/tiles/:layer/:z/:x/:y.mvt',
  async (req, res) => {
    const { layer } = req.params
    const zoom = parseInt(req.params.z, 10)
    const tileX = parseInt(req.params.x, 10)
    const tileY = parseInt(req.params.y, 10)

    if (![zoom, tileX, tileY].every(Number.isInteger)) {
      return res.status(400).json({ error: 'Invalid tile path' })
    }

    const isGeojsonLayer = Object.prototype.hasOwnProperty.call(
      IMPACT_ASSESSOR_GEOJSON_LAYERS,
      layer
    )
    const isMbtilesLayer = Object.prototype.hasOwnProperty.call(
      IMPACT_ASSESSOR_MBTILES_LAYERS,
      layer
    )
    if (!isGeojsonLayer && !isMbtilesLayer) {
      return res.status(404).json({ error: 'Layer not found' })
    }

    try {
      if (process.env.IMPACT_ASSESSOR_BASE_URL) {
        return await proxyImpactAssessorTile(
          req,
          res,
          layer,
          zoom,
          tileX,
          tileY
        )
      }

      if (isGeojsonLayer) {
        const tileData = readGeojsonTile(layer, zoom, tileX, tileY)
        return sendTile(res, tileData, MVT_CONTENT_TYPE, { gzipped: false })
      }

      const tileData = readTile(
        IMPACT_ASSESSOR_MBTILES_LAYERS[layer],
        zoom,
        tileX,
        tileY
      )
      return sendTile(res, tileData, MVT_CONTENT_TYPE)
    } catch (error) {
      return sendTileError(res, error)
    }
  }
)

module.exports = router
