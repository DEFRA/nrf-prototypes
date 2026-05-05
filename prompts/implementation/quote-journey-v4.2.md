# Create NRF Quote Journey in GOV.UK Prototype Kit

## Journey Information

- **Journey Name**: Get a quote for Nature Restoration Fund Levy
- **Journey Description**:
  A user journey for a developer to obtain a quote for the Nature Restoration Fund levy required when submitting planning permission to build a development of some sort. A significant page in the journey is `/nrf-estimate-6/map` where the user will be able to plot a polygon on a map to define the development site boundary. There will also be 5 polygon areas over England that are known as EDP boundaries. If the development site boundary does not fall within an EDP area then the user will be navigated to the exit page `/nrf-estimate-6/no-edp`.
- **Journey Route Prefix**: nrf-estimate-6 (canonical URL first segment: `/nrf-estimate-6/...`)
- **Start Page Title**: Get a quote for Nature Restoration Fund Levy

## Page Flow and Conditional Logic

### Landing page

| **Field**                  | **Value**                                    |
| -------------------------- | -------------------------------------------- |
| **Order number:**          | 1                                            |
| **Path:**                  | /nrf-estimate-6/start                        |
| **Title:**                 | Get a quote for Nature Restoration Fund Levy |
| **Conditional page flow:** | none                                         |

#### Data points

None

#### Content

```
# Nature Restoration Fund

## Using NRF to discharge your environmental obligations

Use this service to find out if your development is in an area with an EDP, get a quote for the cost of the levy, commit to using the levy and pay the levy.

If a development falls into an area with an [Environmental Delivery Plan (EDP)](#), you can use [Nature Restoration Fund (NRF)](#) levies to discharge environmental obligations.
If you choose not to use the NRF levy, you will still need to [discharge your obligations in other ways](#).

CTA: Start now

## What you need

### Getting a quote

To get a quote you will need:

* to show us where the development is planned – you can use a red line boundary file or draw a red line boundary
* to tell us the types of buildings planned
* details about the amount of buildings or rooms

We will send you an email with an NRF reference and the amount of the levy. You can get as many quotes as you like.

### Committing to using NRF

Do this as part of your planning application.

To commit to using NRF you will need:

* the NRF reference from your quote
* to confirm the details of your development
* the company details
* the LPA details
* to agree to the terms and conditions

You will receive a commitment document that you can submit with your planning application.

### Paying the NRF

Do this once you have planning permission and have your Planning Decision Notice.

To pay the NRF and discharge your environmental obligations, you will need:

* the NRF reference from your commitment
* to confirm the details of your development
* the planning reference
* to agree to the terms and conditions

Your LPA will ask you to pay the levy when it is time to discharge your planning conditions. Once you have confirmed the details and your Local Planning Authority has approved them, you will receive an email with ways you can pay.

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)

Telephone: 00000000000

Monday to Friday, 8:30am to 5pm, except bank holidays

[Find out about call charges](https://www.gov.uk/call-charges)
```

---

### What would you like to do?

| **Field**              | **Value**                                 |
| ---------------------- | ----------------------------------------- |
| Order number:          | 2                                         |
| Path:                  | /nrf-estimate-6/what-would-you-like-to-do |
| Title:                 | What would you like to do?                |
| Conditional page flow: | none                                      |

#### Data points

```
{
    data: {
        journeyType: {
            type: radios
            required: true
            values: "quote" | "commit" | "payment"
            labels: "I want a quote for the Nature Restoration Fund levy" | "I am ready to commit to using the Nature Restoration Fund levy" | "I am ready to pay the Nature Restoration Fund levy"
            fieldName: "journey-type"
        }
    }
}
```

#### Content

```
# What would you like to do?
- I want a quote for the Nature Restoration Fund levy
- I am ready to commit to using the Nature Restoration Fund levy
  Hint text: Do this as part of your planning application
- I am ready to pay the Nature Restoration Fund levy
 Hint text: Do this when you are ready to discharge your planning conditions
```

#### Errors

| **Field**      | **Value**                                               |
| -------------- | ------------------------------------------------------- |
| Description:   | User has selected 'Continue' without choosing an option |
| Error summary: | There is a problem                                      |
| Error message: | Select what you would like to do                        |

---

### Choose how you would like to show us the boundary of your development

