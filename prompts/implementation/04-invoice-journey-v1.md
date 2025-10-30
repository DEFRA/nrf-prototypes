# Create NRF Payment journey with reference in GOV.UK Prototype Kit

## Journey Information

- **Journey Name**: Commit to pay and get an invoice for Nature Restoration Fund Levy
- **Journey Description**:  
  A user journey for a developer to commit to pay and get an invoice for the Nature Restoration Fund levy. This journey starts when the link 'Commit to pay and get an invoice' is clicked in the email.
- **Journey Route Prefix**: nrf-estimate-1
- **Start Page Title**: Get an estimate for Nature Restoration Fund Levy

## Page Flow and Conditional Logic

### Which NRF

| **Field**                  | **Value**               |
| -------------------------- | ----------------------- |
| **Order number:**          | 1                       |
| **Path:**                  | /nrf-estimate-1/which   |
| **Title:**                 | Nature Restoration Fund |
| **Conditional page flow:** | none                    |

#### Data points

```
{
    application: {
        journeyType: {
            type: checkboxes
            required: true
            values: "Nature Restoration Fund newts levy: £2,500" | "Nature Restoration Fund nutrients levy: £2,500"
        }
    }
}
```

#### Content

```
# Which Nature Restoration Fund levies would you like to pay?
Hint text: If you don't use Nature Restoration Fund to mitigate your environmental impact, you will still need to mitigate in another way. Learn about other ways to mitigate.
Select all that apply:
- Nature Restoration Fund newts levy: £2,500
- Nature Restoration Fund nutrients levy: £2,500
```

#### Errors

| **Field**      | **Value**                                               |
| -------------- | ------------------------------------------------------- |
| Description:   | User has selected ‘Continue’ without choosing an option |
| Error summary: | There is a problem                                      |
| Error message: | Select the levy you would like to pay                   |

---

### Confirm NRF

| **Field**                  | **Value**               |
| -------------------------- | ----------------------- |
| **Order number:**          | 2                       |
| **Path:**                  | /nrf-estimate-1/confirm |
| **Title:**                 | Nature Restoration Fund |
| **Conditional page flow:** | none                    |

#### Data points

```
{
    application: {
        journeyType: {
            type: confirm
            required: true
            values: "Nature Restoration Fund newts levy: £2,500"
        }
    }
}
```

#### Content

```
# Confirm that you want to commit to paying this Nature Restoration Fund levy
Hint text: Paying this levy will mitigate your environmental impact for newts.

text: Nature Restoration Fund newts levy: £2,500
CTA: Confirm
```

#### Errors

| **Field**      | **Value**                                              |
| -------------- | ------------------------------------------------------ |
| Description:   | User has selected ‘Confirm’ without choosing an option |
| Error summary: | There is a problem                                     |
| Error message: | Confirm the levy you would like to pay                 |

---

### Email entry

| **Field**              | **Value**                                                               |
| ---------------------- | ----------------------------------------------------------------------- |
| Order number:          | 3                                                                       |
| Path:                  | /nrf-estimate-1/LPAemail                                                |
| Title:                 | Enter the email address for your Local Planning Authority (LPA) contact |
| Conditional page flow: | None                                                                    |

#### Data points

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
# Enter the email address for your Local Planning Authority (LPA) contact
Text: Enter the email address for the person that is responsible for your planning application. We will also send a copy to: email@email.co.uk

Once the LPA contact has approved your commitment to use Nature Restoration Fund levy, you will receive an email with an invoice.
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

### Check your answers summary and submit

| **Field**              | **Value**                             |
| ---------------------- | ------------------------------------- |
| Order number:          | 4                                     |
| Path:                  | /nrf-estimate-1/summaryanddeclaration |
| Title:                 | Check your answers                    |
| Conditional page flow: | None                                  |

#### Data points

None

#### Content

```
# Check your answers

| Nature Restoration Fund levy confirmed | [Name of levy] |
| Email address of Local Planning Authority contact| [show email address] |

Text: By confirming and submitting these details you are committing to paying the Nature Restoration Fund levy.
Paying this levy will mitigate your environmental impact for newts.
Nature Restoration Fund newts levy: £2,500

CTA: Confirm and submit

```

#### Errors

None

---

### Details submitted confirmation page

| **Field**             | **Value**                         |
| --------------------- | --------------------------------- |
| Order number:         | 5                                 |
| Path:                 | /nrf-estimate-1/confirmation page |
| Title:                | Details submitted                 |
| Data points:          | None                              |
| Conditional pageflow: | None                              |

#### Content

```
<green banner>
# Your details have been submitted.

Payment reference: 000000
</green banner>

## What happens next

Your Local Planning Authority will review and approve your commitment to use the Nature Restoration Fund levy. If approved, this will mitigate your environmental impact on newts and nutrients.

You will receive an email with an invoice and details of how you can pay.

Once you have paid, you will be sent an email with a receipt which you can use as evidence for your planning application to discharge your obligation.

## Get help with Nature Restoration Fund
If you need help with Nature Restoration Fund, contact XXXX and give the estimate reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

Find out about call charges at https://www.gov.uk/call-charges
```

#### Errors

None

---

### Email sent from the Nature Restoration Fund service

| **Field**             | **Value**                                           |
| --------------------- | --------------------------------------------------- |
| Order number:         | 6                                                   |
| Path:                 | /nrf-estimate-1/invoice-email-content               |
| Title:                | Email sent from the Nature Restoration Fund service |
| Data points:          | None                                                |
| Conditional pageflow: | None                                                |

#### Content

```
# Nature Restoration Fund – payment for the Nature Restoration Fund levy

Payment reference: {{ data.estimateReference }}

Thank you for using Nature Restoration Fund Levy to mitigate your environmental impact.
An invoice for the total amount of the levy is attached.

You have agreed to pay the following:

Nature Restoration Fund newts levy : £2,500
Nature Restoration Fund nutrients levy : £2,500

Your levy will be spent on conservation, with amounts being spent on monitoring and maintenance. There will also be an admin charge of £00 taken from the levy payment. Levies are calculated as part of Environmental Delivery Plans (EDPs).

## Ways to pay

You can pay your levy by using a bank transfer or by using Gov pay.

### Paying by bank transfer
You can make a transfer from a bank account by Faster Payments, Bacs or CHAPS. Use the payee details, sort code and account number on the invoice to make the payment. Use the payment reference as the reference when you make the transfer.

### Paying using GOV.UK Pay

You can use GOV.UK Pay to pay your levy, you will need a bank card or credit card to make this payment.

Pay your levy using GOV.UK Pay

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
