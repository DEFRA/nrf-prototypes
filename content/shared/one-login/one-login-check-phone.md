---
# Mock GOV.UK One Login, text message branch (not in the designs). Any code
# is accepted and nothing is stored.
type: input
layout: one-login
field: _security-code
remember: false
label: Enter the 6 digit security code
width: 10
errors:
  required: Enter the security code
button: Continue
---

# Check your phone

We sent a code to **{{ mobileNumber }}**.

The code will expire after 15 minutes.

::::after-button

:::details Problems with the code?
Check the code is entered exactly as it appears in the text message. If it has expired, go back and we will send you a new one.
:::

::::
