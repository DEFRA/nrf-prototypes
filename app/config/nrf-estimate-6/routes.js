/**
 * Route path constants for the NRF Estimate v6 journey
 */

const BASE_PATH = '/nrf-estimate-6'

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
  PEOPLE_COUNT: `${BASE_PATH}/people-count`,
  WASTE_WATER: `${BASE_PATH}/waste-water`,
  ESTIMATE_EMAIL: `${BASE_PATH}/estimate-email`,
  CHECK_YOUR_ANSWERS: `${BASE_PATH}/check-your-answers`,
  DELETE_QUOTE: `${BASE_PATH}/delete-quote`,
  DELETE_CONFIRMATION: `${BASE_PATH}/delete-confirmation`,
  ESTIMATE_EMAIL_CONTENT_RANGE: `${BASE_PATH}/estimate-email-content-range`,
  DO_YOU_HAVE_A_NRF_REF: `${BASE_PATH}/do-you-have-a-nrf-ref`,
  PAY_HOW_WOULD_YOU_LIKE_TO_SIGN_IN: `${BASE_PATH}/pay-how-would-you-like-to-sign-in`,
  CONFIRMATION: `${BASE_PATH}/confirmation`,
  ESTIMATE_EMAIL_CONTENT: `${BASE_PATH}/estimate-email-content`,
  CATCHMENTS_GEOJSON: `${BASE_PATH}/catchments.geojson`,
  API_CHECK_EDP_INTERSECTION: `${BASE_PATH}/api/check-edp-intersection`
}

const TEMPLATES = {
  START: 'nrf-estimate-6/start',
  WHAT_WOULD_YOU_LIKE_TO_DO: 'nrf-estimate-6/what-would-you-like-to-do',
  REDLINE_MAP: 'nrf-estimate-6/redline-map',
  UPLOAD_REDLINE: 'nrf-estimate-6/upload-redline',
  MAP: 'nrf-estimate-6/map',
  NO_EDP: 'nrf-estimate-6/no-edp',
  BUILDING_TYPE: 'nrf-estimate-6/building-type',
  RESIDENTIAL: 'nrf-estimate-6/residential',
  PEOPLE_COUNT: 'nrf-estimate-6/people-count',
  WASTE_WATER: 'nrf-estimate-6/waste-water',
  ESTIMATE_EMAIL: 'nrf-estimate-6/estimate-email',
  CHECK_YOUR_ANSWERS: 'nrf-estimate-6/check-your-answers',
  DELETE_QUOTE: 'nrf-estimate-6/delete-quote',
  DELETE_CONFIRMATION: 'nrf-estimate-6/delete-confirmation',
  CONFIRMATION: 'nrf-estimate-6/confirmation',
  ESTIMATE_EMAIL_CONTENT: 'nrf-estimate-6/estimate-email-content',
  ESTIMATE_EMAIL_CONTENT_RANGE: 'nrf-estimate-6/estimate-email-content-range',
  DO_YOU_HAVE_A_NRF_REF: 'nrf-estimate-6/do-you-have-a-nrf-ref',
  PAY_HOW_WOULD_YOU_LIKE_TO_SIGN_IN:
    'nrf-estimate-6/pay-how-would-you-like-to-sign-in'
}

module.exports = { ROUTES, TEMPLATES }
