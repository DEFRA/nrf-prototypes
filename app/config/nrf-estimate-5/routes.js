/**
 * Route path constants for the NRF Estimate v5 journey
 */

const BASE_PATH = '/nrf-estimate-5'

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
  NON_RESIDENTIAL: `${BASE_PATH}/non-residential`,
  ROOM_COUNT: `${BASE_PATH}/room-count`,
  ESTIMATE_EMAIL: `${BASE_PATH}/estimate-email`,
  CHECK_YOUR_ANSWERS: `${BASE_PATH}/check-your-answers`,
  DELETE_QUOTE: `${BASE_PATH}/delete-quote`,
  DELETE_CONFIRMATION: `${BASE_PATH}/delete-confirmation`,
  ESTIMATE_EMAIL_CONTENT_RANGE: `${BASE_PATH}/estimate-email-content-range`,
  SUMMARY: `${BASE_PATH}/summary`,
  CONFIRMATION: `${BASE_PATH}/confirmation`,
  ESTIMATE_EMAIL_CONTENT: `${BASE_PATH}/estimate-email-content`,
  DO_YOU_HAVE_A_NRF_REF: `${BASE_PATH}/do-you-have-a-nrf-ref`,
  ENTER_ESTIMATE_REF: `${BASE_PATH}/enter-estimate-ref`,
  RETRIEVE_ESTIMATE_EMAIL: `${BASE_PATH}/retrieve-estimate-email`,
  ESTIMATE_EMAIL_RETRIEVAL_CONTENT: `${BASE_PATH}/estimate-email-retrieval-content`,
  RETRIEVED_ESTIMATE_SUMMARY: `${BASE_PATH}/retrieved-estimate-summary`,
  COMMIT_HOW_WOULD_YOU_LIKE_TO_SIGN_IN: `${BASE_PATH}/commit-how-would-you-like-to-sign-in`,
  COMMIT_SIGN_IN_GOVERNMENT_GATEWAY: `${BASE_PATH}/commit-sign-in-government-gateway`,
  PAY_HOW_WOULD_YOU_LIKE_TO_SIGN_IN: `${BASE_PATH}/pay-how-would-you-like-to-sign-in`,
  PAY_SIGN_IN_GOVERNMENT_GATEWAY: `${BASE_PATH}/pay-sign-in-government-gateway`,
  PAYMENT_SUMMARY: `${BASE_PATH}/payment-summary`,
  PLANNING_REF: `${BASE_PATH}/planning-ref`,
  PAYMENT_DECLARATION: `${BASE_PATH}/payment-declaration`,
  PAYMENT_CONFIRMATION: `${BASE_PATH}/payment-confirmation`,
  PAYMENT_REQUEST_EMAIL_CONTENT: `${BASE_PATH}/payment-request-email-content`,
  PDN_HOW_WOULD_YOU_LIKE_TO_SIGN_IN: `${BASE_PATH}/pdn-how-would-you-like-to-sign-in`,
  PDN_SIGN_IN_GOVERNMENT_GATEWAY: `${BASE_PATH}/pdn-sign-in-government-gateway`,
  UPLOAD_DECISION_NOTICE: `${BASE_PATH}/upload-decision-notice`,
  PAYMENT_SUMMARY_SUBMIT: `${BASE_PATH}/payment-summary-submit`,
  DECISION_NOTICE_CONFIRMATION: `${BASE_PATH}/decision-notice-confirmation`,
  PAY_EMAIL_CONTENT: `${BASE_PATH}/pay-email-content`,
  COMPANY_DETAILS: `${BASE_PATH}/company-details`,
  LPA_CONFIRM: `${BASE_PATH}/lpa-confirm`,
  SUMMARY_AND_DECLARATION: `${BASE_PATH}/summary-and-declaration`,
  COMMIT_CONFIRMATION: `${BASE_PATH}/commit-confirmation`,
  COMMIT_EMAIL_CONTENT: `${BASE_PATH}/commit-email-content`,
  CATCHMENTS_GEOJSON: `${BASE_PATH}/catchments.geojson`,
  API_CHECK_EDP_INTERSECTION: `${BASE_PATH}/api/check-edp-intersection`
}

