//
// VTS Maps Routes - Serve OS Vector Tile Service style JSON files
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const path = require('path')
const fs = require('fs')

// Cache for VTS files
const vtsCache = {}

/**
 * Load VTS JSON file from disk
 */
function loadVtsFile(filename) {
  if (vtsCache[filename]) {
    return vtsCache[filename]
  }

  try {
    const filepath = path.join(__dirname, `../data/vts/${filename}`)
    const data = fs.readFileSync(filepath, 'utf8')
    const json = JSON.parse(data)
    vtsCache[filename] = json
    return json
  } catch (error) {
    console.error(`Error loading VTS file ${filename}:`, error.message)
    return null
  }
}

/**
 * Build a base URL for the current request, honoring proxy headers.
 */
function getRequestBaseUrl(req) {
  const forwardedProto = req.get('x-forwarded-proto')
  const protocol = forwardedProto ? forwardedProto.split(',')[0].trim() : req.protocol
  return `${protocol}://${req.get('host')}`
}

/**
 * Convert style URLs to absolute URLs for the current host.
 * This keeps VTS styles working both locally and when deployed.
 */
function rewriteStyleUrlsForRequest(vtsData, baseUrl) {
  // Clone to avoid mutating cached JSON data
  const style = JSON.parse(JSON.stringify(vtsData))

  const absolutize = (value) => {
    if (typeof value !== 'string') {
      return value
    }

    // Backward compatibility for previously hardcoded local URLs
    if (value.startsWith('http://localhost:3000/')) {
      return `${baseUrl}${value.replace('http://localhost:3000', '')}`
    }

    // Convert root-relative API paths to the current request host
    if (value.startsWith('/api/')) {
      return `${baseUrl}${value}`
    }

    return value
  }

  style.glyphs = absolutize(style.glyphs)

  if (style.sources && typeof style.sources === 'object') {
    Object.values(style.sources).forEach((source) => {
      if (Array.isArray(source.tiles)) {
        source.tiles = source.tiles.map(absolutize)
      }
    })
  }

  return style
}

// ============================================================================
// VTS API ROUTES
// ============================================================================

/**
 * GET /api/maps/vts/:filename
 * Serve VTS JSON style files
 */
router.get('/api/maps/vts/:filename', (req, res) => {
  const { filename } = req.params
  
  // Whitelist allowed files for security
  const allowedFiles = [
    'OS_VTS_3857_Outdoor.json',
    'OS_VTS_3857_Dark.json',
    'OS_VTS_3857_Black_and_White.json',
    'ESRI_World_Imagery.json'
  ]

  if (!allowedFiles.includes(filename)) {
    return res.status(404).json({ error: 'VTS file not found' })
  }

  const vtsData = loadVtsFile(filename)
  if (!vtsData) {
    return res.status(404).json({ error: 'Failed to load VTS file' })
  }

  const baseUrl = getRequestBaseUrl(req)
  const responseStyle = rewriteStyleUrlsForRequest(vtsData, baseUrl)

  res.json(responseStyle)
})

module.exports = router
