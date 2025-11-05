# Create LPA journey with reference in GOV.UK Prototype Kit

## Journey Information

- **Journey Name**: LPA approve developer request to pay NRF
- **Journey Description**:  
  A user journey for the LPA to check and approve the details sent from the developer.
- **Journey Route Prefix**: LPA-approve-1

## Page Flow and Conditional Logic

### Email sent from the Nature Restoration Fund service

| **Field**             | **Value**                                                  |
| --------------------- | ---------------------------------------------------------- |
| Order number:         | 1                                                          |
| Path:                 | /LPA-approve-1/LPA-email-content                           |
| Title:                | Email sent from the Nature Restoration Fund service to LPA |
| Data points:          | None                                                       |
| Conditional pageflow: | None                                                       |

#### Content

```
To: [LPA email address]
Subject: Nature Restoration Fund – Approve request to pay the Nature Restoration Fund levy

# Nature Restoration Fund – Approve request to pay the Nature Restoration Fund levy

Payment reference: 0006677

You need to approve the request to use the Nature Restoration Fund levy for Acme Developments.

They have agreed to pay the following:

Nature Restoration Fund greater crested newts levy :£2,500
Nature Restoration Fund nutrients levy :£2,500

[Approve the Nature Restoration Fund levy](/LPA-approve-1/confirm-view-approve)

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

### Confirm NRF

| **Field**                  | **Value**                                                                       |
| -------------------------- | ------------------------------------------------------------------------------- |
| **Order number:**          | 2                                                                               |
| **Path:**                  | /LPA-approve-1/confirm-view-approve                                             |
| **Title:**                 | Confirm you want to view and approve these Nature Restoration Fund levy details |
| **Conditional page flow:** | none                                                                            |

#### Content

```
# Confirm you want to view and approve these Nature Restoration Fund levy details.
Hint text: You will receive an email with a link.

Payment reference: 0006677
Business name: Acme Developments


CTA: Confirm
```

#### Errors

None

---

### Email with magic link sent from the Nature Restoration Fund service

| **Field**             | **Value**                                                                  |
| --------------------- | -------------------------------------------------------------------------- |
| Order number:         | 3                                                                          |
| Path:                 | /LPA-approve-1/LPA-email-magiclink                                         |
| Title:                | Email with magic link sent from the Nature Restoration Fund service to LPA |
| Data points:          | None                                                                       |
| Conditional pageflow: | None                                                                       |

#### Content

```
To: [LPA email address]
Subject: Nature Restoration Fund – View details: Approve request to pay the Nature Restoration Fund levy

# Nature Restoration Fund – View details: Approve request to pay the Nature Restoration Fund levy

Payment reference: 0006677

You need to approve the request to use the Nature Restoration Fund levy for Acme Developments.

Use the link provided to view and approve the Nature Restoration Fund details.

[View details](/LPA-approve-1/approve)

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

### Approve these details

| **Field**              | **Value**              |
| ---------------------- | ---------------------- |
| Order number:          | 4                      |
| Path:                  | /LPA-approve-1/approve |
| Title:                 | Approve these details  |
| Conditional page flow: | None                   |

{use a table or list pattern with no change links}

#### Content

```
# Approve these details

[Map displaying red line boundary]

| Nature Restoration Fund levy confirmed | Nature Restoration Fund greater crested newts levy: £2,500, Nature Restoration Fund nutrients levy: £2,500 |
| Developer Details | Bob Acme, Acme Developments, 1 Willow Lane, London, N1 9HG|
| Building types | Dwelling |
| Number of dwelling buildings | 100 |
| Developer email address | admin@acme.co.uk |

CTA: Approve

```

#### Errors

None

---

### Details approved confirmation page

| **Field**             | **Value**                      |
| --------------------- | ------------------------------ |
| Order number:         | 5                              |
| Path:                 | /LPA-approve-1/approved        |
| Title:                | The details have been approved |
| Data points:          | None                           |
| Conditional pageflow: | None                           |

#### Content

```
<green banner>
# The details have been approved.

Approval reference: [randomly generated]
</green banner>

You have approved the Nature Restoration Fund levy for Bob Acme at Acme Developments.

An invoice for the total amount of the levy has been sent to admin@acme.co.uk.

They have agreed to pay the following:

Nature Restoration Fund great crested newts levy : £2,500
Nature Restoration Fund nutrients levy : £2,500

## What happens next

Once Acme Developments has paid, you will be sent an email with a receipt which you can use to discharge the obligation.

## Get help with Nature Restoration Fund
If you need help with Nature Restoration Fund, contact XXXX and give the estimate reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

Find out about call charges at https://www.gov.uk/call-charges

Link to: [View the email content](/LPA-approve-1/LPA-email-confirmation-approved)
```

#### Errors

None

---

### Email Nature Restoration Fund service approval confirmation

| **Field**             | **Value**                                                            |
| --------------------- | -------------------------------------------------------------------- |
| Order number:         | 6                                                                    |
| Path:                 | /LPA-approve-1/LPA-email-confirmation-approved                       |
| Title:                | Email from Nature Restoration Fund service for approval confirmation |
| Data points:          | None                                                                 |
| Conditional pageflow: | None                                                                 |
|                       |                                                                      |

#### Content

```
To: [LPA email address]
Subject: Nature Restoration Fund – Confirmation: Approved request to pay the Nature Restoration Fund levy


# Nature Restoration Fund – Confirmation: Approved request to pay the Nature Restoration Fund levy

You have approved the Nature Restoration Fund levy for Bob Acme at Acme Developments.

An invoice for the total amount of the levy has been sent to admin@acme.co.uk.

They have agreed to pay the following:

Nature Restoration Fund great crested newts levy : £2,500
Nature Restoration Fund nutrients levy : £2,500

## What happens next

Once Acme Developments has paid, you will be sent an email with a receipt which you can use to discharge the obligation.

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

```

## Technical Requirements

### File Structure

Create the following files in the GOV.UK Prototype Kit structure:

1. **Route File**: `app/routes/nrf-estimate-2.js`
2. **View Directory**: `app/views/nrf-estimate-2/`
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

1. **Routes are integrated** into existing `app/routes/nrf-estimate-2.js` file
2. **Views are in** `app/views/nrf-estimate-2/` directory
3. **Form validation** is implemented with proper error handling
4. **Conditional routing** based on journey type
5. **Routes use** centralized route constants from `app/config/nrf-estimate-2/routes.js`
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
- **Route organization**: All routes integrated into existing nrf-estimate-2.js file with proper separation of concerns
- **Email template**: Invoice email content is available as a separate viewable page for reference
- **Path naming**: All paths use lowercase with hyphens (e.g., `/company-details`, `/lpa-email`, `/summary-and-declaration`)
- **Company details page**: New page in the invoice journey flow between confirm and LPA email entry
```
