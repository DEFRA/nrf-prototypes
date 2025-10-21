# Natural England Nature Restoration Fund - User Journey Prototypes

Interactive prototypes designed to explore and validate user journeys for the Natural England Nature Restoration Fund (NRF) service.

## Overview

The Nature Restoration Fund (NRF) is a government initiative to restore nature and tackle climate change. This repository contains interactive prototypes that help Natural England and stakeholders understand how users will interact with different parts of the NRF service.

These prototypes are built using the GOV.UK Prototype Kit and follow government service design best practices to ensure they accurately represent the intended user experience.

## Purpose

The primary goals of these prototypes are to:

- **Validate user journeys** - Test how users will navigate through different parts of the NRF service
- **Identify pain points** - Discover potential issues or confusion in the user experience
- **Inform design decisions** - Provide evidence-based insights for service design improvements
- **Support stakeholder engagement** - Help communicate service concepts to internal and external stakeholders
- **Enable user research** - Create realistic scenarios for user testing and feedback sessions

## Current Prototypes

| Prototype                           | Description                                                                                 | Key Features                                                                                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **User Journey 1**                  | Sample journey demonstrating the concept of user journey prototyping within the NRF context | Basic user flow demonstration                                                                                                                                                                          |
| **Applications Prototypes**         | Interactive prototypes for the application process                                          | • Application start and data collection<br>• Location selection (postcode, coordinates, drawing, file upload)<br>• Payment processing<br>• Application summary and confirmation                        |
| **EDP Search Prototypes**           | Prototypes for the Environmental Data Platform (EDP) search functionality                   | • Search interface and filters<br>• Location-based searching<br>• Results display and details<br>• Print functionality                                                                                 |
| **LPA Application Verification**    | Local Planning Authority staff can verify environmental levy payments                       | • Application reference and developer verification<br>• Payment status and development details display<br>• Interactive map showing development and EDP boundaries<br>• Standard GOV.UK error handling |
| **Natural England Case Management** | Staff interface for managing developer applications and processing payments                 | • Application dashboard with filtering and search<br>• Individual application review and editing<br>• Payment processing and status updates<br>• Audit trail and export functionality                  |

## Project Structure

```
nrf-prototypes/
├── app/
│   ├── assets/           # Static assets (CSS, JavaScript, images)
│   ├── config.json       # Service configuration
│   ├── data/            # Session data and defaults
│   ├── filters.js       # Custom filters for templates
│   ├── routes.js        # Route definitions
│   └── views/           # HTML templates
│       ├── layouts/     # Layout templates
│       └── user-journey-1/  # User journey prototypes go in directories like this
├── docs/                # Documentation
├── prompts/             # Development prompts and documentation
└── package.json         # Project dependencies and scripts
```

## Adding New Journeys

To add a new user journey or prototype:

1. **Create a new directory** in `app/views/` (e.g., `user-journey-2/`, `new-feature/`)
2. **Add HTML templates** following the GOV.UK Design System patterns
3. **Update the main index page** to include a link to your new journey
4. **Document the journey purpose** and scope in this README
5. **Routes**: The GOV.UK Prototype Kit automatically creates routes based on your file structure. For example, a file at `app/views/user-journey-2/start.html` will be accessible at `/user-journey-2/start`. You can also define custom routes in `app/routes.js` if needed.

### Best Practices for New Journeys

- **Follow GOV.UK patterns** - Use established design patterns and components
- **Include clear navigation** - Help users understand where they are in the journey
- **Test with users** - Validate the journey with real users when possible
- **Document assumptions** - Note any assumptions made during prototyping
- **Consider accessibility** - Ensure journeys work for all users

## Business Context

### Nature Restoration Fund

The Nature Restoration Fund supports projects that:

- Restore and create wildlife-rich habitats
- Reduce flood risk and improve water quality
- Enhance public access to nature
- Support climate change mitigation and adaptation

### Service Design Approach

These prototypes follow the Government Digital Service (GDS) service design methodology:

1. **Discovery** - Understanding user needs and service requirements
2. **Alpha** - Testing different approaches and solutions
3. **Beta** - Building and refining the service
4. **Live** - Continuous improvement based on user feedback

## Feature Details

### LPA Application Verification

