---
type: checkboxes
# The terms sit between the heading and the checkbox
bodyFirst: true
options:
  - label: I confirm that I have read and agree to these terms
errors:
  required: Select the box to confirm you agree to the terms
button: Continue
actions:
  - text: Delete quote
    kind: destructive
    goto: /nrf-quote-7/delete-quote
    return: agreement
    hidden: quote details
---

# Agree to the terms of using the nature restoration levy

By requesting to use the nature restoration levy, you agree that:

- test
- test

If you do not agree, you can delete your quote details instead.
