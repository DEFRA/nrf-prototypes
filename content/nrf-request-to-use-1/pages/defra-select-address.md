---
# The addresses are a fixture: any postcode finds the same three
type: select
layout: defra-id
caption: Register Defra account
label: Select your address
placeholder: 3 addresses found
options:
  - label: 84 Hobson Street, Macclesfield, Cheshire, SK11 8BD
  - label: 86 Hobson Street, Macclesfield, Cheshire, SK11 8BD
  - label: Flat 2, 88 Hobson Street, Macclesfield, Cheshire, SK11 8BD
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
