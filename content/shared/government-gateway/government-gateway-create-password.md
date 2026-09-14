---
# Mock Government Gateway, create step 5. Any password is accepted and
# nothing is stored.
type: form
layout: government-gateway
remember: false
fields:
  - name: _password
    type: password
    label: Password
    autocomplete: new-password
    errors:
      required: Enter a password
  - name: _password-confirm
    type: password
    label: Confirm your password
    autocomplete: new-password
    errors:
      required: Confirm your password
button: Confirm
---

# Create a password

Your password needs to be 10 or more characters. To help you create a long and strong password, the National Cyber Security Centre recommends using three random words.

You can use a mix of letters, numbers or symbols in these three random words.

:::after-button

[Get help with this page](#)

:::
