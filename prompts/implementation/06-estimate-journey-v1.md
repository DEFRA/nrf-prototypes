# Create NRF Quote Journey in GOV.UK Prototype Kit

## Journey Information

- **Journey Name**: Get an estimate for Nature Restoration Fund Levy
- **Journey Description**:  
  A user journey for a developer to obtain a quote for the Nature Restoration Fund levy required when submitting planning permission to build a development of some sort. A significant page in the journey is /nrf-estimate-3/map where the user will be able to plot a polygon on a map to define the development site boundary. There will also be 5 polygon areas over England that are known as EDP boundaries. If the development site boundary does not fall within an EDP area then the user will be navigated to the exit page /nrf-estimate-3/no-edp.
- **Journey Route Prefix**: nrf-estimate-3
- **Start Page Title**: Get an estimate for Nature Restoration Fund Levy

## Page Flow and Conditional Logic

### Landing page

| **Field**                  | **Value**                                        |
| -------------------------- | ------------------------------------------------ |
| **Order number:**          | 1                                                |
| **Path:**                  | /nrf-estimate-3/start                            |
| **Title:**                 | Get an estimate for Nature Restoration Fund Levy |
| **Conditional page flow:** | none                                             |

#### Data points

None

#### Content

```
# Nature Restoration Fund


If a development falls into an area with an [Environmental Delivery Plan (EDP)](MAKE THIS A FAKE LINK), you can use [Nature Restoration Fund (NRF)](MAKE THIS A FAKE LINK) levies to discharge environmental obligations.
If you choose not to use the NRF levy, you will still need to [discharge your obligations in other ways](MAKE THIS A FAKE LINK).

## Using NRF to discharge your environmental obligations

Use this service to find out if your development is in an area with an EDP, get an estimate for the cost of the levy, commit to using the levy and pay the levy.

{button}[Start now](https://gov.uk/random){/button}

## What you need

### Getting an estimate

To get an estimate you will need:

* to show us where the development is planned – you can use a red line boundary file or draw a red line boundary
* to tell us the types of buildings planned
* details about the amount of buildings or rooms

You will be sent an email with an estimate reference and the amount of the levy. You can get as many estimates as you like.

### Committing to using NRF

To commit to using NRF you will need:

* the estimate reference
* to confirm the details of your development
* the company details
* the LPA details
* to agree to the terms and conditions

You will receive a reference number and a commitment document that you can submit with your planning application.

### Paying the NRF

To pay the NRF and discharge your environmental obligations, you will need:

* the commitment reference
* to confirm the details of your development
* the planning reference
* to agree to the terms and conditions

Your LPA will ask you to pay the levy when it is time to discharge your planning obligations. Once you have confirmed the details and your Local Planning Authority has approved them, you will receive an invoice.

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)

Telephone: 00000000000

Monday to Friday, 8:30am to 5pm, except bank holidays

Find out about call charges at https://www.gov.uk/call-charges
```

---

### What would you like to do?

| **Field**              | **Value**                                 |
| ---------------------- | ----------------------------------------- |
| Order number:          | 2                                         |
| Path:                  | /nrf-estimate-3/what-would-you-like-to-do |
| Title:                 | What would you like to do?                |
| Conditional page flow: | none                                      |

#### Data points

```
{
    data: {
        journeyType: {
            type: radios
            required: true
            values: "I want an estimate for the Nature Restoration Fund levy" |
        "I am ready to commit to using the Nature Restoration Fund levy" | "I am ready to pay the Nature Restoration Fund levy"
        }
    }
}
```

#### Content

```
# What would you like to do?
- I want an estimate for the Nature Restoration Fund levy
- I am ready to commit to using the Nature Restoration Fund levy
  Hint text: You will need an estimate reference
- I am ready to pay the Nature Restoration Fund levy
 Hint text: You will need a commitment reference
```

#### Errors

| **Field**      | **Value**                                                           |
| -------------- | ------------------------------------------------------------------- |
| Description:   | User has selected ‘Continue’ without choosing an option             |
| Error summary: | There is a problem                                                  |
| Error message: | Select if you want an estimate, are ready to commit or ready to pay |
|                |                                                                     |

---

### Choose how you would like to show us the boundary of your development

