---
name: fix-journey-prompt
description: Identify and fix any issue with a journey prompt, in order to give the /journey-updates command the best chance at successfully integrating the journey updates
parameters:
  - name: journey
    description: The type of journey to update (e.g., 'nrf-estimate-1', 'lpa-verify', 'edp-search')
    required: true
  - name: spec-file
    description: Path to the specification markdown file (e.g., prompts/implementation/payment-journey-with-ref-v1.md)
    required: true
    type: string
---

# Journey Prompt Validation and Fixing Command

## Description

Validates and fixes journey specification files to ensure they can be successfully processed by the `/journey-updates` command. This command scans the specification file for common issues, checks for conflicts with existing journey code, and applies fixes to reduce manual tweaks after implementation.

## Usage

Type `/fix-journey-prompt` in the chat to validate and fix a journey specification file.

### Parameters

- `journey` (required): Specify which journey the specification is for
- `spec-file` (required): Path to the specification markdown file to validate and fix

### Examples

- `/fix-journey-prompt journey:nrf-estimate-2 spec-file:prompts/implementation/04-invoice-journey-v1.md`

# Instructions

Take the instructions and parameters provided, then:

## 1. Load and Parse Specification

- Read the specification file at `{spec-file}`
- Extract all pages with their:
  - Order numbers
  - Page titles
  - Path values
  - Data properties used
  - Form field names
  - Route names
  - Template names

## 2. Scan Existing Journey Code for Conflicts

Before applying any changes, scan the existing `{journey}` implementation to identify potential conflicts:

### Route Conflicts

- **Scan**: `app/routes/{journey}.js` and `app/config/{journey}/routes.js`
- **Check for**:
  - Existing route constants that might clash with new routes
  - Duplicate path definitions
  - Similar route names that could cause confusion
- **Action**: List all existing routes and compare with specification paths

### Data Property Conflicts

- **Scan**: All view files in `app/views/{journey}/` for `data.*` references
- **Check for**:
  - Existing data properties that might be overwritten
  - Similar property names that could cause confusion
  - Session data persistence patterns
- **Action**: Extract all unique data properties currently in use
- **Example conflicts to avoid**:
  - `data.levies` vs `data.leviesSelected`
  - `data.reference` vs `data.estimateReference` vs `data.paymentReference`

### Template/View Conflicts

- **Scan**: `app/views/{journey}/` directory
- **Check for**:
  - Existing view files with similar names
  - Pages that might serve similar purposes
- **Action**: List all existing view files and compare with specification

### Configuration Conflicts

- **Scan**: `app/config/{journey}/` directory
- **Check for**:
  - Shared configuration files (e.g., building-types.js)
  - Constant definitions that might clash
- **Action**: Identify shared configs and ensure they're not duplicated

## 3. Path Naming Validation and Fixes

All paths in the specification must follow consistent naming conventions:

### Path Format Requirements

- **Lowercase only**: All path segments must be lowercase
  - ❌ Wrong: `/LPAemail`, `/SummaryAndDeclaration`, `/EstimateRef`
  - ✅ Correct: `/lpa-email`, `/summary-and-declaration`, `/estimate-ref`

- **Hyphenated**: Multi-word paths must use hyphens
  - ❌ Wrong: `/paymentemail`, `/estimateref`, `/buildingtypes`
  - ✅ Correct: `/payment-email`, `/estimate-ref`, `/building-types`

- **Descriptive and Specific**: Avoid generic names that could cause confusion or conflicts
  - ❌ Too generic: `/confirm`, `/check`, `/summary`, `/email`, `/details`
  - ✅ Specific: `/confirm-levy-selection`, `/check-payment-details`, `/payment-summary`, `/lpa-email`, `/site-details`
  - **Why this matters**: Generic names like `/confirm` can be confused with `/confirmation`, and `/summary` could refer to estimate summary, payment summary, or check-your-answers
  - **Conflict examples**:
    - `/confirm` vs `/confirmation` (easily confused)
    - `/summary` vs `/payment-summary` vs `/estimate-summary` (ambiguous purpose)
    - `/email` vs `/payment-email` vs `/lpa-email` vs `/estimate-email` (which email?)
  - **Detection**: Flag any single-word paths that are common generic terms
  - **Auto-fix suggestion**: Prepend context (e.g., `/confirm` → `/confirm-levy-selection`)

