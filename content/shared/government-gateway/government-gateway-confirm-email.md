---
# Mock Government Gateway, create step 2. Any code is accepted and nothing is
# stored.
type: input
layout: government-gateway
field: _confirmation-code
remember: false
label: Confirmation code
hint: For example, DNCLRK
width: 10
errors:
  required: Enter the confirmation code
button: Confirm
---

# Enter code to confirm your email address

We have sent a code to: **{{ signInEmail }}**

The code will expire in 30 minutes.

:::warning
If you use a browser to access your email, you may need to open a new window or tab to see the code.
:::

::::after-button

:::details I have not received the email
The email can take a few minutes to arrive. Check your spam folder. If it has not arrived after 30 minutes, go back and we will send you a new code.
:::

[Get help with this page](#)

::::
