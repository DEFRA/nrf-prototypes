# Create NRF commit journey with reference in GOV.UK Prototype Kit

## Journey Information

- **Journey Name**: Commit to use the Nature Restoration Fund Levy
- **Journey Description**:  
  A user journey for a developer to commit to use the Nature Restoration Fund levy. This journey starts when the link 'Commit to using Nature Restoration Fund' is clicked in the email.
- **Journey Route Prefix**: nrf-estimate-4
- **Start Page Title**: Do you have an NRF reference?

## Page Flow and Conditional Logic

### Do you have a NRF reference?

| **Field**              | **Value**                             |
| ---------------------- | ------------------------------------- |
| Order number:          | 1                                     |
| Path:                  | /nrf-estimate-4/do-you-have-a-nrf-ref |
| Title:                 | Do you have an NRF reference?         |
| Conditional page flow: | none                                  |

#### Data points

```
{
    data: {
        hasNrfReference: {
            type: radios,
            required: true,
            values: "yes" | "no",
            fieldName: "has-nrf-reference"
        }
    }
}
```

#### Content

```
# Do you have a NRF reference?
- Yes
- No

CTA: Continue
```

#### Errors

| **Field**      | **Value**                                               |
| -------------- | ------------------------------------------------------- |
| Description:   | User has selected ‘Continue’ without choosing an option |
| Error summary: | There is a problem                                      |
| Error message: | Select yes if you have an NRF reference                 |

---

### Enter the NRF reference

| **Field**              | **Value**                          |
| ---------------------- | ---------------------------------- |
| Order number:          | 2                                  |
| Path:                  | /nrf-estimate-4/enter-estimate-ref |
| Title:                 | Enter your NRF reference      |
| Conditional page flow: | none                               |

#### Data points

```
{
    data: {
        nrfReference: {
            type: text,
            required: true,
            fieldName: "nrf-reference"
        }
    }
}
```

#### Content

```
# Enter your NRF reference
Hint text: Enter this reference to retrieve the details entered during the quote.

Note: The page title and label use "NRF reference" (implementation uses "Enter your NRF reference").

CTA: Continue
```

#### Errors

| **Field**      | **Value**                                                 |
| -------------- | --------------------------------------------------------- |
| Description:   | User has selected 'Continue' without entering a reference |
| Error summary: | There is a problem                                        |
| Error message: | Enter your NRF reference to continue                      |
| Description:   | User has entered a non-numeric value                      |
| Error summary: | There is a problem                                        |
| Error message: | Enter a valid NRF reference number                        |

---

### Email entry

| **Field**              | **Value**                               |     |
| ---------------------- | --------------------------------------- | --- |
| Order number:          | 3                                       |     |
| Path:                  | /nrf-estimate-4/retrieve-estimate-email |     |
| Title:                 | Enter your email address                |     |
| Conditional page flow: | None                                    |     |

#### Data points

```
{
    data: {
        email: {
            type: email,
            required: true,
            fieldName: "email"
        }
    }
}
```

#### Content

```
# Enter your email address
Hint text: We will send you a link so you can retrieve the details from your quote.

CTA: Continue
```

#### Errors

| **Field**      | **Value**                                                           |
| -------------- | ------------------------------------------------------------------- |
| Description:   | User has selected ‘Continue’ without entering any details           |
| Error summary: | There is a problem                                                  |
| Error message: | Enter your email address to continue                                |
| Description:   | Incorrect email format                                              |
| Error summary: | There is a problem                                                  |
| Error message: | Enter an email address in the correct format, like name@example.com |

---

### Email sent with magic link to estimate

| **Field**             | **Value**                                        |
| --------------------- | ------------------------------------------------ |
| Order number:         | 4                                                |
| Path:                 | /nrf-estimate-4/estimate-email-retrieval-content |
| Title:                | Email sent to get magic link to access estimate  |
| Data points:          | None                                             |
| Conditional page flow: | None                                             |

#### Content

```
<inset-text>
**To:** {{ data.email or 'user@example.com' }}
**Subject:** Nature Restoration Fund - retrieve your estimate details for the Nature Restoration Fund levy
</inset-text>

Note: This page uses the GOV.UK inset text component (govuk-inset-text) to display the email header information.

# Nature Restoration Fund – retrieve your quote details for the Nature Restoration Fund levy

You can use the details you previously gave us for your quote to fill in the information needed to commit to using Nature Restoration Fund levy.

[Retrieve the quote details](/nrf-estimate-4/retrieved-estimate-summary)

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the NRF reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

[Find out about call charges](https://www.gov.uk/call-charges)
```

