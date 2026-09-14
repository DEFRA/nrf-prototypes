---
# Mock Government Gateway sign in. Any user ID and password are accepted and
# nothing is stored (`remember: false`, field names start with `_`); the
# journey's hook reads the user ID to decide the mock account type, the way
# the One Login email does. "Create sign in details" starts the create flow.
type: form
layout: government-gateway
remember: false
fields:
  - name: _user-id
    label: Government Gateway user ID
    hint: This could be up to 12 characters.
    width: 20
    autocomplete: username
    errors:
      required: Enter your Government Gateway user ID
  - name: _password
    type: password
    label: Password
    autocomplete: current-password
    errors:
      required: Enter your password
button: Sign in
---

:::notification Keeping your information secure
Do not share your Government Gateway user ID and password with anyone else.
:::

# Sign in using Government Gateway

:::after-button

## New users of Government Gateway

[Create sign in details](./government-gateway-email)

## Problems signing in

[I have forgotten my password](#)\
[I have forgotten my Government Gateway user ID](#)\
[I have forgotten my Government Gateway user ID and password](#)

[Get help with this page](#)

:::
