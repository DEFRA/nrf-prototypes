# Create NRF Payment journey with reference in GOV.UK Prototype Kit

## Journey Information

- **Journey Name**: Pay Nature Restoration Fund Levy
- **Journey Description**:  
  A user journey for a developer to pay for the Nature Restoration Fund levy required when submitting planning permission to build a development of some sort.
- **Journey Route Prefix**: nrf-estimate-4
- **Start Page Title**: Pay Nature Restoration Fund Levy
- **Integration Point**: This journey starts from `/nrf-estimate-4/what-would-you-like-to-do` when the user selects "I am ready to pay the Nature Restoration Fund levy"

## Page Flow and Conditional Logic

### How do you want to sign in?

| **Field**              | **Value**                                         |
| ---------------------- | ------------------------------------------------- |
| Order number:          | 3                                                 |
| Path:                  | /nrf-estimate-4/pay-how-would-you-like-to-sign-in |
| Title:                 | How would you like to sign in?                    |
| Conditional page flow: | none                                              |

#### Data points

```
{
    data: {
        signInOption: {
            type: radios,
            required: true,
            values: "Sign in with GOV UK One Login" | "Sign in with Government Gateway",
            fieldName: "sign-in-option"
        }
    }
}
```

#### Content

```
# How would you like to sign in?
- Sign in with GOV UK One Login
Hint text: Use your email address and password. If you don't have a GOV.UK One Login, you can create one.
- Sign in with Government Gateway
 Hint text: You'll have a user ID if you've registered for Self Assessment or filed a tax return online before.
```

#### Errors

| **Field**      | **Value**                                                         |
| -------------- | ----------------------------------------------------------------- |
| Description:   | User has selected ‘Continue’ without choosing an option           |
| Error summary: | There is a problem                                                |
| Error message: | Select if you want to log in with One Login or Government Gateway |
|                |                                                                   |

---

### Sign in Government Gateway

| **Field**              | **Value**                                      |
| ---------------------- | ---------------------------------------------- |
| Order number:          | 4                                              |
| Path:                  | /nrf-estimate-4/pay-sign-in-government-gateway |
| Title:                 | Sign in using Government Gateway               |
| H1 heading:            | Sign in using Government Gateway               |
| Conditional page flow: | None                                           |

#### Data points

```
{
    data: {
        payGovernmentGatewayUserId: {
            type: text,
            required: true,
            fieldName: "userId"
        },
        governmentGatewayPassword: {
            type: text,
            required: true,
            fieldName: "password"
        }
    }
}
```

#### Content

```
# Sign in using Government Gateway

Government Gateway user ID
Hint text: This could be up to 12 characters.
Field name: userId

Password
Field name: password
Grey CTA: Show

CTA: Sign in

## New users of Government Gateway
Link

## Problems signing in

[I have forgotten my password](javascript:void(0))
[I have forgotten my Government Gateway user ID](javascript:void(0))
[I have forgotten my Government Gateway user ID and password](javascript:void(0))

[Get help with this page](javascript:void(0))

```

#### Errors

| **Field**      | **Value**                                                |
| -------------- | -------------------------------------------------------- |
| Description:   | User has selected 'Continue' without entering a user ID  |
| Error summary: | There is a problem                                       |
| Error message: | Enter your Government Gateway user ID                    |
| Description:   | User has selected 'Continue' without entering a password |
| Error summary: | There is a problem                                       |
| Error message: | Enter your password                                      |

---

### Check your answers summary

| **Field**              | **Value**                       |
| ---------------------- | ------------------------------- |
| Order number:          | 5                               |
| Path:                  | /nrf-estimate-4/payment-summary |
| Title:                 | Check your answers              |
| Conditional page flow: | None                            |

#### Data points

None

#### Content

