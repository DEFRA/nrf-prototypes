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
  CHECK_YOUR_ANSWERS: `${BASE_PATH}/check-your-answers`,
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
  CHECK_YOUR_ANSWERS: 'nrf-estimate-4/check-your-answers',
  SUMMARY: 'nrf-estimate-4/summary',
  CONFIRMATION: 'nrf-estimate-4/confirmation',
  ESTIMATE_EMAIL_CONTENT: 'nrf-estimate-4/estimate-email-content',
  DO_YOU_HAVE_A_NRF_REF: 'nrf-estimate-4/do-you-have-a-nrf-ref',
  ENTER_ESTIMATE_REF: 'nrf-estimate-4/enter-estimate-ref',
  RETRIEVE_ESTIMATE_EMAIL: 'nrf-estimate-4/retrieve-estimate-email',
  ESTIMATE_EMAIL_RETRIEVAL_CONTENT:
    'nrf-estimate-4/estimate-email-retrieval-content',
  RETRIEVED_ESTIMATE_SUMMARY: 'nrf-estimate-4/retrieved-estimate-summary',
  COMMIT_HOW_WOULD_YOU_LIKE_TO_SIGN_IN:
    'nrf-estimate-4/commit-how-would-you-like-to-sign-in',
  COMMIT_SIGN_IN_GOVERNMENT_GATEWAY:
    'nrf-estimate-4/commit-sign-in-government-gateway',
  COMPANY_DETAILS: 'nrf-estimate-4/company-details',
  LPA_CONFIRM: 'nrf-estimate-4/lpa-confirm',
  SUMMARY_AND_DECLARATION: 'nrf-estimate-4/summary-and-declaration',
  COMMIT_CONFIRMATION: 'nrf-estimate-4/commit-confirmation',
  COMMIT_EMAIL_CONTENT: 'nrf-estimate-4/commit-email-content',
  PAY_HOW_WOULD_YOU_LIKE_TO_SIGN_IN:
    'nrf-estimate-4/pay-how-would-you-like-to-sign-in',
  PAY_SIGN_IN_GOVERNMENT_GATEWAY:
    'nrf-estimate-4/pay-sign-in-government-gateway',
  PAYMENT_SUMMARY: 'nrf-estimate-4/payment-summary',
  PLANNING_REF: 'nrf-estimate-4/planning-ref',
  PAYMENT_DECLARATION: 'nrf-estimate-4/payment-declaration',
  PAYMENT_CONFIRMATION: 'nrf-estimate-4/payment-confirmation',
  PAYMENT_REQUEST_EMAIL_CONTENT: 'nrf-estimate-4/payment-request-email-content',
  PDN_HOW_WOULD_YOU_LIKE_TO_SIGN_IN:
    'nrf-estimate-4/pdn-how-would-you-like-to-sign-in',
  PDN_SIGN_IN_GOVERNMENT_GATEWAY:
    'nrf-estimate-4/pdn-sign-in-government-gateway',
  UPLOAD_DECISION_NOTICE: 'nrf-estimate-4/upload-decision-notice',
  PAYMENT_SUMMARY_SUBMIT: 'nrf-estimate-4/payment-summary-submit',
  DECISION_NOTICE_CONFIRMATION: 'nrf-estimate-4/decision-notice-confirmation',
  PAY_EMAIL_CONTENT: 'nrf-estimate-4/pay-email-content'
}

module.exports = { ROUTES, TEMPLATES }
