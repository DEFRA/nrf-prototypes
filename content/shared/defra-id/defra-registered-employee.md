---
type: content
layout: email
title: Email sent by Defra account
---

:::inset
**To:** {{ account.email or "user@example.com" }}

**Subject:** Your registration for {{ account.businessName }} is complete
:::

# Your registration for {{ account.businessName }} is complete

Hello {{ defraName.firstName or account.fullName }},

Thank you for registering to use online services from Defra and related organisations.

Your Contact Support ID is {{ defraContactSupportId }}.

You'll need your Contact Support ID to contact Defra or related organisations about your account.

## What happens next?

We'll let {{ account.administratorName }} know that you have completed this registration process. They'll choose which information you can see and which tasks you can perform on behalf of {{ account.businessName }}.

We'll email you when everything is ready.

:::inset
**[Sign in to your account](./$next)**
:::