The **LPA Application Verification** prototype enables Local Planning Authority (LPA) staff to verify that developers have paid the required environmental levy before granting final planning permission.

**Key User Journey:**

1. **Landing Page** (`/lpa-verify`) - Form with application reference and developer identifier fields
2. **Verification Process** - Validates application reference format (APP-XXX) and developer details
3. **Success Page** (`/lpa-verify/details`) - Displays comprehensive application information including:
   - Application status and payment confirmation
   - Development details and environmental levy breakdown
   - Interactive map showing development site and overlapping EDP boundaries
   - Environmental Development Plan (EDP) details and rates
4. **Error Handling** (`/lpa-verify/error`) - Standard GOV.UK error page for invalid applications

**Technical Features:**

- **Form Validation** - Client and server-side validation with clear error messages
- **Fuzzy Matching** - Supports both developer names and company IDs
- **Interactive Map** - Leaflet-based map showing redline boundaries
- **Data Security** - Input sanitization and audit logging
- **Accessibility** - WCAG 2.1 AA compliant with proper ARIA labels

**Test Data Available:**

- APP-001 with "Riverside Developers Ltd" or "RDL001"
- APP-002 with "South East Properties" or "SEP002"
- APP-003 with "Hampshire Coastal Ltd" or "HCL003"

### Natural England Case Management

The **Natural England Case Management** prototype provides staff with a comprehensive interface for managing developer applications, processing payments, and maintaining audit trails.

**Key User Journey:**

1. **Dashboard** (`/case-management`) - Overview of all applications with filtering and search capabilities
2. **Application Review** (`/case-management/:id`) - Detailed view of individual applications including:
   - Development information and status
   - Payment details and environmental levy breakdown
   - Interactive map showing development and EDP boundaries
   - Audit trail and change history
3. **Application Editing** (`/case-management/:id/edit`) - Staff can update application details and status
4. **Audit Trail** (`/case-management/:id/audit`) - Complete history of all changes and actions
5. **Export Functionality** (`/case-management/export`) - CSV export of filtered application data

**Technical Features:**

- **Advanced Filtering** - Filter by status, date range, development name
- **Search and Sort** - Find applications quickly with robust search functionality
- **Status Management** - Update application status (draft, pending payment, paid, approved)
- **Payment Processing** - Track payment status and references
- **Audit Logging** - Complete audit trail with user actions and timestamps
- **Data Export** - CSV export for reporting and analysis
- **Interactive Maps** - Visual representation of development sites and EDP boundaries

**Staff Workflow:**

- **Application Review** - Staff can review submitted applications and verify details
- **Payment Verification** - Confirm environmental levy payments have been received
- **Status Updates** - Update application status as it progresses through the system
- **Audit Compliance** - Maintain complete audit trail for compliance and transparency

### User-Centered Design

All prototypes prioritize:

- **Accessibility** - Meeting WCAG 2.2 AA standards
- **Usability** - Clear, intuitive interfaces following GOV.UK patterns
- **Inclusivity** - Designing for diverse user needs and abilities
- **Efficiency** - Streamlined processes that reduce user burden

## Stakeholder Engagement

These prototypes support engagement with:

- **Internal teams** - Natural England staff and management
- **External partners** - Other government departments and delivery partners
- **Local Planning Authorities** - LPA staff who need to verify environmental levy payments
- **Potential applicants** - Landowners, farmers, and conservation organizations
- **User researchers** - Teams conducting user testing and feedback sessions

## Success Metrics

The effectiveness of these prototypes is measured by:

- User feedback and satisfaction scores
- Task completion rates in user testing
- Reduction in support queries and clarification requests
- Improved understanding of service requirements
- Faster decision-making in service design

## Related Resources

- [GOV.UK Design System](https://design-system.service.gov.uk/)
- [Natural England](https://www.gov.uk/government/organisations/natural-england)
- [Nature Restoration Fund](https://www.gov.uk/government/publications/nature-restoration-fund)
- [GOV.UK Service Manual](https://www.gov.uk/service-manual)

## Support and Contact

For questions about these prototypes or the NRF service:

- Contact the Natural England development team
- Create an issue in this repository for specific prototype feedback
- Refer to the main [README.md](../README.md) for technical setup and deployment information
