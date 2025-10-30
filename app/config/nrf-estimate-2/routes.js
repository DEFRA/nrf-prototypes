/**
 * Route path constants for NRF Estimate journey
 * Centralized route definitions to avoid magic strings
 */

const BASE_PATH = '/nrf-estimate-2'

const ROUTES = {
  // Base path
  BASE: BASE_PATH,

  // Start and journey selection
  START: `${BASE_PATH}/start`,
  WHAT_WOULD_YOU_LIKE_TO_DO: `${BASE_PATH}/what-would-you-like-to-do`,

  // Estimate reference journey
  DO_YOU_HAVE_ESTIMATE_REF: `${BASE_PATH}/do-you-have-an-estimate-ref`,
  ENTER_ESTIMATE_REF: `${BASE_PATH}/enter-estimate-ref`,
  RETRIEVE_ESTIMATE_EMAIL: `${BASE_PATH}/retrieve-estimate-email`,

  // Boundary definition
  MAP: `${BASE_PATH}/map`,
  UPLOAD_REDLINE: `${BASE_PATH}/upload-redline`,
  REDLINE_MAP: `${BASE_PATH}/redline-map`,

  // Building details
  BUILDING_TYPE: `${BASE_PATH}/building-type`,
  RESIDENTIAL: `${BASE_PATH}/residential`,
  RESIDENTIAL_INSTITUTION: `${BASE_PATH}/residential-institution`,
  NON_RESIDENTIAL: `${BASE_PATH}/non-residential`,
  ROOM_COUNT: `${BASE_PATH}/room-count`,

  // Planning reference
  PLANNING_REF: `${BASE_PATH}/planning-ref`,

  // Summary and confirmation
  SUMMARY: `${BASE_PATH}/summary`,
  EMAIL: `${BASE_PATH}/email`,
  CONFIRMATION: `${BASE_PATH}/confirmation`,

  // Payment journey
  PAYMENT_SUMMARY: `${BASE_PATH}/payment-summary`,
  PAYMENT_CONFIRMATION: `${BASE_PATH}/payment-confirmation`,

  // Additional pages
  NO_EDP: `${BASE_PATH}/no-edp`,
  ESTIMATE_EMAIL_CONTENT: `${BASE_PATH}/estimate-email-content`,
  ESTIMATE_EMAIL_RETRIEVAL_CONTENT: `${BASE_PATH}/estimate-email-retrieval-content`,
  PAYMENT_EMAIL: `${BASE_PATH}/payment-email`,
  CATCHMENTS_GEOJSON: `${BASE_PATH}/catchments.geojson`
}

// View template paths (for res.render)
const TEMPLATES = {
  START: 'nrf-estimate-2/start',
  WHAT_WOULD_YOU_LIKE_TO_DO: 'nrf-estimate-2/what-would-you-like-to-do',
  DO_YOU_HAVE_ESTIMATE_REF: 'nrf-estimate-2/do-you-have-an-estimate-ref',
  ENTER_ESTIMATE_REF: 'nrf-estimate-2/enter-estimate-ref',
  RETRIEVE_ESTIMATE_EMAIL: 'nrf-estimate-2/retrieve-estimate-email',
  MAP: 'nrf-estimate-2/map',
  UPLOAD_REDLINE: 'nrf-estimate-2/upload-redline',
  REDLINE_MAP: 'nrf-estimate-2/redline-map',
  BUILDING_TYPE: 'nrf-estimate-2/building-type',
  RESIDENTIAL: 'nrf-estimate-2/residential',
  RESIDENTIAL_INSTITUTION: 'nrf-estimate-2/residential-institution',
  NON_RESIDENTIAL: 'nrf-estimate-2/non-residential',
  ROOM_COUNT: 'nrf-estimate-2/room-count',
  PLANNING_REF: 'nrf-estimate-2/planning-ref',
  SUMMARY: 'nrf-estimate-2/summary',
  EMAIL: 'nrf-estimate-2/email',
  CONFIRMATION: 'nrf-estimate-2/confirmation',
  PAYMENT_SUMMARY: 'nrf-estimate-2/payment-summary',
  PAYMENT_CONFIRMATION: 'nrf-estimate-2/payment-confirmation',
  NO_EDP: 'nrf-estimate-2/no-edp',
  ESTIMATE_EMAIL_CONTENT: 'nrf-estimate-2/estimate-email-content',
  ESTIMATE_EMAIL_RETRIEVAL_CONTENT:
    'nrf-estimate-2/estimate-email-retrieval-content',
  ESTIMATE_CONFIRMATION_EMAIL: 'nrf-estimate-2/estimate-confirmation-email',
  PAYMENT_EMAIL: 'nrf-estimate-2/payment-email'
}

module.exports = { ROUTES, TEMPLATES }
