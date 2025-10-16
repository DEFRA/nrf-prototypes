# Create NRF Quote Journey in GOV.UK Prototype Kit

## Journey Information
- **Journey Name**: Get an estimate for Nature Resturation Fund Levy
- **Journey Description**:  
A user journey for a developer to obtain a quote for the Nature Restoration Fund levy required when submitting planning permission to build a development of some sort. A significant page in the journey is /nrf-estimate-1/map where the user will be able to plot a polygon on a map to define the development site boundary. There will also be 5 polygon areas over England that are known as EDP boundaries. If the development site boundary does not fall within an EDP area then the user will be navigated to the exit page /nrf-estimate-1/no-edp.
- **Journey Route Prefix**: nrf-estimate-1
- **Start Page Title**: Get an estimate for Nature Restoration Fund Levy

## Page Flow and Conditional Logic

### Landing page
| **Field** | **Value** |
|-----------|-----------|
| **Order number:** | 1 |
| **Path:** | /nrf-estimate-1/start |
| **Title:** | Get an estimate for Nature Restoration Fund Levy |
| **Conditional page flow:** | none |

#### Data points
None

#### Content
```
#Nature Restoration Fund 
 

Use this service to see if your development falls into the catchment area of an Environmental Delivery Plan (EDP).  
 
You can submit details of your development to get an estimate of how much the levy might be or pay your Nature Restoration Fund (NRF) levy. 
 

## Before you start  

You will need to be able to tell us:  

* where you might be planning your development – you can use a redline boundary or shapefile  

* the types of buildings you are planning 

* details about the buildings including the amount or rooms 

* Your planning reference if you have one and are ready to pay 
 
{button}[Start now](https://gov.uk/random){/button} 
 
 
## Get help with Nature Restoration Fund 

If you need to help with Nature Restoration Fund, contact XXXX. 

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk) 

Telephone: 00000000000  

Monday to Friday, 8:30am to 5pm, except bank holidays  

Find out about call charges at https://www.gov.uk/call-charges 
```

---
### What would you like to do?
| **Field** | **Value** |
|-----------|-----------|
| Order number: | 2 |
| Path: | /nrf-estimate-1/what-would-you-like-to-do |
| Title: | What would you like to do? |
| Conditional page flow: | none |


#### Data points
```
{
    application: {
        journeyType: {
            type: radios
            required: true
            values: "I want an estimate for the Nature Restoration Fund levy" | "I have a planning reference and I’m ready to pay my Nature Restoration Fund levy"
        }
    }
}
```

#### Content
```
# What would you like to do? 
- I want an estimate for the Nature Restoration Fund levy 
- I have a planning reference and I’m ready to pay my Nature Restoration Fund levy 
```

#### Errors 
| **Field** | **Value** |
|-----------|-----------|
| Description: | User has selected ‘Continue’ without choosing an option |
| Error summary: | There is a problem |
| Error message: | Select if you want an estimate or if you are ready to pay |

---
### Do you have a red line boundary file?
| **Field** | **Value** |
|-----------|-----------|
| Order number: | 3 |
| Path: | /nrf-estimate-1/redline-map |
| Title: | Do you have a red line boundary file? |
| Conditional page flow: | none |


#### Data points
```
{
    application: {
        hasRedlineBoundaryFile: {
            type: boolean
            required: true
            values: yes|no
        }
    }
}
```

#### Content
```
# Do you have a red line boundary file?
- Yes
- No
```

#### Errors 
| **Field** | **Value** |
|-----------|-----------|
| Description: | User has selected ‘Continue’ without choosing an option |
| Error summary: | There is a problem |
| Error message: | Select yes if you have a red line boundary file |

---
### Upload a red line boundary file
| **Field** | **Value** |
|-----------|-----------|
| Order number: | 3.1 | 
| Path: | /nrf-estimate-1/upload-redline |  
| Title: | Upload a red line boundary file |
| Conditional pageflow: | display if hasRedlineBoundaryFile === true |

#### Data points 
```
{ 
    application: {
        redlineFile: {
            type: file,
            conditional: required if hasRedlineBoundaryFile === true
        }
    }
}
```

#### Content
```
# Upload a red line boundary file?
```