| **Field**              | **Value**                                                             |
| ---------------------- | --------------------------------------------------------------------- |
| Order number:          | 3                                                                     |
| Path:                  | /nrf-estimate-3/redline-map                                           |
| Title:                 | Choose how you would like to show us the boundary of your development |
| Conditional page flow: | none                                                                  |

#### Data points

```
{
     data: {
        hasRedlineBoundaryFile: {
            type: radios
            required: true
            values: "Draw on a map" |
        "Upload a file"
        }
    }
}
```

#### Content

```
# Choose how you would like to show us the boundary of your development
- Draw on a map
- Upload a file
  Hint text: Upload a shapefile (.shp) or GeoJSON file (.geojson). The file must be smaller than 2MB.
```

#### Errors

| **Field**      | **Value**                                               |
| -------------- | ------------------------------------------------------- |
| Description:   | User has selected ‘Continue’ without choosing an option |
| Error summary: | There is a problem                                      |
| Error message: | Select if you would like to draw a map or upload a file |

---

### Upload a red line boundary file

| **Field**             | **Value**                                       |
| --------------------- | ----------------------------------------------- |
| Order number:         | 3.1                                             |
| Path:                 | /nrf-estimate-3/upload-redline                  |
| Title:                | Upload a red line boundary file                 |
| Conditional pageflow: | display if data.hasRedlineBoundaryFile === true |

#### Data points

```
{
    data: {
        redlineFile: {
            type: file,
            conditional: required if data.hasRedlineBoundaryFile === true
        }
    }
}
```

#### Content

```
# Upload a red line boundary file
Hint text: Upload a shapefile (.shp) or GeoJSON file (.geojson). The file must be smaller than 2MB.
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

### Draw a red line boundary

| **Field**             | **Value**                                        |
| --------------------- | ------------------------------------------------ |
| Order number:         | 3.2                                              |
| Path:                 | /nrf-estimate-3/map                              |
| Title:                | Draw a red line boundary                         |
| Conditional pageflow: | display if data.hasRedlineBoundaryFile === false |

#### Data points

```
{
    data: {
        redlineBoundaryPolygon: {
            type: array,
            conditional: required if data.hasRedlineBoundaryFile === false
        }
    }
}
```

#### Content

```
# Draw a red line boundary
Hint text: Use the map to draw a red line boundary for where the development might be.

Note: The implementation includes a complex map interface with:
- Location search functionality
- Drawing tools (Start drawing boundary, Edit boundary, Delete boundary)
- Map view controls (Show all England, Zoom to boundary, Toggle catchments)
- Delete confirmation panel
- Client-side validation
```

#### Errors

| **Field**      | **Value**                                                          |
| -------------- | ------------------------------------------------------------------ |
| Description:   | User has selected 'Save and continue' without entering any details |
| Error summary: | There is a problem                                                 |
| Error message: | Draw a red line boundary to continue                               |

Note: The button text on this page is "Save and continue" (not just "Continue").

---

### Exit page if the development site is not within an EDP area (conditional)

| **Field**             | **Value**                                                  |
| --------------------- | ---------------------------------------------------------- |
| Order number:         | 3.3                                                        |
| Path:                 | /nrf-estimate-3/no-edp                                     |
| Title:                | Nature Restoration Fund levy is not available in this area |
| Data points:          | None                                                       |
| Conditional pageflow: | display if development site is not within an EDP area      |

#### Content

```
# Nature Restoration Fund levy is not available in this area
Other ways to mitigate environmental impact are:
- Habitat Regulations Assessment (HRA) for European sites or Ramsar sites
- Consent from Natural England for works affecting SSSIs
- Marine impact assessments for marine conservation zones
- Species licensing applications for protected species

