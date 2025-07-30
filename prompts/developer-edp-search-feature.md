# User Story: Development Site Assessment and Environmental Impact Calculation

## User Story
As a housing developer seeking planning permission, I want to upload or define my development site location and provide relevant development details so that I can understand whether my development falls within Environmental Development Plan boundaries and calculate the environmental impact costs I will be required to pay.

## Acceptance Criteria

### Scenario 1: Upload Development Site via File
**Given** I am a housing developer with a shape file of my development site
**When** I upload the shape file through the file upload interface
**Then** the system should accept the file and display the development boundary on a map
**And** the system should check if the development falls within any EDP boundaries

### Scenario 2: Define Development Site via Postcode
**Given** I am a housing developer with a postcode for my development site
**When** I enter the postcode in the search field
**Then** the system should display the postcode location on a map
**And** I should be able to draw a polygon around the development area
**And** the system should check if the development falls within any EDP boundaries

### Scenario 3: Define Development Site via Coordinates
**Given** I am a housing developer with coordinates for my development site
**When** I enter the coordinates in the coordinate input fields
**Then** the system should display the coordinate location on a map
**And** I should be able to draw a polygon around the development area
**And** the system should check if the development falls within any EDP boundaries

### Scenario 4: DLL EDP Applies to Development Site
**Given** my development site falls within a District Level Licensing (DLL) EDP boundary
**When** the system identifies the DLL EDP overlap
**Then** the system should display a form to capture the number of houses in the development
**And** the system should calculate the DLL impact and associated costs

### Scenario 5: Nutrient Mitigation EDP Applies to Development Site
**Given** my development site falls within a Nutrient Mitigation EDP boundary
**When** the system identifies the Nutrient Mitigation EDP overlap
**Then** the system should display a dropdown list of wastewater treatment sites within 50 miles
**And** I should be able to select the treatment site that will be used by the development
**And** the system should calculate the nutrient mitigation impact and associated costs

### Scenario 6: Both DLL and Nutrient Mitigation EDPs Apply
**Given** my development site falls within both DLL and Nutrient Mitigation EDP boundaries
**When** the system identifies both EDP overlaps
**Then** the system should display forms to capture both the number of houses and wastewater treatment site
**And** the system should calculate the combined environmental impact and total costs

### Scenario 7: Display Assessment Summary
**Given** I have provided all required development information
**When** the system completes the assessment
**Then** the system should display a summary page containing:
- A map showing the development boundary in red and any EDP boundaries
- A list of EDPs that the development crosses into
- A breakdown of environmental impact calculations
- The total levy cost the developer must pay

## Interface Design

### Main Assessment Page
The interface should follow GOV.UK Design System principles and include:

**Header Section:**
- GOV.UK header with service name "Nature Restoration Fund"
- Breadcrumb navigation

**Location Input Section:**
- **File Upload Component**: GOV.UK File Upload component with drag-and-drop functionality
  - Accepts .shp, .kml, .geojson file formats
  - Clear error messaging for invalid files
- **Postcode Lookup**: GOV.UK Text Input with autocomplete
  - Postcode validation
  - "Find address" button
- **Coordinate Input**: Two GOV.UK Text Input fields
  - Latitude and longitude inputs with validation
  - Coordinate format guidance
- **Map Drawing Tool**: Interactive map using GOV.UK Frontend map component
  - Polygon drawing functionality
  - Clear/reset drawing options
  - Coordinate display for drawn areas

**EDP-Specific Forms:**
- **DLL Form**: GOV.UK Number Input for house count
  - Validation for positive integers
  - Clear labeling and help text
- **Nutrient Mitigation Form**: GOV.UK Select component
  - Dropdown of wastewater treatment sites within 50-mile radius
  - Search/filter functionality for large lists
  - Distance indicators for each site

**Summary Page:**
- **Map Display**: GOV.UK Frontend map component
  - Development boundary in red
  - EDP boundaries in different colors
  - Legend and zoom controls
- **EDP List**: GOV.UK Summary List component
  - EDP names and types
  - Impact status indicators
- **Cost Breakdown**: GOV.UK Table component
  - Itemized environmental impacts
  - Individual and total costs
  - Clear currency formatting

**Navigation:**
- GOV.UK Button components for Continue, Back, and Save
- Progress indicator showing assessment steps
- Accessibility features including keyboard navigation and screen reader support

## Technical Design

### URL Structure
The application should follow these URL patterns:

- `/edp-search/start` - Initial assessment landing page
- `/edp-search/location` - Location input page (file upload, postcode, coordinates)
- `/edp-search/location/file-upload` - Boundary file upload page
- `/edp-search/location/postcode` - Postcode input page
- `/edp-search/location/coordinates` - Coordinates input page
- `/edp-search/location/draw` - Map drawing interface
- `/edp-search/details` - EDP-specific data collection forms
- `/edp-search/summary` - Final assessment summary and cost breakdown
- `/edp-search/print` - Printable version of assessment summary

### Core Functionality

**Location Processing:**
- File upload handling with format validation (.shp, .kml, .geojson)
- Postcode geocoding using Ordnance Survey or similar service
- Coordinate validation and conversion to standard format
- Polygon drawing with coordinate capture and boundary calculation

**EDP Boundary Checking:**
- Spatial intersection analysis between development site and EDP boundaries
- Support for multiple EDP types (DLL, Nutrient Mitigation)
- Real-time boundary checking as user defines development area

**Data Collection:**
- Dynamic form generation based on applicable EDPs
- House count validation and storage
- Wastewater treatment site lookup within 50-mile radius
- Data persistence throughout assessment process

**Impact Calculation:**
- DLL impact calculation based on house count and EDP rates
- Nutrient mitigation calculation based on treatment site and development size
- Combined impact calculation when multiple EDPs apply
- Cost formatting and currency display

**Map Visualization:**
- Interactive map using GOV.UK Frontend map component
- Multiple boundary layer support with different colors
- Zoom and pan controls
- Export functionality for assessment summary

**Data Validation:**
- Client-side validation for all input fields
- Server-side validation for file uploads and spatial data
- Error handling and user-friendly error messages
- Progress saving and recovery functionality