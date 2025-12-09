/**
 * TileServer Routes
 * Serves vector tiles directly from MBTiles files
 */

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const Database = require('better-sqlite3')
const path = require('path')

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

    // Log for debugging
    console.log(
      `[TileServer] Serving tile: ${layerName}/${zoom}/${tileX}/${tileY}`
    )

    // Get MBTiles database connection
    const db = getMBTilesDB(layerName)

    // MBTiles uses TMS (Tile Map Service) coordinate system where Y is flipped
    // Convert from XYZ to TMS: tms_y = (2^zoom - 1) - y
    const tileYTMS = (1 << zoom) - 1 - tileY

    // Query the tile from the database
    const stmt = db.prepare(
      'SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?'
    )
    const row = stmt.get(zoom, tileX, tileYTMS)

    if (!row) {
      // No tile found - return 204 No Content
      return res.status(204).end()
    }

    // Get the tile data (already gzipped in MBTiles)
    const tileData = row.tile_data

    // Set headers
    res.set('Content-Type', 'application/x-protobuf')
    res.set('Content-Encoding', 'gzip')
    res.set('Cache-Control', 'public, max-age=86400') // Cache for 24 hours
    res.set('Access-Control-Allow-Origin', '*')

    // Send the tile data (already gzipped in MBTiles)
    res.status(200).send(tileData)
  } catch (error) {
    // Log full error server-side for debugging
    console.error('[TileServer] Error:', error)

    // Handle different error types
    if (error.message.includes('does not exist')) {
      res.status(404).json({
        error: 'Layer not found',
        message: 'The requested layer does not exist'
      })
    } else {
      // Return generic error to client, don't leak internal details
      res.status(500).json({
        error: 'Internal server error',
        message: 'An error occurred while processing your request'
      })
    }
  }
})

module.exports = router