- **Consistent with GOV.UK patterns**: Follow GOV.UK Design System naming patterns
  - Use `/check-your-answers` not `/summary`
  - Use `/confirmation` not `/success` or `/complete`
  - Add context to standard patterns: `/payment-confirmation` vs `/estimate-confirmation`

### Auto-fix Path Names

For each page in the specification:

1. Extract the `Path:` value
2. Convert to lowercase
3. Replace spaces and underscores with hyphens
4. Remove special characters except hyphens and slashes
5. Ensure base path matches journey name (e.g., `/nrf-estimate-2/`)
6. Update the specification with corrected path

**Example transformations:**

```
/nrf-estimate-2/LPAemail → /nrf-estimate-2/lpa-email
/nrf-estimate-2/SummaryAndDeclaration → /nrf-estimate-2/summary-and-declaration
/nrf-estimate-2/EstimateRef → /nrf-estimate-2/estimate-ref
/nrf-estimate-2/do_you_have_ref → /nrf-estimate-2/do-you-have-ref
```

## 4. Data Property Naming Validation

All data property names must be unique and descriptive to prevent conflicts:

### Data Property Requirements

- **camelCase**: Use camelCase for data properties
  - ✅ Correct: `leviesSelected`, `estimateReference`, `lpaEmail`
  - ❌ Wrong: `levies_selected`, `EstimateReference`, `LPAEmail`

- **Descriptive and Unique**: Avoid generic names that might conflict
  - ❌ Generic: `data.email`, `data.reference`, `data.items`
  - ✅ Specific: `data.lpaEmail`, `data.estimateReference`, `data.leviesSelected`

- **Consistent with Purpose**: Name should reflect what it stores
  - For checkbox arrays: use plural nouns (e.g., `leviesSelected`, `buildingTypesChosen`)
  - For references: include type (e.g., `estimateReference`, `paymentReference`)
  - For emails: include recipient (e.g., `lpaEmail`, `userEmail`)

### Conflict Detection

- Check if specification introduces data properties that already exist
- If conflict found, suggest more specific names
- Verify the new property won't overwrite unrelated existing data

## 5. Back Link Validation and Fixes

All back links must be hardcoded URLs, never JavaScript history methods:

### Back Link Requirements

- **Hardcoded URLs only**: Use explicit paths
  - ❌ Wrong: `javascript:history.back()`, `javascript:window.history.back()`
  - ✅ Correct: `/nrf-estimate-2/previous-page`

- **Conditional logic when needed**: For pages accessible from multiple sources
  ```nunjucks
  {% if data.someCondition %}
    {{ govukBackLink({ href: "/path/from/journey-a" }) }}
  {% else %}
    {{ govukBackLink({ href: "/path/from/journey-b" }) }}
  {% endif %}
  ```

### Auto-fix Back Links

For each page in the specification:

1. Identify the previous page in the journey flow
2. Generate correct back link path
3. Handle special cases:
   - Confirmation pages (typically no back button after submission)
   - Pages with multiple entry points (use conditional logic)
   - Start pages (back to home or service start)

## 6. Form Validation Alignment

Ensure form validation logic matches the form fields defined in the specification:

### Validation Requirements

- **Remove validation for removed fields**: If specification removes a form field, remove its validation
  - Example: If radio button removed from `/confirm`, remove radio validation in POST handler

- **Add validation for new required fields**: If specification adds required field, add validation
  - Check for empty values
  - Check for format (email, postcode, etc.)
  - Return appropriate error messages

- **Error message consistency**: Ensure error messages match specification exactly
  - Extract error messages from specification
  - Verify they're used in both view (error summary) and route handler

### Common Validation Pitfalls

1. **Orphaned validation**: Validation checking for fields that no longer exist
2. **Missing validation**: New required fields without validation
3. **Incorrect error messages**: Error text doesn't match specification
4. **Form submission blocking**: Continue button not working due to removed field validation

## 7. Data Persistence Patterns

Ensure form values persist correctly when users navigate back:

### Persistence Requirements