```
# Your commitment details

| Red line boundary | [Show Added or Not added] | [Change](/nrf-estimate-4/map?nav=check-your-answers) or [Change](/nrf-estimate-4/upload-redline?change=true&nav=check-your-answers) as appropriate |
| Development types | [List selected types, e.g. Housing, Other residential] | [Change](/nrf-estimate-4/building-type?change=true&nav=check-your-answers) |
| [IF user selected "Housing" THEN show] Number of residential units | [show data.residentialBuildingCount] | [Change](/nrf-estimate-4/residential?change=true&nav=check-your-answers) |
| [IF user selected "Other residential" THEN show] Maximum number of people | [show data.peopleCount] | [Change](/nrf-estimate-4/people-count?change=true&nav=check-your-answers) |
| Waste water treatment works | [show data.wasteWaterTreatmentWorks] | [Change](/nrf-estimate-4/waste-water?change=true&nav=check-your-answers) |
| Email address | [show data.email] | [Change](/nrf-estimate-4/estimate-email?change=true&nav=check-your-answers) |
| Your details | [show full name, business name if provided, address, Company Registration Number and VAT registration number] | [Change](/nrf-estimate-4/company-details?change=true&nav=check-your-answers) |

Primary button: Continue
Secondary button (red): Delete (link to /nrf-estimate-4/delete-summary)

Note: This page uses the GOV.UK summary list component with H1 "Your commitment details". Change links are disabled (javascript:void(0)) as this is a read-only summary of retrieved commitment data.
```

#### Errors

None

---

### Are you sure you want to delete this commitment?

| **Field**              | **Value**                                                                   |
| ---------------------- | --------------------------------------------------------------------------- |
| Order number:          | 5.1                                                                         |
| Path:                  | /nrf-estimate-4/delete-summary                                              |
| Title:                 | Are you sure you want to delete this commitment?                            |
| Conditional page flow: | display if user clicks the delete button on /nrf-estimate-4/payment-summary |

#### Data points

```
{
    data: {
        confirmDeleteQuote: {
            type: radios,
            required: conditional - required if user clicked delete on payment-summary,
            values: "Yes" | "No",
            fieldName: "confirm-delete-summary"
        }
    }
}
```

#### Content

```
# Are you sure you want to delete this commitment?
This will permanently delete your commitment. You can create a new quote. 

Button: Yes
Secondary button: No
```


---

### Delete confirmation page

| **Field**              | **Value**                                  |
| ---------------------- | ------------------------------------------ |
| Order number:          | 5.2                                        |
| Path:                  | /nrf-estimate-4/delete-confirmation |
| Title:                 | Your details have been deleted             |
| Data points:           | None                                       |
| Conditional page flow: | None                                       |

#### Content

```

<green-banner>
# Your details have been deleted
</green-banner>

Note: This page uses the GOV.UK panel component (govuk-panel--confirmation) to display the green banner. The page conditionally displays different content based on journey type (estimate, commit, or payment). For the estimate journey, it shows:

## What happens next

Your commitment details have been removed and deleted.
[Get another quote](/nrf-estimate-4/start)

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the NRF reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

[Find out about call charges](https://www.gov.uk/call-charges)

```

#### Errors

None


---

### Planning ref entry

| **Field**              | **Value**                                 |     |
| ---------------------- | ----------------------------------------- | --- |
| Order number:          | 6                                         |     |
| Path:                  | /nrf-estimate-4/planning-ref              |     |
| Title:                 | Enter your planning application reference |     |
| Conditional page flow: | None                                      |     |

#### Data points

```
{
    data: {
        planningRef: {
            type: text,
            required: true,
            fieldName: "planning-ref"
        }
    }
}
```

#### Content

```

# Enter your planning application reference

Hint text: Enter the reference of the planning application that you want to pay the Nature Restoration Fund levy for

Note: The implementation includes an inset showing Local Planning Authority (e.g. Stockton-on-Tees Borough Council).

```

#### Errors

| **Field**      | **Value**                                                 |
| -------------- | --------------------------------------------------------- |
| Description:   | User has selected 'Continue' without entering any details |
| Error summary: | There is a problem                                        |
| Error message: | Enter the planning application reference                  |

---

### Waste water treatment works entry

