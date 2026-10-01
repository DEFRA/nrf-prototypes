---
type: custom
# Strings the file-preview template assembles itself. {count}, {label},
# {ha} and {percent} are filled in from the boundary check.
text:
  errorHeading: Your red line boundary file contains an error
  withinEdpOne: 'Your red line boundary is within 1 Environmental Delivery Plan (EDP):'
  withinEdpMany: 'Your red line boundary is within {count} Environmental Delivery Plans (EDP):'
  edpOverlap: '{label} overlap: {ha} ha ({percent}% of boundary)'
  uploadAgain: Upload a new file or draw on a map
# What the check can find wrong with the file, in production's words
errors:
  selfIntersecting: The red line boundary is overlapping itself.
  hasHoles: The red line boundary contains a hole. Upload a boundary with no holes.
  duplicateVertices: The red line boundary contains the same point more than once. Remove the duplicate point.
  unclosedRing: The red line boundary is not closed. Make sure the boundary joins back to its starting point.
  unsupportedGeometry: The file must contain an area, not a point or a line.
  noPolygon: The red line boundary is missing.
  invalidGeometry: The file contains a red line boundary with no shape.
button: Save and continue
---

# Your uploaded red line boundary file
