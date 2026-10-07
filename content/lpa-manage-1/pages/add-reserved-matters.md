---
# Reserved matters for a granted outline application, on a page of their
# own (app/views/lpa-manage-1/add-reserved-matters.html): choosing Add
# reserved matters on the record and Confirm opens
# add-reserved-matters?ref=NRL-100958. Breadcrumbs lead back to the
# dashboard and the developer record; Save adds the reserved matters to the
# record and returns to it, which says so. Its status radios are the
# planning stages in records.yaml.
type: custom
caption: '{{ record.reference }}'
errors:
  reservedMattersReferenceRequired: Enter the reserved matters reference number
  reservedMattersReferenceAdded: This reference has already been added to this developer record
  reservedMattersStatusRequired: Select the status of the reserved matters application
  reservedMattersDescriptionRequired: Enter a short description of the reserved matters
  reservedMattersDescriptionTooLong: Description must be 200 characters or fewer
text:
  breadcrumbDashboard: Developer records
  reservedMattersReferenceLabel: Reference number
  reservedMattersStatusLegend: Status
  reservedMattersDescriptionLabel: Short description
  reservedMattersSave: Save reserved matters
  reservedMattersCancel: Cancel
---

# Add reserved matters
