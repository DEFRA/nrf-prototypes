---
# The first details of a commitment: who made it and its reference. Shown
# on "Confirm commitment details", a record's page and the full certificate,
# which lists `- include: commitment-summary` in its rows. `commitment` is
# the commitment on screen (see app/lib/lpa-manage-1/hooks.js for its fields).
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
---
