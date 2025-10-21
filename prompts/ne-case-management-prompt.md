# Natural England Staff Application Management

## User Story

As a Natural England staff member, I want to view and manage developer applications for the Nature Restoration Fund, so that I can process applications, generate invoices, and maintain accurate records of environmental levy payments.

## Acceptance Criteria

### Scenario 1: Viewing Application List

**Given** I am logged in as a Natural England staff member  
**When** I navigate to the applications management page  
**Then** I should see a list of all developer applications  
**And** each application should display the submission date, development name, and status  
**And** the status should be one of: pending payment, paid, or approved

### Scenario 2: Filtering Applications

**Given** I am viewing the applications list  
**When** I use the filter controls  
**Then** I should be able to filter by application status  
**And** I should be able to filter by date range  
**And** I should be able to filter by development name  
**And** the filtered results should update in real-time

### Scenario 3: Exporting Applications

**Given** I am viewing the applications list  
**When** I click the export button  
**Then** a CSV file should be downloaded  
**And** the CSV should contain all visible applications with their key details  
**And** the file should be named with the current date and time

### Scenario 4: Viewing Application Details

**Given** I am viewing the applications list  
**When** I click on an application record  
**Then** I should see the detailed application view  
**And** I should see an interactive map showing the development boundary  
**And** I should see the overlapping EDP areas highlighted on the map  
**And** I should see the house count or wastewater treatment site details  
**And** I should see the calculated quote and payment status  
**And** I should see a list of applicable EDPs with their impact calculations

### Scenario 5: Updating Application Details

**Given** I am viewing an application's details  
**When** I click the update button  
**Then** I should be able to modify the application data  
**And** the system should recalculate the levy amount  
**And** any cost differences should be clearly highlighted  
**And** the changes should be logged in the audit trail

### Scenario 6: Viewing Audit History

**Given** I am viewing an application's details  
**When** I access the audit history  
**Then** I should see a chronological list of all changes made to the application  
**And** each change should show who made it, when, and why  
**And** any quote recalculations should show the old and new amounts

## Interface Design

### Application List Page (`/case-management`)

- **GOV.UK Table Component**: Display applications with columns for date, development name, status, and actions
- **GOV.UK Filter Component**: Allow filtering by status, date range, and development name
- **GOV.UK Button Component**: Export to CSV functionality
- **GOV.UK Tag Component**: Status indicators (pending payment, paid, approved)
- **GOV.UK Pagination Component**: For handling large numbers of applications

### Application Detail Page (`/case-management/[id]`)

- **GOV.UK Summary List Component**: Display key application information
- **Interactive Map Component**: Show development boundary and EDP overlaps using Leaflet or similar
- **GOV.UK Table Component**: Display EDP breakdown and levy calculations
- **GOV.UK Button Component**: Update application and view audit history
- **GOV.UK Tag Component**: Payment status indicator
- **GOV.UK Details Component**: Collapsible sections for different information types

### Update Application Page (`/case-management/[id]/edit`)

- **GOV.UK Form Components**: Text inputs, number inputs, and select dropdowns
- **GOV.UK Button Component**: Save changes and cancel
- **GOV.UK Warning Text Component**: Highlight any cost differences
- **GOV.UK Summary List Component**: Show before/after comparison

### Audit History Page (`/case-management/[id]/audit`)

- **GOV.UK Table Component**: Chronological list of changes
- **GOV.UK Tag Component**: Change type indicators
- **GOV.UK Details Component**: Expandable change details

### Accessibility Requirements

- All components must meet WCAG 2.1 AA standards
- Keyboard navigation support for all interactive elements
- Screen reader compatibility for tables and forms
- High contrast mode support
- Focus indicators for all interactive elements

## Technical Design

### URL Structure

- `/case-management` - Main applications list page
- `/case-management?status=pending_payment&dateFrom=2024-01-01&dateTo=2024-12-31` - Filtered list
- `/case-management/[id]` - Individual application detail view (e.g., `/case-management/APP-001`)
- `/case-management/[id]/edit` - Edit application page
- `/case-management/[id]/audit` - Audit history page
- `/case-management/export` - CSV export endpoint

### Data model

