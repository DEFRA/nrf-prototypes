# Create NRF commit journey with reference in GOV.UK Prototype Kit

## Journey Information

- **Journey Name**: Commit to use the Nature Restoration Fund Levy
- **Journey Description**:  
  A user journey for a developer to commit to use the Nature Restoration Fund levy. This journey starts when the link 'Commit to using Nature Restoration Fund' is clicked in the email.
- **Journey Route Prefix**: nrf-estimate-3
- **Start Page Title**: Get an estimate for Nature Restoration Fund Levy

## Page Flow and Conditional Logic

### Do you have an estimate reference?

| **Field**              | **Value**                                   |
| ---------------------- | ------------------------------------------- |
| Order number:          | 1                                           |
| Path:                  | /nrf-estimate-3/do-you-have-an-estimate-ref |
| Title:                 | Do you have an estimate reference?          |
| Conditional page flow: | none                                        |

#### Data points

```
{
    hasEstimateReference: {
        type: radios,
        required: true,
        values: "yes" | "no"
    }
}
```

#### Content

```
# Do you have an estimate reference?
- Yes
- No
```

#### Errors

| **Field**      | **Value**                                               |
| -------------- | ------------------------------------------------------- |
| Description:   | User has selected ‘Continue’ without choosing an option |
| Error summary: | There is a problem                                      |
| Error message: | Select yes if you have an estimate reference            |

---

### Enter your estimate reference

| **Field**              | **Value**                          |
| ---------------------- | ---------------------------------- |
| Order number:          | 2                                  |
| Path:                  | /nrf-estimate-3/enter-estimate-ref |
| Title:                 | Enter your estimate reference      |
| Conditional page flow: | none                               |

#### Data points

```
{
    estimateReference: {
        type: text,
        required: true
    }
}
```

#### Content

```
# Enter your estimate reference
hint text: Enter this reference to retrieve the details entered during the estimate.
```

#### Errors

| **Field**      | **Value**                                                 |
| -------------- | --------------------------------------------------------- |
| Description:   | User has selected 'Continue' without entering a reference |
| Error summary: | There is a problem                                        |
| Error message: | Enter your estimate reference to continue                 |
| Description:   | User has entered a non-numeric value                      |
| Error summary: | There is a problem                                        |
| Error message: | Enter a valid estimate reference number                   |

---

### Email entry

| **Field**              | **Value**                               |     |
| ---------------------- | --------------------------------------- | --- |
| Order number:          | 3                                       |     |
| Path:                  | /nrf-estimate-3/retrieve-estimate-email |     |
| Title:                 | Enter your email address                |     |
| Conditional page flow: | None                                    |     |

#### Data points

```
{
    email: {
        type: email,
        required: true
    }
}
```

#### Content

```
# Enter your email address
Hint text: We will send you a link so you can retrieve the details from your estimate.
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
| Path:                 | /nrf-estimate-3/estimate-email-retrieval-content |
| Title:                | Email sent to get magic link to access estimate  |
| Data points:          | None                                             |
| Conditional pageflow: | None                                             |

#### Content

```
<div class="govuk-inset-text">
    <p><strong>To:</strong> {{ data.email or 'user@example.com' }}</p>
    <p><strong>Subject:</strong> Nature Restoration Fund - retrieve your estimate details for the Nature Restoration Fund levy</p>
</div>

# Nature Restoration Fund – retrieve your estimate details for the Nature Restoration Fund levy

You can use the details you previously gave us for your estimate to fill in the information needed to commit to using Nature Restoration Fund levy.

