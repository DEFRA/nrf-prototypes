# Create NRF Quote Journey in GOV.UK Prototype Kit

## Journey Information

- **Journey Name**: Get a quote for Nature Restoration Fund levy
- **Journey Description**:
  A user journey for a developer to obtain a quote for the Nature Restoration Fund levy required when submitting planning permission to build a development of some sort. A significant page in the journey is `/nrf-quote-6/map` where the user will be able to plot a polygon on a map to define the development site boundary. There will also be 5 polygon areas over England that are known as EDP boundaries. If the development site boundary does not fall within an EDP area then the user will be navigated to the exit page `/nrf-quote-6/no-edp`.
- **Journey Route Prefix**: nrf-quote-6 (canonical URL first segment: `/nrf-quote-6/...`)
- **Start Page Title**: Get a quote for the nature restoration levy

## Page Flow and Conditional Logic


### Landing page

| **Field**                  | **Value**                                   |
| -------------------------- | ------------------------------------------- |
| **Order number:**          | 1                                           |
| **Path:**                  | /nrf-quote-6/start                          |
| **Title:**                 | Get a quote for the nature restoration levy |
| **Conditional page flow:** | none                                        |

#### Data points

None

#### Content

```
# Nature restoration levy

## Using the nature restoration levy to meet your environmental obligations

Use this service to find out if your relevant development is in an area with an [Environmental Delivery Plan (EDP)](#).

If your development falls into an area with an EDP, you can get a quote and then request to use the nature restoration fund levy to meet your environmental obligations.

If you choose not to use the nature restoration fund levy, you will still need to [meet your environmental obligations in other ways](#).

CTA: Start now 

## What you need to do

### Getting a quote

To get a quote you will need to tell us:

* the type of planning application you are submitting
* that you are building units of housing (this includes houses and flats)
* the number of units of housing
* where the development is planned – you can use a red line boundary file or draw a red line boundary

You will be sent a quote email with a NRF reference and the amount of the levy. You can get as many quotes as you like.

### What to do with your quote

Once you have a quote, you will be able to contact Natural England and request to use the nature restoration fund levy. 
The quote is not a commitment to use the nature restoration fund levy to discharge relevant environmental obligations. A Local Planning Authority must not accept the quote as part of any planning and decision-making processes.


## Get help with the nature restoration fund levy

If you need help with the nature restoration fund levy, contact XXXX.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)

Telephone: 00000000000

Monday to Friday, 8:30am to 5pm, except bank holidays

[Find out about call charges](https://www.gov.uk/call-charges)
```


---

### What type of planning permission

| **Field**              | **Value**                                                     |
| ---------------------- | ------------------------------------------------------------- |
| Order number:          | 2                                                             |
| Path:                  | /nrf-quote-6/planning-type                                    |
| Title:                 | What type of planning application are you planning to submit? |
| Conditional page flow: | none                                                          |

#### Data points

```
{
    data: {
        planningType: {
            type: radios,
            values: "Full (including any variations)" | "Outline (including any variations)" | "Hybrid (including any variations)" | Other,
            fieldName: "planning-type"
        }
    }
}
```

#### Content

```
# What type of planning application are you planning to submit?
Select one
- Full (including any variations)
- Outline (including any variations)
- Hybrid (including any variations)
- Other

Button: Continue
```

#### Errors

| **Field**      | **Value**                                                 |
| -------------- | --------------------------------------------------------- |
| Description:   | User has selected 'Continue' without choosing any options |
| Error summary: | There is a problem                                        |
| Error message: | Select a planning application type to continue            |


---

### Exit page if the planning permission is not full, outline or hybrid

| **Field**              | **Value**                                                   |
| ---------------------- | ----------------------------------------------------------- |
| Order number:          | 2.1                                                         |
| Path:                  | /nrf-quote-6/wrong-permission                               |
| Title:                 | This type of planning application is not currently included |
| Data points:           | None                                                        |
| Conditional page flow: | display if planning application type is Other               |

#### Content

```
# Nature restoration levy is not currently available for this planning application type

Please use the existing Habitat Regulations to meet your environmental obligations.

[Find out about Habitat Regulations](#)
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
# Are you developing housing units?
Hint text: Housing units are dwellings, this includes houses and flats.
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

| **Field**              | **Value**                                             |
| ---------------------- | ----------------------------------------------------- |
| Order number:          | 3.1                                                   |
| Path:                  | /nrf-quote-6/not-housing                              |
| Title:                 | Nature restoration levy is only available for housing |
| Data points:           | None                                                  |
| Conditional page flow: | display if no is selected                             |

#### Content

```
#  Nature restoration levy is only available for housing units

Please use the existing Habitat Regulations to meet your environmental obligations.

