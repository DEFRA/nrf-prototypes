#!/bin/bash
set -e

# Convert all GeoJSON layers to MBTiles
# Usage: ./convert-all.sh

echo "==================================="
echo "Converting all layers to MBTiles"
echo "==================================="

# Check if tippecanoe is installed
if ! command -v tippecanoe &> /dev/null; then
    echo "Error: tippecanoe is not installed"
    echo "Install with: brew install tippecanoe"
    exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "./data/mbtiles"

# Layer configurations: INPUT_FILE|OUTPUT_FILE|LAYER_NAME
LAYERS=(
    "../app/assets/map-layers/gcn_edp_all_regions.geojson|./data/mbtiles/gcn_edp_all_regions.mbtiles|gcn_edp_all_regions"
    "../app/assets/map-layers/catchments_nn_catchments_03_2024.geojson|./data/mbtiles/catchments_nn_catchments_03_2024.mbtiles|catchments_nn_catchments_03_2024"
)

# Convert each layer
for layer_config in "${LAYERS[@]}"; do
    IFS='|' read -r input_file output_file layer_name <<< "$layer_config"

    if [ ! -f "$input_file" ]; then
        echo "⚠️  Skipping $layer_name - source file not found: $input_file"
        continue
    fi

    echo ""
    echo "Converting: $layer_name"
    echo "Input:  $input_file"
    echo "Output: $output_file"

    tippecanoe -o "$output_file" \
        -zg \
        --drop-densest-as-needed \
        --layer="$layer_name" \
        --name="$layer_name" \
        --force \
        "$input_file"

    echo "✓ Conversion complete!"
    du -h "$output_file"
done

echo ""
echo "==================================="
echo "All conversions complete!"
echo "==================================="
echo ""
echo "Generated files:"
ls -lh ./data/mbtiles/*.mbtiles
