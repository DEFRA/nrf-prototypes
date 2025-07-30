# Product Requirements Document: Environmental Development Plan Levy Calculator

## Executive Summary
The Environmental Development Plan (EDP) Levy Calculator enables housing developers to determine if their proposed developments fall within Environmental Development Plan boundaries and receive quotes for required environmental levies. This system supports both District Level Licensing (DLL) and Nutrient Mitigation EDPs.

## User Story
As a housing developer, I want to submit details of my proposed housing development so that I can determine if it falls within an Environmental Development Plan boundary and receive a quote for the required environmental levy, so that I can understand and pay for the environmental impact of my development.

## Acceptance Criteria

### Scenario 1: Developer views their existing applications
**Given** I am a logged-in developer  
**When** I access the NRF service  
**Then** I see a list of my development sites with their status (pending payment, paid, approved)  
**And** I can view details of each application including the redline boundary, submitted data, quote received, and payment status

### Scenario 2: Developer submits new application (DLL and/or Nutrient Mitigation)
**Given** I want to submit a new development application  
**When** I select to create a new application  
**Then** I am prompted to provide the development location by either drawing on a map, entering a postcode, entering coordinates, or uploading a shape file  
**And** I can draw a polygon of the site on a map and click Continue  
**And** if my development location falls within a District Level Licensing (DLL) or Nutrient Mitigation EDP boundary, I am prompted for additional data:
- For DLL: I am prompted for pond location (currently, this is not a separate map drawing step; pond location input is not implemented)
- For Nutrient Mitigation: I am prompted to select the wastewater treatment site and provide the number of houses
- If both DLL and Nutrient Mitigation apply, I am prompted for both sets of data (but there is no combined file upload or pond drawing step)

### Scenario 3: Developer receives and accepts quote
**Given** I have submitted all required development data  
**When** the system processes my application  
**Then** I see a summary page with the levy quote, development boundary map, list of applicable EDPs, and environmental impact breakdown  
**And** I have the option to accept the quote  
**When** I accept the quote  
**Then** I am redirected to a GOV.UK Pay mockup to complete the payment

### Scenario 4: Developer provides location data
**Given** I need to specify my development location  
**When** I am prompted for location information  
**Then** I can upload a geospatial shape file, enter a postcode, input positional coordinates, or draw a polygon shape on a map interface

## Functional Requirements

### FR1: Application Management
- **FR1.1**: Display list of existing applications with status indicators
- **FR1.2**: View detailed application information including boundaries and quotes
- **FR1.3**: Create new application workflow

### FR2: Location Input Methods
- **FR2.1**: Map drawing interface for polygon boundary creation
- **FR2.2**: Postcode input with coordinate lookup
- **FR2.3**: Manual coordinate entry (latitude/longitude)
- **FR2.4**: Shape file upload (.shp, .zip formats)

### FR3: EDP Boundary Detection
- **FR3.1**: Spatial intersection analysis with DLL boundaries
- **FR3.2**: Spatial intersection analysis with Nutrient Mitigation boundaries
- **FR3.3**: Support for multiple EDP types per development
- **FR3.4**: Fallback to center point analysis if boundary analysis fails

### FR4: Data Collection
- **FR4.1**: Development name and description
- **FR4.2**: Number of houses in development
- **FR4.3**: Wastewater treatment site selection (for Nutrient Mitigation)
- **FR4.4**: Pond location specification (for DLL - future enhancement)

### FR5: Levy Calculation
- **FR5.1**: Calculate levy based on EDP type and house count
- **FR5.2**: Support different rates for different EDP types
- **FR5.3**: Generate quote breakdown by EDP
- **FR5.4**: Calculate total levy amount

### FR6: Quote and Summary
- **FR6.1**: Display levy quote with breakdown
- **FR6.2**: Show development boundary on interactive map
- **FR6.3**: Display applicable EDP boundaries on map
- **FR6.4**: Provide quote acceptance functionality

### FR7: Payment Integration
- **FR7.1**: Integration with GOV.UK Pay
- **FR7.2**: Payment status tracking
- **FR7.3**: Application status updates post-payment

## Non-Functional Requirements

### NFR1: Performance
- **NFR1.1**: Map rendering must complete within 3 seconds
- **NFR1.2**: EDP intersection analysis must complete within 1 second
- **NFR1.3**: Page load times must be under 2 seconds

### NFR2: Usability
- **NFR2.1**: Follow GOV.UK Design System patterns
- **NFR2.2**: Support keyboard navigation
- **NFR2.3**: Provide clear error messages
- **NFR2.4**: Responsive design for mobile devices

### NFR3: Accessibility
- **NFR3.1**: WCAG 2.1 AA compliance
- **NFR3.2**: Screen reader compatibility
- **NFR3.3**: High contrast mode support
- **NFR3.4**: Keyboard-only navigation

