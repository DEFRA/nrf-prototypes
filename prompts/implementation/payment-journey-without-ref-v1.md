# Create NRF Payment journey with reference in GOV.UK Prototype Kit

## Journey Information

- **Journey Name**: Pay Nature Restoration Fund Levy
- **Journey Description**:  
  A user journey for a developer pay for the Nature Restoration Fund levy required when submitting planning permission to build a development of some sort. A significant page in the journey is /nrf-estimate-1/map where the user will be able to plot a polygon on a map to define the development site boundary. There will also be 5 polygon areas over England that are known as EDP boundaries. If the development site boundary does not fall within an EDP area then the user will be navigated to the exit page /nrf-estimate-1/no-edp.
- **Journey Route Prefix**: nrf-estimate-1
- **Start Page Title**: Get an estimate for Nature Restoration Fund Levy

## Page Flow and Conditional Logic

### Landing page

| **Field**                  | **Value**                            |
| -------------------------- | ------------------------------------ |
| **Order number:**          | 1                                    |
| **Path:**                  | /nrf-estimate-1/start                |
| **Title:**                 | Pay for Nature Restoration Fund Levy |
| **Conditional page flow:** | none                                 |

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

---

### Do you have a red line boundary file?

| **Field**              | **Value**                             |
| ---------------------- | ------------------------------------- |
| Order number:          | 3                                     |
| Path:                  | /nrf-estimate-1/redline-map           |
| Title:                 | Do you have a red line boundary file? |
| Conditional page flow: | none                                  |

---

### Upload a red line boundary file

| **Field**             | **Value**                                  |
| --------------------- | ------------------------------------------ |
| Order number:         | 3.1                                        |
| Path:                 | /nrf-estimate-1/upload-redline             |
| Title:                | Upload a red line boundary file            |
| Conditional pageflow: | display if hasRedlineBoundaryFile === true |

---

### Draw a red line boundary

| **Field**             | **Value**                                   |
| --------------------- | ------------------------------------------- |
| Order number:         | 3.2                                         |
| Path:                 | /nrf-estimate-1/map                         |
| Title:                | Draw a red line boundary                    |
| Conditional pageflow: | display if hasRedlineBoundaryFile === false |

---

### Exit page if the development site is not within an EDP area (conditional)

| **Field**             | **Value**                                                  |
| --------------------- | ---------------------------------------------------------- |
| Order number:         | 3.3                                                        |
| Path:                 | /nrf-estimate-1/no-edp                                     |
| Title:                | Nature Restoration Fund levy is not available in this area |
| Data points:          | None                                                       |
| Conditional pageflow: | display if development site is not within an EDP area      |

---

### Select the types of buildings that might be included in this development

| **Field**             | **Value**                                                   |
| --------------------- | ----------------------------------------------------------- |
| Order number:         | 4                                                           |
| Path:                 | /nrf-estimate-1/building-type                               |
| Name:                 | Building type entry (conditional)                           |
| Conditional pageflow: | display if red line boundary falls within EDP boundary area |

---

### Exit page if the building type is non-residential (conditional)

| **Field**             | **Value**                                                                      |
| --------------------- | ------------------------------------------------------------------------------ |
| Order number:         | 4.1                                                                            |
| Path:                 | /nrf-estimate-1/non-residential                                                |
| Title:                | Nature Restoration Fund levy is not available for non-residential developments |
| Data points:          | None                                                                           |
| Conditional pageflow: | display if application.buildingTypes includes "Non-residential development"    |

---

### Number of dwellinghouse buildings entry (conditional)

| **Field**              | **Value**                                                               |
| ---------------------- | ----------------------------------------------------------------------- |
| Order number:          | 4.2                                                                     |
| Path:                  | /nrf-estimate-1/residential                                             |
| Title:                 | Enter the number of dwellinghouse buildings planned for the development |
| Conditional page flow: | display if buildingTypes includes dwellinghouse                         |

---

### Enter the number of rooms in your [building type] building(s) planned for the development

| **Field**              | **Value**                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Order number:          | 4.3                                                                                                               |
| Path:                  | /nrf-estimate-1/residential                                                                                       |
| Title:                 | Enter the number of rooms in your [lowercase(application.building Type)] building(s) planned for your development |
| Conditional page flow: | display if buildingType includes "Hotel", "House of multiple occupation (HMO)", "Residential institution"         |

---

### Planning ref

| **Field**              | **Value**                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Order number:          | 5                                                                                                                                     |
| Path:                  | /nrf-estimate-1/enter-planning-ref                                                                                                    |
| Title:                 | Enter your planning application reference                                                                                             |
| Conditional page flow: | displayed when application.hasReference === false and application.journeyType === "I’m ready to pay the Nature Restoration Fund levy" |

#### Data points

```
{
    application: {
        planningApplicationRef: {
            type: string,
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

| **Field**      | **Value**                                                                      |
| -------------- | ------------------------------------------------------------------------------ |
| Description:   | User has selected ‘Continue’ without entering a planning application reference |
| Error summary: | There is a problem                                                             |
| Error message: | Enter the planning application reference                                       |

---

### Email entry

| **Field**              | **Value**                                                   |
| ---------------------- | ----------------------------------------------------------- |
| Order number:          | 4                                                           |
| Path:                  | /nrf-estimate-1/email                                       |
| Title:                 | Enter the email address you would like the estimate sent to |
| Conditional page flow: | None                                                        |

---

### Check your answers summary and submit

| **Field**              | **Value**               |
| ---------------------- | ----------------------- |
| Order number:          | 5                       |
| Path:                  | /nrf-estimate-1/summary |
| Title:                 | Check your answers      |
| Conditional page flow: | None                    |

---

### Details submitted confirmation page

| **Field**             | **Value**                                                  |
| --------------------- | ---------------------------------------------------------- |
| Order number:         | 6                                                          |
| Path:                 | /nrf-estimate-1/summary                                    |
| Title:                | Nature Restoration Fund levy is not available in this area |
| Data points:          | None                                                       |
| Conditional pageflow: | display if development site is not within an EDP area      |

---

### Email sent from the Nature Restoration Fund service

| **Field**             | **Value**                                           |
| --------------------- | --------------------------------------------------- |
| Order number:         | 7                                                   |
| Path:                 | /nrf-estimate-1/estimate-email-content              |
| Title:                | Email sent from the Nature Restoration Fund service |
| Data points:          | None                                                |
| Conditional pageflow: | None                                                |

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
