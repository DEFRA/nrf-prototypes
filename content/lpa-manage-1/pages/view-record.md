---
# A developer record (app/views/lpa-manage-1/view-record.html). The heading
# is the record's NRL reference; `text:` holds the rest of the page's words.
# The status radios sit at the bottom of the page and post back to it; the
# first option is the status of a record just added (see records.yaml).
type: custom
rows:
  - heading: Commitment details
  - include: commitment-summary
  - heading: Planning details
  - key: Planning application reference
    value: '{{ record.planningReference }}'
  - key: Planning application stage
    value: '{{ record.planningStage.label }}'
  - key: Planning type
    value: '{{ commitment.planningType }}'
  - key: Added by
    value: '{{ record.officer }}'
  - key: Reviewed by
    value:
      when: { key: record.reviewedBy, truthy: true }
      then: '{{ record.reviewedBy }}'
      else: Not reviewed yet
options:
  - label: Received
    value: received
  - label: Review and confirm commitment details
    value: confirmed
  - label: Review and confirm commitment details later
    value: review-later
  - label: Reject commitment details
    value: rejected
errors:
  required: Select a new status for this record
  comment: Enter a comment explaining why you are rejecting the commitment details
button: Change status
text:
  addRecord: Add a developer record
  successTitle: Success
  added: Record added
  statusChanged: Status updated
  viewCertificate: View full certificate
  statusLegend: Change status
  commentLabel: Add a comment
  commentHint: Explain why you are rejecting the commitment details
  # Under the comment box, and in place of the radios once rejected
  rejectWarning: Once you reject the commitment details, you cannot change the status of this record.
  rejectedFinal: This record has been rejected. Its status cannot be changed.
  warning: Warning
  timelineHeading: Audit timeline
  timelineAdded: Record added
  timelineStatus: Status changed to
  timelineComment: Comment
  by: by
  at: at
actions:
  - text: Back to dashboard
    kind: secondary
    goto: dashboard
---

# {{ record.reference }}

## Red line boundary

:::map commitment.boundary os
:::