[Retrieve the estimate details](http://testurl-to-my-nrf-service.com)

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the estimate reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

Find out about call charges at https://www.gov.uk/call-charges
```

---

### Check your answers summary and submit

| **Field**              | **Value**                                  |
| ---------------------- | ------------------------------------------ |
| Order number:          | 5                                          |
| Path:                  | /nrf-estimate-3/retrieved-estimate-summary |
| Title:                 | Check your answers                         |
| Conditional page flow: | None                                       |

#### Data points

None

#### Content

```

# Check your answers

| Estimate reference | [show estimate reference if provided] |
| Red line boundary added | [Show Yes/No] |
| Red line boundary file uploaded | [Show Yes/No] |
| Building types | [List all types picked here] |
| [IF they pick Dwelling THEN show] | Number of dwelling buildings |
| [IF they pick Hotel THEN show] | Number of hotel rooms |
| [IF they pick "House of multiple occupation (HMO)" THEN show] | Number of multiple occupation rooms |
| [IF they pick "Residential institution" THEN show] | Number of residential institution rooms |
| Email address | [show email address] |

Continue button at the bottom of the summary list.
```

#### Errors

None

---

### Details entry

| **Field**              | **Value**                       |
| ---------------------- | ------------------------------- |
| Order number:          | 6                               |
| Path:                  | /nrf-estimate-3/company-details |
| Title:                 | Enter the company details       |
| Conditional page flow: | None                            |

#### Data points

```
{
    fullName: {
        type: text,
        required: true
    },
    businessName: {
        type: text,
        required: false
    },
    addressLine1: {
        type: text,
        required: true
    },
    addressLine2: {
        type: text,
        required: false
    },
    townOrCity: {
        type: text,
        required: true
    },
    county: {
        type: text,
        required: false
    },
    postcode: {
        type: text,
        required: true
    },
    companyRegistrationNumber: {
        type: text,
        required: false
    },
    vatRegistrationNumber: {
        type: text,
        required: false
    }
}
```

#### Content

```
# Enter your details

Hint text: Enter the details for the individual or company who will be paying the Nature Restoration Fund Levy.

## Full Name

## Business name (optional)

## Address
Text:
Address line 1
Address line 2 (optional)
Town or city
County (optional)
Postcode

## Company Registration Number (CRN) (optional)

## VAT Registration number (optional)
```

#### Errors

| **Field**      | **Value**                                                       |
| -------------- | --------------------------------------------------------------- |
| Description:   | User has selected 'Continue' without entering a full name       |
| Error summary: | There is a problem                                              |
| Error message: | Enter your full name                                            |
| Description:   | User has selected 'Continue' without entering an address line 1 |
| Error summary: | There is a problem                                              |
| Error message: | Enter address line 1                                            |
| Description:   | User has selected 'Continue' without entering a town or city    |
| Error summary: | There is a problem                                              |
| Error message: | Enter a town or city                                            |
| Description:   | User has selected 'Continue' without entering a postcode        |
| Error summary: | There is a problem                                              |
| Error message: | Enter a postcode                                                |

---

### Confirm LPA

| **Field**              | **Value**                                               |
| ---------------------- | ------------------------------------------------------- |
| Order number:          | 7                                                       |
| Path:                  | /nrf-estimate-3/lpa-confirm                             |
| Title:                 | Confirm the name of your Local Planning Authority (LPA) |
| Conditional page flow: | None                                                    |

#### Content

```
# Confirm your Local Planning Authority (LPA)
Hint text: We will send your commitment to use the Nature Restoration Fund to this LPA.

Stockton-on-Tees Borough Council

CTA: Confirm

```

---

### Check your answers summary and submit

| **Field**              | **Value**                               |
| ---------------------- | --------------------------------------- |
| Order number:          | 8                                       |
| Path:                  | /nrf-estimate-3/summary-and-declaration |
| Title:                 | Check your answers                      |
| Conditional page flow: | None                                    |

#### Data points

None

#### Content

```
# Check your answers

| Estimate reference | [show estimate reference if provided] |
| Red line boundary added | [Show Yes/No] |
| Red line boundary file uploaded | [Show Yes/No] |
| Building types | [List all types picked here] |
| [IF they pick Dwelling THEN show] | Number of dwelling buildings |
| [IF they pick Hotel THEN show] | Number of hotel rooms |
| [IF they pick "House of multiple occupation (HMO)" THEN show] | Number of multiple occupation rooms |
| [IF they pick "Residential institution" THEN show] | Number of residential institution rooms |
| Email address | [show email address] |
| Your details | [show full name, business name if provided, address, Company Registration Number and VAT registration number] |
| Local Planning Authority| [Stockton-on-Tees Borough Council] |

Text: By confirming and submitting these details, you are committing to using the Nature Restoration Fund levy.
The details you are submitting must be accurate and correct.
By commiting to use this levy, you will be emailed a document that you can use in your planning application. The commitment is proof of how you intend to mitigate your environmental impact for nutrients.

CTA: Confirm and submit

```

#### Errors

None

---

### Details submitted confirmation page

| **Field**             | **Value**                        |
| --------------------- | -------------------------------- |
| Order number:         | 9                                |
| Path:                 | /nrf-estimate-3/confirmation     |
| Title:                | Your details have been submitted |
| Data points:          | None                             |
| Conditional pageflow: | None                             |

#### Content

```
<green banner>
# Your details have been submitted.

Commitment reference: [dynamically generated]
</green banner>

## What happens next

You will be sent an email with a commitment document that you can send to your Local Planning Authority to include in your planning application.

The document outlines your commitment to use the Nature Restoration Fund levy. To mitigate your environmental impact for nutrients.

## Get help with Nature Restoration Fund
If you need help with Nature Restoration Fund, contact XXXX and give the estimate reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

Find out about call charges at https://www.gov.uk/call-charges

Link: View the email content (links to /nrf-estimate-3/commit-email-content)
```

**Note:** The confirmation page uses conditional rendering based on `data.paymentReference` to display different content for commit journey vs estimate journey. The invoice journey content is shown when `data.paymentReference` exists.

#### Errors

None

---

### Email sent from the Nature Restoration Fund service

| **Field**             | **Value**                                           |
| --------------------- | --------------------------------------------------- |
| Order number:         | 10                                                  |
| Path:                 | /nrf-estimate-3/commit-email-content                |
| Title:                | Email sent from the Nature Restoration Fund service |
| Data points:          | None                                                |
| Conditional pageflow: | None                                                |

#### Content

```
<div class="govuk-inset-text">
To: [LPA email address - displays data.lpaEmail or defaults to 'user@example.com']
Subject: Nature Restoration Fund – commitment to use the Nature Restoration Fund levy
</div>

# Nature Restoration Fund – commitment to use the Nature Restoration Fund levy

**Commitment reference:** {{ data.commitmentReference }}

Attached is a commitment document that you can send to your Local Planning Authority to include in your planning application.

The document outlines your commitment to use the Nature Restoration Fund levy. To mitigate your environmental impact for nutrients.

You told us the development:

- is planned in an area {{ data.redlineBoundaryPolygon.intersectingCatchment or 'Thames Valley EDP' }}
- has {{ data.residentialBuildingCount }} dwelling buildings (if applicable), hotel buildings with a total of {{ data.roomCounts.hotelCount }} rooms (if applicable), house of multiple occupation buildings with a total of {{ data.roomCounts.hmoCount }} rooms (if applicable), and residential institution buildings with a total of {{ data.roomCounts.residentialInstitutionCount }} rooms (if applicable)

## What you will need to pay

Based on the information you have provided, the development falls into an area with an Enviromental Delivery Plan (EDP), so you can use the Nature Restoration Fund Nutrients Levy.

The estimated total amount you may need to pay if you develop in this area is:
£{{ data.levyAmount or '2,500' }}

You do not need to pay anything at this point, you can send the attached document to your Local Planning Authority to include in your planning application.

Keep this email as a record of your commitment to use the Nature Restoration Fund. You can use the commitment reference to retrieve this commitment when you are ready to pay.

[Pay your Nature Restoration Fund levy](/nrf-estimate-3/do-you-have-a-commitment-ref)

## What your levy will pay for

Your levy will be spent on conservation, with amounts being spent on monitoring and maintenance. There will also be an admin charge of £00 taken from the levy payment. Levies are calculated as part of Environmental Delivery Plans (EDPs).

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the estimate reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

Find out about call charges at https://www.gov.uk/call-charges
```

---

## Technical Requirements

### File Structure

Create the following files in the GOV.UK Prototype Kit structure:

1. **Route File**: `app/routes/nrf-estimate-3.js`
2. **View Directory**: `app/views/nrf-estimate-3/`
3. **View Files**: One HTML file per page in the journey
4. **Data File**: Uses existing session data structure

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

1. **Routes are integrated** into existing `app/routes/nrf-estimate-3.js` file
2. **Views are in** `app/views/nrf-estimate-3/` directory
3. **Form validation** is implemented with proper error handling
4. **Conditional routing** based on journey type
5. **Routes use** centralized route constants from `app/config/nrf-estimate-3/routes.js`
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

- **Journey entry point**: Accessed from payment-email.html page via link "Confirm payment and request an invoice"
- **Shared confirmation page**: The confirmation.html page is shared between estimate and payment journeys with conditional content display
- **Dynamic content**: Levies and their impacts are displayed dynamically based on user selections
- **Levy naming**: Uses "greater crested newts" terminology instead of just "newts"
- **Data structure**: Uses `leviesSelected` array and `lpaEmail` field for data storage. Company details stored in `fullName`, `businessName`, `addressLine1`, `addressLine2`, `townOrCity`, `county`, `postcode`
- **Route organization**: All routes integrated into existing nrf-estimate-3.js file with proper separation of concerns
- **Email template**: Invoice email content is available as a separate viewable page for reference
- **Path naming**: All paths use lowercase with hyphens (e.g., `/company-details`, `/lpa-email`, `/summary-and-declaration`)
- **Company details page**: New page in the invoice journey flow between confirm and LPA email entry
- **Route conflict resolution**: The retrieved estimate summary page uses `/nrf-estimate-3/retrieved-estimate-summary` instead of `/nrf-estimate-3/commit-summary` to avoid conflict with the existing payment journey commit-summary route
