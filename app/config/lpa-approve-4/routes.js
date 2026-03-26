/**
 * Route path constants for the LPA Approval v4 journey
 */

const BASE_PATH = '/lpa-approve-4'

const ROUTES = {
  BASE: BASE_PATH,
  LPA_APPROVAL_EMAIL_CONTENT: `${BASE_PATH}/lpa-approval-email-content`,
  CONFIRM_VIEW_APPROVE: `${BASE_PATH}/confirm-view-approve`,
  LPA_APPROVAL_EMAIL_MAGICLINK: `${BASE_PATH}/lpa-approval-email-magiclink`,
  APPROVE_DETAILS: `${BASE_PATH}/approve-details`,
  LPA_DETAILS: `${BASE_PATH}/lpa-details`,
  LPA_DETAILS_2: `${BASE_PATH}/lpa-details-2`,
  APPROVAL_CONFIRMATION: `${BASE_PATH}/approval-confirmation`,
  LPA_APPROVAL_CONFIRMATION_EMAIL: `${BASE_PATH}/lpa-approval-confirmation-email`,
  REASON_FOR_REJECTING: `${BASE_PATH}/reason-for-rejecting`,
  REJECT_CONFIRMATION: `${BASE_PATH}/reject-confirmation`,
  LPA_REJECTION_CONFIRMATION_EMAIL: `${BASE_PATH}/lpa-rejection-confirmation-email`
}

const TEMPLATES = {
  LPA_APPROVAL_EMAIL_CONTENT: 'lpa-approve-4/lpa-approval-email-content',
  CONFIRM_VIEW_APPROVE: 'lpa-approve-4/confirm-view-approve',
  LPA_APPROVAL_EMAIL_MAGICLINK: 'lpa-approve-4/lpa-approval-email-magiclink',
  APPROVE_DETAILS: 'lpa-approve-4/approve-details',
  LPA_DETAILS: 'lpa-approve-4/lpa-details',
  LPA_DETAILS_2: 'lpa-approve-4/lpa-details-2',
  APPROVAL_CONFIRMATION: 'lpa-approve-4/approval-confirmation',
  LPA_APPROVAL_CONFIRMATION_EMAIL:
    'lpa-approve-4/lpa-approval-confirmation-email',
  REASON_FOR_REJECTING: 'lpa-approve-4/reason-for-rejecting',
  REJECT_CONFIRMATION: 'lpa-approve-4/reject-confirmation',
  LPA_REJECTION_CONFIRMATION_EMAIL:
    'lpa-approve-4/lpa-rejection-confirmation-email'
}

module.exports = { ROUTES, TEMPLATES }
