/**
 * Map Data Configuration
 * Centralized configuration for GeoJSON data layers
 */

;(function () {
  'use strict'

  // Create global namespace
  window.MapData = window.MapData || {}

  // ============================================================================
  // GCN EDP DATASETS
  // ============================================================================

  const GCN_EDP_DATASETS = {
    gcnEdp: {
      id: 'gcnEdp',
      name: 'Nature Restoration Fund great crested newt levy',
      type: 'vector-tile',
      visible: true,
      // Style is retrieved dynamically from MapStyles based on current map style
      getStyle: () =>
        window.MapStyles
          ? window.MapStyles.getGcnStyle(window.MapStyles.getCurrentStyle())
          : {
              color: '#f47738',
              fillColor: '#f47738',
              fillOpacity: 0.3,
              weight: 2
            },
      // Vector tile configuration
      getTilesUrl: () =>
        `${window.location.origin}/tiles/data/gcn_edp_all_regions/{z}/{x}/{y}.pbf`,
      sourceLayer: 'gcn_edp_all_regions',
      minzoom: 0,
      maxzoom: 12 // GCN tiles available up to zoom 12 (from MBTiles metadata)
    }
  }

  // ============================================================================
  // ALL DATASETS COMBINED
  // ============================================================================

  const ALL_DATASETS = Object.assign({}, GCN_EDP_DATASETS)

  // ============================================================================
  // EXPORTS
  // ============================================================================

  window.MapData.GCN_EDP_DATASETS = GCN_EDP_DATASETS
  window.MapData.ALL_DATASETS = ALL_DATASETS
})()
