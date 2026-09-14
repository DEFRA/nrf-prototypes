---
# Mock GOV.UK One Login, create step 3. Any password is accepted and nothing
# is stored: the field names start with `_` so the kit never copies them
# into the session, and `remember: false` keeps the engine from doing so.
type: form
layout: one-login
remember: false
fields:
  - name: _password
    type: password
    label: Enter a password
    hint: It must be at least 8 characters and must include letters and numbers. Do not use a very common password, such as 'password' or a sequence of numbers.
    autocomplete: new-password
    errors:
      required: Enter a password
  - name: _password-confirm
    type: password
    label: Re-type password
    autocomplete: new-password
    errors:
      required: Re-type your password
button: Continue
---

# Create your password

::::after-button

:::details How to create a secure password
A good way to create a secure and memorable password is to use 3 random words. You can add numbers and symbols if you need to.
:::

::::
