//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

// Import journey-specific route modules
const userJourney1Routes = require('./routes/user-journey-1.js')
const edpSearchRoutes = require('./routes/edp-search.js')
const applicationsRoutes = require('./routes/applications.js')
const applications1Routes = require('./routes/applications-1.js')
const applications2Routes = require('./routes/applications-2.js')
const caseManagementRoutes = require('./routes/case-management.js')
const lpaVerifyRoutes = require('./routes/lpa-verify.js')
const lpaApprove1Routes = require('./routes/lpa-approve-1.js')
const nrfEstimate1Routes = require('./routes/nrf-estimate-1.js')
const nrfEstimate2Routes = require('./routes/nrf-estimate-2.js')
const nrfEstimate2MapLayersSpikeRoutes = require('./routes/nrf-estimate-2-map-layers-spike.js')
const nrfEstimate3Routes = require('./routes/nrf-estimate-3.js')
const nrfEstimate4Routes = require('./routes/nrf-estimate-4.js')

// Use journey-specific routes
router.use('/', userJourney1Routes)
router.use('/', edpSearchRoutes)
router.use('/', applicationsRoutes)
router.use('/', applications1Routes)
router.use('/', applications2Routes)
router.use('/', caseManagementRoutes)
router.use('/', lpaVerifyRoutes)
router.use('/', lpaApprove1Routes)
router.use('/', nrfEstimate1Routes)
router.use('/', nrfEstimate2Routes)
router.use('/', nrfEstimate2MapLayersSpikeRoutes)
router.use('/', nrfEstimate3Routes)
router.use('/', nrfEstimate4Routes)

module.exports = router
