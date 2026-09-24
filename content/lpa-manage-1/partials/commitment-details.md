---
# The details of a commitment, shown on "Confirm commitment details", "Check
# your answers" and a record's page. Those pages list `- include:
# commitment-details` in their rows. `commitment` is the commitment on
# screen (see app/lib/lpa-manage-1/hooks.js for its fields).
rows:
  - key: NRL reference
    value: '{{ commitment.reference }}'
  - key: Developer
    value: '{{ commitment.developer }}'
  - key: Developer address
    value:
      lines:
        - '{{ commitment.address.line1 }}'
        - '{{ commitment.address.line2 }}'
        - '{{ commitment.address.line3 }}'
        - '{{ commitment.address.line4 }}'
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
