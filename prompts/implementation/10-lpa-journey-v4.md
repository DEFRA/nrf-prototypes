# Create LPA journey with reference in GOV.UK Prototype Kit

## Journey Information

- **Journey Name**: LPA approve developer request to pay NRF
- **Journey Description**:  
  A user journey for the LPA to check and approve or reject the details sent from the developer. This version adds a rejection flow alongside the existing approval flow.
- **Journey Route Prefix**: lpa-approve-4

## Page Flow and Conditional Logic

### Email sent from the Nature Restoration Fund service

| **Field**             | **Value**                                                  |
| --------------------- | ---------------------------------------------------------- |
| Order number:         | 1                                                          |
| Path:                 | /lpa-approve-4/lpa-approval-email-content                  |
| Title:                | Email sent from the Nature Restoration Fund service to LPA |
| Data points:          | None                                                       |
| Conditional pageflow: | None                                                       |

#### Content

```
<inset-text>
**To:** lpa@example.com
**Subject:** Nature Restoration Fund – Approve request to pay the Nature Restoration Fund levy
</inset-text>

# Nature Restoration Fund – Approve request to pay the Nature Restoration Fund levy

**NRF reference:** 0006677
**Planning reference:** APP/2025/24019/FUL

You need to review and approve the request to pay the Nature Restoration Fund levy from Acme Developments.

Approving the request will enable Acme Developments to use Nature Restoration Fund levy to mitigate their environmental impact.

They have agreed to pay the following:

- Nature Restoration Fund nutrients levy: £2,500

[View and approve the Nature Restoration Fund levy](/lpa-approve-4/confirm-view-approve)

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the NRF reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

Find out about call charges: [https://www.gov.uk/call-charges](https://www.gov.uk/call-charges)

```

#### Errors

None

---

### Confirm NRF

| **Field**                  | **Value**                                                                       |
| -------------------------- | ------------------------------------------------------------------------------- |
| **Order number:**          | 2                                                                               |
| **Path:**                  | /lpa-approve-4/confirm-view-approve                                             |
| **Title:**                 | Confirm you want to view and approve these Nature Restoration Fund levy details |
| **Conditional page flow:** | none                                                                            |

#### Content

```
# Confirm you want to view and approve these Nature Restoration Fund levy details.

Hint text: You will receive an email with a link.

**Summary list:**

| NRF reference | 0006677 |
| Business name | Acme Developments |
| Planning reference | APP/2025/24019/FUL |

**Button:** Confirm (links to `/lpa-approve-4/lpa-approval-email-magiclink`)
```

#### Errors

None

---

### Email with magic link sent from the Nature Restoration Fund service

| **Field**             | **Value**                                                                  |
| --------------------- | -------------------------------------------------------------------------- |
| Order number:         | 3                                                                          |
| Path:                 | /lpa-approve-4/lpa-approval-email-magiclink                                |
| Title:                | Email with magic link sent from the Nature Restoration Fund service to LPA |
| Data points:          | None                                                                       |
| Conditional pageflow: | None                                                                       |

#### Content

```
<inset-text>
**To:** lpa@example.com
**Subject:** Nature Restoration Fund – View details: Approve request to pay the Nature Restoration Fund levy
</inset-text>

# Nature Restoration Fund – View details: Approve request to pay the Nature Restoration Fund levy

**NRF reference:** 0006677
**Planning reference:** APP/2025/24019/FUL

You need to review and approve the request to pay the Nature Restoration Fund levy from Acme Developments.

Use the link provided to view and approve the Nature Restoration Fund details.

[View details](/lpa-approve-4/approve-details)

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the NRF reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

Find out about call charges: [https://www.gov.uk/call-charges](https://www.gov.uk/call-charges)

```

#### Errors

None

---

### Approve or reject these details

| **Field**              | **Value**                      |
| ---------------------- | ------------------------------ |
| Order number:          | 4                              |
| Path:                  | /lpa-approve-4/approve-details |
| Title:                 | Approve these details          |
| Data points:           | None                           |
| Conditional page flow: | Approve → `/lpa-approve-4/lpa-details`; Reject → `/lpa-approve-4/lpa-details-2` |

#### Content