- **Checkbox persistence**: Use `checked` attribute with data check

  ```nunjucks
  {% if data.leviesSelected and data.leviesSelected.includes('specific-value') %}checked{% endif %}
  ```

- **Radio button persistence**: Use `checked` attribute with equality check

  ```nunjucks
  {% if data.chosenOption === 'specific-value' %}checked{% endif %}
  ```

- **Text input persistence**: Use `value` attribute with data

  ```nunjucks
  value="{{ data.inputField }}"
  ```

- **Select dropdown persistence**: Use `selected` attribute
  ```nunjucks
  {% if data.dropdown === 'value' %}selected{% endif %}
  ```

### Filter Unchecked Values

- GOV.UK Prototype Kit adds `_unchecked` entries for checkboxes
- Always filter these out in display logic:
  ```nunjucks
  {% if levy and not levy.startsWith('_unchecked') %}
  ```

## 8. Route Flow Validation

Verify the complete journey flow is logical and all redirects are correct:

### Flow Validation Steps

1. **Map complete journey**: Create flow diagram from specification
2. **Verify redirects**: Check POST handlers redirect to correct next page
3. **Handle conditional flows**: Ensure branching logic matches specification
4. **Check error re-renders**: Failed validation should re-render same page with errors

### Common Flow Issues

- **Wrong redirect target**: POST handler redirects to incorrect page
  - Example: `/summary-and-declaration` redirecting to `/summary` instead of `/payment-confirmation`
- **Confirmation page confusion**: Multiple confirmation pages serving different journeys
  - Solution: Separate files (e.g., `confirmation.html` vs `payment-confirmation.html`)
- **Missing conditional logic**: Page accessible from multiple sources needs dynamic back link

## 9. Dynamic Content Validation

Ensure dynamic text correctly reflects user selections:

### Dynamic Text Requirements

- **Extract selected values**: Build arrays from user selections

  ```nunjucks
  {%- set impacts = [] -%}
  {%- for levy in data.leviesSelected -%}
    {%- if levy.includes('newts') -%}
      {%- set _ = impacts.push('newts') -%}
    {%- endif -%}
  {%- endfor -%}
  ```

- **Join with proper grammar**: Use "and" separator for lists

  ```nunjucks
  {%- for impact in impacts -%}
    {{- impact -}}
    {%- if not loop.last %} and {% endif -%}
  {%- endfor -%}
  ```

- **Whitespace control**: Be careful with whitespace trimming
  - Use `{%-` to strip whitespace before
  - Use `-%}` to strip whitespace after
  - Don't strip leading whitespace before first word: `{% if data.x %}` not `{%- if data.x %}`

### Common Dynamic Content Issues

1. **Missing spaces**: "fornewts and nutrients" instead of "for newts and nutrients"
2. **Extra spaces**: Multiple spaces between words
3. **Incorrect grammar**: "newts nutrients" instead of "newts and nutrients"
4. **Hard-coded values**: Not extracting from user selections

## 10. Email Content Page Structure

Email preview pages must follow consistent structure:

### Email Page Requirements

- **Inset box header**: Display recipient and subject

  ```nunjucks
  <div class="govuk-inset-text">
    <p><strong>To:</strong> {{ data.recipientEmail or 'user@example.com' }}</p>
    <p><strong>Subject:</strong> Email subject line</p>
  </div>
  ```

- **Reference number display**: Show appropriate reference
  - `{{ data.estimateReference }}` for estimate emails
  - `{{ data.paymentReference }}` for payment/invoice emails

- **Dynamic content**: Include user selections in email body
- **Call to action**: Appropriate links or instructions

## 11. Summary Page Patterns

Check Your Answers pages must follow GOV.UK patterns:

### Summary List Requirements

- **Use summary list component**: `govuk-summary-list`
- **Include Change links**: Allow editing each answer

  ```html
  <dd class="govuk-summary-list__actions">
    <a class="govuk-link" href="/path/to/question">
      Change<span class="govuk-visually-hidden"> descriptive text</span>
    </a>
  </dd>
  ```

- **Filter display values**: Don't show `_unchecked` or empty values
- **Format appropriately**: Remove bullets if not appropriate for display

## 12. Known Issues and Auto-fixes

Based on previous implementations, automatically check and fix these issues:

