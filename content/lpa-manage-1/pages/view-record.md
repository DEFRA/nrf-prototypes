---
# A developer record (app/views/lpa-manage-1/view-record.html). The heading
# is the record's NRL reference; `text:` holds the rest of the page's words.
# The review options sit at the bottom of the page, none chosen, and
# Submit returns to the dashboard. A record For review offers the first
# three options (Rejected is final; later keeps it For review and notes it
# on the timeline). Once its commitment details are reviewed the options
# with `step: planning` take their place: they set the planning
# application's stage (see records.yaml).
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
  - label: Review and confirm commitment details
    value: reviewed
  - label: Review and confirm commitment details later
    value: review-later
  - label: Reject commitment details
    value: rejected
  - label: Planning permission granted
    value: granted
    step: planning
  - label: Planning permission refused
    value: refused
    step: planning
  - label: Under appeal
    value: under-appeal
    step: planning
  - label: In judicial review
    value: judicial-review
    step: planning
errors:
  required: Select a new status for this record
  stageRequired: Select the stage the planning application has reached
  comment: Enter a comment explaining why you are rejecting the commitment details
button: Submit
text:
  addRecord: Add a developer record
  successTitle: Commitment details retrieved 
  added: A new record has been created
  viewCertificate: View full certificate
  statusLegend: Review options
  commentLabel: Add a comment
  commentHint: Explain why you are rejecting the commitment details
  # Under the comment box, and in place of the radios once rejected
  rejectWarning: Once you reject the commitment details, you cannot change the status of this record.
  rejectedFinal: This record has been rejected. Its status cannot be changed.
  warning: Warning
  timelineHeading: Timeline
  timelineAdded: Commitment details retrieved
  timelineStatus: Status changed to
  timelineReviewLater: Marked to review and confirm later
  timelineStage: Planning application stage changed to
  timelineComment: Comment
  by: by
  at: at
actions:
  - text: Manage developer records
    kind: secondary
    goto: dashboard
---

# {{ record.reference }}

## Red line boundary

:::map commitment.boundary os
:::
