---
name: content-review
description: Validates implemented view content against specification markdown files
parameters:
  - name: view-path
    description: The view directory path to validate (e.g., nrf-estimate-1)
    required: true
    type: string
  - name: spec-file
    description: Path to the specification markdown file (e.g., prompts/implementation/payment-journey-with-ref-v1.md)
    required: true
    type: string
  - name: show-matches
    description: Show pages that match correctly (default shows only discrepancies)
    required: false
    type: boolean
    default: false
---

# Content Review - Validate Implementation Against Specification

## Overview

This slash command validates that implemented views match their specification document by performing a comprehensive comparison of page content, data fields, error messages, conditional logic, and user journey flow.

The command automatically validates the corresponding route file at `app/routes/{view-path}.js` if it exists.

## Usage

```
/content-review <view-path> <spec-file> [--show-matches]
```

## Examples

### Basic usage

```bash
/content-review nrf-estimate-1 prompts/implementation/payment-journey-with-ref-v1.md
```

This will validate:

- Views in `app/views/nrf-estimate-1/`
- Routes in `app/routes/nrf-estimate-1.js` (if it exists)

### Show matching pages too

```bash
/content-review nrf-estimate-1 prompts/implementation/payment-journey-with-ref-v1.md --show-matches
```

### Using parameter names

```bash
/content-review view-path:nrf-estimate-1 spec-file:prompts/implementation/payment-journey-with-ref-v1.md show-matches:true
```

## What It Does

1. **Reads the specification file** to extract expected page definitions, content, data points, and validation rules
2. **Scans the view directory** (`app/views/{view-path}/`) to find all implemented HTML view files
3. **Locates the route file** (`app/routes/{view-path}.js`) if it exists
4. **Compares each page** against its specification
5. **Validates route logic** (GET/POST routes, validation, session handling, conditional routing)
6. **Generates a detailed report** showing matches, discrepancies, missing elements, and recommendations

## Validation Checklist

The command validates the following aspects:

### Page Structure

- ✅ All specified pages exist
- ✅ Page order matches journey flow
- ✅ Correct file paths and naming
- ✅ No unexpected/extra pages

### Content Validation

- ✅ Page titles match specification
- ✅ Headings hierarchy is correct
- ✅ Required content sections present
- ✅ Hint text matches
- ✅ Button/link labels correct
- ✅ GOV.UK component usage

### Data Points & Forms

- ✅ Form fields match data point specifications
- ✅ Input types correct (text, email, radio, checkbox, etc.)
- ✅ Required fields marked appropriately
- ✅ Field names match session data structure
- ✅ Validation attributes present

### Error Handling

- ✅ Error summary components present
- ✅ Error messages match specification
- ✅ Field-level error messages correct
- ✅ All error scenarios covered

### Conditional Logic

- ✅ Conditional content display rules
- ✅ Dynamic field visibility
- ✅ Branching page flows
- ✅ Conditional navigation

### Route Implementation

- ✅ GET routes for all pages
- ✅ POST routes for form submissions
- ✅ Conditional routing logic
- ✅ Data validation in routes
- ✅ Session data handling
- ✅ Back link functionality

**Note**: Routes are automatically validated from `app/routes/{view-path}.js` if the file exists.

## Review Structure

Organize findings using the following structure:

### 1. Executive Summary

- **View Path**: `{view-path}`
- **Specification**: `{spec-file}`
- **Status**: ✅ Fully Synced / ⚠️ Minor Issues / ❌ Major Discrepancies
- **Pages Analyzed**: X of Y pages
- **Compliance Score**: X% (based on passed checks)

### 2. Journey Flow Analysis

Compare implemented journey against specification:

| Order | Spec Page   | Path     | Implemented     | Status       |
| ----- | ----------- | -------- | --------------- | ------------ |
| 1     | Start Page  | /start   | ✅ start.html   | ✅ Match     |
| 2     | Email Entry | /email   | ❌ Missing      | ❌ Not Found |
| 3     | Summary     | /summary | ⚠️ summary.html | ⚠️ Partial   |

### 3. Page-by-Page Analysis

For each page in the specification:

#### Page Name (Order X)

**Status**: ✅ Perfect Match / ⚠️ Partial Match / ❌ Missing or Incorrect

**Location**:

- **Spec Path**: `/path/from/spec`
- **Implemented**: `app/views/{view-path}/filename.html`

