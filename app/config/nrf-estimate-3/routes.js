/**
 * Route path constants for NRF Estimate journey
 * Centralized route definitions to avoid magic strings
 */

const BASE_PATH = '/nrf-estimate-3'

const ROUTES = {
  // Base path
  BASE: BASE_PATH,

  // Start and journey selection
  START: `${BASE_PATH}/start`,
  WHAT_WOULD_YOU_LIKE_TO_DO: `${BASE_PATH}/what-would-you-like-to-do`,

  // Boundary definition
  MAP: `${BASE_PATH}/map`,
  UPLOAD_REDLINE: `${BASE_PATH}/upload-redline`,
  REDLINE_MAP: `${BASE_PATH}/redline-map`,

  // Building details
  BUILDING_TYPE: `${BASE_PATH}/building-type`,
  RESIDENTIAL: `${BASE_PATH}/residential`,
  NON_RESIDENTIAL: `${BASE_PATH}/non-residential`,
  ROOM_COUNT: `${BASE_PATH}/room-count`,

  // Summary and confirmation
  SUMMARY: `${BASE_PATH}/summary`,
  ESTIMATE_EMAIL: `${BASE_PATH}/estimate-email`,
  CONFIRMATION: `${BASE_PATH}/confirmation`,

  // Additional pages
  NO_EDP: `${BASE_PATH}/no-edp`,
  ESTIMATE_EMAIL_CONTENT: `${BASE_PATH}/estimate-email-content`,
  CATCHMENTS_GEOJSON: `${BASE_PATH}/catchments.geojson`,

  // Payment journey routes
  DO_YOU_HAVE_A_COMMITMENT_REF: `${BASE_PATH}/do-you-have-a-commitment-ref`,
  ENTER_COMMITMENT_REF: `${BASE_PATH}/enter-commitment-ref`,
  RETRIEVE_COMMITMENT_EMAIL: `${BASE_PATH}/retrieve-commitment-email`,
  COMMITMENT_EMAIL_RETRIEVAL_CONTENT: `${BASE_PATH}/commitment-email-retrieval-content`,
  COMMIT_SUMMARY: `${BASE_PATH}/commit-summary`,
  PLANNING_REF: `${BASE_PATH}/planning-ref`,
  COMMIT_SUMMARY_SUBMIT: `${BASE_PATH}/commit-summary-submit`,
  PAYMENT_CONFIRMATION: `${BASE_PATH}/payment-confirmation`,
  INVOICE_EMAIL_CONTENT: `${BASE_PATH}/invoice-email-content`,

  // Commit journey routes
  DO_YOU_HAVE_AN_ESTIMATE_REF: `${BASE_PATH}/do-you-have-an-estimate-ref`,
  ENTER_ESTIMATE_REF: `${BASE_PATH}/enter-estimate-ref`,
  RETRIEVE_ESTIMATE_EMAIL: `${BASE_PATH}/retrieve-estimate-email`,
  ESTIMATE_EMAIL_RETRIEVAL_CONTENT: `${BASE_PATH}/estimate-email-retrieval-content`,
  RETRIEVED_ESTIMATE_SUMMARY: `${BASE_PATH}/retrieved-estimate-summary`,
  COMPANY_DETAILS: `${BASE_PATH}/company-details`,
  LPA_CONFIRM: `${BASE_PATH}/lpa-confirm`,
  SUMMARY_AND_DECLARATION: `${BASE_PATH}/summary-and-declaration`,
  COMMIT_EMAIL_CONTENT: `${BASE_PATH}/commit-email-content`
}

// View template paths (for res.render)
const TEMPLATES = {
  START: 'nrf-estimate-3/start',
  WHAT_WOULD_YOU_LIKE_TO_DO: 'nrf-estimate-3/what-would-you-like-to-do',
  MAP: 'nrf-estimate-3/map',
  UPLOAD_REDLINE: 'nrf-estimate-3/upload-redline',
  REDLINE_MAP: 'nrf-estimate-3/redline-map',
  BUILDING_TYPE: 'nrf-estimate-3/building-type',
  RESIDENTIAL: 'nrf-estimate-3/residential',
  NON_RESIDENTIAL: 'nrf-estimate-3/non-residential',
  ROOM_COUNT: 'nrf-estimate-3/room-count',
  SUMMARY: 'nrf-estimate-3/summary',
  ESTIMATE_EMAIL: 'nrf-estimate-3/estimate-email',
  CONFIRMATION: 'nrf-estimate-3/confirmation',
  NO_EDP: 'nrf-estimate-3/no-edp',
  ESTIMATE_EMAIL_CONTENT: 'nrf-estimate-3/estimate-email-content',

  // Payment journey templates
  DO_YOU_HAVE_A_COMMITMENT_REF: 'nrf-estimate-3/do-you-have-a-commitment-ref',
  ENTER_COMMITMENT_REF: 'nrf-estimate-3/enter-commitment-ref',
  RETRIEVE_COMMITMENT_EMAIL: 'nrf-estimate-3/retrieve-commitment-email',
  COMMITMENT_EMAIL_RETRIEVAL_CONTENT:
    'nrf-estimate-3/commitment-email-retrieval-content',
  COMMIT_SUMMARY: 'nrf-estimate-3/commit-summary',
  PLANNING_REF: 'nrf-estimate-3/planning-ref',
  COMMIT_SUMMARY_SUBMIT: 'nrf-estimate-3/commit-summary-submit',
  PAYMENT_CONFIRMATION: 'nrf-estimate-3/payment-confirmation',
  INVOICE_EMAIL_CONTENT: 'nrf-estimate-3/invoice-email-content',

  // Commit journey templates
  DO_YOU_HAVE_AN_ESTIMATE_REF: 'nrf-estimate-3/do-you-have-an-estimate-ref',
  ENTER_ESTIMATE_REF: 'nrf-estimate-3/enter-estimate-ref',
  RETRIEVE_ESTIMATE_EMAIL: 'nrf-estimate-3/retrieve-estimate-email',
  ESTIMATE_EMAIL_RETRIEVAL_CONTENT:
    'nrf-estimate-3/estimate-email-retrieval-content',
  RETRIEVED_ESTIMATE_SUMMARY: 'nrf-estimate-3/retrieved-estimate-summary',
  COMPANY_DETAILS: 'nrf-estimate-3/company-details',
  LPA_CONFIRM: 'nrf-estimate-3/lpa-confirm',
  SUMMARY_AND_DECLARATION: 'nrf-estimate-3/summary-and-declaration',
  COMMIT_EMAIL_CONTENT: 'nrf-estimate-3/commit-email-content'
}

module.exports = { ROUTES, TEMPLATES }
