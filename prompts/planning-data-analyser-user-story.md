# Planning Data Analyzer - User Story

## User Story

As a data analyst working on the Nature Restoration Fund service, I want to automatically extract, transform, and analyze planning application data from the planning and housing data platform, so that I can generate enhanced datasets and statistical analysis to support environmental planning decisions and conservation measures.

## Acceptance Criteria

### Scenario 1: Planning Data Extraction and Storage

**Given** I have access to the planning application data set on the planning and housing data platform via the sample URL https://www.planning.data.gov.uk/entity.json?dataset=planning-application&limit=10&offset=50&entry_date_day=6&entry_date_month=8&entry_date_year=2024&entry_date_match=since
**When** I initiate the data extraction process
**Then** the system should retrieve JSON data in chunks of 1000 records using the limit and offset query parameters to increase the window size for each call
**And** the complete datasets should be stored as JSON files locally  
**And** the process should continue until all available data has been retrieved

### Scenario 2: Local Authority Data Extraction and Storage

**Given** I have access to the local authority data set on the planning and housing data platform via the sample URL https://www.planning.data.gov.uk/entity/?dataset=local-authority&limit=10&offset=50
**When** I initiate the data extraction process  
**Then** the system should retrieve JSON data
**And** the complete datasets should be stored as JSON files locally

### Scenario 3: Local Planning Authority Data Extraction and Storage

**Given** I have access to the local authority data set on the planning and housing data platform via the sample URL hhttps://www.planning.data.gov.uk/entity/?dataset=local-planning-authority&limit=10&offset=50
**When** I initiate the data extraction process  
**Then** the system should retrieve JSON data
**And** the complete datasets should be stored as JSON files locally

### Scenario 4: Data Enhancement with LLM Analysis

**Given** the planning application JSON data has been extracted  
**When** the LLM analyzes the description field of each planning application  
**Then** the system should add the following fields to a copy of the planning data:

- Number of houses to be built
- Development category (house build, extension, renovation, or other relevant categories)
- Local authority name (retrieved from organization ID field of the retrieved local authority data set)
- Local planning authority name (retrieved from local planning authority reference lookup)

### Scenario 5: Statistical Analysis Generation

**Given** the enhanced planning application dataset has been created  
**When** the system performs statistical analysis  
**Then** the following analysis should be generated:

- Count of applications by development category
- Maximum, minimum, and average number of houses in house build category applications
- Distribution of applications by house count ranges (1-5, 5-10, 10-20, 20-50, 50-100, 100-200, 200-500, 500+)

### Scenario 6: Output File Generation

**Given** the data analysis has been completed  
**When** the system generates output files  
**Then** the following CSV files should be created:

- Local planning authorities list
- Enhanced planning application data
- Analysis data with statistical summaries

## Technical Design

### Data Extraction Process

A script will be created under /scripts/data/ that will be run manually. There is no user interface to this process. The script will be written in javascript and an be executed on the commandline. The different modules of the script are provided below:

- **Process**
  - Retrieve JSON data from planning/housing platform in 1000-record chunks
  - Store raw data as JSON files in local storage
  - Continue until all data is extracted
  - Return extraction status and file locations

### LLM Data Enhancement

- **Process**:
  - Read planning application JSON data
  - Send description fields to LLM for analysis
  - Extract house count and development category from LLM response
  - Query local authority data by organization ID
  - Query local planning authority data by reference
  - Create enhanced dataset with additional fields
  - Store enhanced data as JSON

### Statistical Analysis

- **Process**:
  - Read enhanced planning application dataset
  - Calculate statistics by development category
  - Calculate house build statistics (max, min, average)
  - Categorize applications by house count ranges
  - Generate analysis dataset
  - Store analysis results as JSON

### CSV File Generation

- **Process**:
  - Convert local planning authorities data to CSV format
  - Convert enhanced planning application data to CSV format
  - Convert analysis data to CSV format
  - Store CSV files in designated output directory
  - Return file download URLs

### File Structure

```
/data/
  /raw/
    planning-applications.json
    local-authorities.json
    local-planning-authorities.json
  /enhanced/
    enhanced-planning-applications.json
  /analysis/
    planning-analysis.json
  /output/
    local-planning-authorities.csv
    enhanced-planning-data.csv
    analysis-results.csv
```

### Error Handling

- Network timeout handling for data extraction
- LLM API error handling with retry logic
- Data validation for required fields
- Graceful degradation for missing reference data
- Comprehensive error logging and user notification