**Title Check**:

- **Expected**: "Title from spec"
- **Found**: "Title from implementation"
- **Status**: ✅ Match / ❌ Mismatch

**Content Validation**:

```
✅ Main heading correct
✅ Body paragraphs present
⚠️ Hint text differs slightly
❌ Missing button label
✅ GOV.UK components used correctly
```

**Data Points**:

```
✅ applicant.email (type: email, required: true)
⚠️ applicant.phone (type: tel, required: false) - marked as required in implementation
❌ applicant.reference - Missing from form
```

**Error Messages**:

```
✅ "Enter your email address" - matches spec
❌ "Email address is required" - spec says "Enter your email address to continue"
⚠️ Missing error for invalid email format
```

**Conditional Logic**:

```
✅ Shows field X when option Y is selected
❌ Missing conditional display for field Z
```

**Issues Found**:

1. **Critical**: Missing required field `applicant.reference`
2. **High**: Error message doesn't match specification
3. **Medium**: Hint text wording differs from spec
4. **Low**: Extra whitespace in template

**Recommendations**:

- Add missing `applicant.reference` field to form
- Update error message to match specification exactly
- Align hint text with spec wording

---

### 4. Missing Pages

List pages defined in specification but not found in implementation:

```
❌ /nrf-estimate-1/retrieve-estimate-email
   - Spec Order: 5
   - Expected Data Points: applicant.email
   - Impact: High - breaks user journey flow

❌ /nrf-estimate-1/estimate-email-retrieval-content
   - Spec Order: 6
   - Expected Content: Email template with magic link
   - Impact: High - email confirmation page missing
```

### 5. Extra Pages

List pages found in implementation but not in specification:

```
⚠️ app/views/nrf-estimate-1/debug.html
   - Path: /nrf-estimate-1/debug
   - Purpose: Unknown - not in specification
   - Recommendation: Remove if not needed or add to spec

⚠️ app/views/nrf-estimate-1/test-page.html
   - Path: /nrf-estimate-1/test-page
   - Purpose: Appears to be testing artifact
   - Recommendation: Remove from production views
```

### 6. Route Validation

**Route File**: `app/routes/{view-path}.js`

**Status**: ✅ Found / ❌ Not Found

#### Route Coverage

```
✅ GET /nrf-estimate-1/start - Implemented correctly
✅ POST /nrf-estimate-1/start - Form handling present
❌ GET /nrf-estimate-1/email - Missing route
❌ POST /nrf-estimate-1/email - Missing route
⚠️ POST /nrf-estimate-1/summary - No validation logic found
```

**Note**: If route file is not found at `app/routes/{view-path}.js`, this section will note the absence and recommend creating it.

#### Conditional Routing Logic

```
✅ Routing based on journeyType (Yes/No)
⚠️ Conditional routing to /no-edp page - logic unclear
❌ Missing routing logic for estimate reference flow
```

#### Session Data Handling

```
✅ req.session.data used correctly
✅ Form data persisted to session
⚠️ Some fields not stored in session
❌ Session data not cleared on completion
```

#### Validation Logic

```
✅ Email format validation present
❌ Missing validation for planning reference
⚠️ Error handling incomplete for required fields
```

### 7. Data Model Consistency

Compare data structures across specification and implementation:

#### Specified Data Structure

```javascript
{
  applicant: {
    email: { type: 'email', required: true },
    planningRef: { type: 'text', required: true }
  },
  application: {
    journeyType: { type: 'radio', values: ['Yes', 'No'], required: true }
  }
}
```

#### Implemented Data Structure

```javascript
// Found in forms across view files
{
  applicant: {
    email: ✅ Matches
    planningRef: ❌ Using 'planning-reference' instead
  },
  application: {
    journeyType: ✅ Matches
    estimateRef: ⚠️ Not in specification
  }
}
```

**Issues**:

- Field name mismatch: `planningRef` vs `planning-reference`
- Extra field not in spec: `estimateRef`

### 8. Content Quality Assessment

#### GOV.UK Design System Compliance

```
✅ Using {% extends "layouts/main.html" %}
✅ Form components use GOV.UK Frontend macros
✅ Error summary component implemented
⚠️ Some buttons not using govukButton macro
❌ Missing back link on 2 pages
```

#### Accessibility

