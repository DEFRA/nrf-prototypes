# Create NRF Payment journey with reference in GOV.UK Prototype Kit

## Journey Information

- **Journey Name**: Pay Nature Restoration Fund Levy
- **Journey Description**:  
  A user journey for a developer pay for the Nature Restoration Fund levy required when submitting planning permission to build a development of some sort. A significant page in the journey is /nrf-estimate-1/map where the user will be able to plot a polygon on a map to define the development site boundary. There will also be 5 polygon areas over England that are known as EDP boundaries. If the development site boundary does not fall within an EDP area then the user will be navigated to the exit page /nrf-estimate-1/no-edp.
- **Journey Route Prefix**: nrf-estimate-1
- **Start Page Title**: Get an estimate for Nature Restoration Fund Levy

## Page Flow and Conditional Logic

### Landing page

| **Field**                  | **Value**               |
| -------------------------- | ----------------------- |
| **Order number:**          | 1                       |
| **Path:**                  | /nrf-estimate-1/start   |
| **Title:**                 | Nature Restoration Fund |
| **Conditional page flow:** | none                    |

---

### What would you like to do?

| **Field**              | **Value**                                 |
| ---------------------- | ----------------------------------------- |
| Order number:          | 2                                         |
| Path:                  | /nrf-estimate-1/what-would-you-like-to-do |
| Title:                 | What would you like to do?                |
| Conditional page flow: | none                                      |

---

### Do you have an estimate reference?

| **Field**              | **Value**                                   |
| ---------------------- | ------------------------------------------- |
| Order number:          | 3                                           |
| Path:                  | /nrf-estimate-1/do-you-have-an-estimate-ref |
| Title:                 | Do you have an estimate reference?          |
| Conditional page flow: | none                                        |

#### Data points

```
{
    application: {
        hasEstimateRef: {
            type: radios
            required: true
            values: "yes" | "no"
        }
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
| Order number:          | 4                                  |
| Path:                  | /nrf-estimate-1/enter-estimate-ref |
| Title:                 | Enter your estimate reference      |
| Conditional page flow: | none                               |

#### Data points

```
{
    application: {
        estimateRef: {
            type: text,
            required: true
        }
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
| Error message: | Enter your estimate reference                             |

---

### Email entry

| **Field**              | **Value**                               |     |
| ---------------------- | --------------------------------------- | --- |
| Order number:          | 5                                       |     |
| Path:                  | /nrf-estimate-1/retrieve-estimate-email |     |
| Title:                 | Enter your email address                |     |
| Conditional page flow: | None                                    |     |

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
| Order number:         | 6                                                |
| Path:                 | /nrf-estimate-1/estimate-email-retrieval-content |
| Title:                | Email sent to get magic link to access estimate  |
| Data points:          | None                                             |
| Conditional pageflow: | None                                             |

#### Content

# Nature Restoration Fund – retrieve your estimate details for the Nature Restoration Fund levy

You can use the details you previously gave us for your estimate to fill in the information needed for your levy payment.

[Retrieve the estimate details](http://testurl-to-my-nrf-service.com)

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the estimate reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000  
Monday to Friday, 8:30am to 5pm, except bank holidays

Find out about call charges at https://www.gov.uk/call-charges

```
---

### Planning ref entry
| **Field**              | **Value**                                      |     |
| ---------------------- | ---------------------------------------------- | --- |
| Order number:          | 7                                              |     |
| Path:                  | /nrf-estimate-1/planning-ref                   |     |
| Title:                 | Enter your planning application reference      |     |
| Conditional page flow: | None                                           |     |

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

Hint text: Enter the reference of the planning application you want to pay the Nature Restoration Fund levy for

```

#### Errors
| **Field** | **Value** |
|-----------|-----------|
| Description: | User has selected 'Continue' without entering any details |
| Error summary: | There is a problem |
| Error message: | Enter your planning application reference to continue |

---
### Check your answers summary and submit
| **Field** | **Value** |
|-----------|-----------|
| Order number: | 8 |
| Path: | /nrf-estimate-1/payment-summary |
| Title: | Check your answers |
| Conditional page flow: | None |

#### Data points
None

#### Content
```

# Check your answers

| Planning reference | [show planning reference] |
| Estimate reference | [show estimate reference if provided] |
| Red line boundary added | [Show Yes/No] |
| Red line boundary file uploaded | [Show Yes/No] |  
| Building types | [List all types picked here] |
| [IF they pick Dwellinghouse THEN show] | Number of dwellinghouse buildings |
| [IF they pick Hotel THEN show] | Number of hotel rooms |
| [IF they pick "House of multiple occupation (HMO)" THEN show] | Number of multiple occupation rooms |
| [IF they pick "Residential institution" THEN show] | Number of residential institution rooms |
| Email address | [show email address] |

```

#### Errors
None

---
### Details submitted confirmation page
| **Field** | **Value** |
|-----------|-----------|
| Order number: | 9 |
| Path: | /nrf-estimate-1/payment-confirmation |
| Title: | Your details have been submitted |
| Data points: | None |
| Conditional pageflow: | None |

#### Content
```

<green banner>
# Your details have been submitted

Payment reference: {{ data.paymentReference }}
</green banner>

## What happens next

You will receive an email with the amount of the Nature Restoration Fund levy.

You will be able to click the link on the email to accept the amount and request an invoice to pay the levy.

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the payment reference.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000  
Monday to Friday, 8:30am to 5pm, except bank holidays

Find out about call charges at https://www.gov.uk/call-charges

[View payment email](/nrf-estimate-1/payment-email)

```

#### Errors
None

---
### Email sent from the Nature Restoration Fund service
| **Field**             | **Value**                                           |
| --------------------- | --------------------------------------------------- |
| Order number:         | 10                                                   |
| Path:                 | /nrf-estimate-1/payment-email         |
| Title:                | Email sent from the Nature Restoration Fund service |
| Data points:          | None                                                |
| Conditional pageflow: | None                                                |


#### Content
# Nature Restoration Fund – payment for the Nature Restoration Fund levy

## Payment reference: {{ data.paymentReference }}

Thank you for submitting details of the development on the Pay the Nature Restoration Fund service.

You told us the development:
* is planned in an area {{ data.redlineBoundaryPolygon.intersectingCatchment or 'Unknown' }}
* has [dynamic list of building types with counts, e.g., "5 dwellinghouse buildings, 20 hotel rooms, 10 house of multiple occupation (HMO) rooms"]

## What you need to pay

Based on the information you have provided, the development falls into the catchment area for the Nature Restoration Fund Nutrients Levy.

The total amount you need to pay is:

**£{{ data.levyAmount or '2,500' }}**

[Confirm payment and request an invoice](http://my-nrf-page.com)

## What your levy will pay for

Your levy will be spent on conservation, with amounts being spent on monitoring and maintenance. There will also be an admin charge of £00 taken from the levy payment.

Levies are calculated as part of Environmental Delivery Plans (EDPs).

## Get help with paying the Nature Restoration Fund levy

If you need help with paying the Nature Restoration Fund levy contact XXXX and give the payment reference number {{ data.paymentReference or 'N/A' }}.

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
