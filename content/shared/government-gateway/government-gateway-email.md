---
# Mock Government Gateway, create step 1. The same answer as the One Login
# sign-in email, so the journey's hooks decide the account type from it.
type: email
layout: government-gateway
field: email-address
sessionKey: signInEmail
label: Email address
errors:
  required: Enter your email address
  format: Enter an email address in the correct format, like name@example.com
button: Continue
---

# Enter your email address

This will only be used to send you security updates or if you need to recover your sign in details.

To confirm it is your email address we will send you a code.

:::after-button

[Get help with this page](#)

:::