| **Field**              | **Value**                                                                                         |     |
| ---------------------- | ------------------------------------------------------------------------------------------------- | --- |
| Order number:          | 7                                                                                                 |     |
| Path:                  | /nrf-estimate-4/wwtw-entry                                                                        |     |
| Title:                 | Enter which waste water treatment works will be used for this development                         |     |
| Conditional page flow: | display when data.wasteWaterTreatmentWorks === "I don't know the waste water treatment works yet" |     |

#### Data points

```
{
    data: {
        wasteWaterTreatmentWorks: {
            type: text,
            required: true,
            fieldName: "waste-water-treatment-works"
        }
    }
}
```

#### Content

```

# Enter which waste water treatment works will be used for this development

Button: Continue

```

#### Errors

| **Field**      | **Value**                                                  |
| -------------- | ---------------------------------------------------------- |
| Description:   | User has selected 'Continue' without entering any details  |
| Error summary: | There is a problem                                         |
| Error message: | Enter the waste water treatment works for this development |

---
### Check your answers summary declaration and submit

| **Field**              | **Value**                           |
| ---------------------- | ----------------------------------- |
| Order number:          | 7                                   |
| Path:                  | /nrf-estimate-4/payment-declaration |
| Title:                 | Check your answers                  |
| Conditional page flow: | None                                |

#### Data points

None

#### Content

```
# Check your answers

| NRF reference | {{ data.paymentReference }} (if provided) | [Change link - disabled] |
| Red line boundary added | Yes/No (based on data.redlineBoundaryPolygon) | [Change link - disabled] |
| Red line boundary file uploaded | Yes/No (based on data.hasRedlineBoundaryFile) | [Change link - disabled] |
| Development types | [List selected types, e.g. Housing, Other residential] | [Change](/nrf-estimate-4/building-type?change=true&nav=check-your-answers) |
| [IF user selected "Housing" THEN show] Number of residential units | [show data.residentialBuildingCount] | [Change](/nrf-estimate-4/residential?change=true&nav=check-your-answers) |
| [IF user selected "Other residential" THEN show] Maximum number of people | [show data.peopleCount] | [Change](/nrf-estimate-4/people-count?change=true&nav=check-your-answers) |
| Waste water treatment works | [show data.wasteWaterTreatmentWorks] | [Change](/nrf-estimate-4/waste-water?change=true&nav=check-your-answers) |
| Email address | {{ data.commitmentRetrievalEmail or data.email or 'Not provided' }} | [Change link - disabled] |
| Your details | Full name, business name if provided, address, Company Registration Number and VAT registration number | [Change link - disabled] |
| Planning reference | {{ data.planningRef }} | [Change link - disabled] |
| Local Planning Authority | Stockton-on-Tees Borough Council | 

By confirming and submitting these details, you are requesting to pay the Nature Restoration Fund levy.

The details you are submitting must be accurate and correct.

Once the Local Planning Authority has checked and approved your request, you will be asked to upload your Planning Decision Notice. You will then be sent an email with ways to pay.

Once you have paid, you will then receive a receipt and you can use it to discharge your environmental obligations.

Your Nature Restoration Fund nutrient levy amount is £{{ data.levyAmount or '2,500' }}.

Primary button: Confirm and submit
Secondary button (red): Delete (link to /nrf-estimate-4/delete-payment-details)

Note: This page uses the GOV.UK summary list component (payment-declaration). Change links are disabled. The declaration text is displayed as separate paragraphs before the submit button. Implementation includes a "Cancel action" secondary button.
```

#### Errors

None


---

### Are you sure you want to delete these details?

| **Field**              | **Value**                                                                       |
| ---------------------- | ------------------------------------------------------------------------------- |
| Order number:          | 7.1                                                                             |
| Path:                  | /nrf-estimate-4/delete-payment-details                                          |
| Title:                 | Are you sure you want to delete these details?                                  |
| Conditional page flow: | display if user clicks the delete button on /nrf-estimate-4/payment-declaration |

#### Data points

```
{
    data: {
        confirmDeleteQuote: {
            type: radios,
            required: conditional - required if user clicked delete on payment-declaration,
            values: "Yes" | "No",
            fieldName: "confirm-delete-payment-declaration"
        }
    }
}
```

