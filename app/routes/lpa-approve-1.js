// LPA Approve Developer Request to Pay NRF

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

// Email sent from the Nature Restoration Fund service
router.get('/lpa-approve-1/lpa-approval-email-content', (req, res) => {
  res.render('lpa-approve-1/lpa-approval-email-content')
})

// Confirm you want to view and approve these Nature Restoration Fund levy details
router.get('/lpa-approve-1/confirm-view-approve', (req, res) => {
  res.render('lpa-approve-1/confirm-view-approve')
})

// Email with magic link sent from the Nature Restoration Fund service
router.get('/lpa-approve-1/lpa-approval-email-magiclink', (req, res) => {
  res.render('lpa-approve-1/lpa-approval-email-magiclink')
})

// Approve these details
router.get('/lpa-approve-1/approve-details', (req, res) => {
  res.render('lpa-approve-1/approve-details')
})

// Details approved confirmation page
router.get('/lpa-approve-1/approval-confirmation', (req, res) => {
  res.render('lpa-approve-1/approval-confirmation')
})

// Email Nature Restoration Fund service approval confirmation
router.get('/lpa-approve-1/lpa-approval-confirmation-email', (req, res) => {
  res.render('lpa-approve-1/lpa-approval-confirmation-email')
})

module.exports = router
