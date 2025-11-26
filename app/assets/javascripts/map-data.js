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
      type: 'geojson',
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
      getUrl: () => '/public/map-layers/gcn_edp_all_regions.geojson'
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