Note: Use a table or list pattern with no change links for displaying the details. Includes an interactive MapLibre map showing the red line boundary of the development.

```

# Approve these details

## Red line boundary of development
[Map displaying red line boundary - interactive MapLibre map with red line boundary polygon displayed]

**Summary list:**

| Nature Restoration Fund levy confirmed | Nature Restoration Fund nutrients levy: £2,500 |
| Developer Details | Bob Acme, Acme Developments, 1 Willow Lane, London, N1 9HG, Company Registration Number (CRN): 12345678, VAT registration number: GB123456789 |
| Building types | Dwelling |
| Number of dwelling buildings | 100 |
| Waste water treatment works | Great Billing WRC |
| Developer email address | admin@acme.co.uk |
| Planning reference | APP/2025/24019/FUL |

[Download these details](#)

Check these details against the details submitted as part of the planning permission application APP/2025/24019/FUL by Acme Development.
Approving these details will enable Acme Developments to pay the Nature Restoration Fund levy to mitigate their environmental impact.

**Button:** Approve (links to `/lpa-approve-4/lpa-details`)
**Button (secondary):** Reject (links to `/lpa-approve-4/lpa-details-2`)

```

#### Errors

None

---

### Details entry (approve path)

| **Field**              | **Value**                  |
| ---------------------- | -------------------------- |
| Order number:          | 5                          |
| Path:                  | /lpa-approve-4/lpa-details |
| Title:                 | Enter your details         |
| H1 heading:            | Enter your details         |
| Conditional page flow: | None                       |

#### Data points

```
{
    fullName: {
        type: text,
        required: true,
        fieldName: "full-name"
    },
    email: {
        type: email,
        required: true,
        fieldName: "email"
    }
}
```

#### Content

```
# Enter your details

Hint text: Enter your details to create a record of who approved the request.

## Full name
Field name: fullName

## Email address
Field name: email


CTA: Continue
```

#### Errors

| **Field**      | **Value**                                                           |
| -------------- | ------------------------------------------------------------------- |
| Description:   | User has selected 'Continue' without entering a full name           |
| Error summary: | There is a problem                                                  |
| Error message: | Enter your full name                                                |
| Description:   | User has selected 'Continue' without entering any details           |
| Error summary: | There is a problem                                                  |
| Error message: | Enter your email address to continue                                |
| Description:   | Incorrect email format                                              |
| Error summary: | There is a problem                                                  |
| Error message: | Enter an email address in the correct format, like name@example.com |

---

### Details approved confirmation page

| **Field**             | **Value**                            |
| --------------------- | ------------------------------------ |
| Order number:         | 6                                    |
| Path:                 | /lpa-approve-4/approval-confirmation |
| Title:                | The details have been approved       |
| Data points:          | None                                 |
| Conditional pageflow: | None                                 |

#### Content

```
<green-panel>
Title: The details have been approved
Approval reference: **APPROVAL-001**
</green-panel>

You have approved the Nature Restoration Fund levy for Bob Acme at Acme Developments.

Approval to pay the levy will be sent to admin@acme.co.uk.

They have agreed to pay the following:

- Nature Restoration Fund nutrients levy: £2,500

## What happens next

Once Acme Developments has paid, you will be sent an email with a receipt which you can use when discharging their planning conditions.

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the NRF reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

Find out about call charges: [https://www.gov.uk/call-charges](https://www.gov.uk/call-charges)

[View the email content](/lpa-approve-4/lpa-approval-confirmation-email)
```

#### Errors

None

---

### Email Nature Restoration Fund service approval confirmation

| **Field**             | **Value**                                                            |
| --------------------- | -------------------------------------------------------------------- |
| Order number:         | 7                                                                    |
| Path:                 | /lpa-approve-4/lpa-approval-confirmation-email                       |
| Title:                | Email from Nature Restoration Fund service for approval confirmation |
| Data points:          | None                                                                 |
| Conditional pageflow: | None                                                                 |

#### Content

