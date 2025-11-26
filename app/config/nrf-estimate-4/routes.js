/**
 * Route path constants for the NRF Estimate v4 journey
 */

const BASE_PATH = '/nrf-estimate-4'

const ROUTES = {
  BASE: BASE_PATH,
  START: `${BASE_PATH}/start`,
  WHAT_WOULD_YOU_LIKE_TO_DO: `${BASE_PATH}/what-would-you-like-to-do`,
  REDLINE_MAP: `${BASE_PATH}/redline-map`,
  UPLOAD_REDLINE: `${BASE_PATH}/upload-redline`,
  MAP: `${BASE_PATH}/map`,
  NO_EDP: `${BASE_PATH}/no-edp`,
  BUILDING_TYPE: `${BASE_PATH}/building-type`,
  RESIDENTIAL: `${BASE_PATH}/residential`,
  NON_RESIDENTIAL: `${BASE_PATH}/non-residential`,
  ROOM_COUNT: `${BASE_PATH}/room-count`,
  ESTIMATE_EMAIL: `${BASE_PATH}/estimate-email`,
  SUMMARY: `${BASE_PATH}/summary`,
  CONFIRMATION: `${BASE_PATH}/confirmation`,
  ESTIMATE_EMAIL_CONTENT: `${BASE_PATH}/estimate-email-content`,
  CATCHMENTS_GEOJSON: `${BASE_PATH}/catchments.geojson`,
  API_CHECK_EDP_INTERSECTION: `${BASE_PATH}/api/check-edp-intersection`
}

const TEMPLATES = {
  START: 'nrf-estimate-4/start',
  WHAT_WOULD_YOU_LIKE_TO_DO: 'nrf-estimate-4/what-would-you-like-to-do',
  REDLINE_MAP: 'nrf-estimate-4/redline-map',
  UPLOAD_REDLINE: 'nrf-estimate-4/upload-redline',
  MAP: 'nrf-estimate-4/map',
  NO_EDP: 'nrf-estimate-4/no-edp',
  BUILDING_TYPE: 'nrf-estimate-4/building-type',
  RESIDENTIAL: 'nrf-estimate-4/residential',
  NON_RESIDENTIAL: 'nrf-estimate-4/non-residential',
  ROOM_COUNT: 'nrf-estimate-4/room-count',
  ESTIMATE_EMAIL: 'nrf-estimate-4/estimate-email',
  SUMMARY: 'nrf-estimate-4/summary',
  CONFIRMATION: 'nrf-estimate-4/confirmation',
  ESTIMATE_EMAIL_CONTENT: 'nrf-estimate-4/estimate-email-content'
}

module.exports = { ROUTES, TEMPLATES }
