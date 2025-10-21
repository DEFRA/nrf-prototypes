//
// EDP Search Routes - Development Site Assessment and Environmental Impact Calculation
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

// EDP Search - Development Site Assessment and Environmental Impact Calculation
router.get('/edp-search/start', (req, res) => {
  res.render('edp-search/start')
})

router.get('/edp-search/location', (req, res) => {
  res.render('edp-search/location')
})

router.get('/edp-search/location/file-upload', (req, res) => {
  res.render('edp-search/location-file-upload')
})

router.get('/edp-search/location/postcode', (req, res) => {
  res.render('edp-search/location-postcode')
})

router.get('/edp-search/location/coordinates', (req, res) => {
  res.render('edp-search/location-coordinates')
})

router.get('/edp-search/location/draw', (req, res) => {
  res.render('edp-search/location-draw')
})

router.get('/edp-search/details', (req, res) => {
  res.render('edp-search/details')
})

router.get('/edp-search/summary', (req, res) => {
  res.render('edp-search/summary')
})

router.get('/edp-search/print', (req, res) => {
  res.render('edp-search/print')
})

module.exports = router
