/**
 * Layer Controls Component
 * Handles toggling of EDP layer visibility with checkboxes
 */

window.LayerControls = (function() {
  'use strict';

  let maplibreMap = null;
  const layerState = {
    'gcn-edp': true,
    'catchments': true
  };

  /**
   * Initialize layer controls
   * @param {Object} maplibreMapInstance - MapLibre GL map instance
   */
  function init(maplibreMapInstance) {
    maplibreMap = maplibreMapInstance;

    if (!maplibreMap) {
      console.warn('[LayerControls] MapLibre map not available');
      return;
    }

    // Use document-level event delegation so checkboxes work even when
    // rendered inside a lazily-opened library panel (Preact renders on open).
    document.addEventListener('change', function(e) {
      if (e.target.id === 'layer-gcn-edp') {
        layerState['gcn-edp'] = e.target.checked;
        toggleLayer('gcn-edp', e.target.checked);
      } else if (e.target.id === 'layer-catchments') {
        layerState['catchments'] = e.target.checked;
        toggleLayer('catchments', e.target.checked);
      }
    });

    console.log('[LayerControls] Initialized');

    // After a style change the datasetsPlugin re-adds all layers via its own
    // style.load listener. We listen to style.load too, then wait for the
    // map 'idle' event which fires only once everything has finished loading.
    // That guarantees our visibility call runs after the plugin's work.
    maplibreMap.on('style.load', function() {
      maplibreMap.once('idle', applyStoredVisibility);
    });
  }

  /**
   * Reapply stored visibility state to all layers.
   * Called directly by map-styles.js after a style change.
   */
  function applyStoredVisibility() {
    console.log('[LayerControls] Applying stored visibility:', layerState);
    if (layerState['gcn-edp'] === false) {
      toggleLayer('gcn-edp', false);
    }
    if (layerState['catchments'] === false) {
      toggleLayer('catchments', false);
    }
  }

  /**
   * Get visibility string for a dataset ID.
   * Called by map-datasets.js when creating layers so they start with correct visibility.
   * @param {string} datasetId - Dataset ID (e.g. 'gcnEdp', 'nutrientEdp')
   * @returns {string} 'visible' or 'none'
   */
  function getLayerVisibility(datasetId) {
    const idMap = {
      'gcnEdp': 'gcn-edp',
      'nutrientEdp': 'catchments'
    };
    const stateKey = idMap[datasetId] || datasetId;
    return layerState[stateKey] === false ? 'none' : 'visible';
  }

  /**
   * Toggle layer visibility on the map
   * @param {string} datasetId - Dataset ID to toggle
   * @param {boolean} visible - Whether layer should be visible
   */
  function toggleLayer(datasetId, visible) {
    if (!maplibreMap) return;

    const visibility = visible ? 'visible' : 'none';

    const layerVariants = [
      { fill: `${datasetId}-fill`, line: `${datasetId}-border` },
      { fill: `${datasetId}-fill`, line: `${datasetId}-line` },
      { fill: `${datasetId}`, line: `${datasetId}-stroke` }
    ];

    let foundLayers = false;

    for (const variant of layerVariants) {
      if (maplibreMap.getLayer(variant.fill)) {
        maplibreMap.setLayoutProperty(variant.fill, 'visibility', visibility);
        foundLayers = true;
      }
      if (maplibreMap.getLayer(variant.line)) {
        maplibreMap.setLayoutProperty(variant.line, 'visibility', visibility);
        foundLayers = true;
      }
      if (foundLayers) break;
    }

    if (!foundLayers) {
      console.warn(`[LayerControls] No layers found for dataset ${datasetId}`);
    }
  }

  return {
    init,
    applyStoredVisibility,
    getLayerVisibility
  };
})();
