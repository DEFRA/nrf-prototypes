---
# PLACEHOLDER COPY: a commitment from "Your quotes and commitments" on
# Manage the nature restoration levy (commitment-details?ref=NRL-567890),
# drawn by app/views/assume-liability-1/commitment-details.html. The
# details come from records.yaml. The heading carries the commitment's tag,
# as on the table; near its expiry date, past it or once cancelled a
# warning shows under the heading, and an expired or cancelled commitment
# has no Cancel link.
type: check-answers
caption: Commitment
title: Commitment {{ commitment.reference }}
rows:
  - heading: Levy
  - key: Levy amount
    value: '£{{ commitment.levyAmount }}'
  - key: Environmental Delivery Plan
    value: '{{ commitment.edp }}'
  - key: Commitment issued
    value: '{{ commitment.issued }}'
  - key: Commitment expires
    value: '{{ commitment.expires }}'
  - key: Commitment cancelled
    value: '{{ commitment.cancelledOn }}'
    when: { key: commitment.status, equals: cancelled }
  - key: Reason for cancelling
    value: '{{ commitment.cancelReason }}'
    when: { key: commitment.status, equals: cancelled }
  - heading: Development details
  - key: Development
    value: '{{ commitment.site }}'
  - key: Planning type
    value: '{{ commitment.planningType }}'
  - key: Number of units
    value: '{{ commitment.units }}'
actions:
  - text: View commitment certificate
    kind: submit
    goto: /assume-liability-1/view-commitment-certificate?_from=commitment-details
  - text: Cancel this commitment
    kind: destructive
    goto: cancel-commitment
text:
  # The tag beside the heading, as in the table's Status column
  tags:
    active: Active
    expiring: Expires soon
    expired: Expired
    cancelled: Cancelled
  # Under the heading; {date} is the expiry date, or the date it was
  # cancelled
  expiring: This commitment expires on {date}, unless a planning application is made before then.
  expired: This commitment expired on {date}. You cannot use it with a planning application. Get a new quote if you still want to use the nature restoration levy for this development.
  cancelled: This commitment was cancelled on {date}. You cannot use it with a planning application.
---

# {{ commitment.reference }}

## Red line boundary

:::map commitment.boundary
:::