The known data points applicable to an application submitted by a developer is as follows

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Nature Restoration Fund Application Schema",
  "description": "Schema for NRF application data including development details, environmental plans, payment information, and audit trail.",
  "type": "object",
  "required": [
    "id",
    "userId",
    "status",
    "createdAt",
    "updatedAt",
    "developmentName",
    "location",
    "houseCount",
    "auditTrail"
  ],
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique application identifier",
      "pattern": "^APP-[0-9]{3}$"
    },
    "userId": {
      "type": "string",
      "description": "User who created the application"
    },
    "status": {
      "type": "string",
      "description": "Application status",
      "enum": ["draft", "pending_payment", "paid", "approved"]
    },
    "createdAt": {
      "type": "string",
      "format": "date-time",
      "description": "Application creation timestamp"
    },
    "updatedAt": {
      "type": "string",
      "format": "date-time",
      "description": "Last update timestamp"
    },
    "developmentName": {
      "type": "string",
      "description": "Name of the development project"
    },
    "location": {
      "type": "object",
      "description": "Geographic location data for the development",
      "required": ["center"],
      "properties": {
        "center": {
          "type": "array",
          "description": "Center coordinates [longitude, latitude]",
          "items": { "type": "number" },
          "minItems": 2,
          "maxItems": 2
        },
        "boundary": {
          "type": "object",
          "description": "GeoJSON polygon boundary of the development site",
          "required": ["type", "coordinates"],
          "properties": {
            "type": {
              "type": "string",
              "enum": ["Polygon"]
            },
            "coordinates": {
              "type": "array",
              "items": {
                "type": "array",
                "items": {
                  "type": "array",
                  "items": { "type": "number" },
                  "minItems": 2,
                  "maxItems": 2
                }
              }
            }
          }
        }
      }
    },
    "houseCount": {
      "type": "integer",
      "description": "Number of houses in the development",
      "minimum": 1,
      "maximum": 10000
    },
    "applicableEDPs": {
      "type": "array",
      "description": "Environmental Development Plans that apply to this development",
      "items": {
        "type": "object",
        "required": ["id", "name", "type", "rate", "impact"],
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "type": {
            "type": "string",
            "enum": ["DLL", "Nutrient Mitigation"]
          },
          "rate": { "type": "number", "minimum": 0 },
          "impact": { "type": "number", "minimum": 0 },
          "boundary": {
            "type": "object",
            "required": ["type", "coordinates"],
            "properties": {
              "type": { "type": "string", "enum": ["Polygon"] },
              "coordinates": {
                "type": "array",
                "items": {
                  "type": "array",
                  "items": {
                    "type": "array",
                    "items": { "type": "number" },
                    "minItems": 2,
                    "maxItems": 2
                  }
                }
              }
            }
          }
        }
      }
    },
    "quote": {
      "type": "object",
      "description": "Levy calculation details",
      "required": ["total", "breakdown"],
      "properties": {
        "total": { "type": "number", "minimum": 0 },
        "breakdown": {
          "type": "array",
          "items": {
            "type": "object",
            "required": [
              "edpType",
              "description",
              "rate",
              "houseCount",
              "amount"
            ],
            "properties": {
              "edpType": {
                "type": "string",
                "enum": ["DLL", "Nutrient Mitigation"]
              },
              "description": { "type": "string" },
              "rate": { "type": "number", "minimum": 0 },
              "houseCount": { "type": "integer", "minimum": 1 },
              "amount": { "type": "number", "minimum": 0 }
            }
          }
        }
      }
    },
    "paymentStatus": {
      "type": "string",
      "enum": ["pending", "completed"]
    },
    "paymentReference": {
      "type": "string",
      "pattern": "^PAY-REF-[0-9]{3}$"
    },
    "wastewaterTreatmentSite": {
      "type": "string",
      "description": "Selected wastewater treatment site (for Nutrient Mitigation)"
    },
    "pondBoundaries": {
      "type": "object",
      "description": "GeoJSON polygon boundaries of ponds (for DLL)",
      "required": ["type", "coordinates"],
      "properties": {
        "type": { "type": "string", "enum": ["Polygon"] },
        "coordinates": {
          "type": "array",
          "items": {
            "type": "array",
            "items": {
              "type": "array",
              "items": { "type": "number" },
              "minItems": 2,
              "maxItems": 2
            }
          }
        }
      }
    },
    "auditTrail": {
      "type": "array",
      "description": "Complete audit trail of all changes to the application",
      "items": {
        "type": "object",
        "required": [
          "timestamp",
          "userId",
          "action",
          "field",
          "oldValue",
          "newValue",
          "reason"
        ],
        "properties": {
          "timestamp": {
            "type": "string",
            "format": "date-time",
            "description": "When the change was made"
          },
          "userId": {
            "type": "string",
            "description": "User who made the change"
          },
          "userRole": {
            "type": "string",
            "enum": ["developer", "ne_staff", "ne_manager", "system"]
          },
          "action": {
            "type": "string",
            "enum": [
              "create",
              "update",
              "status_change",
              "quote_recalculation",
              "payment_update",
              "approval",
              "rejection"
            ]
          },
          "field": {
            "type": "string",
            "description": "Field that was changed (or 'multiple' for bulk changes)"
          },
          "oldValue": {
            "description": "Previous value of the field",
            "oneOf": [
              { "type": "string" },
              { "type": "number" },
              { "type": "boolean" },
              { "type": "object" },
              { "type": "array" },
              { "type": "null" }
            ]
          },
          "newValue": {
            "description": "New value of the field",
            "oneOf": [
              { "type": "string" },
              { "type": "number" },
              { "type": "boolean" },
              { "type": "object" },
              { "type": "array" },
              { "type": "null" }
            ]
          },
          "reason": {
            "type": "string",
            "description": "Reason for the change"
          },
          "impact": {
            "type": "object",
            "properties": {
              "quoteChanged": { "type": "boolean" },
              "oldQuoteTotal": { "type": "number" },
              "newQuoteTotal": { "type": "number" },
              "difference": { "type": "number" }
            }
          },
          "metadata": {
            "type": "object",
            "properties": {
              "ipAddress": { "type": "string" },
              "userAgent": { "type": "string" },
              "sessionId": { "type": "string" },
              "relatedDocuments": {
                "type": "array",
                "items": { "type": "string" }
              }
            }
          }
        }
      }
    }
  }
}
```

### Data Handling

- Application data follows the provided JSON schema
- Filter parameters passed as URL query strings
- Map data uses GeoJSON format for boundaries
- Audit trail entries include user role, timestamp, and change details
- Quote recalculations trigger new audit entries with impact analysis

### Key Features

- Real-time filtering without page reload
- Interactive map with development and EDP boundary overlays
- CSV export with all visible application data
- Audit trail with detailed change tracking
- Quote recalculation with difference highlighting
- Responsive design for mobile and desktop access
