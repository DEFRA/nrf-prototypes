---
type: check-answers
rows:
  - heading: Your details
  - key: Full name
    value: '{{ account.fullName }}'
  - key: Business name
    value: '{{ account.businessName or "Not applicable" }}'
  - key: Address
    value:
      lines:
        - '{{ yourAddress.addressLine1 }}'
        - '{{ yourAddress.addressLine2 }}'
        - '{{ yourAddress.town }}'
        - '{{ yourAddress.county }}'
        - '{{ yourAddress.postcode }}'
    change: your-address
    changeHidden: your address
actions:
  - text: Confirm
    kind: submit
---

# Review and confirm your details
