---
# The first details of a commitment: who made it and its reference, as the
# commitment certificate gives them. Shown on a commitment's page, which
# lists `- include: commitment-summary` in its rows. `commitment` is the
# commitment on screen (see app/lib/lpa-manage-1/hooks.js for its fields).
rows:
  - key: Full name
    value: '{{ commitment.fullName }}'
  # Left out for a commitment an individual made
  - key: Business name
    value: '{{ commitment.businessName }}'
    when: { key: commitment.businessName, truthy: true }
  - key: NRL reference
    value: '{{ commitment.reference }}'
---
