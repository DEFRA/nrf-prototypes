---
# A developer record (app/views/lpa-manage-1/view-record.html). The heading
# is the record's NRL reference; `text:` holds the rest of the page's words.
type: custom
rows:
  - heading: Commitment details
  - include: commitment-details
  - heading: Planning application
  - key: Planning application reference
    value: '{{ record.planningReference }}'
  - key: Added by
    value: '{{ record.officer }}'
  - key: Reviewed by
    value:
      when: { key: record.reviewedBy, truthy: true }
      then: '{{ record.reviewedBy }}'
      else: Not reviewed yet
text:
  successTitle: Success
  added: Record added
  statusChanged: Status updated
  changeStatus: Change status
  timelineHeading: Audit timeline
  timelineAdded: Record added
  timelineStatus: Status changed to
  by: by
  at: at
  cancel: Cancel
actions:
  - text: Add another record
    goto: retrieve-commitment
  - text: Back to dashboard
    kind: secondary
    goto: dashboard
---

# {{ record.reference }}

## Red line boundary

:::map commitment.boundary os
:::
