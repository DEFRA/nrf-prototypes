---
name: screenshot-prototype
description: Captures screenshots of each page in the requested prototype journey
parameters:
  - name: prototype-path
    description: The path identifier for the prototype (e.g., nrf-estimate-1)
    required: true
    type: string
  - name: base-url
    description: Base URL for the prototype
    required: false
    type: string
    default: 'http://localhost:3000'
  - name: screenshot-dir
    description: Directory to save screenshots
    required: false
    type: string
    default: 'screenshots'
  - name: headless
    description: Run in headless mode (no browser window)
    required: false
    type: boolean
    default: true
  - name: delay
    description: Delay between pages in milliseconds
    required: false
    type: number
    default: 1000
---

# Screenshot Prototype Journey

## Overview

This slash command captures screenshots of all pages in a prototype journey by automatically walking through the user flow and taking screenshots of each page.

## Implementation approach (preferred order)

1. **Playwright MCP tools** (`mcp__playwright__*`) — use these first if available in the session. They drive a real browser directly with no subprocess or binary path issues. Use `browser_navigate`, `browser_fill_form`, `browser_click`, and `browser_take_screenshot` to walk each page and save screenshots to `{screenshot-dir}/{prototype-path}/`. Always use `{prototype-path}` as the folder name regardless of which `base-url` is used — do not create environment-specific subdirectories.
2. **`scripts/screenshot-capture.js`** — fall back to this only if the Playwright MCP tools are not available. The script uses Playwright (Chromium) and requires the prototype journey to be registered in `PROTOTYPE_JOURNEYS` before running.

## Usage

```
/screenshot-prototype <prototype-path> [options]
```

## Examples

### Basic usage

```bash
/screenshot-prototype nrf-estimate-1
```

### With custom options

```bash
/screenshot-prototype nrf-estimate-1 --base-url http://localhost:3001 --screenshot-dir my-screenshots --headless --delay 2000
```

### Using parameter names

```bash
/screenshot-prototype prototype-path:nrf-estimate-1 base-url:http://localhost:3001 screenshot-dir:my-screenshots headless:true delay:2000
```

## Available Prototypes

### nrf-estimate-1

**Name**: NRF Estimate Journey  
**Description**: Nature Restoration Fund Levy Estimate prototype  
**Pages**: 22 pages including start, forms, maps, summary, and confirmation pages

## What it does

1. **Launches a browser** using Playwright (Chromium)
2. **Navigates through each page** in the `prototype-path` journey
3. **Fills out forms** with test data from formData configuration
4. **Captures screenshots** of each page in full-page mode
5. **Saves screenshots** to `screenshot-dir/<prototype-path>/` directory
6. **Uses the specified `base-url`** to access the prototype
7. **Waits `delay` milliseconds** between page captures (overridable per-page with `waitMs`)
8. **Runs in headless mode** if `headless` is set to true

## Screenshot Organization

Screenshots are saved with the following structure, with index numbers to maintain user journey order:

```
{screenshot-dir}/
└── {prototype-path}/
    ├── 01-start.png
    ├── 02-what-would-you-like-to-do.png
    ├── 03-redline-map.png
    ├── 04-upload-redline.png
    ├── 05-map.png
    ├── 06-no-edp.png
    ├── 07-building-type.png
    ├── 08-room-count.png
    ├── 09-residential.png
    ├── 10-non-residential.png
    ├── 11-email.png
    ├── 12-summary.png
    ├── 13-confirmation.png
    ├── 14-estimate-email-content.png
    ├── 15-do-you-have-an-estimate-ref.png
    ├── 16-enter-estimate-ref.png
    ├── 17-retrieve-estimate-email.png
    ├── 18-estimate-email-retrieval-content.png
    ├── 19-planning-ref.png
    ├── 20-payment-summary.png
    ├── 21-payment-confirmation.png
    ├── 22-estimate-confirmation-email.png
    └── 23-payment-email.png
```

## Prerequisites

1. **Node.js** installed on the system
2. **Playwright** package installed (`npm install @playwright/test` + `npx playwright install chromium`)
3. **Prototype server running** on the specified base URL
4. **Write permissions** to the screenshot directory

## Installation

```bash
# Install Playwright if not already installed
npm install @playwright/test
npx playwright install chromium

# Make the script executable
chmod +x scripts/screenshot-capture.js
```

## Technical Details

### Form Data

The script automatically fills out forms based on the `formData` object in each prototype configuration. The generic form filler supports:

- **Radio buttons**: Matched by field name and value
- **Checkboxes**: Arrays of values for multiple selections
- **Text/email/number inputs**: Matched by field name

Each prototype defines its own test data in the `PROTOTYPE_JOURNEYS` object.

### Error Handling

- Continues to next page if one page fails
- Logs errors for debugging
- Gracefully handles missing form elements
- Times out after 30 seconds per page

### Browser Configuration

- Default viewport: 1200x800 pixels
- Full-page screenshots
- Network idle wait for page loads
- Configurable `delay` between actions
- Runs in headless mode when `headless` is true

## Troubleshooting

### Common Issues

1. **"Prototype not found"**
   - Check that the `prototype-path` parameter is correct
   - Available prototypes are listed in the script

2. **"Connection refused"**
   - Ensure the prototype server is running
   - Check the `base-url` parameter is correct

3. **"Permission denied"**
   - Check write permissions for `screenshot-dir` directory
   - Ensure directory exists or can be created

4. **"Page not loading"**
   - Increase the `delay` parameter between pages
   - Check network connectivity
   - Verify the prototype is accessible at the specified `base-url`

### Debug Mode

Run with verbose logging to see detailed information:

```bash
DEBUG=* node scripts/screenshot-capture.js nrf-estimate-1
```

## Extending for New Prototypes

To add support for new prototypes, edit `scripts/screenshot-capture.js` and add a new entry to the `PROTOTYPE_JOURNEYS` object:

```javascript
const PROTOTYPE_JOURNEYS = {
  // ... existing prototypes ...
  'new-prototype': {
    name: 'New Prototype Name',
    basePath: '/new-prototype',
    pages: [
      { path: '/start', name: 'start', title: 'Start Page' }
      // ... add all pages ...
    ],
    formData: {
      // Define test data to fill forms
      'journey-type': 'estimate', // Radio button
      'building-types': ['Type1', 'Type2'], // Checkboxes (array)
      email: 'test@example.com', // Text input
      count: '10' // Number input
    }
  }
}
```

### Page config rules

When adding pages to a journey config, always apply these rules:

- Any page with `name: 'map'` **must** include `waitMs: 5000, fullPage: false`. The map component loads tiles asynchronously and the canvas prevents full-page capture. Example:
  ```javascript
  { path: '/map', name: 'map', title: 'Draw a red line boundary', waitMs: 5000, fullPage: false }
  ```

## Output

The script provides real-time feedback:

- ✅ Successful page captures
- ❌ Failed page captures with error messages
- 📁 Directory creation notifications
- 📸 Current page being captured
- 🔒 Browser cleanup on completion

## Notes

- Screenshots are taken in full-page mode to capture the entire page
- The script handles both GET and POST routes automatically
- Form submissions are handled to progress through multi-step journeys
- The script uses Playwright (Chromium) — no Puppeteer dependency needed
- The browser runs in non-headless mode by default (`headless: false`) for better debugging
- All screenshots are saved as PNG files with descriptive names in `screenshot-dir/{prototype-path}/`
- The script uses the specified `base-url` to access the prototype
- Page transitions wait for the configured `delay` milliseconds
