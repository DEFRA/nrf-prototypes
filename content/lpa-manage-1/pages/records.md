---
# Every record the council has (app/views/lpa-manage-1/records.html): the
# dashboard's table on a page of its own, searched, filtered, sorted by its
# column headings and paged. Opened from the dashboard's "Search and cards"
# variant (pages/dashboard~cards.md).
type: custom
text:
  searchLabel: Search commitments
  searchButton: Search
  # The button that opens the filter, and the heading and close button
  # inside it
  filterHeading: Filter commitments
  filterSummary: Filters
  filterClose: Close
  filterStatus: Status
  filterStage: Planning application stage
  filterType: Planning type
  filterOverdue: Overdue actions only
  applyFilters: Apply filters
  clearFilters: Clear filters
  # {from}, {to} and {total} are filled in with the numbers
  showing: 'Showing {from} to {to} of {total} commitments'
  # In the table beside a commitment sent to the council that it has not
  # added yet, across the developer, stage, type and officer
  # columns (its NRL reference links to adding the planning reference)
  addPlanningReference: Add planning application reference
  # When a search or the filters find nothing
  noResults: No results found
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

# Commitments