```
✅ Form labels properly associated
✅ Error messages linked to fields
⚠️ Some hint text missing for attributes
❌ Missing aria-describedby on error fields
```

#### Content Guidelines

```
✅ Headings follow GOV.UK content style
✅ Button text uses sentence case
⚠️ Some hint text too verbose
❌ Error messages don't follow GOV.UK patterns
```

### 9. Overall Compliance Metrics

#### Summary Statistics

- **Total Pages in Spec**: 10
- **Pages Implemented**: 8
- **Pages Matching**: 5 (62.5%)
- **Pages with Issues**: 3 (37.5%)
- **Missing Pages**: 2
- **Extra Pages**: 1

#### Compliance by Category

| Category          | Total Checks | Passed  | Failed | Score     |
| ----------------- | ------------ | ------- | ------ | --------- |
| Page Structure    | 40           | 35      | 5      | 87.5%     |
| Content           | 50           | 38      | 12     | 76.0%     |
| Data Points       | 25           | 22      | 3      | 88.0%     |
| Error Messages    | 15           | 10      | 5      | 66.7%     |
| Conditional Logic | 8            | 6       | 2      | 75.0%     |
| Routes            | 20           | 15      | 5      | 75.0%     |
| **Overall**       | **158**      | **126** | **32** | **79.7%** |

### 10. Issues Summary

#### Critical Issues (Blockers)

```
❌ Missing 2 required pages from user journey
   - Impact: Journey cannot be completed
   - Files: /retrieve-estimate-email, /estimate-email-retrieval-content
   - Action: Implement missing pages

❌ Incorrect field names break data persistence
   - Impact: Data not saved correctly to session
   - Fields: planningRef vs planning-reference
   - Action: Align field names with specification
```

#### High Priority (Should Fix)

```
⚠️ Error messages don't match specification
   - Impact: User confusion, inconsistent messaging
   - Pages: 3 pages affected
   - Action: Update error text to match spec exactly

⚠️ Missing validation logic in routes
   - Impact: Invalid data can be submitted
   - Routes: POST /summary, POST /planning-ref
   - Action: Add validation middleware
```

#### Medium Priority (Recommended)

```
⚠️ Hint text wording differs from spec
   - Impact: Minor UX inconsistency
   - Pages: 2 pages affected
   - Action: Align hint text with specification

⚠️ Extra page not in specification
   - Impact: Confusion about intended journey
   - File: debug.html
   - Action: Remove or document purpose
```

#### Low Priority (Nice to Have)

```
⚠️ Some buttons not using GOV.UK macros
   - Impact: Potential styling inconsistency
   - Pages: 2 pages
   - Action: Refactor to use govukButton macro

⚠️ Inconsistent whitespace in templates
   - Impact: Code readability
   - Action: Format templates consistently
```

### 11. Recommendations

#### Immediate Actions

1. **Implement missing pages** to complete the user journey
2. **Fix field name mismatches** to ensure data persistence works
3. **Add missing validation** to route handlers
4. **Update error messages** to match specification exactly

#### Code Quality Improvements

1. Use GOV.UK Frontend macros consistently
2. Add back links to all pages
3. Improve accessibility attributes
4. Format templates consistently

#### Documentation

1. Update specification if intentional changes were made
2. Document any deviations from spec with rationale
3. Add comments for complex conditional logic

### 12. Next Steps

**Status Verdict**: ⚠️ **Implementation needs work before release**

**Required Actions**:

1. Implement 2 missing pages
2. Fix 3 critical field name mismatches
3. Add validation to 2 route handlers
4. Update 5 error messages

**Estimated Effort**: 3-4 hours

**Ready for Testing**: ❌ Not yet - complete critical issues first

**Follow-up Review**: Run `/content-review` again after fixes applied

## Technical Implementation Guide

### How to Parse the Specification

1. **Extract page definitions**: Look for page tables with Order, Path, Title
2. **Parse data points**: Extract JSON/code blocks defining form fields
3. **Capture content**: Extract markdown content sections for each page
4. **Identify error definitions**: Find error tables with messages
5. **Map conditional logic**: Note "Conditional page flow" specifications

### How to Analyze View Files