```
<inset-text>
**To:** lpa@example.com
**Subject:** Nature Restoration Fund – Confirmation: Approved request to pay the Nature Restoration Fund levy
</inset-text>

# Nature Restoration Fund – Confirmation: Approved request to pay the Nature Restoration Fund levy

You have approved the Nature Restoration Fund levy for Bob Acme at Acme Developments.

Approval to pay the levy will be sent to admin@acme.co.uk.

They have agreed to pay the following:

- Nature Restoration Fund nutrients levy: £2,500

## What happens next

Once Acme Developments has paid, you will be sent an email with a receipt which you can use when discharging their planning conditions.

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the NRF reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

Find out about call charges: [https://www.gov.uk/call-charges](https://www.gov.uk/call-charges)

```

#### Errors

None

---

### Details entry (reject path)

| **Field**              | **Value**                    |
| ---------------------- | ---------------------------- |
| Order number:          | 5b                           |
| Path:                  | /lpa-approve-4/lpa-details-2 |
| Title:                 | Enter your details           |
| H1 heading:            | Enter your details           |
| Conditional page flow: | None                         |

#### Data points

```
{
    fullName: {
        type: text,
        required: true,
        fieldName: "full-name"
    },
    email: {
        type: email,
        required: true,
        fieldName: "email"
    }
}
```

#### Content

```
# Enter your details

Hint text: Enter your details to create a record of who rejected the request.

## Full name
Field name: fullName

## Email address
Field name: email

CTA: Continue (links to `/lpa-approve-4/reason-for-rejecting`)
```

#### Errors

| **Field**      | **Value**                                                           |
| -------------- | ------------------------------------------------------------------- |
| Description:   | User has selected 'Continue' without entering a full name           |
| Error summary: | There is a problem                                                  |
| Error message: | Enter your full name                                                |
| Description:   | User has selected 'Continue' without entering any details           |
| Error summary: | There is a problem                                                  |
| Error message: | Enter your email address to continue                                |
| Description:   | Incorrect email format                                              |
| Error summary: | There is a problem                                                  |
| Error message: | Enter an email address in the correct format, like name@example.com |

---

### Reason for rejecting

| **Field**              | **Value**                                            |
| ---------------------- | ---------------------------------------------------- |
| Order number:          | 6b                                                   |
| Path:                  | /lpa-approve-4/reason-for-rejecting                  |
| Title:                 | Tell the developer why you have rejected the details |
| H1 heading:            | Tell the developer why you have rejected the details |
| Conditional page flow: | None                                                 |

#### Data points

```
{
    rejectionReason: {
        type: textarea,
        required: true,
        fieldName: "rejection-reason",
        id: "rejection-reason"
    }
}
```

#### Content

```
# Tell the developer why you have rejected the details

Hint text: Send the reason for your rejection to the developer

Field: rejectionReason (textarea)

CTA: Continue (links to `/lpa-approve-4/reject-confirmation`)
```

#### Errors

| **Field**      | **Value**                                              |
| -------------- | ------------------------------------------------------ |
| Description:   | User has selected 'Continue' without entering a reason |
| Error summary: | There is a problem                                     |
| Error message: | Enter your reason for rejecting this request           |

---

### Details rejected confirmation page

| **Field**             | **Value**                          |
| --------------------- | ---------------------------------- |
| Order number:         | 7b                                 |
| Path:                 | /lpa-approve-4/reject-confirmation |
| Title:                | The details have been rejected     |
| Data points:          | None                               |
| Conditional pageflow: | None                               |

#### Content

```
<green-panel>
Title: The details have been rejected
Rejection reference: **REJECTION-001**
</green-panel>

You have rejected the request to pay the Nature Restoration Fund levy for Bob Acme at Acme Developments.

A rejection notice will be sent to admin@acme.co.uk.

They were requesting to pay the following:

- Nature Restoration Fund nutrients levy: £2,500

## What happens next

Once Acme Developments has adjusted their details, you will receive an email and will be asked to approve the new details.

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the NRF reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

Find out about call charges: [https://www.gov.uk/call-charges](https://www.gov.uk/call-charges)

[View the email content](/lpa-approve-4/lpa-rejection-confirmation-email)
```

#### Errors

None

---

### Email Nature Restoration Fund service rejection confirmation

