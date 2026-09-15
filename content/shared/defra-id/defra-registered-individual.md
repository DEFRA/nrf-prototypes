---
type: content
layout: email
title: Email sent by Defra account
---

:::inset
**To:** {{ account.email or "user@example.com" }}

**Subject:** You're now registered to use Defra online services
:::

# You're now registered to use Defra online services

Hello {{ defraName.firstName or account.fullName }},

Thank you for registering to use Defra online services.

Your Contact Support ID is {{ defraContactSupportId }}.

You'll need your Contact Support ID to contact Defra or related organisations about your account.

You can use this account to register for other services from Defra and its related organisations.

:::inset
**[Sign in to your account](./$next)**
:::

[Privacy notice](#)
