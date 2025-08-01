# LPA Application Verification Feature

## User Story

**AS A** Local Planning Authority (LPA) staff member  
**I WANT** to verify that a developer has paid the environmental levy for their development  
**SO THAT** I can grant final planning permission knowing environmental obligations have been met

## Acceptance Criteria

### Scenario 1: Successful Application Verification
**Given** an LPA staff member is on the verification page  
**When** they enter a valid application reference and developer name  
**And** the application exists in the system  
**Then** they should see the application details page  
**And** the page should display the payment status  
**And** the page should show the development information  
**And** the page should show the redline boundary of the development site and the redline of any EDPs that overlap the site
**And** the page should confirm the application has been found

### Scenario 2: Application Not Found
**Given** an LPA staff member is on the verification page  
**When** they enter an application reference and developer name  
**And** the application does not exist in the system  
**Then** they should be taken to an error page  
**And** the error page should explain that no application was found  
**And** the error page should provide guidance on what to check

### Scenario 3: Form Validation
**Given** an LPA staff member is on the verification page  
**When** they submit the form without required fields  
**Then** validation errors should be displayed  
**And** the form should remain on the same page  
**And** the user should be guided on what information is required

### Scenario 4: Alternative Developer Identifier
**Given** an LPA staff member is on the verification page  
**When** they enter a valid application reference and company ID  
**And** the application exists in the system  
**Then** they should see the application details page  
**And** the verification should be successful

## Interface Design

### Landing Page (`/lpa-verify`)
The verification form should use the following GOV.UK Design System components:

- **GOV.UK Design System Components Required:**
  - `govuk-form-group` for form structure
  - `govuk-input` for application reference field
  - `govuk-input` for developer name/company ID field
  - `govuk-button` for form submission
  - `govuk-fieldset` and `govuk-legend` for field grouping
  - `govuk-hint` for field guidance
  - `govuk-error-summary` for validation errors
  - `govuk-error-message` for field-level errors

- **Form Layout:**
  - Application Reference field (required)
  - Developer Name or Company ID field (required)
  - Clear guidance text explaining the purpose
  - Submit button with appropriate GOV.UK styling

### Application Details Page (`/lpa-verify/details`)
When an application is found, display:

- **GOV.UK Design System Components Required:**
  - `govuk-panel` for success confirmation
  - `govuk-summary-list` for application details
  - `govuk-tag` for status indicators
  - `govuk-inset-text` for important information
  - `govuk-button` for navigation actions

- **Information Display:**
  - Success message confirming application found
  - Application reference and status
  - Development name and location
  - Payment status and reference
  - House count and levy amount
  - Environmental Development Plans (EDPs) applicable
  - Audit trail summary

### Error Page (`/lpa-verify/error`)
When no application is found:

- **GOV.UK Design System Components Required:**
  - `govuk-error-summary` for error message
  - `govuk-button` for return to form
  - `govuk-inset-text` for guidance

- **Error Content:**
  - Clear error message
  - Guidance on what to check
  - Link to return to verification form

## Technical Design

### URL Structure
- **Landing Page**: `/lpa-verify` - Main verification form
- **Success Page**: `/lpa-verify/details` - Application details display
- **Error Page**: `/lpa-verify/error` - Application not found

### Form Processing
1. **Input Validation:**
   - Application reference: Required, format validation (APP-XXX pattern)
   - Developer identifier: Required, either name or company ID
   - Client-side validation with server-side confirmation

2. **Search Logic:**
   - Search by application reference AND developer identifier
   - Fuzzy matching for developer names
   - Exact matching for company IDs
   - Return single result or no results

3. **Data Display:**
   - Application status with appropriate visual indicators
   - Payment information with clear status
   - Development details in structured format
   - Environmental Development Plans summary
   - Audit trail for transparency

4. **Error Handling:**
   - Graceful handling of missing applications
   - Clear error messages and guidance
   - Logging of verification attempts for audit purposes

### Security Considerations
- No sensitive data exposure in URLs
- Input sanitization and validation
- Rate limiting for verification attempts
- Audit logging of all verification requests
- Session management for LPA users

### Accessibility Requirements
- WCAG 2.1 AA compliance
- Screen reader compatibility
- Keyboard navigation support
- High contrast mode support
- Clear focus indicators
- Descriptive error messages