#### Content

```
# Are you sure you want to delete these details?
This will permanently delete your details. You can create a new quote. 

Button: Yes
Secondary button: No
```


---

### Delete confirmation page

| **Field**              | **Value**                           |
| ---------------------- | ----------------------------------- |
| Order number:          | 7.2                                 |
| Path:                  | /nrf-estimate-4/delete-confirmation |
| Title:                 | Your details have been deleted      |
| Data points:           | None                                |
| Conditional page flow: | None                                |

#### Content

```

<green-banner>
# Your details have been deleted
</green-banner>

Note: This page uses the GOV.UK panel component (govuk-panel--confirmation) to display the green banner. The page conditionally displays different content based on journey type (estimate, commit, or payment). For the estimate journey, it shows:

## What happens next

Your details have been removed and deleted.
[Get another quote](/nrf-estimate-4/start)

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the NRF reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

[Find out about call charges](https://www.gov.uk/call-charges)

```

#### Errors

None

---

### Details submitted confirmation page

| **Field**             | **Value**                            |
| --------------------- | ------------------------------------ |
| Order number:         | 8                                    |
| Path:                 | /nrf-estimate-4/payment-confirmation |
| Title:                | Your details have been submitted     |
| Data points:          | None                                 |
| Conditional page flow: | None                                 |

#### Content

```
<green-banner>
# Your details have been submitted.

**NRF reference:** {{ data.paymentReference }}
</green-banner>

Note: The H1 heading includes a period: "Your details have been submitted." This page uses the GOV.UK panel component (govuk-panel--confirmation) to display the green banner. The payment reference label is displayed in bold in the panel body.

## What happens next

Your Local Planning Authority will review your request to pay.
Once they have approved it, you will receive an email with a link to upload your Planning Decision Notice. You will receive this email within 00 days.

You told us the development:

- is planned in {{ data.redlineBoundaryPolygon.intersectingCatchment or data.intersectingCatchment or 'Thames Valley EDP' }}
- has [dynamically constructed list based on building types selected, e.g., "Housing with 6 residential units and a development with a maximum number of 80 people" or "Housing with a total of 5 residential units"]
- has waste water works in {{'Great Billing WRC' }}

Note: The building description is currently hardcoded in the implementation. The instructions describe it as dynamically generated, but the implementation shows a static example.

## What you need to pay

Based on the information you have provided, the development falls into the area for the Nature Restoration Fund Nutrients levy.

The total amount you need to pay is:

**£{{ data.levyAmount or '2,500' }}**

Note: The levy amount is displayed as a separate paragraph with bold formatting.

## What your levy will pay for

Your levy will be spent on conservation, with amounts being spent on monitoring and maintenance. There will also be an admin charge of £00 taken from the levy payment.

Levies are calculated as part of Environmental Delivery Plans (EDPs).

## Get help with Nature Restoration Fund
If you need help with Nature Restoration Fund, contact XXXX and give the NRF reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

[Find out about call charges](https://www.gov.uk/call-charges)

[View the approval email content](/nrf-estimate-4/payment-request-email-content)
[View the reject email content](/nrf-estimate-4/reject-email-content)
```

**Note:** The confirmation page uses conditional rendering based on `data.paymentReference` to display different content for payment journey vs estimate/commit journeys. The payment journey content is shown when `data.paymentReference` exists. The page uses the GOV.UK panel component (govuk-panel--confirmation) to display the green banner.

#### Errors

None

---

### Email sent from the Nature Restoration Fund service

| **Field**             | **Value**                                           |
| --------------------- | --------------------------------------------------- |
| Order number:         | 9                                                   |
| Path:                 | /nrf-estimate-4/payment-request-email-content       |
| Title:                | Email sent from the Nature Restoration Fund service |
| Data points:          | None                                                |
| Conditional page flow: | None                                                |

#### Content