[Find out about Habitat Regulations](#)

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
# Enter the maximum number of units you are developing
Hint text: A housing unit is a house, a HMO with 6 or less residents or a flat within a block of flats.

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
  Hint text: If you have more than one polygon in your red line boundary you must upload a file instead.
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
#  Nature restoration levy is not available in this area

Please use the existing Habitat Regulations to meet your environmental obligations.

[Find out about Habitat Regulations](#)
```

#### Errors

None


---


### Exit page if over capacity

| **Field**              | **Value**                                       |
|------------------------|-------------------------------------------------|
| Order number:          | 5.4                                             |
| Path:                  | /nrf-quote-6/no-capacity                        |
| Title:                 | Not enough capacity remaining                   |
| Data points:           | None                                            |
| Conditional page flow: | display if housing units are greater than 15000 |

#### Content

```
# Not enough capacity remaining
The Environmental Delivery Plan (EDP) in this area does not have enough remaining capacity for this number of houses.
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
Hint text: Once your quote is calculated, a copy of the quote will be emailed to you. This could take up to 00 minutes.
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

#### Implementation notes (not page copy)

- Back link: `/nrf-quote-6/map` (draw path) or `/nrf-quote-6/upload-redline` (upload path) — derive from `data.mapReferrer` or `data.hasRedlineBoundaryFile`.
- When navigating back from check-your-answers (change mode), back link should point to `/nrf-quote-6/check-your-answers`.
- On successful POST, redirect to `/nrf-quote-6/check-your-answers`.

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

| Question                  | Answer                                                       | Action                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Planning application type | `data.planningType`                                          | [Change](/nrf-quote-6/planning-type?change=true&nav=check-your-answers)                                                                      |
| Housing                   | `data.isHousing`                                             |                                                                                                                                              |
| Number of units           | `data.residentialBuildingCount`                              | [Change](/nrf-quote-6/units?change=true&nav=check-your-answers)                                                                              |
| Red line boundary         | Show **Added** or **Not added** (reflect upload or map flow) | [Change](/nrf-quote-6/map?nav=check-your-answers) or [Change](/nrf-quote-6/upload-redline?change=true&nav=check-your-answers) as appropriate |
| Email address             | `data.estimateEmail`                                         | [Change](/nrf-quote-6/estimate-email?change=true&nav=check-your-answers)                                                                     |

```
# Check your answers

You will receive an indicative nature restoration levy quote, based on the details you provide. For the purposes of section 72 of the Planning and Infrastructure Act 2025, the quote is not a commitment to use the nature restoration fund levy to discharge relevant environmental obligations. 
A Local Planning Authority must not accept the quote as part of any planning and decision making processes.

Button: Confirm and submit
```

#### Errors

None

#### Implementation notes (not page copy)

- Primary button: **Confirm and submit** — form POST to `/nrf-quote-6/check-your-answers`.
- Secondary control: **Delete** — rendered as a destructive link (`govuk-link--destructive`) to `/nrf-quote-6/delete-quote`.
- Back link: `/nrf-quote-6/estimate-email`.
- **Change** links use `?change=true&nav=check-your-answers` (or equivalent) so return navigation returns to check your answers.
- Red line boundary Change link is conditional: `/nrf-quote-6/upload-redline?change=true&nav=check-your-answers` if `data.hasRedlineBoundaryFile` is true, otherwise `/nrf-quote-6/map?nav=check-your-answers`.

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


## Get help with the nature restoration fund levy

If you need help with the nature restoration fund levy, contact XXXX.

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

You will receive an email with details of the quote.

You do not need to pay anything at this point, this service is designed to help you plan how to meet your environmental obligations for your relevant development.

If you decide to meet environmental obligations using nature restoration levy, you can request to use it.

Keep the email as a record of the quote and NRF reference number. You can use the reference number to retrieve this quote when you are ready to request to use nature restoration levy.

## Get help with the nature restoration fund levy

If you need help with the nature restoration fund levy, contact XXXX.

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

**Subject:** Nature restoration levy – quote
</inset-text>

# Nature restoration levy – quote

## NRF reference: {{ data.nrfReference }}

Thank you for submitting details of the relevant development on the Get a quote for the nature restoration levy service.

This is an indicative nature restoration levy quote, based on the details you provided. For the purposes of section 72 of the Planning and Infrastructure Act 2025, this quote is not a commitment to use the nature restoration fund levy to discharge relevant environmental obligations. A Local Planning Authority must not accept this quote as part of any planning and decision-making processes.

## Details of your relevant development

You told us the relevant development:
- will have {{ data.planningType | lower }} planning permission
- has housing with a total of {{ data.residentialBuildingCount }} housing unit(s)

## What you might need to pay

Your relevant development is planned in {{ data.redlineBoundaryPolygon.intersectingCatchment or data.intersectingCatchment }} Environmental Delivery Plan (EDP) addressing nutrient pollution.

### Provisional nature restoration levy quote £X,XXX

The amount is calculated from the charging schedule(s) in the relevant EDP(s).

### Inflation-adjusted nature restoration levy quote: £X,XXX

This shows the estimated levy for the year this quote was issued. The amount includes annual inflation in line with the RICS Community Infrastructure Levy (CIL) Index, published on 1 November for the following calendar year. This quote is indicative and subject to annual inflation. It shows the amount you may need to pay if you request to use the nature restoration levy.

## Next steps

You do not need to pay anything now, this service is designed to help you plan how to meet your environmental obligations. You can [get another quote](/nrf-quote-6/start) at any time. 

Keep this email for your records.

When you are ready to start the planning and development process, you can [request to use the nature restoration levy](#). Once your request is accepted, you will receive a commitment certificate. You can submit this alongside your planning application.

## How your nature restoration levy was calculated

Your levy has been calculated from the details you submitted and the charging schedule for the EDP. [Read about the charging schedule for the EDP](#).

## What your levy will pay for

Your levy will fund conservation measures delivered under the relevant EDPs, including their long-term management and monitoring, as well as administration costs. EDP’s set out measures needed to address the environmental impacts of development in an area and deliver an overall improvement in the conservation status of the environmental features set out in the EDP.

## Get help with the nature restoration fund levy

If you need help with the nature restoration fund levy, contact XXXX.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)

Telephone: 00000000000

Monday to Friday, 8:30am to 5pm, except bank holidays

[Find out about call charges](https://www.gov.uk/call-charges)


```

#### Implementation notes (not page copy)

- Use the GOV.UK inset text component (`govuk-inset-text`) for the To/Subject block.
- The housing unit bullet (`has housing with a total of…`) is conditional — only render if `data.residentialBuildingCount` is set.
- Apply `| lower` filter to `data.planningType` when used in running sentence text (e.g. "will have full planning permission"), but not in standalone summary-list values.

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
