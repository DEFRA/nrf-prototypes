---
# Mock GOV.UK One Login, authenticator app branch. The QR code is a
# placeholder image and any code is accepted; nothing is stored.
type: input
layout: one-login
field: _security-code
remember: false
label: Enter the code
hint: This is the 6-digit number shown in your authenticator app
width: 10
errors:
  required: Enter the security code shown in your authenticator app
button: Continue
actions:
  - text: Choose another way to get security codes
    kind: link
    goto: one-login-security-codes
---

# Set up an authenticator app

1. Open your authenticator app on your smartphone, tablet or computer.

:::details I don't have an authenticator app
You can download one from your device's app store. Common examples are Google Authenticator, Microsoft Authenticator and Authy.
:::

2. Use your authenticator app to scan the QR code.

![QR code to scan with your authenticator app](/public/images/one-login-qr-code.svg)

:::details I cannot scan the QR code
Enter this secret key into your authenticator app instead: **ABCD EFGH IJKL MNOP**
:::

3. The authenticator app will show a security code.

4. Enter the code.
