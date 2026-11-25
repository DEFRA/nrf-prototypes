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
  # The heading over the filter, and the link that opens it
  filterHeading: Filter developer records
  filterSummary: Show filters
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
  # Under noResults when a search finds nothing, above addRecord
  noResultsHint: If a developer has given you a new NRL reference, create a developer record for it.
  # Instead of noResults when the search is an NRL reference with no
  # developer record; {reference} is the reference searched for
  unrecordedHeading: The reference {reference} does not have a developer record created for it yet.
  unrecordedBody: Create a developer record to retrieve the commitment certificate details the developer submitted with their planning application.
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

# Manage developer records

Use this service to create and manage developer records for the nature restoration levy.

Retrieve the commitment certificate details the developer submitted with their planning application to create a developer record.