#### Errors 
| **Field** | **Value** |
|-----------|-----------|
| Description: | user submits the page but does not upload a file |
| Error summary: | There is a problem |
| Error message: | Select a file to upload |
| Description: | Wrong file type | 
| Error summary: | There is a problem |
| Error message: | The selected file must be a [shp,geojson] |
| Description: | Wrong file size | 
| Error summary: | There is a problem |
| Error message: | The [file] must be smaller than 2MB |   
| Description: | File is empty | 
| Error summary: | There is a problem |
| Error message: | The selected file is empty |    

---
### Draw a red line boundary
| **Field** | **Value** |
|-----------|-----------|
| Order number: | 3.2 | 
| Path: | /nrf-estimate-1/map | 
| Title: | Draw a red line boundary |
| Conditional pageflow: | display if hasRedlineBoundaryFile === false |

#### Data points 
```
{ 
    application: {
        redlineBoundaryPolygon: {
            type: array,
            conditional: required if hasRedlineBoundaryFile === false
        }
    }
}
```

#### Content
```
# Draw a red line boundary 
Hint text: Use the map to draw a red line boundary for where your development might be.  
```

#### Errors 
| **Field** | **Value** |
|-----------|-----------|
| Description: | User has selected ‘Continue’ without entering any details |
| Error summary: | There is a problem |
| Error message: | Draw a red line boundary to continue |

---
### Exit page if the development site is not within an EDP area (conditional)
| **Field** | **Value** |
|-----------|-----------|
| Order number: | 3.3 | 
| Path: | /nrf-estimate-1/no-edp | 
| Title: | Nature Restoration Fund levy is not available in this area |
| Data points: | None |
| Conditional pageflow: | display if development site is not within an EDP area |

#### Content 
```
# Nature Restoration Fund levy is not available in this area  
You can mitigate your environmental impact by using: 
- Habitat Regulations Assessment (HRA) for European sites or Ramsar sites. 
- Consent from Natural England for works affecting SSSIs. 
- Marine impact assessments for marine conservation zones. 
- Species licensing applications for protected species. 

Find out about mitigating your environmental impact 
```

#### Errors
None

---
### Select the types of buildings that might be included in this development
| **Field** | **Value** |
|-----------|-----------|
| Order number: | 4 |
| Path: | /nrf-estimate-1/building-type |
| Name: | Building type entry (conditional) |
| Conditional pageflow: | display if redline boundary falls within EDP boundary area |

#### Data points 
```
{ 
    application: {
        buildingTypes: {
            type: checkboxes,
            values: Hotel | House of multiple occupation (HMO) | Non-residential development | Residential and accommodation | Residential institution,
            conditional: required if redline boundary falls within EDP boundary area
        }
    }
}
```

#### Content
```
# Select the types of buildings that might be included in this development 
Select all that apply 
```

#### Errors 
| **Field** | **Value** |
|-----------|-----------|
| Description: | User has selected ‘Continue’ without choosing any options |
| Error summary: | There is a problem |
| Error message: | Select a building type to continue |  

---
### Exit page if the building type is non-residential (conditional)
| **Field** | **Value** |
|-----------|-----------|
| Order number: | 4.1 | 
| Path: | /nrf-estimate-1/non-residential |
| Title: | Nature Restoration Fund levy is not available for non-residential developments |
| Data points: | None |
| Conditional pageflow: | display if application.buildingTypes includes "Non-residential development" |

#### Content
```
# Nature Restoration Fund levy is not available for non-residential developments  
Your development must contain residential buildings for you to be eligible to mitigate your impact with a Nature Restoration Fund levy.  

Find out about planning a non-residential development  
```

#### Errors
None

---
### Number of residential and accommodation buildings entry (conditional)
| **Field** | **Value** |
|-----------|-----------|
| Order number: | 4.2 |
| Path: | /nrf-estimate-1/residential |
| Title: | Enter the number of residential and accommodation buildings planned for your development   |
| Conditional page flow: | display if buildingTypes includes Residential and accommodation |

#### Data points 
```
{
    application: {
        residentialBuildingCount: { 
            type: number,
            required: conditional - required if application.buildingTypes includes Residential and accommodation 
        }
    }
}
```

#### Content
```
# Enter the number of residential and accommodation buildings planned for your development  
```

#### Errors
| **Field** | **Value** |
|-----------|-----------|
| Description: | User has selected ‘Continue’ without entering a number |
| Error summary: | There is a problem | 
| Error message: | Enter the number of residential and accommodation buildings to continue |

---
### Enter the number of rooms in your [building type] building planned for your development
| **Field** | **Value** |
|-----------|-----------|
| Order number: | 4.3 |
| Path: | /nrf-estimate-1/residential |
| Title: | Enter the number of rooms in your [building type] building planned for your development |
| Conditional page flow: | display if buildingType includes "Hotel", "House of multiple occupation (HMO)", "Residential institution" |

