---
# Defra ID's "Who do you want to represent?": the organisations the
# developer's Defra account is linked to. The first is the research
# participant's own organisation, as the facilitator typed it into the
# footer's "Participant details" box, or the stand-in until one is given.
# The one chosen shows in the header with a Change organisation link back
# here, and is the developer on the user's own records (see
# app/lib/assume-liability-1/hooks.js).
type: radios
layout: defra-id
options:
  - label: '{{ researchParticipant.organisation or "Fenland Homes" }}'
    value: participant
  - label: Greenfield Developments Ltd
    value: greenfield
  - label: Oakwood Homes
    value: oakwood
errors:
  required: Select who you want to represent
button: Continue
---

# Who do you want to represent?
