---
variant: Add reserved matters in a drawer
sample: outline # the wall shows it with this sample record (journey.yaml)
# Copy variant of view-record.md: a button opens the form in a panel that
# slides in from the right, with Cancel beside Save. See content/README.md
# "Trying out variations of a page".
#
# A developer record (app/views/lpa-manage-1/view-record.html). The heading
# is the record's NRL reference; `text:` holds the rest of the page's words.
# The review options sit at the bottom of the page, none chosen, and
# Confirm returns to the dashboard. A record For review offers the first
# three options (rejecting asks why on reject-commitment and is final;
# later keeps it For review and notes it on the timeline). Once its
# commitment details are reviewed the planning stage options (`step:
# planning`) take their place: they set the planning application's stage
# (see records.yaml). A planning variation shows the new planning
# application reference and the original one. A record linked to another
# (a variation the developer made a commitment for, and the original
# application's) links to it; `linkedOriginal` and `linkedVariation` say
# which way. An outline planning application that has been granted has an
# "Outline application" section below the history: the Add reserved
# matters details opens a small form (reference, status, short
# description); each one saved joins the planning details and the details
# closes again. Its status radios are the planning stages in records.yaml.
# `reservedMattersLayout` picks how the form is offered; the copy variants
# view-record~<name>.md try the others (modal, drawer, inline, cards).
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
    when: { key: record.originalPlanningReference, truthy: true }
  - key: Linked developer record
    value: '{{ record.linkedText }}'
    when: { key: record.linkedText, truthy: true }
  - key: Planning application stage
    value: '{{ record.planningStage.label }}'
  - key: Reserved matters
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
  # The reserved matters form
  reservedMattersReferenceRequired: Enter the reserved matters reference number
  reservedMattersReferenceAdded: This reference has already been added to this developer record
  reservedMattersStatusRequired: Select the status of the reserved matters application
  reservedMattersDescriptionRequired: Enter a short description of the reserved matters
  reservedMattersDescriptionTooLong: Description must be 200 characters or fewer
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
  timelineReservedMatters: Reserved matters added
  # Below the history once an outline application is granted.
  # reservedMattersLayout: details, modal, drawer, inline or cards
  reservedMattersLayout: drawer
  outlineHeading: Outline application
  addReservedMatters: Add reserved matters
  reservedMattersReferenceLabel: Reference number
  reservedMattersStatusLegend: Status
  reservedMattersDescriptionLabel: Short description
  reservedMattersSave: Save reserved matters
  reservedMattersCancel: Cancel
  # The success banner once saved; {reference} is the one just added
  reservedMattersAddedTitle: Success
  reservedMattersAdded: Reserved matters {reference} has been added to this developer record
  # After the NRL reference of a linked developer record, in brackets
  linkedOriginal: original planning application
  linkedVariation: planning variation
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
