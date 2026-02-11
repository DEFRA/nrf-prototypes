/**
 * Route path constants for the LPA Approval v3 journey
 */

const BASE_PATH = '/lpa-approve-3'

const ROUTES = {
  BASE: BASE_PATH,
  LPA_APPROVAL_EMAIL_CONTENT: `${BASE_PATH}/lpa-approval-email-content`,
  CONFIRM_VIEW_APPROVE: `${BASE_PATH}/confirm-view-approve`,
  LPA_APPROVAL_EMAIL_MAGICLINK: `${BASE_PATH}/lpa-approval-email-magiclink`,
  APPROVE_DETAILS: `${BASE_PATH}/approve-details`,
  LPA_DETAILS: `${BASE_PATH}/lpa-details`,
  APPROVAL_CONFIRMATION: `${BASE_PATH}/approval-confirmation`,
  LPA_APPROVAL_CONFIRMATION_EMAIL: `${BASE_PATH}/lpa-approval-confirmation-email`,
  REASON_FOR_REJECTING: `${BASE_PATH}/reason-for-rejecting`,
  REJECT_CONFIRMATION: `${BASE_PATH}/reject-confirmation`,
  LPA_REJECTION_CONFIRMATION_EMAIL: `${BASE_PATH}/lpa-rejection-confirmation-email`
}

const TEMPLATES = {
  LPA_APPROVAL_EMAIL_CONTENT: 'lpa-approve-3/lpa-approval-email-content',
  CONFIRM_VIEW_APPROVE: 'lpa-approve-3/confirm-view-approve',
  LPA_APPROVAL_EMAIL_MAGICLINK: 'lpa-approve-3/lpa-approval-email-magiclink',
  APPROVE_DETAILS: 'lpa-approve-3/approve-details',
  LPA_DETAILS: 'lpa-approve-3/lpa-details',
  APPROVAL_CONFIRMATION: 'lpa-approve-3/approval-confirmation',
  LPA_APPROVAL_CONFIRMATION_EMAIL:
    'lpa-approve-3/lpa-approval-confirmation-email',
  REASON_FOR_REJECTING: 'lpa-approve-3/reason-for-rejecting',
  REJECT_CONFIRMATION: 'lpa-approve-3/reject-confirmation',
  LPA_REJECTION_CONFIRMATION_EMAIL:
    'lpa-approve-3/lpa-rejection-confirmation-email'
}

module.exports = { ROUTES, TEMPLATES }
