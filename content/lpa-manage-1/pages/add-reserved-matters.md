---
# Reserved matters for a granted outline application, on a page of their
# own (app/views/lpa-manage-1/add-reserved-matters.html): the record's Add
# a reserved matters application button opens
# add-reserved-matters?ref=NRL-100958. Breadcrumbs lead back to the
# dashboard and the developer record; Save adds the reserved matters to the
# record and returns to it, which says so. Its stage radios are the
# planning stages in records.yaml, and its checkboxes the reserved matters
# there.
type: custom
caption: '{{ record.reference }}'
errors:
  reservedMattersReferenceRequired: Enter the planning application reference
  reservedMattersReferenceAdded: This reference has already been added to this developer record
  reservedMattersStatusRequired: Select the planning application stage
  # PLACEHOLDER COPY: no matter ticked
  reservedMattersMattersRequired: Select the reserved matters this application is for
  reservedMattersDescriptionTooLong: Description must be 200 characters or fewer
text:
  breadcrumbDashboard: Developer records
  reservedMattersReferenceLabel: Planning application reference
  reservedMattersStatusLegend: Planning application stage
  reservedMattersMattersLegend: Reserved matters
  reservedMattersDescriptionLabel: Description (optional)
  reservedMattersSave: Save
  reservedMattersCancel: Cancel
---

# Add a reserved matters application