Find out about mitigating environmental impact
```

#### Errors

None

---

### Select the types of buildings that might be included in this development

| **Field**             | **Value**                                                   |
| --------------------- | ----------------------------------------------------------- |
| Order number:         | 4                                                           |
| Path:                 | /nrf-estimate-3/building-type                               |
| Name:                 | Building type entry (conditional)                           |
| Conditional pageflow: | display if red line boundary falls within EDP boundary area |

#### Data points

```
{
    data: {
        buildingTypes: {
            type: checkboxes,
            values: Dwelling | Hotel | House of multiple occupation (HMO) | Non-residential development | Residential institution,
            conditional: required if red line boundary falls within EDP boundary area
        }
    }
}
```

#### Content

```
# Select the types of buildings that are planned for this development
Select all that apply
```

#### Errors

| **Field**      | **Value**                                                 |
| -------------- | --------------------------------------------------------- |
| Description:   | User has selected ‘Continue’ without choosing any options |
| Error summary: | There is a problem                                        |
| Error message: | Select a building type to continue                        |

---

### Exit page if the building type is non-residential (conditional)

| **Field**             | **Value**                                                                      |
| --------------------- | ------------------------------------------------------------------------------ |
| Order number:         | 4.1                                                                            |
| Path:                 | /nrf-estimate-3/non-residential                                                |
| Title:                | Nature Restoration Fund levy is not available for non-residential developments |
| Data points:          | None                                                                           |
| Conditional pageflow: | display if data.buildingTypes includes "Non-residential development"           |

#### Content

```
# Nature Restoration Fund levy is not available for non-residential developments
The development must contain residential buildings to be eligible to mitigate environmental impact with a Nature Restoration Fund levy.

Find out about planning a non-residential development
```

#### Errors

None

---

### Number of dwelling buildings entry (conditional)

| **Field**              | **Value**                                                          |
| ---------------------- | ------------------------------------------------------------------ |
| Order number:          | 4.2                                                                |
| Path:                  | /nrf-estimate-3/residential                                        |
| Title:                 | Enter the number of dwelling buildings planned for the development |
| Conditional page flow: | display if data.buildingTypes includes Dwelling                    |

#### Data points

```
{
    data: {
        residentialBuildingCount: {
            type: number,
            required: conditional - required if data.buildingTypes includes Dwelling
        }
    }
}
```

#### Content

```
# Enter the number of dwelling buildings planned for the development
```

#### Errors

| **Field**      | **Value**                                              |
| -------------- | ------------------------------------------------------ |
| Description:   | User has selected ‘Continue’ without entering a number |
| Error summary: | There is a problem                                     |
| Error message: | Enter the number of dwelling buildings to continue     |

---

### Enter the number of rooms in your [building type] building(s) planned for the development

| **Field**              | **Value**                                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| Order number:          | 4.3                                                                                                             |
| Path:                  | /nrf-estimate-3/room-count                                                                                      |
| Title:                 | Enter the number of rooms in your [lowercase(data.buildingTypes)] building(s) planned for the development       |
| Conditional page flow: | display if data.buildingTypes includes "Hotel", "House of multiple occupation (HMO)", "Residential institution" |

#### Data points

```
{
    data: {
        roomCounts: {
            hmoCount: {
                type: number,
                required: conditional - required and shown only if data.buildingTypes includes "House of multiple occupation (HMO)"
            },
            residentialInstitutionCount: {
                type: number,
                required: conditional - required and shown only if data.buildingTypes includes "Residential institution"
            },
            hotelCount: {
                type: number,
                required: conditional - required and shown only if data.buildingTypes includes "Hotel"
            }
        }
    }
}
```

#### Content

```
# Enter the number of rooms in your [lowercase(data.buildingTypes)] building(s) planned for the development

Note: The label dynamically adjusts based on building type. For "House of multiple occupation (HMO)", it shows the full name rather than lowercase.
```

#### Errors

| **Field**      | **Value**                                              |
| -------------- | ------------------------------------------------------ |
| Description:   | User has selected ‘Continue’ without entering a number |
| Error summary: | There is a problem                                     |
| Error message: | Enter the number of rooms to continue                  |

---

### Email entry

| **Field**              | **Value**                      |
| ---------------------- | ------------------------------ |
| Order number:          | 5                              |
| Path:                  | /nrf-estimate-3/estimate-email |
| Title:                 | Enter your email address       |
| Conditional page flow: | None                           |

#### Data points

```
{
    data: {
        estimateEmail: {
            type: email,
            required: true
        }
    }
}
```

#### Content

```
# Enter your email address
Hint text: Once your Nature Restoration Fund levy amount is calculated, the estimate will be emailed to you. This could take up to 00 minutes.

