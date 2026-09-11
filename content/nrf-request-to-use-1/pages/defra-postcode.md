---
type: form
layout: defra-id
caption: Register Defra account
fields:
  - name: postcode
    label: Postcode
    width: 10
    autocomplete: postal-code
    errors:
      required: Enter your postcode
button: Find address
actions:
  - text: Enter the address manually
    kind: link
    goto: defra-address-manual
---

# What is your address?

If you cannot find your address or you need to add a non-UK address you can add it manually below.