```
<inset-text>
**To:** {{ data.commitmentRetrievalEmail or data.email or 'user@example.com' }}
**Subject:** Nature Restoration Fund – payment request approved for the Nature Restoration Fund levy
</inset-text>

Note: This page uses the GOV.UK inset text component (govuk-inset-text) to display the email header information.

# Nature Restoration Fund – payment request approved for the Nature Restoration Fund levy

**NRF reference:** {{ data.paymentReference }}

Note: The NRF reference is displayed as a paragraph with bold formatting, not as a heading.

Thank you for using Nature Restoration Fund levy to mitigate your environmental impact.
The Local Planning Authority has approved your request to pay.
Access your account and upload your Planning Decision Notice to receive a payment email with ways you can pay.

[Upload your Planning Decision Notice](/nrf-estimate-4/pdn-how-would-you-like-to-sign-in)

You have agreed to pay the following:

Nature Restoration Fund nutrients levy: £{{ data.levyAmount or '2,500' }}

Note: The levy amount is displayed as a separate paragraph.

Your levy will be spent on conservation, with amounts being spent on monitoring and maintenance. There will also be an admin charge of £00 taken from the levy payment. Levies are calculated as part of Environmental Delivery Plans (EDPs).

## What happens next

Once you have paid, you will be sent an email with a receipt which you can use as evidence for your planning application to discharge your obligation.

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the NRF reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

[Find out about call charges](https://www.gov.uk/call-charges)
```

---


### Email sent from the Nature Restoration Fund service - LPA reject

| **Field**             | **Value**                                           |
| --------------------- | --------------------------------------------------- |
| Order number:         | 9.1                                                 |
| Path:                 | /nrf-estimate-4/reject-email-content                |
| Title:                | Email sent from the Nature Restoration Fund service |
| Data points:          | None                                                |
| Conditional page flow: | None                                                |

#### Content

```
<inset-text>
**To:** {{ data.commitmentRetrievalEmail or data.email or 'user@example.com' }}
**Subject:** Nature Restoration Fund – payment request rejected for the Nature Restoration Fund levy
</inset-text>

Note: This page uses the GOV.UK inset text component (govuk-inset-text) to display the email header information.

# Nature Restoration Fund – payment request rejected for the Nature Restoration Fund levy

**NRF reference:** {{ data.paymentReference }}

Note: The NRF reference is displayed as a paragraph with bold formatting, not as a heading.

The Local Planning Authority has rejected your request to pay.
Access your account and review the reason given. You will be able to edit your details. 

[Sign in to your account](/nrf-estimate-4/pdn-how-would-you-like-to-sign-in)

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the NRF reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

[Find out about call charges](https://www.gov.uk/call-charges)
```



### How do you want to sign in?

| **Field**              | **Value**                                         |
| ---------------------- | ------------------------------------------------- |
| Order number:          | 10                                                |
| Path:                  | /nrf-estimate-4/pdn-how-would-you-like-to-sign-in |
| Title:                 | How would you like to sign in?                    |
| Conditional page flow: | none                                              |

#### Data points

```
{
    data: {
        signInOption: {
            type: radios,
            required: true,
            values: "Sign in with GOV UK One Login" | "Sign in with Government Gateway",
            fieldName: "sign-in-option"
        }
    }
}
```

#### Content

```
# How would you like to sign in?
- Sign in with GOV UK One Login
Hint text: Use your email address and password. If you don't have a GOV.UK One Login, you can create one.
- Sign in with Government Gateway
 Hint text: You'll have a user ID if you've registered for Self Assessment or filed a tax return online before.
```

#### Errors

| **Field**      | **Value**                                                         |
| -------------- | ----------------------------------------------------------------- |
| Description:   | User has selected ‘Continue’ without choosing an option           |
| Error summary: | There is a problem                                                |
| Error message: | Select if you want to log in with One Login or Government Gateway |
|                |                                                                   |

---

### Sign in Government Gateway

| **Field**              | **Value**                                      |
| ---------------------- | ---------------------------------------------- |
| Order number:          | 11                                             |
| Path:                  | /nrf-estimate-4/pdn-sign-in-government-gateway |
| Title:                 | Sign in using Government Gateway               |
| H1 heading:            | Sign in using Government Gateway               |
| Conditional page flow: | None                                           |

