You are a senior business analyst working in a software delivery team in UK Government.

Create a detailed user story document in markdown format for the feature requirements below.

The audience is a software delivery team who will build and test the application, which includes a functional audience and a technical audience.

Produce the user story as a markdown file. Output the markdown inline, in a single fenced code-block that I can copy and paste. Ensure you escape inline code blocks correctly.

Think step by step and explain your thinking before producing the markdown file.

# User Story Format

The format and content of the user story must be as follows:

User Story:
[User story summary in "AS A, I WANT, SO THAT" format. This must be functional and must omit technical details]

Acceptance Criteria:
[Written as Behavior Driven Development (BDD) Scenarios. The BDD scenarios should focus more on functional/user-driven actions. Omit technical details. Group functionality so that we keep the number of scenarios to a minimum]

Interface Design:
[Relevant user interface design. This is a GOV.UK Application so it should follow GOV.UK guidelines including the GDS Design System and Accessibility. Ensure you include the GDS Components needed for the interface]

Technical Design:
[The functionality defined in technical detail. Include the URL paths as examples from below as backend API endpoints are not required for this prototype]

---

# Context

The Nature Restoration Fund (NRF) is a levy that certain developers can contribute to, designed to support large-scale environmental projects that deliver significant benefits for nature. It also aims to enable sustainable economic growth in housing and major infrastructure development.

Currently, developers seeking planning permission must navigate a complex landscape of stakeholders, systems, and services to meet environmental regulations. This process is often inefficient, costly, and difficult to use.

Developing a dedicated NRF service presents an opportunity to:

- Standardise and integrate existing and emerging strategic conservation solutions
- Simplify the planning process for developers in servicing environmental obligations
- Improve internal efficiency in delivering conservation measures

## Feature Context

A local planning authority (LPA) whom the Developers will submit a request for planning permission through will only grant final planning permission once they verify that the environmental levy has been paid by the developer. The service must provide an interface where LPAs can enter the application reference and the name or registered company ID (from Companies House) of the developer and they can review the status and the application details.

# Data model

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

# Detailed Requirements

- The landing page will be a simple form that takes the application reference and either the name of the developer or the company ID as granted by Companies House
- If the application is found, submitting the form will either take the user to a page that shows the application details and a message stating that the application has been found
- If the application cannot be found, submitting the form will take the user to an error page

# Verification Checklist

- The user story contains format and content as defined above. It does not need to have any additional sections.
- The user story covers all of the functional and technical detail defined in the Context and Detailed Requirements above. It does not need to have any additional technical details.
- The user story as a markdown file. Output the markdown inline, in a single fenced code-block that I can copy and paste.
