---
type: radios
layout: defra-id
# A Defra ID page: the organisations the agent's Defra account is linked
# to. The first three are made up. The last is the research participant's
# own organisation, as the facilitator typed it into the footer's
# "Participant details" box, or the stand-in until one is given. The choice
# goes into the header's organisation bar and the developer details (see
# app/lib/nrf-request-to-use-1/hooks.js).
options:
  - label: Greenfield Developments Ltd
    value: greenfield
  - label: Oakwood Homes
    value: oakwood
  - label: Riverside Land Partners LLP
    value: riverside
  - label: '{{ researchParticipant.organisation or "Organisation name" }}'
    value: participant
errors:
  required: Select who you want to represent
button: Continue
---

# Who do you want to represent?
