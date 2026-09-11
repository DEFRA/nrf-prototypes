---
# Mock GOV.UK One Login, step 0: create an account or sign in. Shared by
# every journey that signs the user in: list it with `shared: true` and send
# both buttons on to one-login-email in journey.yaml (the prototype never
# tells the two apart).
type: content
layout: one-login
actions:
  - text: Create your GOV.UK One Login
    kind: submit
  - text: Sign in
    kind: secondary
---

# Create your GOV.UK One Login or sign in

You can use your GOV.UK One Login to access some government services.

In the future, you'll be able to use it to access all services on GOV.UK.

You'll need:

- an email address
- a way to get security codes - this can be a UK mobile phone number or an authenticator app

:::inset
You can also [use GOV.UK One Login in Welsh (Cymraeg)](#).
:::

[Services you can use with GOV.UK One Login (opens in new tab)](#)
