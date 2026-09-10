---
type: file-upload
hint: Upload a GeoJSON file (.geojson or .json), Keyhole markup language file (.kml) or a shapefile (.shp). Shapefiles (.shp) must be .zip files and must contain at least the .shp, .shx, .dbf and .prj files. The file must be smaller than 2MB.
errors:
  required: Select a file
  wrongType: The selected file must be a GeoJSON file (.geojson or .json), keyhole markup language file (.kml), or a shapefile (.shp). Shapefiles (.shp) must be .zip files and must contain at least the .shp, .shx, .dbf and .prj files.
  tooLarge: The [file] must be smaller than 2MB
  empty: The selected file is empty
  uploadFailed: There was a problem uploading the file
  notGeoJson: The selected file is not a valid GeoJSON file
  noPolygon: The GeoJSON file does not contain valid polygon coordinates
  unsupportedFormat: Shapefile and KML parsing is not yet supported. Please use GeoJSON format.
button: Continue
---

# Upload a red line boundary file

::: details My file is in a different format (eg. PDF)
We don't support PDF uploads, you'll need to re-export the shape from whichever tool was used to create it.
:::