//
// NRF Quote 7 - content-driven port of NRF Quote 6
//
// Pages, copy, branching and validation all come from content/nrf-quote-7.
// Bespoke behaviour (map, upload, reference) lives in app/lib/nrf-quote-7/hooks.js.
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const { createJourneyRouter } = require('../lib/journey-engine')
const hooks = require('../lib/nrf-quote-7/hooks')

createJourneyRouter(router, 'nrf-quote-7', hooks)

module.exports = router
