const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const { JOURNEYS } = require('../config/shared/journeys')

/**
 * Homepage route
 * Displays all available journeys from the shared config
 */
router.get('/', function (req, res) {
  // Pass journeys to the view
  res.render('index', {
    journeys: JOURNEYS
  })
})

module.exports = router
