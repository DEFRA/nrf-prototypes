# Create NRF Payment journey with reference in GOV.UK Prototype Kit

## Journey Information

- **Journey Name**: Pay Nature Restoration Fund Levy
- **Journey Description**:  
  A user journey for a developer to pay for the Nature Restoration Fund levy required when submitting planning permission to build a development of some sort.
- **Journey Route Prefix**: nrf-estimate-1
- **Start Page Title**: Get an estimate for Nature Restoration Fund Levy

## Page Flow and Conditional Logic

### Do you have a commitment reference?

| **Field**              | **Value**                                    |
| ---------------------- | -------------------------------------------- |
| Order number:          | 1                                            |
| Path:                  | /nrf-estimate-1/do-you-have-a-commitment-ref |
| Title:                 | Do you have a commitment reference?          |
| Conditional page flow: | none                                         |

#### Data points

```
{
    application: {
        hasCommitmentRef: {
            type: radios
            required: true
            values: "yes" | "no"
        }
    }
}
```

#### Content

```
# Do you have a commitment reference?
- Yes
- No
```

#### Errors

| **Field**      | **Value**                                               |
| -------------- | ------------------------------------------------------- |
| Description:   | User has selected ‘Continue’ without choosing an option |
| Error summary: | There is a problem                                      |
| Error message: | Select yes if you have a commitment reference           |

---

### Enter your commitment reference

| **Field**              | **Value**                            |
| ---------------------- | ------------------------------------ |
| Order number:          | 2                                    |
| Path:                  | /nrf-estimate-1/enter-commitment-ref |
| Title:                 | Enter your commitment reference      |
| Conditional page flow: | none                                 |

#### Data points

```
{
    application: {
        commitmentRef: {
            type: text,
            required: true
        }
    }
}
```

#### Content

```
# Enter your commitment reference
hint text: Enter this reference to retrieve the details entered when you commited to using Nature Restoration Fund.
```

#### Errors

| **Field**      | **Value**                                                 |
| -------------- | --------------------------------------------------------- |
| Description:   | User has selected 'Continue' without entering a reference |
| Error summary: | There is a problem                                        |
| Error message: | Enter your commitment reference to continue               |
| Description:   | User has entered a non-numeric value                      |
| Error summary: | There is a problem                                        |
| Error message: | Enter a valid commitment reference number                 |

---

### Email entry

| **Field**              | **Value**                                 |     |
| ---------------------- | ----------------------------------------- | --- |
| Order number:          | 3                                         |     |
| Path:                  | /nrf-estimate-1/retrieve-commitment-email |     |
| Title:                 | Enter your email address                  |     |
| Conditional page flow: | None                                      |     |

#### Data points

```
{
    applicant: {
        email: {
            type: email,
            required: true
        }
    }
}
```

#### Content

```
# Enter your email address
Hint text: We will send you a link so you can retrieve the details from your commitment to use Nature Restoration Fund levy.
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

### Email sent with magic link to commitment

| **Field**             | **Value**                                          |
| --------------------- | -------------------------------------------------- |
| Order number:         | 4                                                  |
| Path:                 | /nrf-estimate-1/commitment-email-retrieval-content |
| Title:                | Email sent to get magic link to access commitment  |
| Data points:          | None                                               |
| Conditional pageflow: | None                                               |

#### Content

```
<div class="govuk-inset-text">
    <p><strong>To:</strong> {{ data.email or 'user@example.com' }}</p>
    <p><strong>Subject:</strong> Nature Restoration Fund - retrieve your commitment details for the Nature Restoration Fund levy</p>
</div>

# Nature Restoration Fund – retrieve your commitment details for the Nature Restoration Fund levy

You can use the details you previously gave us for your commitment to complete the information needed for your levy payment.

[Retrieve the commitment details](/nrf-estimate-1/commit-summary)

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the estimate reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

Find out about call charges at https://www.gov.uk/call-charges
```

---

### Check your answers summary

| **Field**              | **Value**                      |
| ---------------------- | ------------------------------ |
| Order number:          | 5                              |
| Path:                  | /nrf-estimate-1/commit-summary |
| Title:                 | Check your answers             |
| Conditional page flow: | None                           |

#### Data points

None

#### Content

```

# Check your answers

| Commitment reference | [show commitment reference] |
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

Continue button at the bottom of the summary list.
```

#### Errors

None

---

### Planning ref entry

| **Field**              | **Value**                                 |     |
| ---------------------- | ----------------------------------------- | --- |
| Order number:          | 6                                         |     |
| Path:                  | /nrf-estimate-1/planning-ref              |     |
| Title:                 | Enter your planning application reference |     |
| Conditional page flow: | None                                      |     |

#### Data points

```

