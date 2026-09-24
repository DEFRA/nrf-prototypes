---
type: check-answers
rows:
  - heading: Commitment details
  - include: commitment-details
  - heading: Planning application
  - key: Planning application reference
    value: '{{ planningReference }}'
    change: planning-reference
    changeHidden: planning application reference
options:
  - label: I confirm the commitment details and planning application reference are correct
    value: 'Yes'
errors:
  required: Confirm the commitment details and planning application reference are correct
actions:
  - text: Add record
---

# Check your answers

## Red line boundary

:::map commitment.boundary os
:::
