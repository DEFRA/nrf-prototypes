/**
 * Route constants for nrf-quote-7.
 *
 * Unlike hand-written journeys these are derived from
 * content/nrf-quote-7/journey.yaml, so there is nothing to keep in sync.
 * Keys are the page ids in UPPER_SNAKE_CASE, e.g. ROUTES.CHECK_YOUR_ANSWERS.
 */

const { getRouteConstants } = require('../../lib/journey-engine')

module.exports = getRouteConstants('nrf-quote-7')
