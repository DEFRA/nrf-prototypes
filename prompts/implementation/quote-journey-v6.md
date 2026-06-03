# Create NRF Quote Journey in GOV.UK Prototype Kit

## Journey Information

- **Journey Name**: Get a quote for Nature Restoration Fund levy
- **Journey Description**:
  A user journey for a developer to obtain a quote for the Nature Restoration Fund levy required when submitting planning permission to build a development of some sort. A significant page in the journey is `/nrf-quote-6/map` where the user will be able to plot a polygon on a map to define the development site boundary. There will also be 5 polygon areas over England that are known as EDP boundaries. If the development site boundary does not fall within an EDP area then the user will be navigated to the exit page `/nrf-quote-6/no-edp`.
- **Journey Route Prefix**: nrf-quote-6 (canonical URL first segment: `/nrf-quote-6/...`)
- **Start Page Title**: Get a quote for Nature Restoration Fund levy

## Page Flow and Conditional Logic


### Landing page

| **Field**                  | **Value**                                    |
| -------------------------- | -------------------------------------------- |
| **Order number:**          | 1                                            |
| **Path:**                  | /nrf-quote-6/start                           |
| **Title:**                 | Get a quote for Nature Restoration Fund levy |
| **Conditional page flow:** | none                                         |

#### Data points

None

#### Content

```
# Nature Restoration Fund

## Using Nature Restoration Fund (NRF) to discharge your environmental obligations

Use this service to find out if your development is in an area with an [Environmental Delivery Plan (EDP)](#) and get a quote for the cost of the levy.

If a development falls into an area with an Environmental Delivery Plan, you can use [Nature Restoration Fund (NRF)](#) levies to discharge environmental obligations.

If you choose not to use the NRF levy, you will still need to [discharge your obligations in other ways](#).

CTA: Start now

## What you need to do

### Getting a quote

To get a quote you will need to tell us:

* the type of planning permission you plan to apply for
* that you are building houses
* the amount of houses
* where the development is planned – you can use a red line boundary file or draw a red line boundary


You will be sent a quote email with an NRF reference and the amount of the levy. You can get as many quotes as you like.


### What to do with your quote

Once you have a quote, you will be able to contact Natural England and request to use NRF.


## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)

Telephone: 00000000000

Monday to Friday, 8:30am to 5pm, except bank holidays

[Find out about call charges](https://www.gov.uk/call-charges)
```


---

### What type of planning permission

| **Field**              | **Value**                                              |
| ---------------------- | ------------------------------------------------------ |
| Order number:          | 2                                                      |
| Path:                  | /nrf-quote-6/planning-type                             |
| Title:                 | What type of planning permission are you applying for? |
| Conditional page flow: | none                                                   |

#### Data points

```
{
    data: {
        planningType: {
            type: radios,
            values: "Full" | "Outline" | "Hybrid" | "Reserved matters" | "Prior approval" | "Listed building consent",
            fieldName: "planning-type"
        }
    }
}
```

#### Content

```
# What type of planning permission are you applying for?
Select one
- Full
- Outline
- Hybrid
- Reserved matters
- Prior approval
- Listed building consent

Button: Continue
```

#### Errors

| **Field**      | **Value**                                                 |
| -------------- | --------------------------------------------------------- |
| Description:   | User has selected 'Continue' without choosing any options |
| Error summary: | There is a problem                                        |
| Error message: | Select a planning permission type to continue             |


---

### Exit page if the planning permission is not full, outline or hybrid

| **Field**              | **Value**                                                          |
| ---------------------- | ------------------------------------------------------------------ |
| Order number:          | 2.1                                                                |
| Path:                  | /nrf-quote-6/wrong-permission                                      |
| Title:                 | This type of planning permission is not currently included         |
| Data points:           | None                                                               |
| Conditional page flow: | display if planning permission type is not full, outline or hybrid |

#### Content

```
# Nature Restoration Fund levy is not available for this planning permission type
Other ways to mitigate environmental impact are:
- Habitat Regulations Assessment (HRA) for European sites or Ramsar sites
- Consent from Natural England for works affecting SSSIs
- Marine impact assessments for marine conservation zones
- Species licensing applications for protected species

[Find out about mitigating environmental impact](#)
```

#### Errors

None

---


### Are you developing housing?

| **Field**              | **Value**                   |
| ---------------------- | --------------------------- |
| Order number:          | 3                           |
| Path:                  | /nrf-quote-6/housing        |
| Title:                 | Are you developing housing? |
| Conditional page flow: | None                        |

