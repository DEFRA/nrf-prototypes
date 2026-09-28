---
# The landing page (app/views/lpa-manage-1/dashboard.html): counts of the
# council's records, each opening the table filtered to them, and every
# record, searched, filtered, sorted by its column headings and paged.
type: custom
text:
  addRecord: Create a developer record
  # The banner after Confirm on a record page; {reference} is its NRL reference
  successTitle: Success
  updated: '{reference} has been updated'
  searchLabel: Search developer records
  searchButton: Search
  filterSummary: Filter developer records
  filterStatus: Status
  filterStage: Planning application stage
  filterType: Planning type
  filterOverdue: Overdue actions only
  applyFilters: Apply filters
  clearFilters: Clear filters
  # The count cards, each under its number
  forReviewCount: Developer records for review
  rejectedCount: Rejected developer records
  reviewedActiveCount: Developer records with active planning applications
  overdueCount: Overdue actions
  # {from}, {to} and {total} are filled in with the numbers
  showing: 'Showing {from} to {to} of {total} developer records'
  noResults: No developer records match your search.
  clearSearch: Clear search
  columns:
    reference: NRL reference
    developer: Developer
    stage: Planning application stage
    planningType: Planning type
    officer: Officer
    lastModified: Last modified
    expires: Expires
    status: Status
---

# Manage the developer records for nature restoration levy
