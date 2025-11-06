---
name: journey-updates
description: Merge new changes to a prototype user journey
parameters:
  - name: journey
    description: The type of journey to update (e.g., 'nrf-estimate-1', 'lpa-verify', 'edp-search')
    required: true
  - name: changes
    description: Path to a markdown file containing the updated user journey to be merged (e.g., 'prompts/implementation/quote-journey-v2.md')
    required: true
---

# Code Review Command

## Description

Take the content from updates to the user journey and integrate them into the implemented code

## Usage

Type `/journey-updates` in the chat to trigger a merge of changes to the user journey.

### Parameters

- `journey` (required): Specify which journey to update
- `changes` (required): Path to a markdown file containing the updated user journey to be merged

### Examples

- `/journey-updates journey:nrf-estimate-1 changes:prompts/implementation/quote-journey-v2.md`

### Content Change Examples

- **Terminology**: "redline" → "red line", "residential" → "dwellinghouse"
- **Spacing**: "redline boundary" → "red line boundary"
- **Error messages**: "Select a building type" → "Select a building type to continue"
- **Page titles**: "Upload redline file" → "Upload a red line boundary file"
- **Pronoun changes**: "your development" → "the development"
- **Grammar fixes**: "If you need to help" → "If you need help"
- **Alphabetical ordering**: Form options (checkboxes, radio buttons, select options) must be in alphabetical order

### Styling Requirements

When implementing or updating journeys, ensure consistent styling across all pages:

- **Heading Styles**:
  - **All pages**: Use `govuk-heading-l` for main headings (h1)
  - **Confirmation pages**: Use `govukPanel` component with `titleText` (not h1 headings)
  - **Sub-headings**: Use `govuk-heading-m` for h2, `govuk-heading-s` for h3

- **Email Pages**:
  - **No button styles**: Email pages must use `govuk-link` class for links, never `govuk-button` or button styling
  - **Link styling**: All navigation links in email pages should be plain links with `class="govuk-link"`

- **Data Display**:
  - **Payment/Reference numbers**: When displaying "Payment reference:" or similar labels, make the label bold using `<strong>Payment reference:</strong>` followed by the value
  - **Structured data**: Use `govuk-summary-list` component for displaying key-value pairs (e.g., payment reference and business name together)

- **Consistency**: Ensure all pages in a journey follow the same styling patterns as existing journeys (nrf-estimate-1, nrf-estimate-2)

### Structural Change Examples

- **New pages**: Step 7 "Email sent from the Nature Restoration Fund service" → `/nrf-estimate-1/estimate-email-content`
- **Page order changes**: Reordering of steps in the journey flow
- **Path changes**: `/old-path` → `/new-path`
- **Deleted pages**: Removing steps that are no longer needed

# Instructions

Take the instructions and parameters provided, then:

1. **Journey Type**: Focus on the `{journey}` journey
2. **Changes Source**:
   - Read and analyze the markdown file content in `{changes}`
   - Compare with the implemented user journey under `{journey}`
   - **Content Replacement Methodology** (Recommended Approach):
     - **Parse Specification Content**: Extract complete content blocks from the markdown specification for each page
     - **Content Block Identification**: Identify content sections in the specification:
       - Main page content (paragraphs, lists, headings)
       - Form labels and options
       - Error messages and validation text
       - Button text and navigation elements
     - **Direct Content Mapping**: Map specification content directly to view file content sections
     - **Template-Aware Replacement**: Replace content while preserving:
       - GOV.UK Prototype Kit template structure
       - Template variables and data binding (`{{ data.variable }}`)
       - Form action URLs and method attributes
       - CSS classes and HTML attributes
       - JavaScript functionality
   - **Content Comparison Techniques** (Fallback Approach):
     - Use grep/search tools to find specific text patterns
     - Compare exact strings between specification and implementation
     - Look for word variations, spacing differences, and terminology changes
     - Check all user-facing text including hidden form elements and error messages
     - Forensically review the content in the implemented pages and compare against the content defined in `{changes}`
   - **Structural Detection Techniques**:
     - Use `grep -E "^\|\|.*Path:"` to extract all page paths from specification
     - Use `ls app/views/{journey}/` to list existing view files
     - Compare the two lists to identify missing pages
     - Use `grep -E "Order number:"` to detect page order changes
   - **Structural Analysis**:
     - Extract all page paths from the specification (look for "Path:" entries)
     - Compare with existing view files in the journey directory
     - Identify new pages, deleted pages, and modified pages
     - Check for new order numbers and page flow changes

