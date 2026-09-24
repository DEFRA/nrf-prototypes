---
# The rest of a commitment's details, after commitment-summary: only the
# full certificate (pages/certificate.md) shows them. `commitment` is the
# commitment on screen (see app/lib/lpa-manage-1/hooks.js for its fields).
rows:
  - key: Planning permission type
    value: '{{ commitment.planningType }}'
  - key: Number of housing units
    value: '{{ commitment.units }}'
  - key: Environmental Delivery Plan (EDP)
    value: '{{ commitment.edp }}'
  - key: Provisional nature restoration levy amount
    value: '£{{ commitment.levyAmount }} (excluding VAT)'
  - key: Date of issue
    value: '{{ commitment.issued }}'
  - key: Expiry date
    value: '{{ commitment.expires }}'
---
