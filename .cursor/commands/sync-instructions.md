---
name: sync-instructions
description: Compare implementation against markdown instructions and update instructions to match reality
tags: [documentation, sync, review]
parameters:
  - name: view-path
    description: Path to the implemented view directory (e.g., 'app/views/nrf-estimate-1/')
    required: true
    type: string
  - name: spec-file
    description: Path to the specification markdown file to sync (e.g., 'prompts/implementation/quote-journey-v3.md')
    required: true
    type: string
---

# Sync Instructions with Implementation

## Description

This command compares the implemented content under a specified view path against the content described in markdown instructions, then updates the instructions to reflect what has actually been implemented.

## Usage

Type `/sync-instructions` in the chat to sync a specification file with its implementation.

### Parameters

- `view-path` (required): Path to the implemented view directory
- `spec-file` (required): Path to the specification markdown file to sync

### Examples

- `/sync-instructions view-path:app/views/nrf-estimate-1/ spec-file:prompts/implementation/quote-journey-v3.md`
- `/sync-instructions view-path:app/views/lpa-verify/ spec-file:prompts/implementation/lpa-journey-v2.md`

# Instructions

Take the instructions and parameters provided, then:

## 1. Discovery Phase

**Read the markdown instructions file:**

- Extract all file paths mentioned
- Extract all content blocks (HTML, JavaScript, etc.)
- Note the structure and organization
- Identify which files are documented

**Scan the view path directory:**

- List all files that exist in the implementation
- Read the actual content of each file
- Compare against what's documented in the instructions

## 2. Comparison Phase

For each file mentioned in the instructions:

**If file exists in implementation:**

- Compare the documented content with actual implementation
- Identify differences in:
  - HTML structure and elements
  - Form fields and their attributes
  - Button text and actions
  - Links and navigation
  - Data attributes
  - CSS classes
  - JavaScript functionality
  - Content text (headings, labels, help text, etc.)

**Content Update Rules:**

**UPDATE in instructions when:**

- Field labels differ
- Button text differs
- Heading text differs
- Help text differs
- Hint text differs
- Raw HTML has been used in the instructions instead of markdown or pseudo tags where markdown doesn't support the formatting such as with inset text
- Form field names or IDs differ
- Link destinations differ
- File names differ
- Routes or paths differ
- Data attributes differ
- CSS classes used differ (if they affect understanding)

**DO NOT UPDATE in instructions when:**

- Error messages differ (list in summary instead)
- Validation conditions differ (list in summary instead)
- Conditional logic differs (list in summary instead)
- It's unclear which version is "correct" (list in summary instead)
- The difference is trivial whitespace or formatting
- Comments differ
- The change would reduce clarity of instructions

**If file doesn't exist:**

- Note as "File not implemented" in summary

## 3. Discovery of New Files

**For files in implementation but NOT in instructions:**

- Read the file content
- Determine its purpose
- Add to summary as "Missing from instructions"
- Do NOT automatically add to instructions (user decides)

**For files in instructions but NOT in implementation:**

- Note as "Not yet implemented" in summary

## 4. Update Phase

**Update the markdown instructions file:**

For each difference that should be updated:

1. Locate the relevant section in the markdown
2. Update the code block or description to match implementation
3. Preserve the structure and format of the instructions
4. Maintain any explanatory text around the code blocks
5. Keep section headings and organization intact

**Use `search_replace` tool carefully:**

- Include enough context to make replacements unique
- Update one section at a time
- Verify each update is in the correct location

## 5. Summary Phase

After all updates, provide a comprehensive summary:

```markdown
## Sync Summary

### Files Updated in Instructions

- `file1.html`: Updated button text, form field labels
- `file2.html`: Updated heading structure, help text

### Unclear Differences (Review Needed)

- `file1.html`: Error message for field X differs
  - Instructions: "Enter a valid email"
  - Implementation: "Please provide a valid email address"
- `file2.html`: Conditional validation logic differs

### Files Missing from Instructions (Exist in Implementation)

- `new-file1.html`: Appears to be a confirmation page
- `new-file2.html`: Appears to be an error handling page

### Files Not Yet Implemented (In Instructions Only)

- `planned-file1.html`: Payment processing page
- `planned-file2.html`: Receipt page

### Statistics

- Total files in instructions: X
- Total files in implementation: Y
- Files updated: Z
- Files with unclear differences: N
```

## Important Guidelines

1. **Preserve Intent**: Don't change the instructional nature of the markdown. Update facts, not explanations.

2. **Be Conservative**: When in doubt about whether a difference matters, list it in the summary rather than changing it.

3. **Maintain Structure**: Keep the same section organization, heading levels, and flow.

4. **Code Blocks**: When updating code blocks, replace the entire block to maintain formatting.

5. **Context**: Include explanatory context about WHY something is implemented a certain way if it differs significantly from instructions.

6. **Version Info**: If the markdown has version info or dates, consider updating those.

7. **Multiple Code Blocks**: If a file appears in multiple places in the instructions (e.g., showing evolution), update ALL instances appropriately.

8. **Favour markdown syntax over HTML**: If the instructions include HTML it should be pseudo HTML and used only for the specific cases to denote a confirmation panel `<green-banner>` or inset text `<inset-text>` and URLs can use the syntax `[label](URL)`

9. **Use markdown tables to represent summary lists**: Style the summary list as a markdown table whenever the page is intended to use the summary list pattern, e.g., a check your answers page

## Example Interaction

**User:**

```
Compare app/views/nrf-estimate-1/ against prompts/implementation/quote-journey-v3.md and sync the instructions
```

**Assistant Actions:**

1. Read `prompts/implementation/quote-journey-v3.md`
2. List all files in `app/views/nrf-estimate-1/`
3. Compare each file
4. Update code blocks in the markdown where content differs
5. Provide comprehensive summary

## Error Handling

- If view path doesn't exist, report error and stop
- If markdown file doesn't exist, report error and stop
- If a file is mentioned in instructions but path is ambiguous, ask for clarification
- If updates would conflict (same section updated multiple times), report in summary

## Output Format

After completing the sync:

```markdown
✅ Instructions updated successfully

## Changes Made

[List of specific updates]

## Review Required

[List of unclear differences]

## Discovery

[New and missing files]

## Next Steps

[Suggested actions if any]
```

## Technical Notes

- Use `list_dir` to discover files
- Use `read_file` to read both instructions and implementation
- Use `search_replace` for targeted updates to instructions
- Be careful with regex patterns in code blocks (escape properly)
- Handle multi-line code blocks correctly
- Preserve markdown formatting (backticks, indentation, etc.)

## Success Criteria

- Instructions accurately reflect what is implemented
- No breaking changes to instruction structure
- Clear summary of what was changed and why
- Clear list of items needing human review
- All file discoveries documented
