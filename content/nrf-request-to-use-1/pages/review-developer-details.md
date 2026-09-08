---
type: check-answers
rows:
  - heading: Developer details
  - key: Full name
    value: '{{ developerDetails.fullName }}'
    change: developer-details
    changeHidden: the developer's full name
  - key: Address
    value:
      lines:
        - '{{ developerDetails.addressLine1 }}'
        - '{{ developerDetails.addressLine2 }}'
        - '{{ developerDetails.town }}'
        - '{{ developerDetails.county }}'
        - '{{ developerDetails.postcode }}'
    change: developer-details
    changeHidden: the developer's address
actions:
  - text: Confirm
    kind: submit
---

# Review and confirm the developer details