1. **Read each HTML file** in the view directory
2. **Extract page title**: Look for `<h1>` or `{{ title }}` variable
3. **Parse form fields**: Find all `input`, `textarea`, `select` elements
4. **Check field names**: Extract `name` attributes from form elements
5. **Validate components**: Verify GOV.UK macro usage
6. **Find error messages**: Look for `errorMessage` in macros
7. **Check conditional content**: Look for `{% if %}` blocks

### How to Validate Routes

1. **Check for route file**: Look for `app/routes/{view-path}.js`
2. **If found**:
   - Parse all GET and POST route definitions
   - Match routes to pages in specification
   - Check validation middleware or logic
   - Verify `req.session.data` usage
   - Analyze conditional routing and redirect logic
3. **If not found**: Report missing route file and recommend creation

### Comparison Algorithm

For each page in specification:

```
1. Find corresponding view file (by path/name matching)
2. If not found → Add to "Missing Pages"
3. If found:
   a. Compare page title
   b. Validate form fields against data points
   c. Check error messages
   d. Verify conditional logic
   e. Check content completeness
   f. Validate GOV.UK components
4. Calculate compliance score for page
5. Document all discrepancies
```

For each view file in implementation:

```
1. Check if page exists in specification
2. If not → Add to "Extra Pages"
```

## Key Principles

- **Be thorough**: Check every aspect of implementation vs spec
- **Be precise**: Reference specific files, line numbers, and code
- **Be constructive**: Suggest fixes, not just problems
- **Be evidence-based**: Quote from spec and implementation
- **Be prioritized**: Distinguish critical from minor issues
- **Be actionable**: Provide clear next steps

## Common Discrepancy Types

### Content Discrepancies

- Page title wording differs
- Missing hint text
- Incorrect button labels
- Missing or extra paragraphs
- Heading hierarchy wrong

### Data Field Discrepancies

- Field name doesn't match spec
- Wrong input type (text vs email)
- Missing required attribute
- Extra fields not in spec
- Missing fields from spec

### Error Message Discrepancies

- Wording doesn't match exactly
- Missing error scenarios
- Wrong error message shown
- Error summary missing

### Structural Discrepancies

- Missing pages from journey
- Extra pages not in spec
- Wrong page order
- Incorrect paths

### Route Discrepancies

- Missing route definitions
- No validation logic
- Incorrect conditional routing
- Session data not handled

## Output Format

- Use **Markdown** with clear headers and sections
- Use **emoji indicators**: ✅ ❌ ⚠️
- Use **code references**: File paths and line numbers
- Use **comparison tables** for side-by-side analysis
- Use **checklists** for tracking validation items
- Use **metrics tables** for compliance scoring
- Be **detailed but scannable** (use bullets, short paragraphs)

## Exit Criteria for Full Sync

A view implementation is considered "fully synced" when:

- ✅ **100% page coverage**: All spec pages implemented
- ✅ **0 extra pages**: No unexpected pages (or documented)
- ✅ **Content matches**: Titles, headings, body text align
- ✅ **Data fields match**: All form fields match spec exactly
- ✅ **Error messages match**: All error text matches spec
- ✅ **Routes complete**: All GET/POST routes implemented
- ✅ **Validation present**: Form validation in routes
- ✅ **Conditional logic**: All conditional flows implemented
- ✅ **GOV.UK compliant**: Proper component usage
- ✅ **Compliance score**: ≥95% overall

## Tips for Users

### Before Running

1. Ensure specification file is up to date
2. Run prototype locally to verify pages work
3. Have both spec and implementation files ready

### Interpreting Results

- **Green (✅)**: Fully compliant, no action needed
- **Amber (⚠️)**: Minor issues, should fix before production
- **Red (❌)**: Critical issues, must fix before testing

### After Review

1. Prioritize critical and high issues first
2. Create tickets/tasks for each issue category
3. Re-run command after fixes to verify
4. Update specification if intentional changes made

### Keeping Synchronized

- Run this command after each specification update
- Run before user testing sessions
- Run as part of prototype review process
- Document any intentional deviations

## Deliverable

Produce a **comprehensive, actionable content sync report** that:

1. Clearly identifies all discrepancies between spec and implementation
2. Prioritizes issues by severity and impact
3. Provides specific, actionable recommendations
4. Includes metrics and compliance scoring
5. Gives clear verdict on readiness for testing
6. Serves as a quality gate for prototype development

Remember: The goal is to ensure high-quality prototype implementation that accurately reflects the specification, providing confidence for user research and stakeholder demonstrations.
