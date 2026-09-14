---
# Mock GOV.UK One Login, create step 1: the email address the account is
# made with. It is the same answer as the sign-in email, so the journey's
# hooks decide the account type from it in the same way.
type: email
layout: one-login
field: one-login-email
sessionKey: signInEmail
errors:
  required: Enter your email address
  format: Enter an email address in the correct format, like name@example.com
button: Continue
---

# Enter your email address

### Agree to the GOV.UK One Login terms and conditions

By continuing, you confirm that you agree to our [terms and conditions (opens in a new tab)](#).

To find out how we use your personal information, see our [privacy notice (opens in a new tab)](#).
