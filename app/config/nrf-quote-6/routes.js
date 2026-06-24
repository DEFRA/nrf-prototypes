const BASE_PATH = '/nrf-quote-6'

const ROUTES = {
  BASE: BASE_PATH,
  START: `${BASE_PATH}/start`,
  PLANNING_TYPE: `${BASE_PATH}/planning-type`,
  WRONG_PERMISSION: `${BASE_PATH}/wrong-permission`,
  HOUSING: `${BASE_PATH}/housing`,
  NOT_HOUSING: `${BASE_PATH}/not-housing`,
  UNITS: `${BASE_PATH}/units`,
  REDLINE_MAP: `${BASE_PATH}/redline-map`,
  UPLOAD_REDLINE: `${BASE_PATH}/upload-redline`,
  MAP: `${BASE_PATH}/map`,
  NO_EDP: `${BASE_PATH}/no-edp`,
  NO_CAPACITY: `${BASE_PATH}/no-capacity`,
  EXCLUSION: `${BASE_PATH}/exclusion`,
  ESTIMATE_EMAIL: `${BASE_PATH}/estimate-email`,
  CHECK_YOUR_ANSWERS: `${BASE_PATH}/check-your-answers`,
  DELETE_QUOTE: `${BASE_PATH}/delete-quote`,
  DELETE_CONFIRMATION: `${BASE_PATH}/delete-confirmation`,
  CONFIRMATION: `${BASE_PATH}/confirmation`,
  ESTIMATE_EMAIL_CONTENT: `${BASE_PATH}/estimate-email-content`,
  CATCHMENTS_GEOJSON: `${BASE_PATH}/catchments.geojson`,
  API_CHECK_EDP_INTERSECTION: `${BASE_PATH}/api/check-edp-intersection`
}

const TEMPLATES = {
  START: 'nrf-quote-6/start',
  PLANNING_TYPE: 'nrf-quote-6/planning-type',
  WRONG_PERMISSION: 'nrf-quote-6/wrong-permission',
  HOUSING: 'nrf-quote-6/housing',
  NOT_HOUSING: 'nrf-quote-6/not-housing',
  UNITS: 'nrf-quote-6/units',
  REDLINE_MAP: 'nrf-quote-6/redline-map',
  UPLOAD_REDLINE: 'nrf-quote-6/upload-redline',
  MAP: 'nrf-quote-6/map',
  NO_EDP: 'nrf-quote-6/no-edp',
  NO_CAPACITY: 'nrf-quote-6/no-capacity',
  EXCLUSION: 'nrf-quote-6/exclusion',
  ESTIMATE_EMAIL: 'nrf-quote-6/estimate-email',
  CHECK_YOUR_ANSWERS: 'nrf-quote-6/check-your-answers',
  DELETE_QUOTE: 'nrf-quote-6/delete-quote',
  DELETE_CONFIRMATION: 'nrf-quote-6/delete-confirmation',
  CONFIRMATION: 'nrf-quote-6/confirmation',
  ESTIMATE_EMAIL_CONTENT: 'nrf-quote-6/estimate-email-content'
}

module.exports = { ROUTES, TEMPLATES }
