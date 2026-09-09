---
# Mock GOV.UK One Login, step 1. Shared by every journey that signs the user
# in: list it with `shared: true` and decide where it leads in journey.yaml.
# The email decides the mock account type in the journey's hooks.
type: email
layout: one-login
title: Enter your email address to sign in to your GOV.UK One Login
field: one-login-email
sessionKey: signInEmail
errors:
  required: Enter your email address
  format: Enter an email address in the correct format, like name@example.com
button: Continue
---

# Enter your email address to sign in to your GOV.UK One Login