### NFR4: Data Integrity
- **NFR4.1**: Validate boundary data format (GeoJSON)
- **NFR4.2**: Ensure coordinate system consistency (WGS84)
- **NFR4.3**: Validate file upload formats
- **NFR4.4**: Prevent data loss during multi-step forms

## Technical Specifications

### Data Models

**Application Data Structure:**
- Unique application identifier
- Developer user ID
- Application status (pending_payment, paid, approved)
- Development name and description
- House count
- Development location (center coordinates and boundary polygon)
- Applicable EDPs list
- Wastewater treatment site (if applicable)
- Quote details (total amount and breakdown)
- Payment status and reference

**EDP Boundary Data:**
- EDP identifier and name
- EDP type (DLL or Nutrient Mitigation)
- Boundary polygon coordinates (GeoJSON format)
- Rate per house
- Geographic coverage area

**Spatial Data Requirements:**
- All coordinates in WGS84 (EPSG:4326)
- Boundary data in GeoJSON Polygon format
- Support for complex polygon shapes
- Coordinate precision to 6 decimal places

### User Interface Requirements

**Map Interface:**
- Interactive map with drawing tools
- Boundary visualization with different colors for development vs EDP areas
- Zoom and pan functionality
- Boundary editing capabilities
- Clear visual distinction between different EDP types

**Form Design:**
- Multi-step form with progress indication
- Server-side validation with immediate feedback
- Error summary display
- Responsive form layout
- Clear call-to-action buttons

**Summary Display:**
- Prominent quote amount display
- Detailed breakdown table
- Interactive map with all relevant boundaries
- Clear acceptance workflow

### Integration Requirements

**GOV.UK Pay Integration:**
- Secure payment processing
- Payment status webhooks
- Receipt generation
- Payment failure handling

**Data Storage:**
- Session management for multi-step forms
- Persistent application data storage
- EDP boundary data management
- User authentication integration

## Business Rules

### BR1: EDP Intersection Logic
- Development must intersect with EDP boundary to be applicable
- Center point fallback if boundary analysis fails
- Multiple EDPs can apply to single development
- Each EDP type has different calculation rules

### BR2: Levy Calculation
- DLL: Rate per house × number of houses
- Nutrient Mitigation: Rate per house × number of houses
- Multiple EDPs: Sum of individual calculations
- Rates vary by EDP type and geographic area

### BR3: Data Validation
- Boundary must be valid GeoJSON Polygon
- Coordinates must be within UK bounds
- House count must be positive integer
- Development name is required
- Postcode must be valid UK format

### BR4: Workflow Rules
- Location must be specified before data collection
- EDP intersection must be determined before quote generation
- Payment must be completed before application approval
- Session data persists across form steps

## Constraints and Limitations

### Current Limitations
- Pond location drawing for DLL not implemented
- Species-specific data structure not implemented
- Combined EDP file upload not implemented
- Some dynamic validation simplified
- Payment integration is mocked

### URL Structure
- `/applications-2` - Main dashboard listing existing applications
- `/applications-2/:id` - View specific application details
- `/applications-2/new/start` - Start new application process
- `/applications-2/new/location` - Location input step
- `/applications-2/new/location-draw` - Draw development boundary on map
- `/applications-2/new/location-postcode` - Enter postcode
- `/applications-2/new/location-coordinates` - Enter coordinates
- `/applications-2/new/location-file-upload` - Upload shape file
- `/applications-2/new/data` - Data collection (species-specific, but not using nested 
structure)
- `/applications-2/new/summary` - Quote and summary page
- `/applications-2/new/payment` - Payment processing
- `/applications-2/new/payment-confirmation` - Payment confirmation

### Technical Constraints
- Must use GOV.UK Prototype Kit framework
- Must follow GOV.UK Design System
- Must support existing authentication system
- Must integrate with existing data infrastructure

### Future Enhancements
- Pond location drawing interface
- Advanced species data collection
- Combined file upload functionality
- Enhanced dynamic validation
- Full payment integration

## Success Criteria

### SC1: User Experience
- Users can complete application process in under 10 minutes
- Map interface is intuitive and responsive
- Error messages are clear and actionable
- Quote calculation is accurate and transparent

### SC2: Technical Performance
- All pages load within 2 seconds
- Map rendering completes within 3 seconds
- EDP intersection analysis completes within 1 second
- System handles concurrent users without degradation

### SC3: Data Accuracy
- EDP intersection detection is 100% accurate
- Levy calculations are mathematically correct
- Boundary data is properly validated
- Session data is reliably preserved

### SC4: Accessibility
- System passes WCAG 2.1 AA audit
- All functionality accessible via keyboard
- Screen readers can navigate all features
- High contrast mode is fully supported