---

### Check your answers summary and submit

| **Field**              | **Value**                                  |
| ---------------------- | ------------------------------------------ |
| Order number:          | 5                                          |
| Path:                  | /nrf-estimate-4/retrieved-estimate-summary |
| Title:                 | Check your answers                         |
| Conditional page flow: | None                                       |

#### Data points

None

#### Content

```
# Your quote details

| Red line boundary | [Show Added or Not added] | [Change](/nrf-estimate-4/map?nav=check-your-answers) or [Change](/nrf-estimate-4/upload-redline?change=true&nav=check-your-answers) as appropriate |
| Development types | [List selected types, e.g. Housing, Other residential] | [Change](/nrf-estimate-4/building-type?change=true&nav=check-your-answers) |
| [IF user selected "Housing" THEN show] Number of residential units | [show data.residentialBuildingCount] | [Change](/nrf-estimate-4/residential?change=true&nav=check-your-answers) |
| [IF user selected "Other residential" THEN show] Maximum number of people | [show data.peopleCount] | [Change](/nrf-estimate-4/people-count?change=true&nav=check-your-answers) |
| Waste water treatment works | [show data.wasteWaterTreatmentWorks] | [Change](/nrf-estimate-4/waste-water?change=true&nav=check-your-answers) |
| Email address | [show data.email] | [Change](/nrf-estimate-4/estimate-email?change=true&nav=check-your-answers) |

Amend the above information or continue. You will be asked to create or sign in to an account.
Primary button: Continue (form POST to /nrf-estimate-4/retrieved-estimate-summary, then redirects to commit sign-in)
Secondary button (red): Delete (link to /nrf-estimate-4/delete-details)

Note: This page uses the GOV.UK summary list component. It displays retrieved quote details; Change links go to the same paths as the quote journey (map, building-type, etc.) with nav=check-your-answers. Paths delete-details and delete-details-confirmation are for the commit journey; implementation may share delete-quote/delete-confirmation until commit-specific routes are added.
```

#### Errors

None

---

### Are you sure you want to delete this quote?

| **Field**              | **Value**                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------- |
| Order number:          | 5.1                                                                                    |
| Path:                  | /nrf-estimate-4/delete-details                                                         |
| Title:                 | Are you sure you want to delete this quote?                                            |
| Conditional page flow: | display if user clicks the delete button on /nrf-estimate-4/retrieved-estimate-summary |

#### Data points

```
{
    data: {
        confirmDeleteQuote: {
            type: radios,
            required: conditional - required if user clicked delete on /nrf-estimate-4/retrieved-estimate-summary,
            values: "Yes" | "No",
            fieldName: "confirm-delete-details"
        }
    }
}
```

#### Content

```
# Are you sure you want to delete this quote?
This will permanently delete your quote. You can create a new quote. 

Button: Yes
Secondary button: No
```


---

### Delete confirmation page

| **Field**              | **Value**                                   |
| ---------------------- | ------------------------------------------- |
| Order number:          | 5.2                                         |
| Path:                  | /nrf-estimate-4/delete-details-confirmation |
| Title:                 | Your details have been deleted              |
| Data points:           | None                                        |
| Conditional page flow: | None                                        |

#### Content