3. **Implementation Steps**:
   - **Structural Analysis First**:
     - Extract all page paths from the specification using grep for "Path:"
     - List all existing view files in the journey directory
     - Identify new pages that need to be created
     - Identify deleted pages that need to be removed
     - Check for page order changes and flow modifications
   - **Content Replacement Strategy** (Primary Approach):
     - **Extract Content Blocks**: Parse the specification markdown to extract complete content blocks for each page
     - **Direct Content Replacement**: Replace entire content sections in view files with the exact content from the specification
     - **Content Block Mapping**: Map specification content blocks to corresponding view file sections:
       - Page titles and headings
       - Main content paragraphs and lists
       - Form labels and options
       - Error messages and validation text
       - Button text and navigation elements
     - **Template Preservation**: Maintain GOV.UK Prototype Kit template structure while replacing content
     - **Variable Preservation**: Keep existing template variables and data binding intact
     - **Styling Preservation**: Ensure correct heading styles (all pages: `govuk-heading-l`, confirmation pages: `govukPanel`), email pages use `govuk-link` not buttons, payment references use bold labels, structured data uses `govuk-summary-list`
   - **Fallback Content Comparison** (Secondary Approach):
     - Use grep/search tools to find specific text patterns
     - Compare exact strings between specification and implementation
     - Look for word variations, spacing differences, and terminology changes
     - Check all user-facing text including hidden form elements and error messages
   - Focus on ALL content changes including:
     - **Text changes**: Exact wording, capitalization, punctuation, spacing
     - **Terminology changes**: Word variations (e.g., "redline" vs "red line", "dwellinghouse" vs "residential")
     - **Error messages**: Exact error text, validation messages, field labels
     - **Page titles and headings**: All heading text, page titles, form labels
     - **Navigation text**: Button text, link text, back link text
     - **Content structure**: Bullet points, lists, form options, radio/checkbox labels
     - **Alphabetical ordering**: Ensure all form options (checkboxes, radio buttons, select options) are in alphabetical order by their display text
     - **Page flow changes**: New pages, deleted pages, conditional routing
     - **Data structure changes**: Field names, variable names, data types
   - Update the relevant files (routes, views, etc.)
   - Ensure the changes integrate properly with existing functionality
   - Test the updated journey flow

4. **Files to Update**:
   - Routes: `app/routes/{journey}.js`
   - Views: `app/views/{journey}/`
   - Any additional files mentioned in the changes

5. **Validation**:
   - **Structural Verification**:
     - Verify all pages from the specification exist as view files
     - Check that all page paths match the specification exactly
     - Confirm page order and flow matches the specification
     - Ensure no orphaned pages exist that aren't in the specification
   - **Content Verification**:
     - Compare ALL user-facing text with the specification (page titles, headings, labels, buttons, error messages)
     - Verify terminology consistency throughout the journey
     - Check spacing, punctuation, and capitalization match exactly
     - Verify all form options (checkboxes, radio buttons, select options) are in alphabetical order by display text
   - **Styling Verification**:
     - Verify heading styles: all pages use `govuk-heading-l`, confirmation pages use `govukPanel`
     - Check email pages use `govuk-link` for links, not `govuk-button` styles
     - Verify payment/reference labels are bold (`<strong>Payment reference:</strong>`)
     - Check structured data uses `govuk-summary-list` where appropriate
     - Ensure styling consistency with existing journeys (nrf-estimate-1, nrf-estimate-2)
   - **Functional Testing**:
     - Ensure all form submissions work correctly
     - Verify navigation flow is maintained
     - Check that validation logic is properly implemented and all conditions work as per the requirements
     - Check the error messages display for each of the defined conditions
   - **User Experience**:
     - Confirm the user experience matches the requirements exactly
     - Test the complete journey flow end-to-end
     - Verify all conditional paths work correctly
