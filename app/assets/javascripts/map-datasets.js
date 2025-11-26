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

  // Cookie name for persisting layer visibility
  const COOKIE_NAME = 'edp-layer-visibility'

  // ============================================================================
  // COOKIE MANAGEMENT
  // ============================================================================

  /**
   * Get layer visibility from cookie
   * @returns {Object} Visibility state for each dataset
   */
  function getVisibilityFromCookie() {
    if (typeof Cookies === 'undefined') {
      console.warn('js-cookie library not loaded, using defaults')
      return {
        nutrientEdp: true,
        gcnEdp: true
      }
    }

    const cookieValue = Cookies.get(COOKIE_NAME)
    if (cookieValue) {
      try {
        return JSON.parse(cookieValue)
      } catch (e) {
        console.error('Error parsing visibility cookie:', e)
      }
    }

    return {
      nutrientEdp: true,
      gcnEdp: true
    }
  }

  /**
   * Save layer visibility to cookie
   * @param {Object} visibility - Visibility state for each dataset
   */
  function saveVisibilityToCookie(visibility) {
    if (typeof Cookies === 'undefined') {
      console.warn('js-cookie library not loaded, cannot save visibility')
      return
    }

    Cookies.set(COOKIE_NAME, JSON.stringify(visibility), {
      expires: 365,
      path: '/',
      sameSite: 'Lax',
      secure: window.location.protocol === 'https:'
    })
  }

  /**
   * Get current visibility state from checkboxes
   * @returns {Object} Current visibility state
   */
  function getCurrentVisibility() {
    const visibility = {}
    Object.keys(DATASETS).forEach((datasetId) => {
      const checkbox = document.querySelector(`#dataset-${datasetId}`)
      visibility[datasetId] = checkbox ? checkbox.checked : false
    })
    return visibility
  }

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
   * @param {Object} savedVisibility - Saved visibility state from cookie
   * @returns {string} HTML string
   */
  function generateCheckboxHTML(dataset, savedVisibility) {
    // Use saved visibility if available, otherwise use dataset default
    const isVisible =
      savedVisibility && savedVisibility.hasOwnProperty(dataset.id)
        ? savedVisibility[dataset.id]
        : dataset.visible
    const checked = isVisible ? 'checked' : ''
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
   * Handle checkbox change event
   * @param {Event} event - Change event
   */
  function handleCheckboxChange(event) {
    const checkbox = event.target
    const datasetId = checkbox.dataset.datasetId
    toggleDataset(datasetId, checkbox.checked)

    const currentVisibility = getCurrentVisibility()
    saveVisibilityToCookie(currentVisibility)
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

    // Remove existing event listeners before re-initialization
    const existingCheckboxes = container.querySelectorAll(
      'input[type="checkbox"]'
    )
    existingCheckboxes.forEach((checkbox) => {
      checkbox.removeEventListener('change', handleCheckboxChange)
    })

    const savedVisibility = getVisibilityFromCookie()

    if (!document.cookie.includes(COOKIE_NAME)) {
      saveVisibilityToCookie(savedVisibility)
    }

    const checkboxesHTML = Object.values(DATASETS)
      .map((dataset) => generateCheckboxHTML(dataset, savedVisibility))
      .join('')

    container.innerHTML = `
      <div class="govuk-checkboxes govuk-checkboxes--small">
        ${checkboxesHTML}
      </div>
    `

    // Add event listeners with named function for proper cleanup
    const checkboxes = container.querySelectorAll('input[type="checkbox"]')
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', handleCheckboxChange)
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

    // Get saved visibility from cookie
    const savedVisibility = getVisibilityFromCookie()

    // Initialize UI if container exists
    const container = document.getElementById('datasets-checkboxes')
    if (container) {
      initUI(container)
    }

    // Apply saved visibility to all datasets
    Object.keys(DATASETS).forEach((datasetId) => {
      const isVisible =
        savedVisibility && savedVisibility.hasOwnProperty(datasetId)
          ? savedVisibility[datasetId]
          : DATASETS[datasetId].visible

      // Apply visibility for GCN EDP (nutrient EDP is already handled by loadCatchmentData)
      if (datasetId !== 'nutrientEdp' && isVisible) {
        showDataset(datasetId)
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
  window.MapDatasets.getCookiePreference = getVisibilityFromCookie
})()
