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

  res.json(vtsData)
})

module.exports = router