| **Field**              | **Value**                                                             |
| ---------------------- | --------------------------------------------------------------------- |
| Order number:          | 3                                                                     |
| Path:                  | /nrf-estimate-6/redline-map                                           |
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

| **Field**               | **Value**                                       |
| ----------------------- | ----------------------------------------------- |
| Order number:           | 3.1                                             |
| Path:                   | /nrf-estimate-6/upload-redline                  |
| Title:                  | Upload a red line boundary file                 |
| Conditional page flow:  | display if `data.hasRedlineBoundaryFile` is `true` |

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

| **Field**               | **Value**                                        |
| ----------------------- | ------------------------------------------------ |
| Order number:           | 3.2                                              |
| Path:                   | /nrf-estimate-6/map                              |
| Title:                  | Draw a red line boundary                         |
| Conditional page flow:  | display if `data.hasRedlineBoundaryFile` is `false` |

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

| **Field**               | **Value**                                                  |
| ----------------------- | ---------------------------------------------------------- |
| Order number:           | 3.3                                                        |
| Path:                   | /nrf-estimate-6/no-edp                                     |
| Title:                  | Nature Restoration Fund levy is not available in this area |
| Data points:            | None                                                       |
| Conditional page flow:   | display if development site is not within an EDP area      |

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

### What type of development is it?

| **Field**               | **Value**                                                   |
| ----------------------- | ----------------------------------------------------------- |
| Order number:           | 4                                                           |
| Path:                   | /nrf-estimate-6/building-type                               |
| Title:                  | What type of development is it?                             |
| Conditional page flow:  | display if red line boundary falls within EDP boundary area |

#### Data points

```
{
    data: {
        buildingTypes: {
            type: checkboxes,
            values: "Housing" | "Other residential",
            conditional: required if red line boundary falls within EDP boundary area
            fieldName: "building-types"
        }
    }
}
```

#### Content

```
# What type of development is it?
Select all that apply
- Housing
Hint text: Dwellings, HMOs of 6 or less residents, static caravans or mobile homes with permanent residents
- Other residential
Hint text: HMOs for 7 or more residents, care homes, retirement homes, student accommodation, prisons and secure institutions, military accommodation, hotels, bed and breakfasts, Holiday lets, caravans and camping

Button: Continue
```

#### Errors

| **Field**      | **Value**                                                 |
| -------------- | --------------------------------------------------------- |
| Description:   | User has selected 'Continue' without choosing any options |
| Error summary: | There is a problem                                        |
| Error message: | Select a development type to continue                     |


---

### How many residential units in this development?

| **Field**              | **Value**                                                          |
| ---------------------- | ------------------------------------------------------------------ |
| Order number:          | 4.1                                                                |
| Path:                  | /nrf-estimate-6/residential                                        |
| Title:                 | How many residential units in this development?                    |
| Conditional page flow: | display if data.buildingTypes includes Housing                     |

#### Data points

```
{
    data: {
        residentialBuildingCount: {
            type: number,
            required: conditional - required if data.buildingTypes includes Housing
            fieldName: "residential-building-count"
        }
    }
}
```

#### Content

```
# How many residential units in this development?
Hint text: A unit is a house, a HMO with 6 or less residents, a flat within a block of flats or a caravan or mobile home on a site.

Button: Continue
```

#### Errors

| **Field**      | **Value**                                              |
| -------------- | ------------------------------------------------------ |
| Description:   | User has selected ‘Continue’ without entering a number |
| Error summary: | There is a problem                                     |
| Error message: | Enter the number of dwelling buildings to continue     |

---

### What is the maximum number of people the development will serve?

| **Field**              | **Value**                                                                       |
| ---------------------- | ------------------------------------------------------------------------------- |
| Order number:          | 4.2                                                                             |
| Path:                  | /nrf-estimate-6/people-count                                                    |
| Title:                 | What is the maximum number of people the development will serve?                |
| Conditional page flow: | display if data.buildingTypes includes "Other residential"                      |

#### Data points

```
{
    data: {
        peopleCount: {
            type: number,
            required: conditional - required if data.buildingTypes includes "Other residential",
            fieldName: "people-count"
        }
    }
}
```

#### Content

