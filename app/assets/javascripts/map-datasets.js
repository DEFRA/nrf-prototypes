/**
 * Map Datasets Module
 * Manages map data layers with a scalable, configuration-driven approach
 */

;(function () {
  'use strict'

  // Create global namespace
  window.MapDatasets = window.MapDatasets || {}

  // ============================================================================
  // DATASET CONFIGURATION
  // ============================================================================

  // Special dataset for nutrient EDP (uses existing catchment layers)
  const NUTRIENT_EDP_DATASET = {
    nutrientEdp: {
      id: 'nutrientEdp',
      name: 'Nature Restoration Fund nutrients levy',
      type: 'special',
      visible: true
    }
  }

  // Get datasets from MapData module and merge with nutrient EDP
  const DATASETS = Object.assign(
    {},
    NUTRIENT_EDP_DATASET,
    window.MapData && window.MapData.ALL_DATASETS
      ? window.MapData.ALL_DATASETS
      : {}
  )

  // Store for loaded layers
  const loadedLayers = {}
  let mapInstance = null

  // ============================================================================
  // LAYER CREATION
  // ============================================================================

  /**
   * Create a GeoJSON layer
   * @param {Object} dataset - Dataset configuration
   * @param {Object} data - GeoJSON data
   * @returns {L.Layer} Leaflet layer
   */
  function createGeoJSONLayer(dataset, data) {
    // Get style - use getStyle() if available for dynamic styles, otherwise use static style
    const getStyleFn = dataset.getStyle || (() => dataset.style)

    const layer = L.geoJSON(data, {
      style: function () {
        const style = getStyleFn()
        return {
          color: style.color,
          fillColor: style.fillColor,
          fillOpacity: style.fillOpacity,
          weight: style.weight,
          opacity: style.opacity || 0.8
        }
      },
      onEachFeature: function (feature, layer) {
        const props = feature.properties
        const name =
          props.Label ||
          props.N2K_Site_N ||
          props.name ||
          props.ZoneName ||
          'Feature'
        layer.bindPopup(`<strong>${name}</strong>`)
      }
    })

    // Store reference to dataset for style updates
    layer._datasetId = dataset.id

    return layer
  }

  // ============================================================================
  // DATASET MANAGEMENT
  // ============================================================================

  /**
   * Load a dataset
   * @param {string} datasetId - Dataset ID
   * @returns {Promise} Resolves when dataset is loaded
   */
  function loadDataset(datasetId) {
    const dataset = DATASETS[datasetId]
    if (!dataset) {
      console.error(`Unknown dataset: ${datasetId}`)
      return Promise.reject(new Error(`Unknown dataset: ${datasetId}`))
    }

    if (loadedLayers[datasetId]) {
      return Promise.resolve(loadedLayers[datasetId])
    }

    if (dataset.type === 'geojson') {
      const url = dataset.getUrl()
      if (!url) {
        console.log(`No URL configured for dataset: ${datasetId}`)
        return Promise.reject(new Error(`No URL for ${datasetId}`))
      }

      return fetch(url)
        .then((response) => response.json())
        .then((data) => {
          const layer = createGeoJSONLayer(dataset, data)
          loadedLayers[datasetId] = layer
          return layer
        })
    }

    return Promise.reject(new Error(`Unknown dataset type: ${dataset.type}`))
  }

  /**
   * Show a dataset on the map
   * @param {string} datasetId - Dataset ID
   */
  function showDataset(datasetId) {
    if (!mapInstance) {
      console.error('Map not initialized')
      return
    }

    loadDataset(datasetId)
      .then((layer) => {
        if (!mapInstance.hasLayer(layer)) {
          layer.addTo(mapInstance)
        }
        console.log(`Dataset shown: ${datasetId}`)

        // Ensure red line boundary stays on top of data layers
        if (
          window.MapDrawingControls &&
          window.MapDrawingControls.getDrawnItems
        ) {
          const drawnItems = window.MapDrawingControls.getDrawnItems()
          if (drawnItems) {
            drawnItems.bringToFront()
          }
        }
      })
      .catch((error) => {
        console.error(`Error showing dataset ${datasetId}:`, error)
      })
  }

  /**
   * Hide a dataset from the map
   * @param {string} datasetId - Dataset ID
   */
  function hideDataset(datasetId) {
    const layer = loadedLayers[datasetId]
    if (layer && mapInstance && mapInstance.hasLayer(layer)) {
      mapInstance.removeLayer(layer)
      console.log(`Dataset hidden: ${datasetId}`)
    }
  }

  /**
   * Toggle dataset visibility
   * @param {string} datasetId - Dataset ID
   * @param {boolean} visible - Whether to show or hide
   */
  function toggleDataset(datasetId, visible) {
    // Special handling for nutrient EDP (uses MapStyles catchment layers)
    if (datasetId === 'nutrientEdp') {
      if (visible) {
        window.MapStyles.showCatchmentLayers(mapInstance)
      } else {
        window.MapStyles.hideCatchmentLayers(mapInstance)
      }
      return
    }

    if (visible) {
      showDataset(datasetId)
    } else {
      hideDataset(datasetId)
    }
  }

  /**
   * Get dataset layer (for external use)
   * @param {string} datasetId - Dataset ID
   * @returns {L.Layer|null} The layer or null
   */
  function getLayer(datasetId) {
    return loadedLayers[datasetId] || null
  }

  // ============================================================================
  // UI GENERATION
  // ============================================================================

  /**
   * Generate checkbox HTML for a dataset
   * @param {Object} dataset - Dataset configuration
   * @returns {string} HTML string
   */
  function generateCheckboxHTML(dataset) {
    const checked = dataset.visible ? 'checked' : ''
    return `
      <div class="govuk-checkboxes__item">
        <input class="govuk-checkboxes__input"
               id="dataset-${dataset.id}"
               name="datasets"
               type="checkbox"
               value="${dataset.id}"
               ${checked}
               data-dataset-id="${dataset.id}">
        <label class="govuk-label govuk-checkboxes__label" for="dataset-${dataset.id}">
          ${dataset.name}
        </label>
      </div>
    `
  }

  /**
   * Initialize the datasets panel UI
   * @param {HTMLElement} container - Container element for checkboxes
   */
  function initUI(container) {
    if (!container) {
      console.error('Datasets container not found')
      return
    }

    // Generate checkboxes for all datasets
    const checkboxesHTML = Object.values(DATASETS)
      .map(generateCheckboxHTML)
      .join('')

    container.innerHTML = `
      <div class="govuk-checkboxes govuk-checkboxes--small">
        ${checkboxesHTML}
      </div>
    `

    // Add event listeners
    const checkboxes = container.querySelectorAll('input[type="checkbox"]')
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', function () {
        const datasetId = this.dataset.datasetId
        toggleDataset(datasetId, this.checked)
      })
    })
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize the datasets manager
   * @param {L.Map} map - Leaflet map instance
   */
  function init(map) {
    mapInstance = map

    // Initialize UI if container exists
    const container = document.getElementById('datasets-checkboxes')
    if (container) {
      initUI(container)
    }

    // Load initially visible datasets (skip nutrientEdp as it's already loaded)
    Object.values(DATASETS).forEach((dataset) => {
      if (dataset.visible && dataset.id !== 'nutrientEdp') {
        showDataset(dataset.id)
      }
    })
  }

  /**
   * Get all dataset configurations
   * @returns {Object} All datasets
   */
  function getDatasets() {
    return DATASETS
  }

  /**
   * Update layer styles based on current map style
   * Called when map style changes between street and satellite
   */
  function updateLayerStyles() {
    if (!mapInstance) return

    Object.keys(loadedLayers).forEach((datasetId) => {
      const layer = loadedLayers[datasetId]
      const dataset = DATASETS[datasetId]

      if (layer && dataset && dataset.getStyle) {
        // Update style for layers with dynamic styling
        const newStyle = dataset.getStyle()
        layer.setStyle({
          color: newStyle.color,
          fillColor: newStyle.fillColor,
          fillOpacity: newStyle.fillOpacity,
          weight: newStyle.weight,
          opacity: newStyle.opacity || 0.8
        })
      }
    })
  }

  /**
   * Refresh all visible datasets (re-add them to map)
   * Called after map style changes to ensure layers persist
   */
  function refreshLayers() {
    if (!mapInstance) return

    // First update styles based on new map style
    updateLayerStyles()

    Object.keys(loadedLayers).forEach((datasetId) => {
      const layer = loadedLayers[datasetId]
      const checkbox = document.querySelector(`#dataset-${datasetId}`)

      if (checkbox && checkbox.checked && layer) {
        // Remove and re-add to ensure it's on top and visible
        try {
          if (mapInstance.hasLayer(layer)) {
            mapInstance.removeLayer(layer)
          }
          layer.addTo(mapInstance)
        } catch (e) {
          console.error(`Error refreshing layer ${datasetId}:`, e)
        }
      }
    })

    // Ensure red line boundary stays on top of data layers
    if (window.MapDrawingControls && window.MapDrawingControls.getDrawnItems) {
      const drawnItems = window.MapDrawingControls.getDrawnItems()
      if (drawnItems) {
        drawnItems.bringToFront()
      }
    }
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  window.MapDatasets.DATASETS = DATASETS
  window.MapDatasets.init = init
  window.MapDatasets.loadDataset = loadDataset
  window.MapDatasets.showDataset = showDataset
  window.MapDatasets.hideDataset = hideDataset
  window.MapDatasets.toggleDataset = toggleDataset
  window.MapDatasets.getLayer = getLayer
  window.MapDatasets.getDatasets = getDatasets
  window.MapDatasets.initUI = initUI
  window.MapDatasets.refreshLayers = refreshLayers
})()
