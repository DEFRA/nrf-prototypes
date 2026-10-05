---
# A developer record (app/views/lpa-manage-1/view-record.html). The heading
# is the record's NRL reference; `text:` holds the rest of the page's words.
# The review options sit at the bottom of the page, none chosen, and
# Confirm returns to the dashboard. A record For review offers the first
# three options (rejecting asks why on reject-commitment and is final;
# later keeps it For review and notes it on the timeline). Once its
# commitment details are reviewed the planning stage options (`step:
# planning`) take their place: they set the planning application's stage
# (see records.yaml). A planning variation shows the new planning
# application reference and the original one.
type: custom
rows:
  - heading: Commitment details
  - include: commitment-summary
  - heading: Planning details
  - key: Planning type
    value: '{{ commitment.planningType }}'
  - key: Planning variation
    value: 'Yes'
    when: { key: record.variation, truthy: true }
  - key: Planning application reference
    value: '{{ record.planningReference }}'
  - key: Original planning application reference
    value: '{{ record.originalPlanningReference }}'
    when: { key: record.variation, truthy: true }
  - key: Planning application stage
    value: '{{ record.planningStage.label }}'
  - key: Added by
    value: '{{ record.officer }}'
  - key: Reviewed by
    value:
      when: { key: record.reviewedBy, truthy: true }
      then: '{{ record.reviewedBy }}'
      else: Not reviewed yet
options:
  - label: I have reviewed these commitment details
    value: reviewed
    hint: The details match the planning application
  - label: I want to reject these commitment details
    value: rejected
    hint: The details are incorrect or don't match the planning application
  - label: I want to review these later
    value: review-later
  - label: The planning permission has been granted
    value: granted
    step: planning
  - label: The planning permission has been refused
    value: refused
    step: planning
  - label: The planning permission is under appeal
    value: under-appeal
    step: planning
  - label: The planning permission is in judicial review
    value: judicial-review
    step: planning
errors:
  required: Select a new status for this developer record
  stageRequired: Select the stage the planning application has reached
button: Confirm
text:
  successTitle: Commitment details retrieved
  added: A new developer record has been created for review
  viewCertificate: View full certificate
  statusLegend: Review options
  # Once the commitment details are reviewed
  planningLegend: Planning stage options
  planningHint: Update the planning stage for this developer record
  # In place of the radios once rejected
  rejectedFinal: This developer record has been rejected. Its status cannot be changed.
  warning: Warning
  timelineHeading: Developer record history
  timelineAdded: Commitment details retrieved
  timelineStatus: Status changed to
  timelineReviewLater: Marked to review and confirm later
  timelineStage: Planning application stage changed to
  timelineVariation: Planning variation added
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