```

<green-banner>
# Your details have been deleted
</green-banner>

Note: This page uses the GOV.UK panel component (govuk-panel--confirmation) to display the green banner. The page conditionally displays different content based on journey type (estimate, commit, or payment). For the estimate journey, it shows:

## What happens next

Your quote details have been removed and deleted.
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

### How do you want to sign in?

| **Field**              | **Value**                                            |
| ---------------------- | ---------------------------------------------------- |
| Order number:          | 6                                                    |
| Path:                  | /nrf-estimate-4/commit-how-would-you-like-to-sign-in |
| Title:                 | How would you like to sign in?                       |
| Conditional page flow: | none                                                 |

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

| **Field**              | **Value**                                         |
| ---------------------- | ------------------------------------------------- |
| Order number:          | 7                                                 |
| Path:                  | /nrf-estimate-4/commit-sign-in-government-gateway |
| Title:                 | Sign in using Government Gateway                  |
| H1 heading:            | Sign in using Government Gateway                  |
| Conditional page flow: | None                                              |

#### Data points

```
{
    data: {
        governmentGatewayUserId: {
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

### Details entry

| **Field**              | **Value**                       |
| ---------------------- | ------------------------------- |
| Order number:          | 8                               |
| Path:                  | /nrf-estimate-4/company-details |
| Title:                 | Enter the company details       |
| H1 heading:            | Enter your details              |
| Conditional page flow: | None                            |

#### Data points

```
{
    data: {
        fullName: { type: text, required: true, fieldName: "fullName" },
        businessName: { type: text, required: false, fieldName: "businessName" },
        addressLine1: { type: text, required: true, fieldName: "addressLine1" },
        addressLine2: { type: text, required: false, fieldName: "addressLine2" },
        townOrCity: { type: text, required: true, fieldName: "townOrCity" },
        county: { type: text, required: false, fieldName: "county" },
        postcode: { type: text, required: true, fieldName: "postcode" },
        companyRegistrationNumber: { type: text, required: false, fieldName: "companyRegistrationNumber" },
        vatRegistrationNumber: { type: text, required: false, fieldName: "vatRegistrationNumber" },
        purchaseOrderNumber: { type: text, required: false, fieldName: "purchaseOrderNumber" }
    }
}
```

#### Content

```
# Enter your details

Hint text: Enter the details for the individual or company who will be paying the Nature Restoration Fund levy.

## Full Name
Field name: fullName

## Business name (optional)
Field name: businessName

## Address
Address line 1
Field name: addressLine1
Address line 2 (optional)
Field name: addressLine2
Town or city
Field name: townOrCity
County (optional)
Field name: county
Postcode
Field name: postcode

Note: The address fields are grouped in a fieldset with legend "Address".

## Company Registration Number (CRN) (optional)
Field name: companyRegistrationNumber

## VAT registration number (optional)
Field name: vatRegistrationNumber

## Purchase order number (optional)
Field name: purchaseOrderNumber

CTA: Continue
```

#### Errors

| **Field**      | **Value**                                                       |
| -------------- | --------------------------------------------------------------- |
| Description:   | User has selected 'Continue' without entering a full name       |
| Error summary: | There is a problem                                              |
| Error message: | Enter your full name                                            |
| Description:   | User has selected 'Continue' without entering address line 1     |
| Error summary: | There is a problem                                              |
| Error message: | Enter address line 1                                            |
| Description:   | User has selected 'Continue' without entering a town or city     |
| Error summary: | There is a problem                                              |
| Error message: | Enter a town or city                                            |
| Description:   | User has selected 'Continue' without entering a postcode        |
| Error summary: | There is a problem                                              |
| Error message: | Enter a postcode                                                |

---

### Check your answers summary and submit

| **Field**              | **Value**                               |
| ---------------------- | --------------------------------------- |
| Order number:          | 9                                       |
| Path:                  | /nrf-estimate-4/summary-and-declaration |
| Title:                 | Check your answers                      |
| Conditional page flow: | None                                    |

#### Data points

None

#### Content

```
# Check your answers

| Red line boundary | [Show Added or Not added] | [Change](/nrf-estimate-4/map?nav=check-your-answers) or [Change](/nrf-estimate-4/upload-redline?change=true&nav=check-your-answers) as appropriate |
| Development types | [List selected types, e.g. Housing, Other residential] | [Change](/nrf-estimate-4/building-type?change=true&nav=check-your-answers) |
| [IF user selected "Housing" THEN show] Number of residential units | [show data.residentialBuildingCount] | [Change](/nrf-estimate-4/residential?change=true&nav=check-your-answers) |
| [IF user selected "Other residential" THEN show] Maximum number of people | [show data.peopleCount] | [Change](/nrf-estimate-4/people-count?change=true&nav=check-your-answers) |
| Waste water treatment works | [show data.wasteWaterTreatmentWorks] | [Change](/nrf-estimate-4/waste-water?change=true&nav=check-your-answers) |
| Email address | [show data.email] | [Change](/nrf-estimate-4/estimate-email?change=true&nav=check-your-answers) |
| Your details | [show full name, business name if provided, address, Company Registration Number and VAT registration number] | [Change](/nrf-estimate-4/company-details?change=true&nav=check-your-answers) |

By confirming and submitting these details, you are committing to using the Nature Restoration Fund levy.

The details you are submitting must be accurate and correct.

By committing to use this levy, you will be emailed a document that you can use in your planning application. The commitment is proof of how you intend to mitigate your environmental impact for nutrients.

Primary button: Confirm and submit
Secondary button (red): Delete (link to /nrf-estimate-4/delete-commit)

Note: This page uses the GOV.UK summary list component. The declaration text is displayed as separate paragraphs before the submit button.
Change links are disabled (javascript:void(0)) as this is a read-only summary of retrieved commitment data.
```

#### Errors

None

---

### Are you sure you want to delete this commitment?

| **Field**              | **Value**                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------- |
| Order number:          | 9.1                                                                                 |
| Path:                  | /nrf-estimate-4/delete-commit                                                       |
| Title:                 | Are you sure you want to delete this commitment?                                    |
| Conditional page flow: | display if user clicks the delete button on /nrf-estimate-4/summary-and-declaration |

#### Data points

```
{
    data: {
        confirmDeleteQuote: {
            type: radios,
            required: conditional - required if user clicked delete on /nrf-estimate-4/summary-and-declaration
            values: "Yes" | "No",
            fieldName: "confirm-delete-commitment"
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
| Order number:          | 9.2                                        |
| Path:                  | /nrf-estimate-4/delete-commit-confirmation |
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

### Details submitted confirmation page

| **Field**             | **Value**                           |
| --------------------- | ----------------------------------- |
| Order number:         | 10                                  |
| Path:                 | /nrf-estimate-4/commit-confirmation |
| Title:                | Your details have been submitted    |
| Data points:          | None                                |
| Conditional page flow: | None                                |

#### Content

```
<green-banner>
# Your details have been submitted

Commitment reference: {{ data.commitmentReference }}
</green-banner>

## What happens next

You will be sent an email with a commitment document that you can send to your Local Planning Authority to include in your planning application.

The document outlines your commitment to use the Nature Restoration Fund levy to mitigate your environmental impact for nutrients.

## Get help with Nature Restoration Fund
If you need help with Nature Restoration Fund, contact XXXX and give the NRF reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

[Find out about call charges](https://www.gov.uk/call-charges)

[View the email content](/nrf-estimate-4/commit-email-content)
```

**Note:** The commit journey uses the commit-confirmation page (path `/commit-confirmation`). The page uses the GOV.UK panel component (govuk-panel--confirmation) to display the green banner with Commitment reference.

#### Errors

None

---

### Email sent from the Nature Restoration Fund service

| **Field**             | **Value**                                           |
| --------------------- | --------------------------------------------------- |
| Order number:         | 11                                                  |
| Path:                 | /nrf-estimate-4/commit-email-content                |
| Title:                | Email sent from the Nature Restoration Fund service |
| Data points:          | None                                                |
| Conditional page flow: | None                                                |

#### Content

```
<inset-text>
**To:** {{ data.email or 'user@example.com' }}
**Subject:** Nature Restoration Fund – commitment to use the Nature Restoration Fund levy
</inset-text>

Note: This page uses the GOV.UK inset text component (govuk-inset-text) to display the email header information.

# Nature Restoration Fund – commitment to use the Nature Restoration Fund levy

**NRF reference:** {{ data.nrfReference }}

Note: The commitment reference is displayed as a paragraph with bold formatting, not as a heading.

Attached is a commitment document that you can send to your Local Planning Authority to include in your planning application.

The document outlines your commitment to use the Nature Restoration Fund levy to mitigate your environmental impact for nutrients.

You told us the development:

- is planned in {{ data.redlineBoundaryPolygon.intersectingCatchment or data.intersectingCatchment or 'Thames Valley EDP' }}
- has [dynamically constructed list based on building types selected, e.g., "Housing with 6 residential units and a development with a maximum number of 80 people" or "Housing with a total of 5 residential units"]
- has waste water works in {{'Great Billing WRC' }}

## What you will need to pay

Based on the information you have provided, the development falls into an area with an Environmental Delivery Plan (EDP), so you can use the Nature Restoration Fund Nutrients Levy.

The estimated total amount you may need to pay if you develop in this area is:

**£{{ data.levyAmount or '2,500' }}**

Note: The levy amount is displayed as a separate paragraph with bold formatting.

You do not need to pay anything at this point, you can send the attached document to your Local Planning Authority to include in your planning application.

Keep this email as a record of your commitment to use the Nature Restoration Fund. You can sign in to your account when you are ready to pay.

[Pay your Nature Restoration Fund levy](/nrf-estimate-4/pay-how-would-you-like-to-sign-in)

## What your levy will pay for

Your levy will be spent on conservation, with amounts being spent on monitoring and maintenance. There will also be an admin charge of £00 taken from the levy payment. Levies are calculated as part of Environmental Delivery Plans (EDPs).

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the NRF reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

[Find out about call charges](https://www.gov.uk/call-charges)
```

---

### Email sent from the Nature Restoration Fund service

| **Field**             | **Value**                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| Order number:         | 11.1                                                                                              |
| Path:                 | /nrf-estimate-4/commit-email-content-range                                                        |
| Title:                | Email sent from the Nature Restoration Fund service                                               |
| Data points:          | None                                                                                              |
| Conditional page flow: | display when data.wasteWaterTreatmentWorks === "I don't know the waste water treatment works yet" |

#### Content

```
<inset-text>
**To:** {{ data.email or 'user@example.com' }}
**Subject:** Nature Restoration Fund – commitment to use the Nature Restoration Fund levy
</inset-text>

Note: This page uses the GOV.UK inset text component (govuk-inset-text) to display the email header information.

# Nature Restoration Fund – commitment to use the Nature Restoration Fund levy

**NRF reference:** {{ data.nrfReference }}

Note: The commitment reference is displayed as a paragraph with bold formatting, not as a heading.

Attached is a commitment document that you can send to your Local Planning Authority to include in your planning application.

The document outlines your commitment to use the Nature Restoration Fund levy to mitigate your environmental impact for nutrients.

You told us the development:

- is planned in {{ data.redlineBoundaryPolygon.intersectingCatchment or data.intersectingCatchment or 'Thames Valley EDP' }}
- has [dynamically constructed list based on building types selected, e.g., "Housing with 6 residential units and a development with a maximum number of 80 people" or "Housing with a total of 5 residential units"]

## What you will need to pay

Based on the information you have provided, the development falls into an area with an Environmental Delivery Plan (EDP), so you can use the Nature Restoration Fund Nutrients Levy.

The quote for the total amount you may need to pay if you develop in this area will be in the range of: **£{{ data.levyAmount or '1,500 to 2,500' }}**

Note: The levy amount is displayed as a separate paragraph with bold formatting.

You do not need to pay anything at this point, you can send the attached document to your Local Planning Authority to include in your planning application.

Keep this email as a record of your commitment to use the Nature Restoration Fund. You can sign in to your account when you are ready to pay.

[Pay your Nature Restoration Fund levy](/nrf-estimate-4/pay-how-would-you-like-to-sign-in)

## What your levy will pay for

Your levy will be spent on conservation, with amounts being spent on monitoring and maintenance. There will also be an admin charge of £00 taken from the levy payment. Levies are calculated as part of Environmental Delivery Plans (EDPs).

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

1. **Route File**: `app/routes/nrf-estimate-4.js`
2. **View Directory**: `app/views/nrf-estimate-4/`
3. **View Files**: One HTML file per page in the journey
4. **Data File**: `app/data/nrf-estimate-4-data.js` (if needed)

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

1. **Routes are integrated** into `app/routes/nrf-estimate-4.js` (or the new commit journey file)
2. **Views are in** `app/views/nrf-estimate-4/` directory
3. **Form validation** is implemented with proper error handling
4. **Conditional routing** based on journey type
5. **Routes use** centralized route constants from `app/config/nrf-estimate-4/routes.js`
6. **Journey can be accessed** via payment-email page link or directly

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

## Implementation Details

- **Journey entry point**: Accessed from `/nrf-estimate-4/what-would-you-like-to-do` when the user selects "I am ready to commit to using the Nature Restoration Fund levy", or from the estimate email link "Commit to using Nature Restoration Fund"
- **Shared confirmation page**: The confirmation.html page is shared between estimate and payment journeys with conditional content display
- **Dynamic content**: Levies and their impacts are displayed dynamically based on user selections
- **Levy naming**: Uses "greater crested newts" terminology instead of just "newts"
- **Data structure**: Uses `leviesSelected` array and `lpaEmail` field for data storage. Company details stored in `fullName`, `businessName`, `addressLine1`, `addressLine2`, `townOrCity`, `county`, `postcode`
- **Route organization**: All routes integrated into the new `nrf-estimate-4.js` file with proper separation of concerns
- **Email template**: Invoice email content is available as a separate viewable page for reference
- **Path naming**: All paths use lowercase with hyphens (e.g., `/company-details`, `/lpa-email`, `/summary-and-declaration`)
- **Company details page**: New page in the invoice journey flow between confirm and LPA email entry
- **Route conflict resolution**: The retrieved estimate summary page uses `/nrf-estimate-4/retrieved-estimate-summary` instead of `/nrf-estimate-3/commit-summary` to avoid conflict with the existing payment journey route
- **Data Property Note**: The implementation uses `email` for the estimate retrieval email field, not `estimateRetrievalEmail`
