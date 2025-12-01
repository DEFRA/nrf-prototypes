/**
 * Route path constants for the NRF Quote v4 journey
 */

const BASE_PATH = '/nrf-quote-4'

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
  API_CHECK_EDP_INTERSECTION: `${BASE_PATH}/api/check-edp-intersection`,

  // Commit journey routes
  DO_YOU_HAVE_A_NRF_REF: `${BASE_PATH}/do-you-have-a-nrf-ref`,
  ENTER_ESTIMATE_REF: `${BASE_PATH}/enter-estimate-ref`,
  RETRIEVE_ESTIMATE_EMAIL: `${BASE_PATH}/retrieve-estimate-email`,
  ESTIMATE_EMAIL_RETRIEVAL_CONTENT: `${BASE_PATH}/estimate-email-retrieval-content`,
  RETRIEVED_ESTIMATE_SUMMARY: `${BASE_PATH}/retrieved-estimate-summary`,
  COMMIT_HOW_WOULD_YOU_LIKE_TO_SIGN_IN: `${BASE_PATH}/commit-how-would-you-like-to-sign-in`,
  COMMIT_SIGN_IN_GOVERNMENT_GATEWAY: `${BASE_PATH}/commit-sign-in-government-gateway`,
  COMPANY_DETAILS: `${BASE_PATH}/company-details`,
  LPA_CONFIRM: `${BASE_PATH}/lpa-confirm`,
  SUMMARY_AND_DECLARATION: `${BASE_PATH}/summary-and-declaration`,
  COMMIT_EMAIL_CONTENT: `${BASE_PATH}/commit-email-content`
}

const TEMPLATES = {
  START: 'nrf-quote-4/start',
  WHAT_WOULD_YOU_LIKE_TO_DO: 'nrf-quote-4/what-would-you-like-to-do',
  REDLINE_MAP: 'nrf-quote-4/redline-map',
  UPLOAD_REDLINE: 'nrf-quote-4/upload-redline',
  MAP: 'nrf-quote-4/map',
  NO_EDP: 'nrf-quote-4/no-edp',
  BUILDING_TYPE: 'nrf-quote-4/building-type',
  RESIDENTIAL: 'nrf-quote-4/residential',
  NON_RESIDENTIAL: 'nrf-quote-4/non-residential',
  ROOM_COUNT: 'nrf-quote-4/room-count',
  ESTIMATE_EMAIL: 'nrf-quote-4/estimate-email',
  SUMMARY: 'nrf-quote-4/summary',
  CONFIRMATION: 'nrf-quote-4/confirmation',
  ESTIMATE_EMAIL_CONTENT: 'nrf-quote-4/estimate-email-content',

  // Commit journey templates
  DO_YOU_HAVE_A_NRF_REF: 'nrf-quote-4/do-you-have-a-nrf-ref',
  ENTER_ESTIMATE_REF: 'nrf-quote-4/enter-estimate-ref',
  RETRIEVE_ESTIMATE_EMAIL: 'nrf-quote-4/retrieve-estimate-email',
  ESTIMATE_EMAIL_RETRIEVAL_CONTENT:
    'nrf-quote-4/estimate-email-retrieval-content',
  RETRIEVED_ESTIMATE_SUMMARY: 'nrf-quote-4/retrieved-estimate-summary',
  COMMIT_HOW_WOULD_YOU_LIKE_TO_SIGN_IN:
    'nrf-quote-4/commit-how-would-you-like-to-sign-in',
  COMMIT_SIGN_IN_GOVERNMENT_GATEWAY:
    'nrf-quote-4/commit-sign-in-government-gateway',
  COMPANY_DETAILS: 'nrf-quote-4/company-details',
  LPA_CONFIRM: 'nrf-quote-4/lpa-confirm',
  SUMMARY_AND_DECLARATION: 'nrf-quote-4/summary-and-declaration',
  COMMIT_EMAIL_CONTENT: 'nrf-quote-4/commit-email-content'
}

module.exports = { ROUTES, TEMPLATES }
