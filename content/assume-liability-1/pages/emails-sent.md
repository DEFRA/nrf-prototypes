---
# PLACEHOLDER COPY
type: confirmation
title: Emails sent
panel:
  title: Emails sent
actions:
  - text: Continue
    goto: assumption-document
---

## What happens next

We have sent an email to:

:::each person in liablePeople

- {{ person.email }}

:::

Lorem ipsum dolor sit amet, consectetur adipiscing elit. You can see who has signed on the assumption of liability document.
