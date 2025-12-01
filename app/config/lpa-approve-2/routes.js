/**
 * Route path constants for the LPA Approval v2 journey
 */

const BASE_PATH = '/lpa-approve-2'

const ROUTES = {
  BASE: BASE_PATH,
  LPA_APPROVAL_EMAIL_CONTENT: `${BASE_PATH}/lpa-approval-email-content`,
  CONFIRM_VIEW_APPROVE: `${BASE_PATH}/confirm-view-approve`,
  LPA_APPROVAL_EMAIL_MAGICLINK: `${BASE_PATH}/lpa-approval-email-magiclink`,
  APPROVE_DETAILS: `${BASE_PATH}/approve-details`,
  LPA_DETAILS: `${BASE_PATH}/lpa-details`,
  APPROVAL_CONFIRMATION: `${BASE_PATH}/approval-confirmation`,
  LPA_APPROVAL_CONFIRMATION_EMAIL: `${BASE_PATH}/lpa-approval-confirmation-email`
}

const TEMPLATES = {
  LPA_APPROVAL_EMAIL_CONTENT: 'lpa-approve-2/lpa-approval-email-content',
  CONFIRM_VIEW_APPROVE: 'lpa-approve-2/confirm-view-approve',
  LPA_APPROVAL_EMAIL_MAGICLINK: 'lpa-approve-2/lpa-approval-email-magiclink',
  APPROVE_DETAILS: 'lpa-approve-2/approve-details',
  LPA_DETAILS: 'lpa-approve-2/lpa-details',
  APPROVAL_CONFIRMATION: 'lpa-approve-2/approval-confirmation',
  LPA_APPROVAL_CONFIRMATION_EMAIL:
    'lpa-approve-2/lpa-approval-confirmation-email'
}

module.exports = { ROUTES, TEMPLATES }