Note: For the payment journey with estimate reference retrieval, there is a separate email entry page at /nrf-estimate-3/retrieve-estimate-email with hint text: "We will send you a link so you can retrieve the details from your estimate."
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

| **Field**              | **Value**                        |
| ---------------------- | -------------------------------- |
| Order number:          | 6                                |
| Path:                  | /nrf-estimate-3/estimate-summary |
| Title:                 | Check your answers               |
| Conditional page flow: | None                             |

#### Data points

None

#### Content

```
# Check your answers

| Red line boundary | [Show Added/Not added] |
| Building types | [List all types picked here] |
| [IF they pick Dwelling THEN show] Number of dwelling buildings | [show count] |
| [IF they pick "House of multiple occupation (HMO)" THEN show] Number of multiple occupation rooms | [show count] |
| [IF they pick "Residential institution" THEN show] Number of residential institution rooms | [show count] |
| [IF they pick Hotel THEN show] Number of hotel rooms | [show count] |
| Email address | [show estimateEmail address] |
```

#### Errors

None

---

### Details submitted confirmation page

| **Field**             | **Value**                        |
| --------------------- | -------------------------------- |
| Order number:         | 7                                |
| Path:                 | /nrf-estimate-3/confirmation     |
| Title:                | Your details have been submitted |
| Data points:          | None                             |
| Conditional pageflow: | None                             |

#### Content

```
<green banner>
# Your details have been submitted

Estimate reference: {{ data.estimateReference }}
</green banner>

## What happens next

You will receive an email with details of the estimate.

You do not need to pay anything at this point, this service is designed to help you plan how to mitigate environmental obligations.

If you decide to mitigate environmental impact using Nature Restoration Fund levy, you can commit to use the Nature Restoration Fund levy.

Keep the email as a record of the estimate and reference number. You can use the reference to retrieve this estimate when you are ready commit to using nature Restoration Fund.

## Get help with Nature Restoration Fund
If you need help with Nature Restoration Fund, contact XXXX and give the estimate reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

Find out about call charges at https://www.gov.uk/call-charges

View the email content (link to /nrf-estimate-3/estimate-email-content)
```

#### Errors

None

---

### Email sent from the Nature Restoration Fund service

| **Field**             | **Value**                                           |
| --------------------- | --------------------------------------------------- |
| Order number:         | 8                                                   |
| Path:                 | /nrf-estimate-3/estimate-email-content              |
| Title:                | Email sent from the Nature Restoration Fund service |
| Data points:          | None                                                |
| Conditional pageflow: | None                                                |

#### Content

```
# Nature Restoration Fund – estimate for the Nature Restoration Fund levy

Estimate reference: {{ data.estimateReference }}

Thank you for submitting details of the development on the Get an estimate for Nature Restoration Fund Levy service.

You told us the development:

- is planned in an area {{ data.redlineBoundaryPolygon.intersectingCatchment or 'Thames Valley EDP' }}
- has {{ data.residentialBuildingCount }} dwelling buildings (if applicable), hotel buildings with a total of {{ data.roomCounts.hotelCount }} rooms (if applicable), house of multiple occupation buildings with a total of {{ data.roomCounts.hmoCount }} rooms (if applicable), and residential institution buildings with a total of {{ data.roomCounts.residentialInstitutionCount }} rooms (if applicable)

## What you might need to pay

Based on the information you have provided, the development falls into an area with an Enviromental Delivery Plan (EDP), so you can use the Nature Restoration Fund Nutrients Levy.

The estimated total amount you may need to pay if you develop in this area is:
£{{ data.levyAmount or '2,500' }}

You do not need to pay anything at this point, this service is designed to help you plan how to mitigate your environmental obligations.[Get another estimate](ADD PATH HERE)

If you do decide to mitigate using Nature Restoration Fund levy, you can commit and include the commitment when applying for planning permission.

[Commit to using Nature Restoration Fund](/nrf-estimate-3/do-you-have-an-estimate-ref)

Keep this email as a record of your estimate and reference number, you can use it to retrieve this estimate when you are ready to commit.

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
4. **Data File**: `app/data/nrf-estimate-3-data.js` (if needed)

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

```

```
