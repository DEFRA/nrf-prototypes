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

# Instructions
Take the instructions and parameters provided, then:

1. **Journey Type**: Focus on the `{journey}` journey
2. **Changes Source**: 
   - Read and analyze the markdown file content in `{changes}`
   - Compare with the implemented user journey under `{journey}`
   - **Content Comparison Techniques**:
     * Use grep/search tools to find specific text patterns
     * Compare exact strings between specification and implementation
     * Look for word variations, spacing differences, and terminology changes
     * Check all user-facing text including hidden form elements and error messages

3. **Implementation Steps**:
   - Review the current implementation of the `{journey_type}` journey
   - Identify the differences with the updated journey from `{changes}`
   - Focus on ALL content changes including:
     * **Text changes**: Exact wording, capitalization, punctuation, spacing
     * **Terminology changes**: Word variations (e.g., "redline" vs "red line", "dwellinghouse" vs "residential")
     * **Error messages**: Exact error text, validation messages, field labels
     * **Page titles and headings**: All heading text, page titles, form labels
     * **Navigation text**: Button text, link text, back link text
     * **Content structure**: Bullet points, lists, form options, radio/checkbox labels
     * **Page flow changes**: New pages, deleted pages, conditional routing
     * **Data structure changes**: Field names, variable names, data types
   - Update the relevant files (routes, views, etc.)
   - Ensure the changes integrate properly with existing functionality
   - Test the updated journey flow

4. **Files to Update**:
   - Routes: `app/routes/{journey_type}.js`
   - Views: `app/views/{journey_type}/`
   - Any additional files mentioned in the changes

5. **Validation**:
   - **Content Verification**: 
     * Compare ALL user-facing text with the specification (page titles, headings, labels, buttons, error messages)
     * Verify terminology consistency throughout the journey
     * Check spacing, punctuation, and capitalization match exactly
   - **Functional Testing**:
     * Ensure all form submissions work correctly
     * Verify navigation flow is maintained
     * Check that validation logic is properly implemented and all conditions work as per the requirements
     * Check the error messages display for each of the defined conditions
   - **User Experience**:
     * Confirm the user experience matches the requirements exactly
     * Test the complete journey flow end-to-end
     * Verify all conditional paths work correctly 