#### Data points

```
{
    data: {
        pdnGovernmentGatewayUserId: {
            type: text,
            required: true,
            fieldName: "userId"
        },
        governmentGatewayPassword: {
            type: text,
            required: true,
            fieldName: "password"
        }
    }
}
```

#### Content

```
# Sign in using Government Gateway

Government Gateway user ID
Hint text: This could be up to 12 characters.
Field name: userId

Password
Field name: password
Grey CTA: Show

CTA: Sign in

## New users of Government Gateway
Link

## Problems signing in

[I have forgotten my password](javascript:void(0))
[I have forgotten my Government Gateway user ID](javascript:void(0))
[I have forgotten my Government Gateway user ID and password](javascript:void(0))

[Get help with this page](javascript:void(0))

```

#### Errors

| **Field**      | **Value**                                                |
| -------------- | -------------------------------------------------------- |
| Description:   | User has selected 'Continue' without entering a user ID  |
| Error summary: | There is a problem                                       |
| Error message: | Enter your Government Gateway user ID                    |
| Description:   | User has selected 'Continue' without entering a password |
| Error summary: | There is a problem                                       |
| Error message: | Enter your password                                      |

---

### Upload a planning decision notice

| **Field**             | **Value**                              |
| --------------------- | -------------------------------------- |
| Order number:         | 12                                     |
| Path:                 | /nrf-estimate-4/upload-decision-notice |
| Title:                | Upload a Planning Decision Notice      |
| Conditional page flow: | None                                   |

#### Data points

```
{
    data: {
        decisionNoticeFile: {
            type: file,
            required: conditional,
            fieldName: "decision-notice-file"
        }
    }
}
```

#### Content

```
# Upload a Planning Decision Notice
Hint text: You must have a Planning Decision Notice before you pay your levy.
```

#### Errors

| **Field**      | **Value**                                         |
| -------------- | ------------------------------------------------- |
| Description:   | user submits the page but does not upload a file  |
| Error summary: | There is a problem                                |
| Error message: | Select a file                                     |
| Description:   | Wrong file type                                   |
| Error summary: | There is a problem                                |
| Error message: | The selected file must be a .shp or .geojson file |
| Description:   | Wrong file size                                   |
| Error summary: | There is a problem                                |
| Error message: | The [file] must be smaller than 2MB               |
| Description:   | File is empty                                     |
| Error summary: | There is a problem                                |
| Error message: | The selected file is empty                        |

---

### Check your answers summary declaration and submit (after upload)

| **Field**              | **Value**                             |
| ---------------------- | ------------------------------------- |
| Order number:          | 13                                    |
| Path:                  | /nrf-estimate-4/payment-summary-submit |
| Title:                 | Check your answers                    |
| Conditional page flow: | None                                  |

#### Data points

None

#### Content

```
# Check your answers

| NRF reference | {{ data.paymentReference }} (if provided) |
| Red line boundary added | Yes/No (based on data.redlineBoundaryPolygon) |
| Red line boundary file uploaded | Yes/No (based on data.hasRedlineBoundaryFile) |
| Development types | [List selected types, e.g. Housing, Other residential] | 
| [IF user selected "Housing" THEN show] Number of residential units | [show data.residentialBuildingCount] | 
| [IF user selected "Other residential" THEN show] Maximum number of people | [show data.peopleCount] |
| Waste water treatment works | [show data.wasteWaterTreatmentWorks] | (/nrf-estimate-4/waste-water?change=true&nav=check-your-answers) |
| Email address | {{ data.commitmentRetrievalEmail or data.email or 'Not provided' }} |
| Your details | Full name, business name if provided, address, Company Registration Number and VAT registration number |
| Planning reference | {{ data.planningRef }} |
| Local Planning Authority | Stockton-on-Tees Borough Council |
| Planning Decision Notice | Yes/No |

Your Nature Restoration Fund nutrient levy amount is £{{ data.levyAmount or '2,500' }}.

CTA: Confirm

Note: This page uses the GOV.UK summary list component (payment-summary-submit). Shown after upload decision notice; declaration text is conditional. Links to decision-notice-confirmation.
```

