/**
 * Route path constants for NRF Estimate journey
 * Centralized route definitions to avoid magic strings
 */

const BASE_PATH = '/nrf-estimate-2-map-layers-spike'

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

  // Invoice journey (commit to pay and get an invoice)
  WHICH: `${BASE_PATH}/which`,
  CONFIRM: `${BASE_PATH}/confirm`,
  COMPANY_DETAILS: `${BASE_PATH}/company-details`,
  LPA_EMAIL: `${BASE_PATH}/lpa-email`,
  SUMMARY_AND_DECLARATION: `${BASE_PATH}/summary-and-declaration`,
  INVOICE_EMAIL_CONTENT: `${BASE_PATH}/invoice-email-content`,

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
  START: 'nrf-estimate-2-map-layers-spike/start',
  WHAT_WOULD_YOU_LIKE_TO_DO:
    'nrf-estimate-2-map-layers-spike/what-would-you-like-to-do',
  DO_YOU_HAVE_ESTIMATE_REF:
    'nrf-estimate-2-map-layers-spike/do-you-have-an-estimate-ref',
  ENTER_ESTIMATE_REF: 'nrf-estimate-2-map-layers-spike/enter-estimate-ref',
  RETRIEVE_ESTIMATE_EMAIL:
    'nrf-estimate-2-map-layers-spike/retrieve-estimate-email',
  MAP: 'nrf-estimate-2-map-layers-spike/map',
  UPLOAD_REDLINE: 'nrf-estimate-2-map-layers-spike/upload-redline',
  REDLINE_MAP: 'nrf-estimate-2-map-layers-spike/redline-map',
  BUILDING_TYPE: 'nrf-estimate-2-map-layers-spike/building-type',
  RESIDENTIAL: 'nrf-estimate-2-map-layers-spike/residential',
  RESIDENTIAL_INSTITUTION:
    'nrf-estimate-2-map-layers-spike/residential-institution',
  NON_RESIDENTIAL: 'nrf-estimate-2-map-layers-spike/non-residential',
  ROOM_COUNT: 'nrf-estimate-2-map-layers-spike/room-count',
  PLANNING_REF: 'nrf-estimate-2-map-layers-spike/planning-ref',
  SUMMARY: 'nrf-estimate-2-map-layers-spike/summary',
  EMAIL: 'nrf-estimate-2-map-layers-spike/email',
  CONFIRMATION: 'nrf-estimate-2-map-layers-spike/confirmation',
  PAYMENT_SUMMARY: 'nrf-estimate-2-map-layers-spike/payment-summary',
  PAYMENT_CONFIRMATION: 'nrf-estimate-2-map-layers-spike/payment-confirmation',
  NO_EDP: 'nrf-estimate-2-map-layers-spike/no-edp',
  ESTIMATE_EMAIL_CONTENT:
    'nrf-estimate-2-map-layers-spike/estimate-email-content',
  ESTIMATE_EMAIL_RETRIEVAL_CONTENT:
    'nrf-estimate-2-map-layers-spike/estimate-email-retrieval-content',
  ESTIMATE_CONFIRMATION_EMAIL:
    'nrf-estimate-2-map-layers-spike/estimate-confirmation-email',
  PAYMENT_EMAIL: 'nrf-estimate-2-map-layers-spike/payment-email',

  // Invoice journey templates
  WHICH: 'nrf-estimate-2-map-layers-spike/which',
  CONFIRM: 'nrf-estimate-2-map-layers-spike/confirm',
  COMPANY_DETAILS: 'nrf-estimate-2-map-layers-spike/company-details',
  LPA_EMAIL: 'nrf-estimate-2-map-layers-spike/lpa-email',
  SUMMARY_AND_DECLARATION:
    'nrf-estimate-2-map-layers-spike/summary-and-declaration',
  INVOICE_EMAIL_CONTENT: 'nrf-estimate-2-map-layers-spike/invoice-email-content'
}

module.exports = { ROUTES, TEMPLATES }
