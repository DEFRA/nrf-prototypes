//
// LPA Approval Journey Routes - LPA approve developer request to pay NRF (v3)
// Includes Approve and Reject paths
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const { ROUTES, TEMPLATES } = require('../config/lpa-approve-3/routes')

// ============================================================================
// LPA APPROVAL JOURNEY ROUTES
// ============================================================================

// Email sent from the Nature Restoration Fund service (entry page, no back link)
router.get(ROUTES.LPA_APPROVAL_EMAIL_CONTENT, (req, res) => {
  res.render(TEMPLATES.LPA_APPROVAL_EMAIL_CONTENT)
})

// Confirm you want to view and approve
router.get(ROUTES.CONFIRM_VIEW_APPROVE, (req, res) => {
  res.render(TEMPLATES.CONFIRM_VIEW_APPROVE, {
    backLink: ROUTES.LPA_APPROVAL_EMAIL_CONTENT
  })
})

router.post(ROUTES.CONFIRM_VIEW_APPROVE, (req, res) => {
  res.redirect(ROUTES.LPA_APPROVAL_EMAIL_MAGICLINK)
})

// Email with magic link sent
router.get(ROUTES.LPA_APPROVAL_EMAIL_MAGICLINK, (req, res) => {
  res.render(TEMPLATES.LPA_APPROVAL_EMAIL_MAGICLINK, {
    backLink: ROUTES.CONFIRM_VIEW_APPROVE
  })
})

// Approve these details (Approve → lpa-details, Reject → reason-for-rejecting)
router.get(ROUTES.APPROVE_DETAILS, (req, res) => {
  res.render(TEMPLATES.APPROVE_DETAILS, {
    backLink: ROUTES.LPA_APPROVAL_EMAIL_MAGICLINK
  })
})

router.post(ROUTES.APPROVE_DETAILS, (req, res) => {
  const action = req.body.action
  if (action === 'reject') {
    return res.redirect(ROUTES.REASON_FOR_REJECTING)
  }
  res.redirect(ROUTES.LPA_DETAILS)
})

// Enter your details
router.get(ROUTES.LPA_DETAILS, (req, res) => {
  const data = req.session.data || {}
  res.render(TEMPLATES.LPA_DETAILS, {
    data,
    backLink: ROUTES.APPROVE_DETAILS
  })
})

router.post(ROUTES.LPA_DETAILS, (req, res) => {
  const fullName = req.body['full-name']?.trim()
  const email = req.body.email?.trim()
  const errors = []
  const errorsByField = {}

  if (!fullName) {
    errors.push({
      field: 'full-name',
      message: 'Enter your full name',
      href: '#full-name'
    })
    errorsByField.fullName = { text: 'Enter your full name' }
  }

  if (!email) {
    errors.push({
      field: 'email',
      message: 'Enter your email address to continue',
      href: '#email'
    })
    errorsByField.email = { text: 'Enter your email address to continue' }
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({
      field: 'email',
      message:
        'Enter an email address in the correct format, like name@example.com',
      href: '#email'
    })
    errorsByField.email = {
      text: 'Enter an email address in the correct format, like name@example.com'
    }
  }

  if (errors.length > 0) {
    return res.render(TEMPLATES.LPA_DETAILS, {
      errors,
      errorsByField,
      data: req.session.data || {},
      backLink: ROUTES.APPROVE_DETAILS
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.lpaFullName = fullName
  req.session.data.lpaEmail = email

  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err)
    }
    res.redirect(ROUTES.APPROVAL_CONFIRMATION)
  })
})

// Reason for rejecting
router.get(ROUTES.REASON_FOR_REJECTING, (req, res) => {
  res.render(TEMPLATES.REASON_FOR_REJECTING, {
    backLink: ROUTES.APPROVE_DETAILS
  })
})

router.post(ROUTES.REASON_FOR_REJECTING, (req, res) => {
  const reason = req.body['rejection-reason']?.trim()
  const errors = []
  const errorsByField = {}

  if (!reason) {
    errors.push({
      field: 'rejection-reason',
      message: 'Enter your reason for rejecting this request',
      href: '#rejection-reason'
    })
    errorsByField.rejectionReason = {
      text: 'Enter your reason for rejecting this request'
    }
  }

  if (errors.length > 0) {
    return res.render(TEMPLATES.REASON_FOR_REJECTING, {
      errors,
      errorsByField,
      data: req.session.data || {},
      backLink: ROUTES.APPROVE_DETAILS
    })
  }

  req.session.data = req.session.data || {}
  req.session.data.lpaRejectionReason = reason

  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err)
    }
    res.redirect(ROUTES.REJECT_CONFIRMATION)
  })
})

// Details rejected confirmation
router.get(ROUTES.REJECT_CONFIRMATION, (req, res) => {
  res.render(TEMPLATES.REJECT_CONFIRMATION, {
    backLink: ROUTES.REASON_FOR_REJECTING
  })
})

// Email rejection confirmation
router.get(ROUTES.LPA_REJECTION_CONFIRMATION_EMAIL, (req, res) => {
  res.render(TEMPLATES.LPA_REJECTION_CONFIRMATION_EMAIL, {
    backLink: ROUTES.REJECT_CONFIRMATION
  })
})

// Details approved confirmation
router.get(ROUTES.APPROVAL_CONFIRMATION, (req, res) => {
  res.render(TEMPLATES.APPROVAL_CONFIRMATION, {
    backLink: ROUTES.LPA_DETAILS
  })
})

// Email approval confirmation
router.get(ROUTES.LPA_APPROVAL_CONFIRMATION_EMAIL, (req, res) => {
  res.render(TEMPLATES.LPA_APPROVAL_CONFIRMATION_EMAIL, {
    backLink: ROUTES.APPROVAL_CONFIRMATION
  })
})

module.exports = router