{
applicant: {
planningRef: {
type: text,
required: true
}
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
| Path:                  | /nrf-estimate-1/commit-summary-submit |
| Title:                 | Check your answers                    |
| Conditional page flow: | None                                  |

#### Data points

None

#### Content

```

# Check your answers

| Commitment reference | [show commitment reference if provided] |
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
| Planning reference | [show planning reference |

Text: By confirming and submitting these details, you are agreeing to pay the Nature Restoration Fund levy.
The details you are submitting must be accurate and correct.
You will be emailed an invoice which you must pay.
You will then receive a receipt and you can use it to discharge your environmental obligations.

Your Nature Restoration Fund Nutrient levy amount is £2,500.

CTA: Confirm and submit
```

#### Errors

None

---

### Details submitted confirmation page

| **Field**             | **Value**                        |
| --------------------- | -------------------------------- |
| Order number:         | 8                                |
| Path:                 | /nrf-estimate-1/confirmation     |
| Title:                | Your details have been submitted |
| Data points:          | None                             |
| Conditional pageflow: | None                             |

#### Content

```
<green banner>
# Your details have been submitted.

Payment reference: [dynamically generated]
</green banner>

## What happens next

Your Local Planning Authority will review your details.
You will receive an email with an invoice and details of how you can pay. You should receive this email within 0 working days.

Once you have paid, you will be sent an email with a receipt which you can use as evidence for your planning application to discharge your obligation.

You told us the development:
* is planned in an area {{ data.redlineBoundaryPolygon.intersectingCatchment or 'Unknown' }}
* has [dynamic list of building types with counts, e.g., "5 dwellinghouse buildings, 20 hotel rooms, 10 house of multiple occupation (HMO) rooms"]

## What you need to pay

Based on the information you have provided, the development falls into the catchment area for the Nature Restoration Fund Nutrients Levy.

The total amount you need to pay is:

**£{{ data.levyAmount or '2,500' }}**

## What your levy will pay for

Your levy will be spent on conservation, with amounts being spent on monitoring and maintenance. There will also be an admin charge of £00 taken from the levy payment.

Levies are calculated as part of Environmental Delivery Plans (EDPs).

## Get help with Nature Restoration Fund
If you need help with Nature Restoration Fund, contact XXXX and give the estimate reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

Find out about call charges at https://www.gov.uk/call-charges

Link: View the email content (links to /nrf-estimate-2/invoice-email-content)
```

**Note:** The confirmation page uses conditional rendering based on `data.paymentReference` to display different content for invoice journey vs estimate journey. The invoice journey content is shown when `data.paymentReference` exists.

#### Errors

None

---

### Email sent from the Nature Restoration Fund service

| **Field**             | **Value**                                           |
| --------------------- | --------------------------------------------------- |
| Order number:         | 9                                                   |
| Path:                 | /nrf-estimate-1/invoice-email-content               |
| Title:                | Email sent from the Nature Restoration Fund service |
| Data points:          | None                                                |
| Conditional pageflow: | None                                                |

#### Content

```
<div class="govuk-inset-text">
To: [LPA email address - displays data.lpaEmail or defaults to 'user@example.com']
Subject: Nature Restoration Fund – payment for the Nature Restoration Fund levy
</div>

# Nature Restoration Fund – payment for the Nature Restoration Fund levy

**Payment reference:** {{ data.paymentReference }}

Thank you for using Nature Restoration Fund Levy to mitigate your environmental impact.
An invoice for the total amount of the levy is attached.

You have agreed to pay the following:

Nature Restoration Fund nutrients levy: £2,500

Your levy will be spent on conservation, with amounts being spent on monitoring and maintenance. There will also be an admin charge of £00 taken from the levy payment. Levies are calculated as part of Environmental Delivery Plans (EDPs).

## Ways to pay

You can pay your levy by using a bank transfer or by using Gov pay.

### Paying by bank transfer
You can make a transfer from a bank account by Faster Payments, Bacs or CHAPS. Use the payee details, sort code and account number on the invoice to make the payment. Use the payment reference as the reference when you make the transfer.

### Paying using GOV.UK Pay

You can use GOV.UK Pay to pay your levy, you will need a bank card or credit card to make this payment.

[Link: Pay your levy using GOV.UK Pay] (placeholder link with href="#")

### Paying by instalments

You can request to pay your levy in instalments.

## What happens next

Once you have paid, you will be sent an email with a receipt which you can use as evidence for your planning application to discharge your obligation.

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

1. **Route File**: `app/routes/nrf-estimate-1.js`
2. **View Directory**: `app/views/nrf-estimate-1/`
3. **View Files**: One HTML file per page in the journey
4. **Data File**: `app/data/nrf-estimate-1-data.js` (if needed)

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
5. **Update the main routes.js** to include the new journey routes
6. **Test the complete journey** to ensure all paths work correctly

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