#### Data points

```
{
    data: {
        isHousing: {
            type: radios,
            values: "Yes" | "No",
            conditional: none
            fieldName: "housing"
        }
    }
}
```

#### Content

```
# Are you developing housing?
Hint text: Housing is dwellings, this includes houses and flats.
- Yes
- No
Button: Continue
```

#### Errors

| **Field**      | **Value**                                                 |
| -------------- | --------------------------------------------------------- |
| Description:   | User has selected 'Continue' without choosing any options |
| Error summary: | There is a problem                                        |
| Error message: | Select yes if you are developing housing                  |


---

### Exit page if the development is not housing

| **Field**              | **Value**                                                     |
| ---------------------- | ------------------------------------------------------------- |
| Order number:          | 3.1                                                           |
| Path:                  | /nrf-quote-6/not-housing                                      |
| Title:                 | Only housing is currently included in Nature Restoration Fund |
| Data points:           | None                                                          |
| Conditional page flow: | display if no is selected                                     |

#### Content

```
# If you are developing anything other than housing you will need to mitigate in another way.

Other ways to mitigate environmental impact are:
- Habitat Regulations Assessment (HRA) for European sites or Ramsar sites
- Consent from Natural England for works affecting SSSIs
- Marine impact assessments for marine conservation zones
- Species licensing applications for protected species

[Find out about mitigating environmental impact](#)
```

#### Errors

None

---


### How many housing units

| **Field**              | **Value**                                   |
| ---------------------- | ------------------------------------------- |
| Order number:          | 4                                           |
| Path:                  | /nrf-quote-6/units                          |
| Title:                 | How many housing units in this development? |
| Conditional page flow: | none                                        |

#### Data points

```
{
    data: {
        residentialBuildingCount: {
            type: number,
            fieldName: "unit-count"
        }
    }
}
```

#### Content

```
# Enter the maximum number of units of housing you are developing
Hint text: A unit is a house, a HMO with 6 or less residents or a flat within a block of flats.

Button: Continue
```

#### Errors

| **Field**      | **Value**                                              |
| -------------- | ------------------------------------------------------ |
| Description:   | User has selected ‘Continue’ without entering a number |
| Error summary: | There is a problem                                     |
| Error message: | Enter the number of housing units to continue          |

---

### Choose how you would like to show us the boundary of your development

| **Field**              | **Value**                                                             |
| ---------------------- | --------------------------------------------------------------------- |
| Order number:          | 5                                                                     |
| Path:                  | /nrf-quote-6/redline-map                                              |
| Title:                 | Choose how you would like to show us the boundary of your development |
| Conditional page flow: | none                                                                  |

#### Data points

```
{
     data: {
        hasRedlineBoundaryFile: {
            type: radios
            required: true
            values: "Draw on a map" | "Upload a file"
            fieldName: "has-redline-boundary-file"
        }
    }
}
```

#### Content

```
# Choose how you would like to show us the boundary of your development
- Draw on a map
  Hint text: If you have more than one polygon in your red line boundary you must upload a file instead
- Upload a file
  Hint text: Upload a GeoJSON file (.geojson), keyhole markup language file (.kml), or a shapefile (.shp). The file must be smaller than 2MB.
```

#### Errors

| **Field**      | **Value**                                               |
| -------------- | ------------------------------------------------------- |
| Description:   | User has selected ‘Continue’ without choosing an option |
| Error summary: | There is a problem                                      |
| Error message: | Select if you would like to draw a map or upload a file |


---

### Upload a red line boundary file

| **Field**              | **Value**                                          |
| ---------------------- | -------------------------------------------------- |
| Order number:          | 5.1                                                |
| Path:                  | /nrf-quote-6/upload-redline                        |
| Title:                 | Upload a red line boundary file                    |
| Conditional page flow: | display if `data.hasRedlineBoundaryFile` is `true` |

#### Data points

```
{
    data: {
        redlineFile: {
            type: file,
            conditional: required if data.hasRedlineBoundaryFile === true
            fieldName: "redline-file"
        }
    }
}
```

#### Content

```
# Upload a red line boundary file
 Hint text: Upload a GeoJSON file (.geojson), keyhole markup language file (.kml), or a shapefile (.shp). The file must be smaller than 2MB.
```

#### Errors

