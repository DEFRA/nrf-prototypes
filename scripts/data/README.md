# Planning Data Analyzer

This script extracts, enhances, and analyzes planning application data from the planning.data.gov.uk platform to support environmental planning decisions and conservation measures.

## Features

- **Data Extraction**: Retrieves planning applications, local authorities, and local planning authorities data in chunks
- **LLM Enhancement**: Analyzes planning descriptions to extract house counts and development categories
- **Data Enrichment**: Adds local authority and planning authority names by cross-referencing datasets
- **Statistical Analysis**: Generates comprehensive statistics on development categories and house counts
- **CSV Output**: Creates formatted CSV files for further analysis

## Project Structure

The application is organized into modular components for better maintainability:

```
scripts/data/
├── config.js                           # Configuration settings
├── planning-data-analyzer.js           # Main application entry point
├── README.md                           # This documentation
├── utils/                              # Utility modules
│   ├── logger.js                       # Logging utility
│   ├── file-manager.js                 # File operations utility
│   └── http-client.js                  # HTTP client utility
├── services/                           # Business logic services
│   ├── data-extractor.js               # Data extraction service
│   ├── llm-analyzer.js                 # LLM analysis service
│   ├── data-enhancer.js                # Data enhancement service
│   ├── statistical-analyzer.js         # Statistical analysis service
│   └── csv-generator.js                # CSV generation service
└── data/                               # Generated data files
    ├── raw/                            # Raw extracted data
    ├── enhanced/                       # Enhanced data with LLM analysis
    ├── analysis/                       # Statistical analysis results
    └── output/                         # CSV output files
```

## Prerequisites

- Node.js (version 14 or higher)
- Internet connection to access planning.data.gov.uk
- Optional: OpenAI API key for enhanced LLM analysis

## Installation

1. Navigate to the scripts/data directory:
   ```bash
   cd scripts/data
   ```

2. Ensure the script is executable:
   ```bash
   chmod +x planning-data-analyzer.js
   ```

3. Set up environment variables (optional):
   ```bash
   export OPENAI_API_KEY="your-openai-api-key"
   ```

## Usage

Run the script from the command line:

```bash
node planning-data-analyzer.js
```

Or if made executable:

```bash
./planning-data-analyzer.js
```

## Configuration

The script uses the following configuration (defined in `config.js`):

- **Base URL**: https://www.planning.data.gov.uk/entity.json
- **Chunk Size**: 1000 records per API call
- **Timeout**: 30 seconds per request
- **Retry Attempts**: 3 attempts with exponential backoff
- **Data Directory**: `./data/` relative to the script location

## Module Overview

### Configuration (`config.js`)
Centralized configuration for all application settings including API endpoints, timeouts, and file paths.

### Utilities (`utils/`)
- **logger.js**: Consistent logging with timestamps and log levels
- **file-manager.js**: File system operations for JSON and CSV files
- **http-client.js**: HTTP client with retry logic and error handling

### Services (`services/`)
- **data-extractor.js**: Extracts data from planning.data.gov.uk API
- **llm-analyzer.js**: Analyzes planning descriptions using LLM (currently mock implementation)
- **data-enhancer.js**: Enhances planning data with LLM analysis and cross-referencing
- **statistical-analyzer.js**: Generates statistical analysis and summaries
- **csv-generator.js**: Creates CSV output files for further analysis

## Output Structure

The script creates the following directory structure:

```
data/
├── raw/
│   ├── planning-applications.json
│   ├── local-authorities.json
│   └── local-planning-authorities.json
├── enhanced/
│   └── enhanced-planning-applications.json
├── analysis/
│   └── planning-analysis.json
└── output/
    ├── local-planning-authorities.csv
    ├── enhanced-planning-data.csv
    └── analysis-results.csv
```

## Output Files

### Raw Data (JSON)
- **planning-applications.json**: Raw planning application data from the API
- **local-authorities.json**: Local authority reference data
- **local-planning-authorities.json**: Local planning authority reference data

### Enhanced Data (JSON)
- **enhanced-planning-applications.json**: Planning applications with added fields:
  - `houseCount`: Number of houses extracted from description
  - `developmentCategory`: Category (house_build, extension, renovation, etc.)
  - `localAuthorityName`: Name of the local authority
  - `localPlanningAuthorityName`: Name of the local planning authority

### Analysis Data (JSON)
- **planning-analysis.json**: Statistical analysis including:
  - Summary statistics
  - Development category breakdown
  - House build statistics (max, min, average)
  - House count distribution

### CSV Output Files
- **local-planning-authorities.csv**: Reference data for local planning authorities
- **enhanced-planning-data.csv**: Enhanced planning application data in CSV format
- **analysis-results.csv**: Flattened analysis data for spreadsheet analysis

## LLM Integration

The script includes a mock LLM implementation that analyzes planning descriptions to extract:
- Number of houses/dwellings mentioned
- Development category classification

To use a real LLM API:
1. Set the `OPENAI_API_KEY` environment variable
2. Replace the `mockLLMAnalysis` method in `services/llm-analyzer.js` with actual API calls
3. Update the `LLM_CONFIG` object in `config.js` with your preferred model and settings

## Error Handling

The script includes comprehensive error handling:
- Network timeout handling with retry logic
- Graceful degradation for missing reference data
- Detailed logging of all operations
- Fallback values for failed LLM analysis

## Logging

The script provides detailed logging with timestamps:
- **INFO**: General progress information
- **SUCCESS**: Successful operations
- **ERROR**: Error conditions with details
- **DEBUG**: Debug information (when DEBUG environment variable is set)

## Performance Considerations

- The script processes data in chunks to handle large datasets
- LLM analysis is performed sequentially to avoid rate limiting
- File operations use async/await for better performance
- Memory usage is optimized by processing data in streams

## Troubleshooting

### Common Issues

1. **Network Timeouts**: Increase the `timeout` value in `config.js`
2. **API Rate Limiting**: Increase `retryDelay` in `config.js`
3. **Memory Issues**: Reduce `chunkSize` in `config.js`
4. **File Permission Errors**: Ensure write permissions to the data directory

### Debug Mode

To enable more detailed logging, set the DEBUG environment variable:
```bash
DEBUG=1 node planning-data-analyzer.js
```

## Dependencies

The script uses only Node.js built-in modules:
- `fs.promises`: File system operations
- `path`: Path manipulation
- `https`: HTTP client for API calls
- `url`: URL parsing

No additional npm packages are required.

## Development

### Adding New Features

1. **New Data Sources**: Add extraction methods to `services/data-extractor.js`
2. **New Analysis**: Add analysis methods to `services/statistical-analyzer.js`
3. **New Output Formats**: Add generation methods to `services/csv-generator.js`
4. **Configuration Changes**: Update `config.js`

### Testing Individual Modules

Each module can be tested independently:

```javascript
// Test data extraction
const DataExtractor = require('./services/data-extractor');
const planningApps = await DataExtractor.extractPlanningApplications();

// Test LLM analysis
const LLMAnalyzer = require('./services/llm-analyzer');
const analysis = await LLMAnalyzer.analyzePlanningDescription('description text');
```

## License

This script is part of the NRF Prototypes project and follows the same licensing terms. 