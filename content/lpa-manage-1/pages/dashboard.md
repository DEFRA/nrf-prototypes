---
# The landing page (app/views/lpa-manage-1/dashboard.html): a search, then
# counts of the council's commitments as cards, and a link to every one.
# Searching, a card and "View all" open the records page (pages/records.md),
# a card filtered to the commitments it counts. The cards above the table
# are the `table` copy variant (dashboard~table.md).
type: custom
text:
  # The banner after Confirm on a record page; {reference} is its NRL reference
  successTitle: Success
  updated: '{reference} has been updated'
  # The link under it, opening that commitment
  viewRecord: View commitment
  searchLabel: Search commitments
  searchButton: Search
  # The count cards, in this order: the number, then a link, then a
  # caption under it. For review: sent to the council with no planning
  # application reference yet. In review: added, waiting to be reviewed.
  # Active: reviewed, with the planning application applied for.
  forReviewCount: Commitments for review
  forReviewCaption: Add a planning application reference and compare the commitment certificate with the planning application.
  inReviewCount: Commitments in review
  inReviewCaption: Compare the commitment certificate with the planning application.
  reviewedActiveCount: Active commitments
  reviewedActiveCaption: Update these commitments with the progress of the planning application.
  overdueCount: Commitments with an overdue action
  overdueCaption: View and update this commitment.
  rejectedCount: Rejected commitments
  rejectedCaption: Caption text here
  # Under the cards, opening the records page
  viewAll: View all commitments
---

# Manage commitments for the nature restoration levy
