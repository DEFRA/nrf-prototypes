---
name: phase-review
description: Comprehensive phase implementation review against legacy script and refactoring plan
---

You are conducting a comprehensive phase implementation review for the NRF Impact Assessment Worker refactoring project.

## Context

This project is refactoring a legacy Python script (`legacy/FullDFMScript250925.py`) into a production-ready AWS ECS worker application. The refactoring follows a multi-phase plan with incremental validation using the Strangler Fig pattern.

## Your Task

Perform a thorough review of the specified phase implementation by:

1. **Comparing against legacy script**: Map each refactored component back to the original implementation
2. **Validating completeness**: Ensure no functionality has been missed or incorrectly implemented
3. **Checking test coverage**: Verify unit and regression tests adequately cover the phase
4. **Identifying gaps**: Highlight any missing functionality or technical debt
5. **Providing recommendations**: Suggest improvements or flag critical issues

## Review Structure

Organize your review using the following structure:

### 1. Phase Overview
- **Phase Number and Name**: (e.g., Phase 3 - Business Logic Extraction)
- **Status**: Complete ✅ / In Progress 🚧 / Not Started ⏳
- **Scope**: Brief description of what this phase should deliver

### 2. Implementation Analysis

For each major component in the phase:

#### Component Name
- **Status**: ✅ Complete / 🚧 Partial / ❌ Missing
- **Location**: File path and relevant line numbers
- **Maps to Legacy**: Reference to legacy script lines
- **Implemented Features**:
  - Feature 1 (legacy lines X-Y)
  - Feature 2 (legacy lines A-B)
- **Coverage**: Description of what's covered
- **Improvements over legacy**: What's better in refactored version

### 3. Missing Functionality Check

Create a checklist comparing all relevant legacy script sections:

```
✅ Functionality correctly implemented
🚧 Partially implemented / needs work
❌ Missing from this phase
⏳ Intentionally deferred to future phases
```

### 4. Test Coverage Analysis

#### Unit Tests
- **Count**: X tests passing
- **Coverage Areas**: List what's tested
- **Gaps**: Any untested functionality

#### Regression Tests
- **Count**: X tests
- **Validation Strategy**: How equivalence is verified
- **Results**: Pass/fail status

### 5. Code Quality Assessment

Evaluate:
- **Type Safety**: Use of type hints, Pydantic models, etc.
- **Separation of Concerns**: Clear module boundaries
- **DRY Principle**: Elimination of duplication
- **Documentation**: Docstrings, comments, README updates
- **Error Handling**: Validation and error messages

### 6. Integration Points

Check how this phase integrates:
- **Hybrid Runner**: Are injection points implemented?
- **Feature Flags**: Can components be toggled?
- **Backwards Compatibility**: Does it produce identical results?

### 7. Validation Summary

For each phase criterion:
- ✅ **Pass**: Meets requirements with evidence
- ⚠️ **Warning**: Minor issues or improvements needed
- ❌ **Fail**: Critical issues that block progress

### 8. Issues and Recommendations

#### Critical Issues (Blockers)
- Issue description
- Impact
- Recommended fix

#### Warnings (Should Fix)
- Issue description
- Impact
- Recommended fix

#### Suggestions (Nice to Have)
- Suggestion description
- Benefit
- Estimated effort

### 9. Next Steps

- **Current Phase Status**: Summary verdict (Ready to merge / Needs work)
- **Recommended Actions**: Specific next steps
- **Next Phase Preview**: What to focus on in the following phase

## Instructions

When a user invokes this command with a phase identifier:

1. **Read the README.md**: Understand the phase plan and current status
2. **Read the legacy script**: `legacy/FullDFMScript250925.py`
3. **Examine implementation files**: Read all relevant files for the phase
4. **Check tests**: Review unit and regression tests
5. **Cross-reference**: Map every legacy script line to refactored code or future phases
6. **Generate comprehensive review**: Use the structure above
7. **Provide clear verdict**: Is the phase complete and accurate?

## Key Principles

- **Be thorough**: Check every aspect of the implementation
- **Be precise**: Reference specific files, line numbers, and code sections
- **Be constructive**: Suggest improvements, don't just criticize
- **Be evidence-based**: Support claims with code references
- **Be comprehensive**: Cover functionality, tests, docs, and quality

## Example Usage

```
User: /phase-review phase-3
```

Your response should:
1. Identify Phase 3 from the README
2. Review all business logic calculators
3. Map to legacy script lines 185-452
4. Check test coverage
5. Validate hybrid runner integration
6. Provide detailed review following the structure above

## Output Format

- Use **Markdown** with clear headers and sections
- Use **emoji indicators**: ✅ ❌ 🚧 ⏳ ⚠️
- Use **code references**: File paths and line numbers
- Use **comparison tables** where helpful
- Use **checklists** for tracking coverage
- Be **detailed but scannable** (use bullets, short paragraphs)

## Special Considerations

### Legacy Script Mapping
Always identify which lines from `legacy/FullDFMScript250925.py` are covered:
- Lines 1-73: Configuration and constants → Phase 1
- Lines 75-111: Data loading → Phase 2
- Lines 117-452: Business logic → Phase 3
- Lines 420-455: Output formatting → Phase 5

### Regression Testing
Verify that:
- Hybrid runner has injection points for new components
- Feature flags can enable/disable components
- Regression tests validate numerical equivalence
- Tests use appropriate tolerances

### Code Quality Standards
Check against project rules:
- Type hints on all functions
- Pydantic models for validation
- Clear separation of concerns
- No hardcoded values (use config)
- Comprehensive docstrings
- Error handling with clear messages

## Deliverable

Produce a **comprehensive, actionable review** that:
1. Clearly states whether the phase is complete and accurate
2. Identifies all gaps or issues with specific recommendations
3. Provides confidence to proceed (or clear blockers if not ready)
4. Serves as documentation of the refactoring progress

Remember: The goal is to ensure high-quality, equivalent refactoring while building confidence through continuous validation.