| **Field**      | **Value**                                                           |
| -------------- | ------------------------------------------------------------------- |
| Description:   | user submits the page but does not upload a file                    |
| Error summary: | There is a problem                                                  |
| Error message: | Select a file                                                       |
| Description:   | Wrong file type                                                     |
| Error summary: | There is a problem                                                  |
| Error message: | The selected file must be a .geojson file, .kml file or a .shp file |
| Description:   | Wrong file size                                                     |
| Error summary: | There is a problem                                                  |
| Error message: | The [file] must be smaller than 2MB                                 |
| Description:   | File is empty                                                       |
| Error summary: | There is a problem                                                  |
| Error message: | The selected file is empty                                          |

---

### Draw a red line boundary

| **Field**              | **Value**                                           |
| ---------------------- | --------------------------------------------------- |
| Order number:          | 5.2                                                 |
| Path:                  | /nrf-quote-6/map                                    |
| Title:                 | Draw a red line boundary                            |
| Conditional page flow: | display if `data.hasRedlineBoundaryFile` is `false` |

#### Data points

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
```
#### Implementation notes (not page copy)

- Use the **same map architecture and structure as** `app/views/nrf-estimate-5/map.html` (do not generate the older custom map stack used in some journeys).
- The map page must use the `@defra/interactive-map` vendor bundle pattern (CSS + UMD scripts) and the component modules under `/public/javascripts/components/map/`.
- Keep the same structural pattern used by `nrf-estimate-5`:
  - map container with `id="map"`
  - stats slot with `id="stats-panel-slot"`
  - desktop drawing menu include (`map/_drawing-menu-desktop.html`)
  - instructions include (`map/_instructions.html`)
  - hidden input `id="boundary-data"` with form POST to `{basePath}/map`
- Keep the same UX capabilities and control set as `nrf-estimate-5`:
  - location search
  - drawing controls (add/edit/delete)
  - map view controls (show all England, zoom to boundary)
  - datasets/catchments toggle panel
  - contextual hints + client-side validation + save/continue flow
- Do **not** use the legacy map implementation pattern that relies on `mapbox-gl-draw` + custom scripts like `map-drawing-layers-spike.js`.

#### Errors

| **Field**      | **Value**                                                          |
| -------------- | ------------------------------------------------------------------ |
| Description:   | User has selected 'Save and continue' without entering any details |
| Error summary: | There is a problem                                                 |
| Error message: | Draw a red line boundary to continue                               |

---

### Exit page if the development site is not within an EDP area (conditional)

| **Field**              | **Value**                                                  |
| ---------------------- | ---------------------------------------------------------- |
| Order number:          | 5.3                                                        |
| Path:                  | /nrf-quote-6/no-edp                                        |
| Title:                 | Nature Restoration Fund levy is not available in this area |
| Data points:           | None                                                       |
| Conditional page flow: | display if development site is not within an EDP area      |

#### Content

```
# Nature Restoration Fund levy is not available in this area
Other ways to mitigate environmental impact are:
- Habitat Regulations Assessment (HRA) for European sites or Ramsar sites
- Consent from Natural England for works affecting SSSIs
- Marine impact assessments for marine conservation zones
- Species licensing applications for protected species