```
# What is the maximum number of people the development will serve?
Hint text: This should be the maximum capacity allowed for your development.

Link (separate line below input): [Find out how to calculate your maximum capacity for your development](javascript:void(0))

Button: Continue
```

#### Errors

| **Field**      | **Value**                                              |
| -------------- | ------------------------------------------------------ |
| Description:   | User has selected ‘Continue’ without entering a number |
| Error summary: | There is a problem                                     |
| Error message: | Enter the maximum number of people to continue         |

---

### Confirm which waste water treatment works will be used for this development

| **Field**              | **Value**                                                                   |
| ---------------------- | --------------------------------------------------------------------------- |
| Order number:          | 5                                                                           |
| Path:                  | /nrf-estimate-6/waste-water                                                 |
| Title:                 | Confirm which waste water treatment works will be used for this development |
| Conditional page flow: | none                                                                        |

#### Data points

```
{
     data: {
        wasteWaterTreatmentWorks: {
            type: radios
            required: true
            values: "Great Billing WRC" | "Letchworth Wastewater Treatment Plant" | "Main Pump Hall" | "I don't know the waste water treatment works yet"
            fieldName: "waste-water-treatment-works"
        }
    }
}
```

#### Content

```
# Confirm which waste water treatment works will be used for this development
Hint text: Your quote will be partially based on the waste water treatment works you choose. If you don't know your waste water treatment works yet, we will provide a quote range.
- Great Billing WRC
- Letchworth Wastewater Treatment Plant
- Main Pump Hall
- I don't know the waste water treatment works yet

Button: Continue
```

#### Errors

| **Field**      | **Value**                                                                        |
| -------------- | -------------------------------------------------------------------------------- |
| Description:   | User has selected ‘Continue’ without choosing an option                          |
| Error summary: | There is a problem                                                               |
| Error message: | Select the waste water treatment works or tell us you don't know yet to continue |


---

### Email entry

| **Field**              | **Value**                      |
| ---------------------- | ------------------------------ |
| Order number:          | 6                              |
| Path:                  | /nrf-estimate-6/estimate-email |
| Title:                 | Enter your email address       |
| Conditional page flow: | None                           |

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
Hint text: Once your Nature Restoration Fund levy amount is calculated, the quote will be emailed to you. This could take up to 00 minutes.
```

#### Implementation notes (not page copy)

- For the commitment journey (NRF reference retrieval), use a separate email entry page at `/nrf-estimate-6/retrieve-estimate-email` with hint text: “We will send you a link so you can retrieve the details from your quote.” That page is not part of the linear quote-only path described in this document.

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

| **Field**              | **Value**                          |
| ---------------------- | ---------------------------------- |
| Order number:          | 7                                  |
| Path:                  | /nrf-estimate-6/check-your-answers |
| Title:                 | Check your answers                 |
| Conditional page flow: | None                               |

#### Data points

None

#### Content

# Check your answers

| Question | Answer | Action |
| -------- | ------ | ------ |
| Red line boundary | Show **Added** or **Not added** (reflect upload or map flow) | [Change](/nrf-estimate-6/map?nav=check-your-answers) or [Change](/nrf-estimate-6/upload-redline?change=true&nav=check-your-answers) as appropriate |
| Development types | List selected types (for example Housing, Other residential) | [Change](/nrf-estimate-6/building-type?change=true&nav=check-your-answers) |
| Number of residential units (if Housing selected) | `data.residentialBuildingCount` | [Change](/nrf-estimate-6/residential?change=true&nav=check-your-answers) |
| Maximum number of people (if Other residential selected) | `data.peopleCount` | [Change](/nrf-estimate-6/people-count?change=true&nav=check-your-answers) |
| Waste water treatment works | `data.wasteWaterTreatmentWorks` | [Change](/nrf-estimate-6/waste-water?change=true&nav=check-your-answers) |
| Email address | `data.estimateEmail` or `data.email` | [Change](/nrf-estimate-6/estimate-email?change=true&nav=check-your-answers) |

#### Errors

None

#### Implementation notes (not page copy)

- Primary button: **Submit** — form POST to `/nrf-estimate-6/check-your-answers`.
- Secondary control: **Delete** — links to `/nrf-estimate-6/delete-quote`.
- Back link: from `/nrf-estimate-6/estimate-email` (or the previous step in the quote branch).
- **Change** links use `?change=true&nav=check-your-answers` (or equivalent) so return navigation returns to check your answers.
- The summary list may include additional rows (for example room counts) when extended building-type options are present in the implementation.

---


### Are you sure you want to delete this quote?

| **Field**              | **Value**                                                                      |
| ---------------------- | ------------------------------------------------------------------------------ |
| Order number:          | 7.1                                                                            |
| Path:                  | /nrf-estimate-6/delete-quote                                                   |
| Title:                 | Are you sure you want to delete this quote?                                    |
| Conditional page flow: | display if user clicks the delete button on /nrf-estimate-6/check-your-answers |

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

| **Field**             | **Value**                           |
| --------------------- | ----------------------------------- |
| Order number:         | 7.2                                 |
| Path:                 | /nrf-estimate-6/delete-confirmation |
| Title:                | Your details have been deleted      |
| Data points:           | None                                |
| Conditional page flow: | None                                |

#### Content

```

