/**
 * Route constants for nrf-request-to-use-1.
 *
 * Derived from content/nrf-request-to-use-1/journey.yaml, so there is nothing
 * to keep in sync. Keys are the page ids in UPPER_SNAKE_CASE, e.g.
 * ROUTES.CHECK_YOUR_ANSWERS, plus hook routes such as ROUTES.SIGN_OUT.
 */

const { getRouteConstants } = require('../../lib/journey-engine')

module.exports = getRouteConstants('nrf-request-to-use-1')
