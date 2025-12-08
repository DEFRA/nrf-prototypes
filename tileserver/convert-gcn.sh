#!/bin/bash
set -e

# Convert GCN EDP GeoJSON to MBTiles
# Usage: ./convert-gcn.sh

INPUT_GEOJSON="../app/assets/map-layers/gcn_edp_all_regions.geojson"
OUTPUT_MBTILES="./data/mbtiles/gcn_edp_all_regions.mbtiles"
LAYER_NAME="gcn_edp_all_regions"

echo "Converting GCN EDP layer to MBTiles..."
echo "Input: $INPUT_GEOJSON"
echo "Output: $OUTPUT_MBTILES"

# Check if tippecanoe is installed
if ! command -v tippecanoe &> /dev/null; then
    echo "Error: tippecanoe is not installed"
    echo "Install with: brew install tippecanoe"
    exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "$(dirname "$OUTPUT_MBTILES")"

# Generate MBTiles with tippecanoe
echo "Running tippecanoe..."
tippecanoe -o "$OUTPUT_MBTILES" \
    -zg \
    --drop-densest-as-needed \
    --layer="$LAYER_NAME" \
    --name="$LAYER_NAME" \
    --force \
    "$INPUT_GEOJSON"

echo "✓ Conversion complete!"
echo "MBTiles file: $OUTPUT_MBTILES"

# Show file size
du -h "$OUTPUT_MBTILES"
