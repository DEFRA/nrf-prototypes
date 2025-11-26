# Create LPA journey with reference in GOV.UK Prototype Kit

## Journey Information

- **Journey Name**: LPA approve developer request to pay NRF
- **Journey Description**:  
  A user journey for the LPA to check and approve the details sent from the developer.
- **Journey Route Prefix**: lpa-approve-2

## Page Flow and Conditional Logic

### Email sent from the Nature Restoration Fund service

| **Field**             | **Value**                                                  |
| --------------------- | ---------------------------------------------------------- |
| Order number:         | 1                                                          |
| Path:                 | /lpa-approve-2/lpa-approval-email-content                  |
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

**Payment reference:** 0006677
**Planning reference:** APP/2025/24019/FUL

You need to review and approve the request to pay the Nature Restoration Fund levy from Acme Developments.

Approving the request will enable Acme Developments to use Nature Restoration Fund levy to mitigate their environmental impact.

They have agreed to pay the following:

- Nature Restoration Fund nutrients levy: £2,500

[Approve the Nature Restoration Fund levy](/lpa-approve-2/confirm-view-approve)

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the estimate reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

Find out about call charges at [https://www.gov.uk/call-charges](https://www.gov.uk/call-charges)

```

#### Errors

None

---

### Confirm NRF

| **Field**                  | **Value**                                                                       |
| -------------------------- | ------------------------------------------------------------------------------- |
| **Order number:**          | 2                                                                               |
| **Path:**                  | /lpa-approve-2/confirm-view-approve                                             |
| **Title:**                 | Confirm you want to view and approve these Nature Restoration Fund levy details |
| **Conditional page flow:** | none                                                                            |

#### Content

```
# Confirm you want to view and approve these Nature Restoration Fund levy details.

Hint text: You will receive an email with a link.

**Summary list:**

| Payment reference | 0006677 |
| Business name | Acme Developments |
| Planning reference | APP/2025/24019/FUL |

**Button:** Confirm (links to `/lpa-approve-2/lpa-approval-email-magiclink`)
```

#### Errors

None

---

### Email with magic link sent from the Nature Restoration Fund service

| **Field**             | **Value**                                                                  |
| --------------------- | -------------------------------------------------------------------------- |
| Order number:         | 3                                                                          |
| Path:                 | /lpa-approve-2/lpa-approval-email-magiclink                                |
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

**Payment reference:** 0006677
**Planning reference:** APP/2025/24019/FUL

You need to review and approve the request to pay the Nature Restoration Fund levy from Acme Developments.

Use the link provided to view and approve the Nature Restoration Fund details.

[View details](/lpa-approve-2/approve-details)

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the estimate reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

Find out about call charges at [https://www.gov.uk/call-charges](https://www.gov.uk/call-charges)

```

#### Errors

None

---

### Approve these details

| **Field**              | **Value**                      |
| ---------------------- | ------------------------------ |
| Order number:          | 5                              |
| Path:                  | /lpa-approve-2/approve-details |
| Title:                 | Approve these details          |
| Data points:           | None                           |
| Conditional page flow: | None                           |

#### Content

Note: Use a table or list pattern with no change links for displaying the details.

```

# Approve these details

## Red line boundary of development
[Map displaying red line boundary - interactive Leaflet map with red line boundary polygon displayed]

**Summary list:**

| Nature Restoration Fund levy confirmed | Nature Restoration Fund nutrients levy: £2,500 |
| Developer Details | Bob Acme, Acme Developments, 1 Willow Lane, London, N1 9HG, Company Registration Number (CRN): 12345678, VAT registration number: GB123456789 |
| Building types | Dwelling |
| Number of dwelling buildings | 100 |
| Developer email address | admin@acme.co.uk |
| Planning reference | APP/2025/24019/FUL

[Download these details](javascript:void(0))

Check these details against the details submitted as part of the planning permission application APP/2025/24019/FUL by Acme Development.
Approving these details will enable Acme Developments to pay the Nature Restoration Fund levy to mitigate their environmental impact.

**Button:** Approve (links to `/lpa-approve-2/LPA-details`)

```

#### Errors

None

---

### Details entry

| **Field**              | **Value**                  |
| ---------------------- | -------------------------- |
| Order number:          | 6                          |
| Path:                  | /lpa-approve-2/LPA-details |
| Title:                 | Enter your details         |
| H1 heading:            | Enter your details         |
| Conditional page flow: | None                       |

#### Data points

```
{
    fullName: {
        type: text,
        required: true
   {
    email: {
        type: email,
        required: true
    }
}
```

#### Content

```
# Enter your details

Hint text: Enter your details to create a record of who approved the request.

## Full Name
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
| Description:   | User has selected ‘Continue’ without entering any details           |
| Error summary: | There is a problem                                                  |
| Error message: | Enter your email address to continue                                |
| Description:   | Incorrect email format                                              |
| Error summary: | There is a problem                                                  |
| Error message: | Enter an email address in the correct format, like name@example.com |

---

### Details approved confirmation page

| **Field**             | **Value**                            |
| --------------------- | ------------------------------------ |
| Order number:         | 7                                    |
| Path:                 | /lpa-approve-2/approval-confirmation |
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

Once Acme Developments has paid, you will be sent an email with a receipt which you can use to discharge their obligation.

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the estimate reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

Find out about call charges at [https://www.gov.uk/call-charges](https://www.gov.uk/call-charges)

[View the email content](/lpa-approve-2/lpa-approval-confirmation-email)
```

#### Errors

None

---

### Email Nature Restoration Fund service approval confirmation

| **Field**             | **Value**                                                            |
| --------------------- | -------------------------------------------------------------------- |
| Order number:         | 8                                                                    |
| Path:                 | /lpa-approve-2/lpa-approval-confirmation-email                       |
| Title:                | Email from Nature Restoration Fund service for approval confirmation |
| Data points:          | None                                                                 |
| Conditional pageflow: | None                                                                 |
|                       |                                                                      |

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

Once Acme Developments has paid, you will be sent an email with a receipt which you can use to discharge their obligation.

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the estimate reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

Find out about call charges at [https://www.gov.uk/call-charges](https://www.gov.uk/call-charges)

```

#### Errors

None

---

## Technical Requirements

### File Structure

Create the following files in the GOV.UK Prototype Kit structure:

1. **Route File**: `app/routes/lpa-approve-1.js` (new route file for LPA approval journey)
2. **View Directory**: `app/views/lpa-approve-1/` (new view directory)
3. **View Files**: One HTML file per page in the journey
4. **Route Config File**: `app/config/lpa-approve-1/routes.js` (optional, for route constants)
5. **Data File**: Uses existing session data structure

### Route Implementation

- Use GOV.UK Prototype Kit router setup
- Implement GET routes for displaying pages
- No form submissions required (click-through journey only)
- Include back links on each page

### View Implementation

- Extend `layouts/main.html` from GOV.UK Prototype Kit
- Use GOV.UK Frontend components and classes
- Use button links for navigation (no form inputs required)
- Implement proper navigation between pages with back links

### Data Handling

- No session data storage required (static content only)
- No data validation needed (no form inputs)

### GOV.UK Design System Compliance

- Use proper GOV.UK Frontend components
- Follow GOV.UK content guidelines
- Implement proper heading hierarchy
- Ensure accessibility compliance

### Conditional Logic Implementation

- Provide clear navigation between pages with back links

## Implementation Instructions

1. **Routes are in** new `app/routes/lpa-approve-1.js` file (similar to `lpa-verify.js` structure)
2. **Views are in** `app/views/lpa-approve-1/` directory
3. **No form validation** required (click-through journey only)
4. **No conditional routing** required (linear journey)
5. **Routes use** centralized route constants from `app/config/lpa-approve-1/routes.js` (optional)
6. **Journey can be accessed** via payment-email page link or directly
7. **Route registration**: Add `const lpaApprove1Routes = require('./routes/lpa-approve-1.js')` and `router.use('/', lpaApprove1Routes)` in `app/routes.js`

## Expected Output

- Complete working user journey with all pages
- GOV.UK design system compliance
- Back links on all pages including email confirmations
- Clean, maintainable code structure
- Static content with hardcoded values

## Notes

- This is for rapid prototyping, so focus on user experience over security
- No session storage needed (static content only)
- Focus on demonstrating the user flow and interface design
- Ensure the journey works end-to-end for user testing
- All pages use hardcoded values - no dynamic content

## Implementation Details

- **Journey entry point**: Accessed from payment-email.html page via link or directly
- **Static content**: All content uses hardcoded values - no dynamic data binding
- **Levy naming**: Uses "greater crested newts" terminology instead of just "newts"
- **No data structure required**: All pages display static hardcoded values
- **Route organization**: Routes in separate `lpa-approve-1.js` file following pattern of `lpa-verify.js`
- **Email template**: Email content pages follow standard inset-text pattern with recipient and subject
- **Path naming**: All paths use lowercase with hyphens (e.g., `/lpa-approve-1/approve-details`, `/lpa-approve-1/approval-confirmation`)
- **Back links**: All pages include back links, including email confirmation pages
- **No forms**: Journey uses button links only - no form inputs or validation required
