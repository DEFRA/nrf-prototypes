//
// User Journey 1 Routes - Digital Application Process
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

// User Journey 1 - Digital Application Process
router.get('/user-journey-1/start', (req, res) => {
  res.render('user-journey-1/start')
})

module.exports = router
