---
type: checkboxes
# The terms sit between the heading and the checkbox
bodyFirst: true
options:
  - label: I confirm that I have read and agree to the terms of this declaration
errors:
  required: Tick the box to confirm you agree to the declaration
button: Continue
actions:
  - text: Delete quote
    kind: destructive
    goto: /nrf-quote-7/delete-quote
    return: agreement
    hidden: quote details
---

# Declaration

By requesting to use the nature restoration levy, you agree that:

- the information I have provided is true and correct to the best of my knowledge
- I will inform Natural England if any of the details I have provided change

If you do not agree and confirm, you can delete your quote details.
