---
# A developer record (app/views/lpa-manage-1/view-record.html). The heading
# is the record's NRL reference; `text:` holds the rest of the page's words.
# The review options sit at the bottom of the page, none chosen, and
# Confirm returns to the dashboard. A record For review offers the first
# three options (rejecting asks why on reject-commitment and is final;
# later keeps it For review and notes it on the timeline). Once its
# commitment details are reviewed the planning stage options (`step:
# planning`) take their place: they set the planning application's stage
# (see records.yaml), and each shows only at the stages in its `stages`.
# A stage none lists (withdrawn) offers no options. A planning variation
# shows the new planning application reference and the original one. A
# record linked to another (a variation the developer made a commitment
# for, and the original application's) links to it; `linkedOriginal` and
# `linkedVariation` say which way. A granted outline planning application
# has an Add a reserved matters application button below its planning
# details, opening add-reserved-matters. The reserved matters saved are
# listed in the planning details.
type: custom
rows:
  - heading: Commitment details
  - include: commitment-summary
  - heading: Planning details
  - key: Planning type
    value: '{{ commitment.planningType }}'
  - key: Amendment
    value: 'Yes'
    when: { key: record.variation, truthy: true }
  - key: Planning application reference
    value: '{{ record.planningReference }}'
    when: { key: record.originalPlanningReference, falsy: true }
  - key: Amendment planning application reference
    value: '{{ record.planningReference }}'
    when: { key: record.originalPlanningReference, truthy: true }
  - key: Original planning application reference
    value: '{{ record.originalPlanningReference }}'
    when: { key: record.originalPlanningReference, truthy: true }
  - key: Linked developer record
    value: '{{ record.linkedText }}'
    when: { key: record.linkedText, truthy: true }
  - key: Planning application stage
    value: '{{ record.planningStage.label }}'
  - key: Reserved matters applications
    value: '{{ record.reservedMattersText }}'
    when: { key: record.reservedMattersText, truthy: true }
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
  # Once the commitment details are reviewed: each shows only while the
  # planning application is at one of its `stages`
  - label: Granted
    value: granted
    step: planning
    stages: [applied, under-appeal, judicial-review]
  - label: Refused
    value: refused
    step: planning
    stages: [applied, under-appeal, judicial-review]
  - label: Withdrawn
    value: withdrawn
    step: planning
    stages: [applied]
  - label: Under appeal
    value: under-appeal
    step: planning
    stages: [granted, refused]
  - label: Under judicial review
    value: judicial-review
    step: planning
    stages: [granted, refused]
errors:
  required: Select a new status for this developer record
  stageRequired: Select the stage the planning application has reached
button: Confirm
text:
  successTitle: Commitment details retrieved
  added: A new developer record has been created for review
  # A variation the developer made a commitment for; {reference} is the
  # existing developer record it is linked with
  addedLinked: A new developer record has been created for review and linked with existing developer record {reference}
  # Once a planning variation's reference is added
  variationAddedTitle: Developer record updated
  variationAdded: Amendment planning application reference added
  viewCertificate: View full certificate
  statusLegend: Have you reviewed these commitment details?
  # Once the commitment details are reviewed
  planningLegend: What stage is the planning permission at?
  # Below the planning details of a granted outline application
  addReservedMatters: Add a reserved matters application
  # In place of the radios once rejected, under its own heading
  rejectedHeading: Review options
  rejectedFinal: This developer record has been rejected. Its status cannot be changed.
  warning: Warning
  timelineHeading: Developer record history
  timelineAdded: Commitment details retrieved
  timelineStatus: Status changed to
  timelineReviewLater: Marked to review and confirm later
  timelineStage: Planning application stage changed to
  timelineVariation: Amendment added
  timelineReservedMatters: Reserved matters added
  # The success banner once reserved matters are saved on
  # add-reserved-matters; {reference} is the one just added
  reservedMattersAddedTitle: Success
  reservedMattersAdded: Reserved matters {reference} has been added to this developer record
  # After the NRL reference of a linked developer record, in brackets
  linkedOriginal: original planning application
  linkedVariation: amendment
  timelineComment: Comment
  by: by
  at: at
actions:
  - text: Manage developer records
    kind: link
    goto: dashboard
---

# {{ record.reference }}

## Red line boundary

:::map commitment.boundary os
:::