#### Errors

None

---

### Details submitted confirmation page (after upload)

| **Field**             | **Value**                                    |
| --------------------- | -------------------------------------------- |
| Order number:         | 14                                           |
| Path:                 | /nrf-estimate-4/decision-notice-confirmation |
| Title:                | Your details have been submitted             |
| Data points:          | None                                         |
| Conditional page flow: | None                                         |

#### Content

```
<green-banner>
# Your details have been submitted.

**NRF reference:** {{ data.paymentReference }}
</green-banner>

Note: The H1 heading includes a period: "Your details have been submitted." This page uses the GOV.UK panel component (govuk-panel--confirmation) to display the green banner. The NRF reference is displayed in bold in the panel body.

## What happens next

You will receive an email with an invoice and how you can pay. Once you have paid, you will be sent an email with a receipt which you can use when discharging your planning conditions.

You told us the development:

- is planned in {{ data.redlineBoundaryPolygon.intersectingCatchment or data.intersectingCatchment or 'Thames Valley EDP' }}
- has [dynamically constructed list based on building types selected, e.g., "Housing with 6 residential units and a development with a maximum number of 80 people" or "Housing with a total of 5 residential units"]
- has waste water works in {{'Great Billing WRC' }}

Note: The building description is currently hardcoded in the implementation. The instructions describe it as dynamically generated, but the implementation shows a static example.

## What you need to pay

Based on the information you have provided, the development falls into the area for the Nature Restoration Fund Nutrients levy.

The total amount you need to pay is:

**£{{ data.levyAmount or '2,500' }}**

Note: The levy amount is displayed as a separate paragraph with bold formatting.

## What your levy will pay for

Your levy will be spent on conservation, with amounts being spent on monitoring and maintenance. There will also be an admin charge of £00 taken from the levy payment.

Levies are calculated as part of Environmental Delivery Plans (EDPs).

## Get help with Nature Restoration Fund
If you need help with Nature Restoration Fund, contact XXXX and give the NRF reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

[Find out about call charges](https://www.gov.uk/call-charges)

[View the email content](/nrf-estimate-4/pay-email-content)
```

**Note:** The confirmation page uses conditional rendering based on `data.paymentReference` to display different content for payment journey vs estimate/commit journeys. The payment journey content is shown when `data.paymentReference` exists. The page uses the GOV.UK panel component (govuk-panel--confirmation) to display the green banner.

#### Errors

None

---

### Email sent from the Nature Restoration Fund service

| **Field**             | **Value**                                           |
| --------------------- | --------------------------------------------------- |
| Order number:         | 15                                                  |
| Path:                 | /nrf-estimate-4/pay-email-content                   |
| Title:                | Email sent from the Nature Restoration Fund service |
| Data points:          | None                                                |
| Conditional page flow: | None                                                |

#### Content

```
<inset-text>
**To:** {{ data.commitmentRetrievalEmail or data.email or 'user@example.com' }}
**Subject:** Nature Restoration Fund – pay the Nature Restoration Fund levy
</inset-text>

Note: This page uses the GOV.UK inset text component (govuk-inset-text) to display the email header information.

# Nature Restoration Fund – pay the Nature Restoration Fund levy

**NRF reference:** {{ data.paymentReference }}

Note: The payment reference is displayed as a paragraph with bold formatting, not as a heading.

Thank you for using Nature Restoration Fund levy to mitigate your environmental impact. There is an invoice attached to this email.

You have agreed to pay the following:

Nature Restoration Fund nutrients levy: £{{ data.levyAmount or '2,500' }}

Note: The levy amount is displayed as a separate paragraph.

Your levy will be spent on conservation, with amounts being spent on monitoring and maintenance. There will also be an admin charge of £00 taken from the levy payment. Levies are calculated as part of Environmental Delivery Plans (EDPs).

## Ways to pay
You can pay your levy by using a bank transfer or by using GOV.UK Pay.


### Paying by bank transfer
You can make a transfer from a bank account by Faster Payments, Bacs or CHAPS. Use the payee details, sort code and account number on the invoice to make the payment. Use the payment reference as the reference when you make the transfer.


### Paying using GOV.UK Pay
You can use GOV.UK Pay to pay your levy, you will need a bank card or credit card to make this payment.
[Pay your levy using GOV.UK Pay](javascript:void(0))


### Paying by instalments
You can request to pay your levy in instalments.

Note: The payment methods are displayed as separate sections with appropriate heading levels (h3 for subsections).

## What happens next

Once you have paid, you will be sent an email with a receipt which you can use when discharging your planning conditions.

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the NRF reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

[Find out about call charges](https://www.gov.uk/call-charges)
```

