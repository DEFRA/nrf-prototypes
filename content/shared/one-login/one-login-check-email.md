---
# Mock GOV.UK One Login, create step 2: the 6 digit code from the email. Any
# code is accepted and nothing is stored (field name starts with `_`).
type: input
layout: one-login
field: _security-code
remember: false
label: Enter the 6 digit code
width: 10
errors:
  required: Enter the security code
button: Continue
---

# Check your email

:::inset
We have sent an email to: **{{ signInEmail }}**
:::

The email contains a 6 digit security code.

Your email might take a few minutes to arrive. If you do not get an email, check your spam folder.

The code will expire after one hour.

::::after-button

:::details Problems with the code?
Check the code is entered exactly as it appears in the email. If it has expired, go back and we will send you a new one.
:::

::::
