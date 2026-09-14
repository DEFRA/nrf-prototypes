---
type: form
layout: defra-id
caption: Register Defra account
fields:
  - name: address-line-1
    label: Address line 1
    autocomplete: address-line1
    errors:
      required: Enter address line 1, typically the building and street
  - name: address-line-2
    label: Address line 2
    optional: true
    autocomplete: address-line2
  - name: town
    label: Town or city
    width: two-thirds
    autocomplete: address-level2
    errors:
      required: Enter town or city
  - name: county
    label: County
    optional: true
    width: two-thirds
  - name: postcode
    label: Postcode
    width: 10
    autocomplete: postal-code
    errors:
      required: Enter postcode
button: Continue
---

# What is your address?
