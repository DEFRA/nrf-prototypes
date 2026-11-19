---
# PLACEHOLDER COPY: a quote from "Your quotes and commitments" on Manage the
# nature restoration levy (quote-details?ref=NRL-456789). The details come
# from records.yaml; Delete leaves for the quote journey's "Are you sure you
# want to delete this quote?", whose Back and Cancel return here.
type: check-answers
serviceName: Manage the nature restoration levy
caption: Quote
title: Quote {{ quote.reference }}
rows:
  - heading: Levy
  - key: Levy amount
    value: '£{{ quote.levyAmount }}'
  - key: Environmental Delivery Plan
    value: '{{ quote.edp }}'
  - key: Quote date
    value: '{{ quote.created }}'
  - heading: Development details
  - key: Development
    value: '{{ quote.site }}'
  - key: Planning type
    value: '{{ quote.planningType }}'
  - key: Number of units
    value: '{{ quote.units }}'
actions:
  - text: Request to use the nature restoration levy
    kind: submit
    goto: /assume-liability-1/quote-details/request-to-use
  - text: Delete this quote
    kind: destructive
    goto: /nrf-quote-7-1/delete-quote
    return: quote-details
---

# {{ quote.reference }}

## Red line boundary

:::map quote.boundary
:::