[Find out about mitigating environmental impact](#)
```

#### Errors

None


---


### Exit page if over capacity

| **Field**              | **Value**                                                                      |
| ---------------------- | ------------------------------------------------------------------------------ |
| Order number:          | 5.4                                                                            |
| Path:                  | /nrf-quote-6/no-capacity                                                       |
| Title:                 | This Environmental Delivery Plan (EDP) does not have enough capacity remaining |
| Data points:           | None                                                                           |
| Conditional page flow: | display if housing units are greater than 15000                                |

#### Content

```
# This Environmental Delivery Plan (EDP) for the Nature Restoration Fund levy does not have enough capacity remaining for this number of houses.

[Check the capacity for EDPs](#)
```

#### Errors

None


---

### Email entry

| **Field**              | **Value**                   |
| ---------------------- | --------------------------- |
| Order number:          | 6                           |
| Path:                  | /nrf-quote-6/estimate-email |
| Title:                 | Enter your email address    |
| Conditional page flow: | None                        |

#### Data points

```
{
    data: {
        estimateEmail: {
            type: email,
            required: true,
            fieldName: "email"
        }
    }
}
```

#### Content

```
# Enter your email address
Hint text: A copy of the quote will be emailed to you.
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

| **Field**              | **Value**                       |
| ---------------------- | ------------------------------- |
| Order number:          | 7                               |
| Path:                  | /nrf-quote-6/check-your-answers |
| Title:                 | Check your answers              |
| Conditional page flow: | None                            |

#### Data points

None

#### Content

# Check your answers

| Question                 | Answer                                                       | Action                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Planning permission type | `data.planningType`                                          | [Change](/nrf-quote-6/planning-type?change=true&nav=check-your-answers)                                                                      |
| Housing                  | `data.isHousing`                                             |                                                                                                                                              |
| Number of housing units  | `data.residentialBuildingCount`                              | [Change](/nrf-quote-6/units?change=true&nav=check-your-answers)                                                                              |
| Red line boundary        | Show **Added** or **Not added** (reflect upload or map flow) | [Change](/nrf-quote-6/map?nav=check-your-answers) or [Change](/nrf-quote-6/upload-redline?change=true&nav=check-your-answers) as appropriate |
| Email address            | `data.estimateEmail` or `data.email`                         | [Change](/nrf-quote-6/estimate-email?change=true&nav=check-your-answers)                                                                     |

#### Errors

None

#### Implementation notes (not page copy)

- Primary button: **Submit** — form POST to `/nrf-quote-6/check-your-answers`.
- Secondary control: **Delete** — links to `/nrf-quote-6/delete-quote`.
- Back link: from `/nrf-quote-6/estimate-email` (or the previous step in the quote branch).
- **Change** links use `?change=true&nav=check-your-answers` (or equivalent) so return navigation returns to check your answers.

---


### Are you sure you want to delete this quote?

| **Field**              | **Value**                                                                   |
| ---------------------- | --------------------------------------------------------------------------- |
| Order number:          | 7.1                                                                         |
| Path:                  | /nrf-quote-6/delete-quote                                                   |
| Title:                 | Are you sure you want to delete this quote?                                 |
| Conditional page flow: | display if user clicks the delete button on /nrf-quote-6/check-your-answers |

#### Data points

```
{
    data: {
        confirmDeleteQuote: {
            type: radios,
            required: conditional - required if user clicked delete on check-your-answers,
            values: "Yes" | "No",
            fieldName: "confirm-delete-quote"
        }
    }
}
```

#### Content

```
# Are you sure you want to delete this quote?
This will permanently delete your quote. You can create a new quote.

Button: Yes
Secondary button: No
```


---

### Delete confirmation page

| **Field**              | **Value**                        |
| ---------------------- | -------------------------------- |
| Order number:          | 7.2                              |
| Path:                  | /nrf-quote-6/delete-confirmation |
| Title:                 | Your details have been deleted   |
| Data points:           | None                             |
| Conditional page flow: | None                             |

#### Content

```

<green-banner>
# Your details have been deleted
</green-banner>

## What happens next

Your quote details have been removed and deleted.

[Get another quote](/nrf-quote-6/start)

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the NRF reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

[Find out about call charges](https://www.gov.uk/call-charges)

```

#### Implementation notes (not page copy)

- Use the GOV.UK panel component (`govuk-panel--confirmation`) for the green banner.
- If this template is shared across journey types (quote, commit, payment), branch copy with `data.journeyType` (or equivalent) in the template — the block above is the **quote / estimate** variant after delete.

#### Errors

None

---

### Details submitted confirmation page

| **Field**              | **Value**                        |
| ---------------------- | -------------------------------- |
| Order number:          | 8                                |
| Path:                  | /nrf-quote-6/confirmation        |
| Title:                 | Your details have been submitted |
| Data points:           | None                             |
| Conditional page flow: | None                             |

#### Content

```

<green-banner>
# Your details have been submitted

NRF reference: {{ data.nrfReference }}
</green-banner>

## What happens next

You told us the development:
- has {{ data.planningType }} planning permission
- has Housing with a total of {{ data.residentialBuildingCount }} housing unit(s) *(conditional: only shown if residentialBuildingCount is set)*
- is planned in {{ data.redlineBoundaryPolygon.intersectingCatchment or data.intersectingCatchment or 'Thames Valley EDP' }}

## What you might need to pay

Based on the information you have provided, the development falls into an area with an Environmental Delivery Plan (EDP), so you can use the Nature Restoration Fund Nutrients levy.

The quote for the total amount you may need to pay if you develop in this area is: **£{{ data.levyAmount or '2,500' }}**

You do not need to pay anything at this point, this service is designed to help you plan how to mitigate your environmental obligations. [Get another quote](/nrf-quote-6/start)

If you decide to mitigate environmental impact using Nature Restoration Fund levy, contact Natural England to request to use NRF.

Keep the email we send you as a record of the quote and NRF reference number.

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the NRF reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

[Find out about call charges](https://www.gov.uk/call-charges)

[View the email content](/nrf-quote-6/estimate-email-content)

```

#### Implementation notes (not page copy)

- Use the GOV.UK panel component (`govuk-panel--confirmation`) for the green banner.
- **View the email content** link goes to `/nrf-quote-6/estimate-email-content`.

#### Errors

None

---

### Email sent from the Nature Restoration Fund service

| **Field**              | **Value**                                           |
| ---------------------- | --------------------------------------------------- |
| Order number:          | 9                                                   |
| Path:                  | /nrf-quote-6/estimate-email-content                 |
| Title:                 | Email sent from the Nature Restoration Fund service |
| Data points:           | None                                                |
| Conditional page flow: | None                                                |

#### Content

```

<inset-text>
**To:** {{ data.estimateEmail or 'user@example.com' }}

**Subject:** Nature Restoration Fund – quote for the Nature Restoration Fund levy
</inset-text>

# Nature Restoration Fund – quote for the Nature Restoration Fund levy

## NRF reference: {{ data.nrfReference }}

Thank you for submitting details of the development on the Get a quote for the Nature Restoration Fund levy service.

You told us the development:
- has {{ data.planningType }} planning permission
- has Housing with a total of {{ data.residentialBuildingCount }} housing unit(s) *(conditional: only shown if residentialBuildingCount is set)*
- is planned in {{ data.redlineBoundaryPolygon.intersectingCatchment or data.intersectingCatchment or 'Thames Valley EDP' }}

## What you might need to pay

Based on the information you have provided, the development falls into an area with an Environmental Delivery Plan (EDP), so you can use the Nature Restoration Fund Nutrients levy.

The quote for the total amount you may need to pay if you develop in this area is: **£{{ data.levyAmount or '2,500' }}**

You do not need to pay anything at this point, this service is designed to help you plan how to mitigate your environmental obligations. [Get another quote](/nrf-quote-6/start)

If you decide to mitigate environmental impact using Nature Restoration Fund levy, contact [Natural England](#) to request to use NRF.

Keep this email as a record of the quote and NRF reference number.

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the NRF reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

[Find out about call charges](https://www.gov.uk/call-charges)


```

#### Implementation notes (not page copy)

- Use the GOV.UK inset text component (`govuk-inset-text`) for the To/Subject block.

---

## Technical Requirements

### File Structure

Create the following files in the GOV.UK Prototype Kit structure:

1. **Route File**: `app/routes/nrf-quote-6.js`
2. **Config File**: `app/config/nrf-quote-6/routes.js` (route path constants and template names)
3. **View Directory**: `app/views/nrf-quote-6/`
4. **View Files**: One HTML file per page in the journey
5. **Data File**: `app/data/nrf-quote-6-data.js` (if needed)

### Route Implementation

- Use GOV.UK Prototype Kit router setup
- Implement GET routes for displaying pages
- Implement POST routes for form submissions
- Handle conditional routing based on form data
- Store form data in session using `req.session.data`
- Implement validation logic with appropriate error handling
- Include back links on each page using **hardcoded paths** to the previous step in this journey (do not use `javascript:history.back()`).

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

### Session data (key names used in this spec)

| Key                                                   | Purpose                                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `planningType`                                        | Selected planning permission type                                                    |
| `isHousing`                                           | Whether the development is housing (`Yes` \| `No`)                                   |
| `hasRedlineBoundaryFile`                              | How the user provides the red line (`false`: Draw on a map \| `true`: Upload a file) |
| `redlineFile`                                         | Uploaded boundary file (when upload path)                                            |
| `redlineBoundaryPolygon`                              | Drawn boundary / map state (when map path)                                           |
| `residentialBuildingCount`                            | Housing unit count                                                                   |
| `estimateEmail`                                       | Email address for the quote                                                          |
| `confirmDeleteQuote`                                  | Delete confirmation on check your answers                                            |
| `nrfReference`, `levyAmount`, `intersectingCatchment` | Set on submit / for confirmation and email previews                                  |

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

1. **Create** `app/config/nrf-quote-6/routes.js` and **`app/routes/nrf-quote-6.js`** with all GET and POST routes for the journey
2. **Create the view directory** `app/views/nrf-quote-6/` and all HTML template files
3. **Implement form validation** with proper error handling
4. **Add conditional routing** based on user selections
5. **Register the journey** in `app/config/shared/journeys.js` with `basePath: '/nrf-quote-6'` (the app mounts route modules from `JOURNEYS`; do not edit `app/routes/routes.js` unless the project pattern requires it)
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