---

## Technical Requirements

### File Structure

Create the following files in the GOV.UK Prototype Kit structure:

1. **Route File**: `app/routes/nrf-estimate-4.js` (create or update for the payment journey)
2. **View Directory**: `app/views/nrf-estimate-4/`
3. **View Files**: One HTML file per page in the journey, added to existing directory
4. **Data File**: `app/data/nrf-estimate-4-data.js` (if needed) or reuse the existing session defaults

### Route Implementation

- Use GOV.UK Prototype Kit router setup
- Implement GET routes for displaying pages
- Implement POST routes for form submissions
- Handle conditional routing based on form data
- Store form data in session using `req.session.data`
- Implement validation logic with appropriate error handling
- Include back links on each page

### View Implementation

- Extend `layouts/main.html` from GOV.UK Prototype Kit
- Use GOV.UK Frontend components and classes
- Implement proper form structure with CSRF protection
- Include error summary and field-level error messages
- Use appropriate GOV.UK form components (input, textarea, select, radio, checkbox, file upload)
- Implement proper navigation between pages

### Data Handling

- Store form data in session using `req.session.data`
- Implement data validation with appropriate error messages
- Handle conditional logic for multi-step forms
- Clear session data on journey completion or restart

### GOV.UK Design System Compliance

- Use proper GOV.UK Frontend components
- Follow GOV.UK content guidelines
- Implement proper heading hierarchy
- Use appropriate form validation patterns
- Include proper error handling and user feedback
- Ensure accessibility compliance

### Conditional Logic Implementation

- Implement branching logic based on user selections
- Handle different paths through the journey
- Store conditional data appropriately
- Provide clear navigation between conditional pages

## Implementation Instructions

1. **Create the route file** with all GET and POST routes for the journey
2. **Create the view directory** and all HTML template files
3. **Implement form validation** with proper error handling
4. **Add conditional routing** based on user selections
5. **Update the route handler** in `app/routes/nrf-estimate-4.js` for `/what-would-you-like-to-do` to redirect to `/pay-how-would-you-like-to-sign-in` when `journeyType === 'payment'`
6. **Add back link** on the first page (`/pay-how-would-you-like-to-sign-in`) that links back to `/what-would-you-like-to-do`
7. **Test the complete journey** to ensure all paths work correctly

## Expected Output

- Complete working user journey with all pages
- Proper form validation and error handling
- Conditional logic implementation
- GOV.UK design system compliance
- Session-based data storage
- Clean, maintainable code structure

## Notes

- This is for rapid prototyping, so focus on user experience over security
- Use session storage for data persistence during the journey
- Implement basic validation without complex security measures
- Focus on demonstrating the user flow and interface design
- Ensure the journey works end-to-end for user testing
- **Important**: The confirmation page path is `/payment-confirmation` (not `/confirmation`) to avoid conflict with the existing estimate journey confirmation page
- **Integration**: This journey is triggered from `/what-would-you-like-to-do` when user selects "I am ready to pay the Nature Restoration Fund levy"
- **Data Property Note**: Use `commitmentRetrievalEmail` instead of `email` for the commitment retrieval email to avoid conflicts with the estimate journey's email field
