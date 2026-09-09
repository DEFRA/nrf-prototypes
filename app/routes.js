//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const fs = require('fs')
const path = require('path')
const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const { JOURNEYS, setMountedIds } = require('./config/shared/journeys')
const { createJourneyRouter, watchContent } = require('./lib/journey-engine')

// Import non-journey route modules (utilities, maps, tools)
const indexRoutes = require('./routes/index.js')
const applications2Routes = require('./routes/applications-2.js')
const tileserverProxyRoutes = require('./routes/tileserver-proxy.js')
const vtsMapRoutes = require('./routes/vts-maps.js')
const mapTilesRoutes = require('./routes/map-tiles.js')
const osBaseMapRoutes = require('./routes/os-base-map.js')
const toolsRoutes = require('./routes/tools.js')

// Use non-journey routes
router.use('/', tileserverProxyRoutes) // Add tileserver proxy first
router.use('/', mapTilesRoutes) // Add generic map tiles endpoint
router.use('/', osBaseMapRoutes) // Production-style OS basemap + names proxies
router.use('/', vtsMapRoutes)
router.use('/', indexRoutes)
router.use('/', applications2Routes) // Has no views directory, so not in the registry
router.use('/', toolsRoutes) // Journey flow diagrams and screen walls

const mounted = []

// Hand-coded journeys: every entry in app/config/shared/journeys.yaml has a
// route file at app/routes/<id>.js (unless it sets `mount: false`).
JOURNEYS.filter(
  (journey) => journey.source === 'legacy' && journey.mount
).forEach((journey) => {
  try {
    const routeModule = require(`./routes/${journey.id}.js`)
    router.use('/', routeModule)
    mounted.push(journey.id)
    console.log(`✓ Loaded journey: ${journey.name} (${journey.basePath})`)
  } catch (error) {
    console.warn(
      `⚠ Warning: Could not load route file for journey ${journey.name} (${journey.basePath})`
    )
    console.warn(`  Error: ${error.message}`)
  }
})

// Content-driven journeys: every content/<id>/journey.yaml is mounted by the
// journey engine. Bespoke behaviour is picked up from app/lib/<id>/hooks.js
// when that file exists. Legacy journeys mount first so they win on a clash.
function hooksFor(id) {
  const file = path.join(__dirname, 'lib', id, 'hooks.js')
  return fs.existsSync(file) ? require(file) : {}
}

JOURNEYS.filter(
  (journey) => journey.source === 'content' && !journey.error
).forEach((journey) => {
  try {
    createJourneyRouter(router, journey.id, hooksFor(journey.id))
    mounted.push(journey.id)
    console.log(
      `✓ Loaded content journey: ${journey.name} (${journey.basePath})`
    )
  } catch (error) {
    console.warn(
      `⚠ Warning: Could not mount content journey ${journey.id} (${journey.basePath})`
    )
    console.warn(`  Error: ${error.message}`)
  }
})

setMountedIds(mounted)

// Reload the browser when content/ changes (development only). The kit's own
// watchers never look at content/; see app/lib/journey-engine/watch.js.
watchContent()

module.exports = router