#### Data points 
```
{
    application: {
        hmoCount: {
            type: number,
            required: conditional - required and shown only if buildingType includes "House of multiple occupation (HMO)" 
        },
        residentialAccommodationCount: {
            type: number,
            required: conditional - required and shown only if buildingType includes "Residential institution" 
        },
        hotelCount: {
            type: number,
            required: conditional - required and shown only if buildingType includes "Hotel" 
        }
    }
}
```

#### Content
```
# Enter the number of rooms in your [building type] building planned for your development 
```

#### Errors
| **Field** | **Value** |
|-----------|-----------|
| Description: | User has selected ‘Continue’ without entering a number |
| Error summary: | There is a problem | 
| Error message: | Enter the number of rooms to continue |

---
### Number of residential institution rooms (conditional)
| **Field** | **Value** |
|-----------|-----------|
| Order number: | 4.3 |
| Path: | /nrf-estimate-1/residential-institution |
| Title: | Enter the number of residential institution buildings planned for your development |
| Conditional page flow: | display if buildingType includes "Non-residential development" |

#### Data points 
```
{
    application: {
        residentialBuildingCount: {
            type: number,
            required: conditional - required if buildingType includes "Non-residential development"
        }
    }
}
```

#### Content
```
# Enter the number of rooms in your residential institution building planned for your development 
```

#### Errors 
| **Field** | **Value** |
|-----------|-----------|
| Description: | User has selected ‘Continue’ without choosing any options |
| Error summary: | There is a problem | 
| Error message: | Enter the number of residential institution buildings to continue |

---
### Email entry
| **Field** | **Value** |
|-----------|-----------|
| Order number: | 4 |
| Path: | /nrf-estimate-1/email |
| Title: | Enter the email address you would like the estimate sent to |
| Conditional page flow: | None | 

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

#### Content
```
# Enter the email address you would like the estimate sent to  
```

#### Errors 
| **Field** | **Value** |
|-----------|-----------|
| Description: | User has selected ‘Continue’ without entering any details |
| Error summary: | There is a problem | 
| Error message: | Enter your email address to continue |
| Description: | Incorrect email format |
| Error summary: | There is a problem | 
| Error message: | Enter an email address in the correct format, like name@example.com |

---
### Check your answers summary and submit
| **Field** | **Value** |
|-----------|-----------|
| Order number: | 5 |
| Path: | /nrf-estimate-1/summary |
| Title: | Check your answers |
| Conditional page flow: | None | 

#### Data points
None

#### Content
```
# Check your answers 

| Red line boundary added | [Show yes/no] | 
| Shape file uploaded     | [Show no/yes] |  
| Building types          | [List all types picked here] | 
| [IF they pick residential and accommodation THEN show] | Number of residential and accommodation buildings |
| [IF they pick "House of multiple occupation (HMO)" THEN show] | Number of multiple occupation rooms |
| [IF they pick "Residential institution THEN show] | Number of residential institution rooms |
| Email address                                          | [show email address] | 
```

#### Errors
None 

---
### Details submitted confirmation page
| **Field** | **Value** |
|-----------|-----------|
| Order number: | 6 |
| Path: | /nrf-estimate-1/summary |
| Title: | Nature Restoration Fund levy is not available in this area | 
| Data points: | None |
| Conditional pageflow: | display if development site is not within an EDP area |

#### Content
```<green banner>
# Your details have been submitted. 

Estimate reference: 000000   
</green banner>

## What happens next 

You will receive an email with details of the estimate.  

You do not need to pay anything at this point, this service is designed to help you plan how to mitigate your environmental obligations.   

If you do decide to mitigate your impact using Nature Restoration Fund levy, you can speak to your Local Planning Authority and commit to use Nature Restoration Fund. 

Keep the email as record of your estimate and reference number, you can use it to retrieve this estimate when you are ready to pay your levy. 

 

## Get help with Nature Restoration Fund 
If you need to help with Nature Restoration Fund, contact XXXX and give the estimate reference number.  

Email: [xxxxx@defra.gov.uk](mailto:xxxxx@defra.gov.uk) 
Telephone: 00000000000  
Monday to Friday, 8:30am to 5pm, except bank holidays  

Find out about call charges at https://www.gov.uk/call-charges 
```

#### Errors
None

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