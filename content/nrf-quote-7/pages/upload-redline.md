---
type: file-upload
hint: Upload a GeoJSON file (.geojson or .json), keyhole markup language file (.kml) or a shapefile (.shp). Shapefiles (.shp) must be .zip files and must contain at least the .shp, .shx, .dbf and .prj files. The file must be smaller than 2MB.
errors:
  required: Select a red line boundary file
  noShapefile: The ZIP file does not contain a shapefile (.shp). Upload a ZIP file containing a shapefile.
  wrongType: The selected file must be a GeoJSON file (.geojson or .json), keyhole markup language file (.kml) or a shapefile (.shp). Shapefiles (.shp) must be .zip files and must contain at least the .shp, .shx, .dbf and .prj files.
  missingFiles: The shapefile is incomplete. Make sure the ZIP file contains all the required files, then upload it again.
  tooLarge: The selected file must be smaller than 2MB.
  virus: The selected file contains a virus
button: Continue
---

# Upload a red line boundary file

::: details My file is in a different format
You'll need to re-export the shape from the tool was used to create it originally. If you don't have access to the file types listed, you can draw on a map instead. [Learn more about telling us where your development is (opens in a new tab)](*)
:::
