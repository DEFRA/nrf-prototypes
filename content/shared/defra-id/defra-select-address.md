---
# The addresses are a made-up fixture: any postcode finds the same five
type: select
layout: defra-id
caption: Register Defra account
label: Select your address
placeholder: 5 addresses found
options:
  - label: 1 Meadow Lane, Anytown, Countyshire, AN1 1AA
  - label: 3 Meadow Lane, Anytown, Countyshire, AN1 1AA
  - label: 5 Meadow Lane, Anytown, Countyshire, AN1 1AA
  - label: Flat 1, 7 Meadow Lane, Anytown, Countyshire, AN1 1AA
  - label: Flat 2, 7 Meadow Lane, Anytown, Countyshire, AN1 1AA
errors:
  required: Select your address
button: Continue
actions:
  - text: My address is not in this list
    kind: link
    goto: defra-address-manual
---

# Select your address

We found the following addresses for postcode **{{ defraPostcode.postcode }}**

[Change postcode](/nrf-request-to-use-1/defra-postcode)