const TEMPLATES = {
  START: 'nrf-estimate-5/start',
  WHAT_WOULD_YOU_LIKE_TO_DO: 'nrf-estimate-5/what-would-you-like-to-do',
  REDLINE_MAP: 'nrf-estimate-5/redline-map',
  UPLOAD_REDLINE: 'nrf-estimate-5/upload-redline',
  MAP: 'nrf-estimate-5/map',
  NO_EDP: 'nrf-estimate-5/no-edp',
  BUILDING_TYPE: 'nrf-estimate-5/building-type',
  RESIDENTIAL: 'nrf-estimate-5/residential',
  PEOPLE_COUNT: 'nrf-estimate-5/people-count',
  WASTE_WATER: 'nrf-estimate-5/waste-water',
  NON_RESIDENTIAL: 'nrf-estimate-5/non-residential',
  ROOM_COUNT: 'nrf-estimate-5/room-count',
  ESTIMATE_EMAIL: 'nrf-estimate-5/estimate-email',
  CHECK_YOUR_ANSWERS: 'nrf-estimate-5/check-your-answers',
  DELETE_QUOTE: 'nrf-estimate-5/delete-quote',
  DELETE_CONFIRMATION: 'nrf-estimate-5/delete-confirmation',
  ESTIMATE_EMAIL_CONTENT: 'nrf-estimate-5/estimate-email-content',
  ESTIMATE_EMAIL_CONTENT_RANGE: 'nrf-estimate-5/estimate-email-content-range',
  SUMMARY: 'nrf-estimate-5/summary',
  CONFIRMATION: 'nrf-estimate-5/confirmation',
  DO_YOU_HAVE_A_NRF_REF: 'nrf-estimate-5/do-you-have-a-nrf-ref',
  ENTER_ESTIMATE_REF: 'nrf-estimate-5/enter-estimate-ref',
  RETRIEVE_ESTIMATE_EMAIL: 'nrf-estimate-5/retrieve-estimate-email',
  ESTIMATE_EMAIL_RETRIEVAL_CONTENT:
    'nrf-estimate-5/estimate-email-retrieval-content',
  RETRIEVED_ESTIMATE_SUMMARY: 'nrf-estimate-5/retrieved-estimate-summary',
  COMMIT_HOW_WOULD_YOU_LIKE_TO_SIGN_IN:
    'nrf-estimate-5/commit-how-would-you-like-to-sign-in',
  COMMIT_SIGN_IN_GOVERNMENT_GATEWAY:
    'nrf-estimate-5/commit-sign-in-government-gateway',
  COMPANY_DETAILS: 'nrf-estimate-5/company-details',
  LPA_CONFIRM: 'nrf-estimate-5/lpa-confirm',
  SUMMARY_AND_DECLARATION: 'nrf-estimate-5/summary-and-declaration',
  COMMIT_CONFIRMATION: 'nrf-estimate-5/commit-confirmation',
  COMMIT_EMAIL_CONTENT: 'nrf-estimate-5/commit-email-content',
  PAY_HOW_WOULD_YOU_LIKE_TO_SIGN_IN:
    'nrf-estimate-5/pay-how-would-you-like-to-sign-in',
  PAY_SIGN_IN_GOVERNMENT_GATEWAY:
    'nrf-estimate-5/pay-sign-in-government-gateway',
  PAYMENT_SUMMARY: 'nrf-estimate-5/payment-summary',
  PLANNING_REF: 'nrf-estimate-5/planning-ref',
  PAYMENT_DECLARATION: 'nrf-estimate-5/payment-declaration',
  PAYMENT_CONFIRMATION: 'nrf-estimate-5/payment-confirmation',
  PAYMENT_REQUEST_EMAIL_CONTENT: 'nrf-estimate-5/payment-request-email-content',
  PDN_HOW_WOULD_YOU_LIKE_TO_SIGN_IN:
    'nrf-estimate-5/pdn-how-would-you-like-to-sign-in',
  PDN_SIGN_IN_GOVERNMENT_GATEWAY:
    'nrf-estimate-5/pdn-sign-in-government-gateway',
  UPLOAD_DECISION_NOTICE: 'nrf-estimate-5/upload-decision-notice',
  PAYMENT_SUMMARY_SUBMIT: 'nrf-estimate-5/payment-summary-submit',
  DECISION_NOTICE_CONFIRMATION: 'nrf-estimate-5/decision-notice-confirmation',
  PAY_EMAIL_CONTENT: 'nrf-estimate-5/pay-email-content'
}

module.exports = { ROUTES, TEMPLATES }
