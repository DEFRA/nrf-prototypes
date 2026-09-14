---
# Mock GOV.UK One Login, create step 4: how security codes arrive. The
# journey decides where each answer leads (text message or authenticator app).
type: radios
layout: one-login
field: security-code-method
sessionKey: securityCodeMethod
hint: You'll need to enter a security code when you sign in to GOV.UK One Login.
options:
  - label: Text message to a UK mobile phone number
    value: sms
  - label: Authenticator app
    value: app
    hint: You can use any authenticator app to create security codes when you sign in
errors:
  required: Select how you want to get security codes
button: Continue
---

# Choose how to get security codes

:::details What is an authenticator app?
An authenticator app is an app on your phone, tablet or computer that creates security codes. Common examples are Google Authenticator, Microsoft Authenticator and Authy.
:::