### Issue 1: JavaScript Back Links

- **Symptom**: Back links using `javascript:history.back()`
- **Detection**: Grep for `javascript:history.back` or `javascript:window.history.back`
- **Fix**: Replace with hardcoded path to previous page in flow

### Issue 2: Inconsistent Path Casing

- **Symptom**: Paths like `/LPAemail`, `/SummaryAndDeclaration`
- **Detection**: Check paths for uppercase letters
- **Fix**: Convert to lowercase with hyphens

### Issue 3: Orphaned Validation

- **Symptom**: POST handler validates fields that don't exist in form
- **Detection**: Compare form fields in view with validation checks in route
- **Fix**: Remove validation for non-existent fields

### Issue 4: Missing Checkbox Persistence

- **Symptom**: Checkbox values not retained when navigating back
- **Detection**: Check for `checked` attributes with data lookups
- **Fix**: Add conditional `checked` attributes based on session data

### Issue 5: Unchecked Values in Display

- **Symptom**: "\_unchecked" appearing in lists
- **Detection**: Look for loops displaying checkbox data without filtering
- **Fix**: Add `not levy.startsWith('_unchecked')` filter

### Issue 6: Wrong Confirmation Page Links

- **Symptom**: Confirmation page linking to wrong email content
- **Detection**: Check if multiple journey types use same confirmation page
- **Fix**: Create separate confirmation pages per journey type

### Issue 7: Missing Spaces in Dynamic Text

- **Symptom**: Words concatenated together in dynamic content
- **Detection**: Review whitespace control in Nunjucks templates
- **Fix**: Ensure proper spacing around variables and control structures

### Issue 8: Incorrect Redirects

- **Symptom**: POST handler redirects to wrong next page
- **Detection**: Map expected flow from specification and compare with redirects
- **Fix**: Update redirect targets to match specification flow

### Issue 9: Generic Route/File Names

- **Symptom**: Routes with generic names like `/confirm`, `/summary`, `/email` that cause confusion
- **Detection**: Check for single-word paths that are common generic terms (confirm, check, summary, email, details, etc.)
- **Fix**: Prepend context to make them specific
  - `/confirm` → `/confirm-levy-selection`
  - `/summary` → `/payment-summary` or `/estimate-summary`
  - `/email` → `/lpa-email` or `/payment-email`
- **Why critical**: `/confirm` easily confused with `/confirmation`, leading to wrong links and redirects
- **Applies to**: Route constants, view file names, and data property names

## 13. Update Specification File In Place

After all validations and fixes:

1. **Update the original spec-file**: Modify `{spec-file}` directly with all fixes applied
   - Use the Edit tool to make changes to the original file
   - This allows the user to see git diff of all changes made
   - Preserve the original structure and formatting where possible

2. **Provide summary of changes**: Output a summary message listing all modifications made

### Summary Output Format

After updating the file, provide this summary:

```markdown
# Specification Fixes Applied

Updated file: {spec-file}

## Automatic Fixes Applied

- Fixed path casing: [list of changed paths]
  - Example: /LPAemail → /lpa-email
- Updated data property names: [list of changes if any]
- Corrected back links: [list of pages]
- Added validation fixes: [description]
- Other fixes: [description]

## Potential Conflicts Detected

- Route conflicts: [list with recommendations]
- Data property conflicts: [list with recommendations]
- View file conflicts: [list with recommendations]

## Manual Review Needed

- [List items that need human decision]

## Next Steps

1. Review the git diff: `git diff {spec-file}`
2. Commit the fixed specification if satisfied
3. Run `/journey-updates journey:{journey} changes:{spec-file}`
```

## 14. Integration with journey-updates Command

This command prepares specifications for seamless processing by `/journey-updates`:

- **Pre-validation**: Run this command before `/journey-updates`
- **Fix application**: Apply all automatic fixes to specification
- **Conflict resolution**: Resolve naming conflicts before implementation
- **Quality assurance**: Ensure specification meets all formatting standards

**Recommended workflow:**

1. Content designer provides specification file
2. Run `/fix-journey-prompt` to validate and fix
3. Review output and resolve flagged issues
4. Run `/journey-updates` with fixed specification
5. Minimal manual tweaks needed after implementation
