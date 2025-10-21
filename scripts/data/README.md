# Planning Data Analyser

## Overview

The Planning Data Analyser is a comprehensive tool for extracting, enhancing, and analysing planning application data from the planning.data.gov.uk platform. It provides a unified workflow for data processing, statistical analysis, and CSV generation to support environmental planning decisions.

## What It Does

The analyser performs several key functions:

1. **Data Extraction** - Downloads raw planning data from government APIs
2. **Data Enhancement** - Uses LLM analysis to categorise applications and extract building counts
3. **Data Standardisation** - Cleans and standardises development categories
4. **Authority Mapping** - Populates local authority and planning authority names
5. **Statistical Analysis** - Generates comprehensive analysis and summaries
6. **CSV Generation** - Creates formatted CSV files for further analysis

## Key Features

- **Integrated Workflow** - Single command runs the entire process
- **Smart Caching** - Avoids re-downloading data unnecessarily
- **Flexible Operation** - Full run or regeneration-only modes
- **Comprehensive Output** - Multiple CSV formats and analysis reports
- **Error Handling** - Robust error handling with detailed logging
- **Performance Optimised** - Fast regeneration from existing data

## Installation & Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

### Setup

1. Navigate to the scripts/data directory:

   ```bash
   cd scripts/data
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment variables (copy from env-example.txt):

   ```bash
   cp env-example.txt .env
   # Edit .env with your API keys and configuration
   ```

4. Make the script executable:
   ```bash
   chmod +x planning-data-analyser.js
   ```

## Usage

### Full Run (Extraction + LLM + Analysis + CSV)

This mode extracts fresh data, runs LLM analysis, and generates all outputs:

```bash
node planning-data-analyser.js
```

**What happens:**

- Downloads raw planning applications from planning.data.gov.uk
- Downloads local authority and planning authority data
- Runs LLM analysis to categorise applications and extract building counts
- Standardises development categories
- Populates authority names
- Generates statistical analysis
- Creates all CSV output files

**Use when:** Initial setup, new data needed, or when LLM analysis is required

### Regeneration Only (Skip Extraction & LLM)

This mode uses existing enhanced data to regenerate analysis and CSV files:

```bash
node planning-data-analyser.js --regenerate
# or
node planning-data-analyser.js -r
```

**What happens:**

- Loads existing enhanced planning applications
- Standardises development categories
- Populates authority names (if data available)
- Regenerates statistical analysis
- Creates all CSV output files
- **Skips** API extraction and LLM analysis

**Use when:** Daily updates, testing, or when only standardisation/analysis is needed

## Output Files

### Enhanced Data

- `enhanced-planning-applications.json` - LLM enhanced data with building counts and categories
- `enhanced-planning-applications-standardised.json` - Fully standardised data with clean categories

### Analysis

- `planning-analysis.json` - Complete statistical analysis results
- `planning-analysis-v3.json` - Versioned analysis with metadata

### CSV Files

- `enhanced-planning-data.csv` - Complete planning applications (33+ MB)
  - Includes: ID, reference, description, building counts, categories, authority names, dates
- `planning-analysis.csv` - Analysis summary (1 KB)
  - Includes: Category breakdowns, counts, totals, averages
- `local-planning-authorities.csv` - Authority reference (10 KB)
  - Includes: Authority codes and names

## Development Category Standardisation

The system automatically maps long descriptive development categories to standardised names:

### Examples

- `"mixed-use development comprising residential units, commercial floor space, hotel, cinema and associated car parking, cycle parking, public realm and landscaping"` → `"mixed_use"`
- `"mixed_use_redevelopment"` → `"mixed_use"`
- `"mixed-use development"` → `"mixed_use"`

### Standard Categories

- `extension` - Building extensions
- `other` - Miscellaneous applications
- `renovation` - Building renovations
- `house_build` - New house construction
- `infrastructure_build` - Infrastructure projects
- `commercial_build` - Commercial buildings
- `mixed_use` - Mixed-use developments
- `demolition` - Demolition projects
- `school_build` - School construction

## Performance

### Full Run

- **Time**: Varies based on API calls and LLM processing (typically 10-30 minutes)
- **Data**: Fresh extraction and analysis
- **Use Case**: Initial setup or when new data is needed

### Regeneration

- **Time**: ~1-2 seconds (very fast)
- **Data**: Uses existing enhanced data
- **Use Case**: Daily updates, testing, or when only standardisation/analysis is needed

## Configuration

The system uses a central configuration file (`config.js`) that controls:

- **HTTP Settings**: Timeouts, retry attempts, rate limiting
- **Data Directories**: Raw, enhanced, analysis, and output paths
- **API Endpoints**: Planning data.gov.uk endpoints
- **Processing Limits**: Batch sizes and concurrency settings

## Architecture

The analyser is built with a modular service architecture:

### Core Services

- **DataExtractor** - Handles API data extraction and caching
- **DataEnhancer** - Manages LLM analysis and data enhancement
- **DataStandardizer** - Standardises categories and populates authority names
- **StatisticalAnalyser** - Generates statistical analysis and CSV outputs
- **CSVGenerator** - Creates formatted CSV files

### Utilities

- **Logger** - Structured logging with different levels
- **FileManager** - File operations and directory management
- **HTTPClient** - HTTP requests with retry logic and rate limiting

## Error Handling

The system includes comprehensive error handling:

- **File Not Found**: Helpful error messages with file path suggestions
- **API Failures**: Automatic retry logic with exponential backoff
- **Data Validation**: Quality checks and validation reporting
- **Detailed Logging**: Comprehensive logging for debugging and monitoring

## Troubleshooting

### Common Issues

1. **Missing Data Files**
   - Ensure the data directory structure exists
   - Check file permissions and paths

2. **API Rate Limiting**
   - The system includes automatic rate limiting
   - Adjust settings in config.js if needed

3. **LLM Analysis Failures**
   - Check API keys and configuration
   - Verify network connectivity to LLM services

4. **Memory Issues**
   - Large datasets may require increased Node.js memory limits
   - Use `--max-old-space-size=4096` flag if needed

### Debug Mode

Enable detailed logging:

```bash
DEBUG=1 node planning-data-analyser.js
```

## Future Enhancements

The modular architecture makes it easy to extend:

- **Additional Data Sources** - Integration with other planning data sources
- **New Analysis Types** - Custom statistical analysis methods
- **Enhanced LLM Models** - Support for different AI models
- **Real-time Updates** - Webhook-based data updates
- **API Endpoints** - REST API for external integration

## Support

For issues or questions:

1. Check the logs for detailed error information
2. Verify configuration and environment variables
3. Ensure all dependencies are installed
4. Check file permissions and directory structure

The Planning Data Analyser provides a robust, scalable solution for planning data processing and analysis, suitable for both development and production use.