<green-banner>
# Your details have been deleted
</green-banner>

## What happens next

Your quote details have been removed and deleted.

[Get another quote](/nrf-estimate-6/start)

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

| **Field**             | **Value**                        |
| --------------------- | -------------------------------- |
| Order number:         | 8                                |
| Path:                 | /nrf-estimate-6/confirmation     |
| Title:                | Your details have been submitted |
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

You do not need to pay anything at this point, this service is designed to help you plan how to mitigate environmental obligations.

If you decide to mitigate environmental impact using Nature Restoration Fund levy, you can commit to using the Nature Restoration Fund levy.

Keep the email as a record of the quote and NRF reference number. You can use the reference number to retrieve this quote when you are ready to commit to using Nature Restoration Fund.

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the NRF reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

[Find out about call charges](https://www.gov.uk/call-charges)

[View the email content](/nrf-estimate-6/estimate-email-content)

```

#### Implementation notes (not page copy)

- Use the GOV.UK panel component (`govuk-panel--confirmation`) for the green banner.
- Shared template across journey types: branch “What happens next” (and primary next link) by `data.journeyType` where needed — the fenced block above is the **quote** submission variant.
- **View the email content** link: use [`/nrf-estimate-6/estimate-email-content`](/nrf-estimate-6/estimate-email-content) when `data.wasteWaterTreatmentWorks` is any specific works; use [`/nrf-estimate-6/estimate-email-content-range`](/nrf-estimate-6/estimate-email-content-range) when the user chose **I don't know the waste water treatment works yet**.

#### Errors

None

---

### Email sent from the Nature Restoration Fund service

| **Field**             | **Value**                                           |
| --------------------- | --------------------------------------------------- |
| Order number:         | 9                                                   |
| Path:                 | /nrf-estimate-6/estimate-email-content              |
| Title:                | Email sent from the Nature Restoration Fund service |
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

- is planned in {{ data.redlineBoundaryPolygon.intersectingCatchment or data.intersectingCatchment or 'Thames Valley EDP' }}
- has [dynamically constructed list based on building types selected, e.g., "Housing with 6 residential units and a development with a maximum number of 80 people" or "Housing with a total of 5 residential units"]
- has waste water works in {{ data.wasteWaterTreatmentWorks }}

## What you might need to pay

Based on the information you have provided, the development falls into an area with an Environmental Delivery Plan (EDP), so you can use the Nature Restoration Fund Nutrients levy.

The quote for the total amount you may need to pay if you develop in this area is: **£{{ data.levyAmount or '2,500' }}**

You do not need to pay anything at this point, this service is designed to help you plan how to mitigate your environmental obligations. [Get another quote](/nrf-estimate-6/start)

If you do decide to mitigate using Nature Restoration Fund levy, you can commit and include the commitment when applying for planning permission.

[Commit to using Nature Restoration Fund](/nrf-estimate-6/do-you-have-a-nrf-ref)

Keep this email as a record of your quote and NRF reference number, you can use it to retrieve this quote when you are ready to commit.
You can also [create an account now](#)

## What your levy will pay for

Your levy will be spent on conservation, with amounts being spent on monitoring and maintenance. There will also be an admin charge of £00 taken from the levy payment. Levies are calculated as part of Environmental Delivery Plans (EDPs).

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
### Email sent from the Nature Restoration Fund service

| **Field**             | **Value**                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Order number:         | 9.1                                                                                                              |
| Path:                 | /nrf-estimate-6/estimate-email-content-range                                                                     |
| Title:                | Email sent from the Nature Restoration Fund service                                                              |
| Data points:          | None                                                                                                             |
| Conditional page flow: | display when data.wasteWaterTreatmentWorks === "I don't know the waste water treatment works yet"                |

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

- is planned in {{ data.redlineBoundaryPolygon.intersectingCatchment or data.intersectingCatchment or 'Thames Valley EDP' }}
- has [dynamically constructed list based on building types selected, e.g., "Housing with 6 residential units and a development with a maximum number of 80 people" or "Housing with a total of 5 residential units"]

## What you might need to pay

Based on the information you have provided, the development falls into an area with an Environmental Delivery Plan (EDP), so you can use the Nature Restoration Fund Nutrients levy.

The quote for the total amount you may need to pay if you develop in this area will be in the range of: **£{{ data.levyAmount or '1,500 to 2,500' }}**

You do not need to pay anything at this point, this service is designed to help you plan how to mitigate your environmental obligations. [Get another quote](/nrf-estimate-6/start)

If you do decide to mitigate using Nature Restoration Fund levy, you can commit and include the commitment when applying for planning permission.

[Commit to using Nature Restoration Fund](/nrf-estimate-6/do-you-have-a-nrf-ref)

Keep this email as a record of your quote and NRF reference number, you can use it to retrieve this quote when you are ready to commit.
You can also [create an account now](#)

## What your levy will pay for

Your levy will be spent on conservation, with amounts being spent on monitoring and maintenance. There will also be an admin charge of £00 taken from the levy payment. Levies are calculated as part of Environmental Delivery Plans (EDPs).

## Get help with Nature Restoration Fund

If you need help with Nature Restoration Fund, contact XXXX and give the NRF reference number.

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk)
Telephone: 00000000000
Monday to Friday, 8:30am to 5pm, except bank holidays

[Find out about call charges](https://www.gov.uk/call-charges)

```

#### Implementation notes (not page copy)

- Use the GOV.UK inset text component (`govuk-inset-text`) for the To/Subject block.
- Omit the “waste water works” bullet from the email body when the user did not select a specific works (aligned with this range quote variant).

---

## Technical Requirements

### File Structure

Create the following files in the GOV.UK Prototype Kit structure:

1. **Route File**: `app/routes/nrf-estimate-6.js`
2. **Config File**: `app/config/nrf-estimate-6/routes.js` (route path constants and template names)
3. **View Directory**: `app/views/nrf-estimate-6/`
4. **View Files**: One HTML file per page in the journey
5. **Data File**: `app/data/nrf-estimate-6-data.js` (if needed)

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

| Key | Purpose |
| --- | --- |
| `journeyType` | Branch for combined journey entry (`quote` \| `commit` \| `payment`) |
| `hasRedlineBoundaryFile` | How the user provides the red line (`false`: Draw on a map \| `true`: Upload a file) |
| `redlineFile` | Uploaded boundary file (when upload path) |
| `redlineBoundaryPolygon` | Drawn boundary / map state (when map path) |
| `buildingTypes` | Selected development types (checkboxes) |
| `residentialBuildingCount` | Dwelling count when Housing selected |
| `peopleCount` | Capacity when Other residential selected |
| `wasteWaterTreatmentWorks` | Selected WwTW or “don’t know yet” |
| `estimateEmail`, `email` | Email for the quote (both keys may be present in templates/routes) |
| `confirmDeleteQuote` | Delete confirmation on check your answers |
| `nrfReference`, `levyAmount`, `intersectingCatchment` | Set on submit / for confirmation and email previews |

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

1. **Create** `app/config/nrf-estimate-6/routes.js` and **`app/routes/nrf-estimate-6.js`** with all GET and POST routes for the journey
2. **Create the view directory** `app/views/nrf-estimate-6/` and all HTML template files
3. **Implement form validation** with proper error handling
4. **Add conditional routing** based on user selections
5. **Register the journey** in `app/config/shared/journeys.js` with `basePath: '/nrf-estimate-6'` (the app mounts route modules from `JOURNEYS`; do not edit `app/routes/routes.js` unless the project pattern requires it)
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