| **Field**             | **Value**                                                             |
| --------------------- | --------------------------------------------------------------------- |
| Order number:         | 8b                                                                    |
| Path:                 | /lpa-approve-4/lpa-rejection-confirmation-email                       |
| Title:                | Email from Nature Restoration Fund service for rejection confirmation |
| Data points:          | None                                                                  |
| Conditional pageflow: | None                                                                  |

#### Content

```
<inset-text>
**To:** lpa@example.com
**Subject:** Nature Restoration Fund – Confirmation: rejected request to pay the Nature Restoration Fund levy
</inset-text>

# Nature Restoration Fund – Confirmation: rejected request to pay the Nature Restoration Fund levy

You have rejected the request to pay the Nature Restoration Fund levy for Bob Acme at Acme Developments.

A rejection notice will be sent to admin@acme.co.uk.

They were requesting to pay the following:

- Nature Restoration Fund nutrients levy: £2,500

## What happens next

Once Acme Developments has adjusted their details, you will receive an email and will be asked to approve the new details.

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the NRF reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

Find out about call charges: [https://www.gov.uk/call-charges](https://www.gov.uk/call-charges)

```

#### Errors

None

---

## Technical Requirements

### File Structure

1. **Route File**: `app/routes/lpa-approve-4.js`
2. **View Directory**: `app/views/lpa-approve-4/`
3. **View Files**: One HTML file per page in the journey
4. **Route Config File**: `app/config/lpa-approve-4/routes.js`
5. **Data File**: Uses existing session data structure

### Route Implementation

- Use GOV.UK Prototype Kit router setup
- Implement GET routes for displaying pages
- Implement POST routes for form submissions on `lpa-details`, `lpa-details-2`, and `reason-for-rejecting`
- Include back links on each page

### View Implementation

- Extend `layouts/main.html` from GOV.UK Prototype Kit
- Use GOV.UK Frontend components and classes
- Use button links for navigation on click-through pages
- Implement proper navigation between pages with back links

### Data Handling

- Store `lpaFullName`, `lpaEmail`, and `lpaRejectionReason` in session data
- Validate form inputs on `lpa-details`, `lpa-details-2`, and `reason-for-rejecting`

### GOV.UK Design System Compliance

- Use proper GOV.UK Frontend components
- Follow GOV.UK content guidelines
- Implement proper heading hierarchy
- Ensure accessibility compliance

### Conditional Logic Implementation

- `approve-details`: Approve button → `lpa-details`; Reject button → `lpa-details-2`
- `lpa-details`: Continue → `approval-confirmation`
- `lpa-details-2`: Continue → `reason-for-rejecting`
- `reason-for-rejecting`: Continue → `reject-confirmation`

## Implementation Instructions

1. **Routes are in** `app/routes/lpa-approve-4.js`
2. **Views are in** `app/views/lpa-approve-4/` directory
3. **Form validation** required on `lpa-details`, `lpa-details-2`, and `reason-for-rejecting`
4. **Two branching paths** from `approve-details`: approve flow and reject flow
5. **Routes use** centralized route constants from `app/config/lpa-approve-4/routes.js`
6. **Route registration**: Add `lpa-approve-4` to `app/config/shared/journeys.js`

## Expected Output

- Complete working user journey with all pages including approve and reject paths
- GOV.UK design system compliance
- Back links on all pages including email confirmations
- Clean, maintainable code structure
- Static content with hardcoded values
- Interactive MapLibre map on the `approve-details` page

## Notes

- This is for rapid prototyping, so focus on user experience over security
- Focus on demonstrating the user flow and interface design for both approve and reject paths
- Ensure the journey works end-to-end for user testing
- All pages use hardcoded values - no dynamic content

## Implementation Details

- **Journey entry point**: Accessed via the payment email issued by the developer payment journey
- **Static content**: All content uses hardcoded values - no dynamic data binding
- **Map**: `approve-details` page uses MapLibre GL JS with an OpenStreetMap base layer and a red line boundary polygon
- **Email template**: Email content pages follow standard inset-text pattern with recipient and subject
- **Path naming**: All paths use lowercase with hyphens
- **Back links**: All pages include back links, including email confirmation pages
- **Two branching paths**: Approve path (orders 5–7) and Reject path (orders 5b–8b) both originate from `approve-details`
