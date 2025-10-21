---
name: code-review
description: Conduct a comprehensive code review focusing on code quality, security, performance, and maintainability
---

# Code Review Command

## Description

Conduct a comprehensive code review focusing on code quality, security, performance, and maintainability.

## Usage

Type `/code-review` in the chat to trigger a thorough code review of the current file or selected code.

## Review Areas

1. **Simplicity & Readability** - Review functions/classes for unnecessary complexity, simplify conditional logic, reduce nesting
2. **Package Dependencies & Versions** - Verify latest stable versions, check for deprecated packages/security vulnerabilities
3. **Code Conciseness** - Remove verbose implementations, look for over-engineering, use idiomatic patterns
4. **Debugging Artifacts** - Remove print() statements, clean up commented code, remove TODOs
5. **Conditional Logic Patterns** - Use early returns, guard clauses, dictionary lookups, modern language features
6. **Code Quality & Standards** - Run linting, check formatting, verify type hints, remove unused imports
7. **Language-Specific Naming Conventions** - Review variable/function/class names for clarity and consistency
8. **Performance & Scalability** - Check for inefficient queries/loops, verify caching, review memory usage
9. **Security** - Verify input validation, check auth patterns, review error messages, ensure secure data handling
10. **Testing Coverage & Quality** - Ensure comprehensive test coverage, verify edge cases, check test isolation
11. **Architecture & Design** - Review SOLID principles, separation of concerns, dependency injection
12. **Error Handling & Resilience** - Ensure comprehensive error handling, graceful degradation, proper logging
13. **Documentation & Comments** - Verify API documentation, check complex logic comments, ensure type hints
14. **Maintainability** - Check for code duplication, ensure consistent patterns, verify organization
15. **Python-Specific** - Follow PEP 8, use type hints, leverage modern Python features

## Output Format

For each issue found, provide:

- Priority level (Critical/High/Medium/Low)
- Category (Performance/Security/Readability/etc.)
- Specific file and line numbers
- Before/after code examples
- Rationale and impact assessment

## Focus Areas by Priority

- **Critical**: Security vulnerabilities, data corruption risks, critical performance issues
- **High**: Major architectural problems, significant performance bottlenecks, missing error handling
- **Medium**: Code quality issues, maintainability concerns, test coverage gaps
- **Low**: Style inconsistencies, minor optimizations, documentation improvements
