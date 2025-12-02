//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const { JOURNEYS } = require('./config/shared/journeys')

// Import non-journey route modules (utilities, search, etc.)
const indexRoutes = require('./routes/index.js')
const userJourney1Routes = require('./routes/user-journey-1.js')
const edpSearchRoutes = require('./routes/edp-search.js')
const applicationsRoutes = require('./routes/applications.js')
const applications1Routes = require('./routes/applications-1.js')
const applications2Routes = require('./routes/applications-2.js')
const caseManagementRoutes = require('./routes/case-management.js')
const lpaVerifyRoutes = require('./routes/lpa-verify.js')

// Use non-journey routes
router.use('/', indexRoutes)
router.use('/', userJourney1Routes)
router.use('/', edpSearchRoutes)
router.use('/', applicationsRoutes)
router.use('/', applications1Routes)
router.use('/', applications2Routes)
router.use('/', caseManagementRoutes)
router.use('/', lpaVerifyRoutes)

// Dynamically load journey routes from shared config
// This ensures that all journeys defined in config/shared/journeys.js are automatically loaded
JOURNEYS.forEach((journey) => {
  try {
    // Convert base path to route file name (e.g., /nrf-estimate-1 -> nrf-estimate-1.js)
    const routeFileName = journey.basePath.substring(1) // Remove leading slash
    const routeModule = require(`./routes/${routeFileName}.js`)
    router.use('/', routeModule)
    console.log(`✓ Loaded journey: ${journey.name} (${journey.basePath})`)
  } catch (error) {
    console.warn(
      `⚠ Warning: Could not load route file for journey ${journey.name} (${journey.basePath})`
    )
    console.warn(`  Error: ${error.message}`)
  }
})

module.exports = router
