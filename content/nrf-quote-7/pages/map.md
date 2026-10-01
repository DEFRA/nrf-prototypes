---
type: custom
errors:
  required: Draw a red line boundary to continue
  invalid: Invalid boundary data. Please draw a valid boundary.
  tooComplex: Boundary is too complex. Maximum 10000 points allowed.
button: Save and continue
text:
  # Hints shown on the map, one for each step of drawing a boundary. These
  # are the Click (mouse) versions; a step can also have a Tap version (e.g.
  # hintStartTap) for when the user touches the map with a finger. A step
  # with no text shows no hint, so touch screens show none for now.
  # The map has loaded and there is no boundary yet
  hintIdleClick: Select Draw to begin drawing your red line boundary.
  # The map was clicked or tapped before pressing Draw (fades after a few seconds)
  hintStartClick: Select Draw to begin drawing your red line boundary.
  # Draw was pressed and no point is placed yet
  hintFirstPointClick: Click on map to draw first point.
  # 1 or 2 points placed
  hintAddPointsClick: Move cursor and click to add points.
  # 3 or more points placed, enough to finish the shape
  hintFinishClick: Double click or select "Done" to finish
  # Editing an existing boundary
  hintEditClick: Click to select point to move or delete. Select done when you are finished drawing.
  # A point of that boundary is selected
  hintPointSelectedClick: Press delete key to remove this point. Drag to move.
---

# Draw your boundary on a map
