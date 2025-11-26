# Create NRF Payment journey with reference in GOV.UK Prototype Kit

## Journey Information

- **Journey Name**: Pay Nature Restoration Fund Levy
- **Journey Description**:  
  A user journey for a developer to pay for the Nature Restoration Fund levy required when submitting planning permission to build a development of some sort.
- **Journey Route Prefix**: nrf-estimate-3
- **Start Page Title**: Pay Nature Restoration Fund Levy
- **Integration Point**: This journey starts from `/nrf-estimate-3/what-would-you-like-to-do` when the user selects "I am ready to pay the Nature Restoration Fund levy"

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
    application: {
        journeyType: {
            type: radios
            required: true
            values: "Sign in with GOV UK One Login" |
        "Sign in with Government Gateway"
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

| **Field**              | **Value**                        |
| ---------------------- | -------------------------------- |
| Order number:          | 4                                |
| Path:                  | /nrf-estimate-4/pay-Sign in-GG   |
| Title:                 | Sign in using Government Gateway |
| H1 heading:            | Sign in using Government Gateway |
| Conditional page flow: | None                             |

#### Data points

```
{
    GGuserID: {
        type: text,
        required: true
    },
    Password: {
        type: text,
        required: true
    }
}
```

#### Content

```
# Sign in using Government Gateway

Government Gateway user ID
Hint text: This could be up to 12 characters.
Field name: userID

Password
Field name: Password
Grey CTA: Show

CTA: Sign in

## New users of Government Gateway
Link

## Problems signing in

[I have forgetten my password](javascript:void(0))
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

| **Field**              | **Value**                      |
| ---------------------- | ------------------------------ |
| Order number:          | 5                              |
| Path:                  | /nrf-estimate-4/commit-summary |
| Title:                 | Check your answers             |
| Conditional page flow: | None                           |

#### Data points

None

#### Content

```
# Check your answers

| NRF reference | {{ data.NRFRef }} (if provided) | [Change link - disabled] |
| Red line boundary added | Yes/No (based on data.redlineBoundaryPolygon) | [Change link - disabled] |
| Red line boundary file uploaded | Yes/No (based on data.hasRedlineBoundaryFile) | [Change link - disabled] |
| Building types | List of all types selected (if any) | [Change link - disabled] |
| Number of dwelling buildings | {{ data.residentialBuildingCount }} (if Dwelling selected) | [Change link - disabled] |
| Number of hotel rooms | {{ data.roomCounts.hotelCount }} (if Hotel selected) | [Change link - disabled] |
| Number of multiple occupation rooms | {{ data.roomCounts.hmoCount }} (if "House of multiple occupation (HMO)" selected) | [Change link - disabled] |
| Number of residential institution rooms | {{ data.roomCounts.residentialInstitutionCount }} (if "Residential institution" selected) | [Change link - disabled] |
| Email address | {{ data.commitmentRetrievalEmail or data.email or 'Not provided' }} | [Change link - disabled] |
| Your details | Full name, business name if provided, address, Company Registration Number and VAT registration number | [Change link - disabled] |
| Local Planning Authority | Stockton-on-Tees Borough Council | [Change link - disabled] |

CTA: Continue

Note: This page uses the GOV.UK summary list component. Change links are disabled (javascript:void(0)) as this is a read-only summary of retrieved commitment data.
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
    planningRef: {
        type: text,
        required: true
        fieldName: "planning-ref"
    }
}
```

#### Content

```

# Enter your planning application reference

Hint text: Enter the reference of the planning application that you want to pay the Nature Restoration Fund levy for

```

#### Errors

| **Field**      | **Value**                                                 |
| -------------- | --------------------------------------------------------- |
| Description:   | User has selected 'Continue' without entering any details |
| Error summary: | There is a problem                                        |
| Error message: | Enter the planning application reference                  |

---

### Check your answers summary declaration and submit

| **Field**              | **Value**                             |
| ---------------------- | ------------------------------------- |
| Order number:          | 7                                     |
| Path:                  | /nrf-estimate-4/commit-summary-submit |
| Title:                 | Check your answers                    |
| Conditional page flow: | None                                  |

#### Data points

None

#### Content

```
# Check your answers

| NRF reference | {{ data.NRFRef }} (if provided) | [Change link - disabled] |
| Red line boundary added | Yes/No (based on data.redlineBoundaryPolygon) | [Change link - disabled] |
| Red line boundary file uploaded | Yes/No (based on data.hasRedlineBoundaryFile) | [Change link - disabled] |
| Building types | List of all types selected (if any) | [Change link - disabled] |
| Number of dwelling buildings | {{ data.residentialBuildingCount }} (if Dwelling selected) | [Change link - disabled] |
| Number of hotel rooms | {{ data.roomCounts.hotelCount }} (if Hotel selected) | [Change link - disabled] |
| Number of multiple occupation rooms | {{ data.roomCounts.hmoCount }} (if "House of multiple occupation (HMO)" selected) | [Change link - disabled] |
| Number of residential institution rooms | {{ data.roomCounts.residentialInstitutionCount }} (if "Residential institution" selected) | [Change link - disabled] |
| Email address | {{ data.commitmentRetrievalEmail or data.email or 'Not provided' }} | [Change link - disabled] |
| Your details | Full name, business name if provided, address, Company Registration Number and VAT registration number | [Change link - disabled] |
| Local Planning Authority | Stockton-on-Tees Borough Council | [Change link - disabled] |
| Planning reference | {{ data.planningRef }} | [Change link - disabled] |

By confirming and submitting these details, you are requesting to pay the Nature Restoration Fund levy.

The details you are submitting must be accurate and correct.

Once the Local Planning Authority has checked and approved your request, you will be asked to upload your Planning Decision Notice. You will then be sent an email with ways to pay.

Once you have paid, you will then receive a receipt and you can use it to discharge your environmental obligations.

Your Nature Restoration Fund nutrient levy amount is £{{ data.levyAmount or '2,500' }}.

CTA: Confirm and submit

Note: This page uses the GOV.UK summary list component. Change links are disabled (javascript:void(0)). The declaration text is displayed as separate paragraphs before the submit button.
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
| Conditional pageflow: | None                                 |

#### Content

```
<green-banner>
# Your details have been submitted.

**NRF reference:** {{ data.NRFReference }}
</green-banner>

Note: The H1 heading includes a period: "Your details have been submitted." This page uses the GOV.UK panel component (govuk-panel--confirmation) to display the green banner. The payment reference label is displayed in bold in the panel body.

## What happens next

Your Local Planning Authority will review your request to pay.
Once they have approved it, you will receive an email with a link to upload your Planning Decision Notice. You will receive this email within 00 days.

You told us the development:

* is planned in {{ data.redlineBoundaryPolygon.intersectingCatchment or 'Thames Valley EDP' }}
* has 6 dwelling buildings and 3 hotel rooms

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
If you need help with Nature Restoration Fund, contact XXXX and give the commitment reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

[Find out about call charges](https://www.gov.uk/call-charges)

[View the email content](/nrf-estimate-4/payment-request-email-content)
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
| Conditional pageflow: | None                                                |

#### Content

```
<inset-text>
**To:** {{ data.commitmentRetrievalEmail or data.email or 'user@example.com' }}
**Subject:** Nature Restoration Fund – payment request approved for the Nature Restoration Fund levy
</inset-text>

Note: This page uses the GOV.UK inset text component (govuk-inset-text) to display the email header information.

# Nature Restoration Fund – payment request approved for the Nature Restoration Fund levy

**NRF reference:** {{ data.NRFReference }}

Note: The NRF reference is displayed as a paragraph with bold formatting, not as a heading.

Thank you for using Nature Restoration Fund levy to mitigate your environmental impact.
The Local Planning Authority has approved your request to pay.
Access your account and upload your Planning Decision Notice to receive a payment email with ways you can pay.

[Upload your Planning Decision Notice](/nrf-estimate-4/PDN-how-would-you-like-to-sign-in]

You have agreed to pay the following:

Nature Restoration Fund nutrients levy: £{{ data.levyAmount or '2,500' }}

Note: The levy amount is displayed as a separate paragraph.

Your levy will be spent on conservation, with amounts being spent on monitoring and maintenance. There will also be an admin charge of £00 taken from the levy payment. Levies are calculated as part of Environmental Delivery Plans (EDPs).

## What happens next

Once you have paid, you will be sent an email with a receipt which you can use as evidence for your planning application to discharge your obligation.

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the commitment reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

[Find out about call charges](https://www.gov.uk/call-charges)
```

---

### How do you want to sign in?

| **Field**              | **Value**                                         |
| ---------------------- | ------------------------------------------------- |
| Order number:          | 10                                                |
| Path:                  | /nrf-estimate-4/PDN-how-would-you-like-to-sign-in |
| Title:                 | How would you like to sign in?                    |
| Conditional page flow: | none                                              |

#### Data points

```
{
    application: {
        journeyType: {
            type: radios
            required: true
            values: "Sign in with GOV UK One Login" |
        "Sign in with Government Gateway"
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

| **Field**              | **Value**                        |
| ---------------------- | -------------------------------- |
| Order number:          | 11                               |
| Path:                  | /nrf-estimate-4/PDN-Sign in-GG   |
| Title:                 | Sign in using Government Gateway |
| H1 heading:            | Sign in using Government Gateway |
| Conditional page flow: | None                             |

#### Data points

```
{
    GGuserID: {
        type: text,
        required: true
    },
    Password: {
        type: text,
        required: true
    }
}
```

#### Content

```
# Sign in using Government Gateway

Government Gateway user ID
Hint text: This could be up to 12 characters.
Field name: userID

Password
Field name: Password
Grey CTA: Show

CTA: Sign in

## New users of Government Gateway
Link

## Problems signing in

[I have forgetten my password](javascript:void(0))
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
| Conditional pageflow: | None                                   |

#### Data points

```
{
    application: {
        decisionFile: {
            type: file,
            conditional: none
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

### Check your answers summary declaration and submit

| **Field**              | **Value**                             |
| ---------------------- | ------------------------------------- |
| Order number:          | 13                                    |
| Path:                  | /nrf-estimate-4/commit-summary-submit |
| Title:                 | Check your answers                    |
| Conditional page flow: | None                                  |

#### Data points

None

#### Content

```
# Check your answers

| NRF reference | {{ data.NRFRef }} (if provided) |
| Red line boundary added | Yes/No (based on data.redlineBoundaryPolygon) |
| Red line boundary file uploaded | Yes/No (based on data.hasRedlineBoundaryFile) |
| Building types | List of all types selected (if any) |
| Number of dwelling buildings | {{ data.residentialBuildingCount }} (if Dwelling selected)|
| Number of hotel rooms | {{ data.roomCounts.hotelCount }} (if Hotel selected) |
| Number of multiple occupation rooms | {{ data.roomCounts.hmoCount }} (if "House of multiple occupation (HMO)" selected) |
| Number of residential institution rooms | {{ data.roomCounts.residentialInstitutionCount }} (if "Residential institution" selected) |
| Email address | {{ data.commitmentRetrievalEmail or data.email or 'Not provided' }} |
| Your details | Full name, business name if provided, address, Company Registration Number and VAT registration number |
| Local Planning Authority | Stockton-on-Tees Borough Council |
| Planning reference | {{ data.planningRef }} |
| Planning Decision Notice | Yes/No

Your Nature Restoration Fund nutrient levy amount is £{{ data.levyAmount or '2,500' }}.

CTA: Confirm

Note: This page uses the GOV.UK summary list component. Change links are removed. The amount text is displayed as separate paragraphs before the confirm button.
```

#### Errors

None

---

### Details submitted confirmation page

| **Field**             | **Value**                                    |
| --------------------- | -------------------------------------------- |
| Order number:         | 14                                           |
| Path:                 | /nrf-estimate-4/decision_notice-confirmation |
| Title:                | Your details have been submitted             |
| Data points:          | None                                         |
| Conditional pageflow: | None                                         |

#### Content

```
<green-banner>
# Your details have been submitted.

**Payment reference:** {{ data.NRFReference }}
</green-banner>

Note: The H1 heading includes a period: "Your details have been submitted." This page uses the GOV.UK panel component (govuk-panel--confirmation) to display the green banner. The payment reference label is displayed in bold in the panel body.

## What happens next

You will receive an email with an invoice, with the ways you can pay.
Once you have paid, you will be sent an email with a receipt which you can use to discharge your obligation.

You told us the development:

* is planned in {{ data.redlineBoundaryPolygon.intersectingCatchment or 'Thames Valley EDP' }}
* has 6 dwelling buildings and 3 hotel rooms

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
If you need help with Nature Restoration Fund, contact XXXX and give the commitment reference number.

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
| Conditional pageflow: | None                                                |

#### Content

```
<inset-text>
**To:** {{ data.commitmentRetrievalEmail or data.email or 'user@example.com' }}
**Subject:** Nature Restoration Fund – pay the Nature Restoration Fund levy
</inset-text>

Note: This page uses the GOV.UK inset text component (govuk-inset-text) to display the email header information.

# Nature Restoration Fund – pay the Nature Restoration Fund levy

**NRF reference:** {{ data.NRFReference }}

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

Once you have paid, you will be sent an email with a receipt which you can use as evidence for your planning application to discharge your obligation.

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the commitment reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

[Find out about call charges](https://www.gov.uk/call-charges)
```

---

## Technical Requirements

### File Structure

Create the following files in the GOV.UK Prototype Kit structure:

1. **Route File**: Routes should be added to `app/routes/nrf-estimate-3.js` (existing file)
2. **View Directory**: `app/views/nrf-estimate-3/` (existing directory)
3. **View Files**: One HTML file per page in the journey, added to existing directory
4. **Data File**: Use existing session data structure, no separate data file needed

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
5. **Update the route handler** in `app/routes/nrf-estimate-3.js` for `/what-would-you-like-to-do` to redirect to `/do-you-have-a-commitment-ref` when `journeyType === 'payment'`
6. **Add back link** on the first page (`/do-you-have-a-commitment-ref`) that links back to `/what-would-you-like-to-do`
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
