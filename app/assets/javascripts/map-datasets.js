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

  // Store for loaded layers and their event handlers
  const loadedLayers = {}
  const layerEventHandlers = {} // Store event handlers for cleanup
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
   * Create a vector tile layer (MapLibre version)
   * @param {Object} dataset - Dataset configuration
   * @returns {Object} Layer metadata {sourceId, fillLayerId, borderLayerId}
   */
  function createVectorTileLayer(dataset) {
    if (!mapInstance) {
      console.error('Map not initialized')
      return null
    }

    // Don't throw error - let the caller handle waiting for style to load
    if (!mapInstance.isStyleLoaded()) {
      return null
    }

    // Get style - use getStyle() if available for dynamic styles, otherwise use static style
    const getStyleFn = dataset.getStyle || (() => dataset.style)
    const style = getStyleFn()

    // Create unique IDs for this dataset's layers
    const sourceId = `${dataset.id}-source`
    const fillLayerId = `${dataset.id}-fill`
    const borderLayerId = `${dataset.id}-border`

    try {
      // Check if source already exists
      if (mapInstance.getSource(sourceId)) {
        console.log(`Vector tile source ${sourceId} already exists, skipping`)
        return { sourceId, fillLayerId, borderLayerId, datasetId: dataset.id }
      }

      // Add vector tile source
      // Set maxzoom to match MBTiles file so MapLibre knows tile availability
      // MapLibre will automatically overzoom beyond this level
      mapInstance.addSource(sourceId, {
        type: 'vector',
        tiles: [dataset.getTilesUrl()],
        minzoom: dataset.minzoom || 0,
        maxzoom: dataset.maxzoom || 12 // Use dataset-specific maxzoom or default to 12
      })

      // Find the first drawing layer to insert dataset layers before it
      // This ensures dataset layers appear above base map but below user drawings
      const layers = mapInstance.getStyle().layers
      let firstDrawingLayer = null
      for (const layer of layers) {
        if (
          layer.id.includes('gl-draw') ||
          layer.id.includes('draw') ||
          layer.type === 'symbol'
        ) {
          firstDrawingLayer = layer.id
          break
        }
      }

      // Add fill layer
      mapInstance.addLayer(
        {
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          'source-layer': dataset.sourceLayer,
          paint: {
            'fill-color': style.fillColor || style.color,
            'fill-opacity': style.fillOpacity || 0.3
          }
        },
        firstDrawingLayer
      )

      // Add border layer
      mapInstance.addLayer(
        {
          id: borderLayerId,
          type: 'line',
          source: sourceId,
          'source-layer': dataset.sourceLayer,
          paint: {
            'line-color': style.color,
            'line-width': style.weight || 2,
            'line-opacity': style.opacity || 0.8
          }
        },
        firstDrawingLayer
      )

      // Create and attach event handlers using shared utility
      const handlers =
        window.MapEventHandlers.createLayerEventHandlers(mapInstance)
      window.MapEventHandlers.attachEventHandlers(
        mapInstance,
        fillLayerId,
        handlers
      )

      // Store handlers for cleanup
      layerEventHandlers[dataset.id] = {
        fillLayerId,
        ...handlers
      }

      console.log(`✓ Created vector tile layer: ${dataset.id}`, {
        sourceId,
        fillLayerId,
        borderLayerId,
        style
      })

      return {
        sourceId,
        fillLayerId,
        borderLayerId,
        datasetId: dataset.id
      }
    } catch (error) {
      console.error(
        `Error creating vector tile layer for ${dataset.id}:`,
        error
      )
      return null
    }
  }

  // ============================================================================
  // DATASET MANAGEMENT
  // ============================================================================

  /**
   * Re-attach event listeners to a layer
   * Used when showing a previously hidden layer
   * @param {string} datasetId - Dataset ID
   */
  function reattachEventListeners(datasetId) {
    const layerInfo = loadedLayers[datasetId]
    const dataset = DATASETS[datasetId]

    if (!layerInfo || !dataset || layerInfo.isSpecial) {
      return
    }

    // Only re-attach if handlers don't already exist
    if (layerEventHandlers[datasetId]) {
      return
    }

    const fillLayerId = layerInfo.fillLayerId

    // Create and attach event handlers using shared utility
    const handlers =
      window.MapEventHandlers.createLayerEventHandlers(mapInstance)
    window.MapEventHandlers.attachEventHandlers(
      mapInstance,
      fillLayerId,
      handlers
    )

    // Store handlers for cleanup
    layerEventHandlers[datasetId] = {
      fillLayerId,
      ...handlers
    }
  }

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

    if (dataset.type === 'special') {
      // Special datasets like nutrientEdp use existing catchment layers
      // Return a placeholder since the layers are already loaded
      const placeholderLayer = {
        datasetId: datasetId,
        isSpecial: true
      }
      loadedLayers[datasetId] = placeholderLayer
      return Promise.resolve(placeholderLayer)
    }

    if (dataset.type === 'vector-tile') {
      // Vector tiles don't need to be fetched - they're loaded on-demand
      const layer = createVectorTileLayer(dataset)
      if (layer) {
        loadedLayers[datasetId] = layer
        return Promise.resolve(layer)
      } else {
        return Promise.reject(
          new Error(
            `Failed to create vector tile layer for ${datasetId} - style may not be loaded`
          )
        )
      }
    }

    return Promise.reject(new Error(`Unknown dataset type: ${dataset.type}`))
  }

  /**
   * Show a dataset on the map (MapLibre version)
   * @param {string} datasetId - Dataset ID
   */
  function showDataset(datasetId) {
    if (!mapInstance) {
      console.error('Map not initialized')
      return
    }

    console.log(`[showDataset] Showing dataset: ${datasetId}`)

    // Special handling for nutrientEdp (uses MapStyles catchment layers)
    if (datasetId === 'nutrientEdp') {
      window.MapStyles.showCatchmentLayers(mapInstance)
      console.log(`Dataset shown: ${datasetId}`)
      return
    }

    console.log(`[showDataset] Loading dataset: ${datasetId}`)
    loadDataset(datasetId)
      .then((layerInfo) => {
        console.log(`[showDataset] Dataset loaded:`, datasetId, layerInfo)
        if (!layerInfo) {
          console.warn(`Dataset ${datasetId} could not be loaded`)
          return
        }

        // Skip if this is a special dataset (already handled above)
        if (layerInfo.isSpecial) {
          return
        }

        // Re-attach event listeners if they were removed
        reattachEventListeners(datasetId)

        // Set visibility to visible for both fill and border layers
        if (mapInstance.getLayer(layerInfo.fillLayerId)) {
          mapInstance.setLayoutProperty(
            layerInfo.fillLayerId,
            'visibility',
            'visible'
          )
        }
        if (mapInstance.getLayer(layerInfo.borderLayerId)) {
          mapInstance.setLayoutProperty(
            layerInfo.borderLayerId,
            'visibility',
            'visible'
          )
        }

        console.log(`Dataset shown: ${datasetId}`)
      })
      .catch((error) => {
        console.error(`Error showing dataset ${datasetId}:`, error)
      })
  }

  /**
   * Hide a dataset from the map (MapLibre version)
   * @param {string} datasetId - Dataset ID
   */
  function hideDataset(datasetId) {
    if (!mapInstance) {
      return
    }

    // Special handling for nutrientEdp (uses MapStyles catchment layers)
    if (datasetId === 'nutrientEdp') {
      window.MapStyles.hideCatchmentLayers(mapInstance)
      console.log(`Dataset hidden: ${datasetId}`)
      return
    }

    const layerInfo = loadedLayers[datasetId]
    if (!layerInfo) {
      return
    }

    // Skip if this is a special dataset (already handled above)
    if (layerInfo.isSpecial) {
      return
    }

    // Clean up event listeners to prevent memory leak
    const handlers = layerEventHandlers[datasetId]
    if (handlers) {
      window.MapEventHandlers.removeEventHandlers(
        mapInstance,
        handlers.fillLayerId,
        handlers
      )
      delete layerEventHandlers[datasetId]
    }

    // Set visibility to none for both fill and border layers
    if (mapInstance.getLayer(layerInfo.fillLayerId)) {
      mapInstance.setLayoutProperty(layerInfo.fillLayerId, 'visibility', 'none')
    }
    if (mapInstance.getLayer(layerInfo.borderLayerId)) {
      mapInstance.setLayoutProperty(
        layerInfo.borderLayerId,
        'visibility',
        'none'
      )
    }

    console.log(`Dataset hidden: ${datasetId}`)
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
   * Get dataset layer info (for external use)
   * @param {string} datasetId - Dataset ID
   * @returns {Object|null} Layer info object {sourceId, fillLayerId, borderLayerId} or null
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
   * Initialize the datasets manager (MapLibre version)
   * @param {maplibregl.Map} map - MapLibre map instance
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

    // Function to apply saved visibility
    const applyVisibility = () => {
      // Double-check style is loaded before applying
      if (!mapInstance.isStyleLoaded()) {
        console.log('[MapDatasets] Style not loaded yet, waiting...')
        mapInstance.once('styledata', applyVisibility)
        return
      }

      console.log('[MapDatasets] Applying saved visibility to datasets')
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

    // Wait for map style to load before applying visibility
    if (mapInstance.isStyleLoaded()) {
      applyVisibility()
    } else {
      mapInstance.once('styledata', applyVisibility)
    }
  }

  /**
   * Get all dataset configurations
   * @returns {Object} All datasets
   */
  function getDatasets() {
    return DATASETS
  }

  /**
   * Update layer styles based on current map style (MapLibre version)
   * Called when map style changes between street and satellite
   */
  function updateLayerStyles() {
    if (!mapInstance) return

    Object.keys(loadedLayers).forEach((datasetId) => {
      const layerInfo = loadedLayers[datasetId]
      const dataset = DATASETS[datasetId]

      if (layerInfo && dataset && dataset.getStyle) {
        // Update style for layers with dynamic styling
        const newStyle = dataset.getStyle()

        // Update fill layer
        if (mapInstance.getLayer(layerInfo.fillLayerId)) {
          mapInstance.setPaintProperty(
            layerInfo.fillLayerId,
            'fill-color',
            newStyle.fillColor || newStyle.color
          )
          mapInstance.setPaintProperty(
            layerInfo.fillLayerId,
            'fill-opacity',
            newStyle.fillOpacity || 0.3
          )
        }

        // Update border layer
        if (mapInstance.getLayer(layerInfo.borderLayerId)) {
          mapInstance.setPaintProperty(
            layerInfo.borderLayerId,
            'line-color',
            newStyle.color
          )
          mapInstance.setPaintProperty(
            layerInfo.borderLayerId,
            'line-width',
            newStyle.weight || 2
          )
          mapInstance.setPaintProperty(
            layerInfo.borderLayerId,
            'line-opacity',
            newStyle.opacity || 0.8
          )
        }
      }
    })
  }

  /**
   * Refresh all visible datasets (MapLibre version)
   * Called after map style changes to ensure layers persist
   * Note: MapLibre preserves layers automatically on style change, so we just update styles
   */
  function refreshLayers() {
    if (!mapInstance) return

    // Update styles based on new map style
    updateLayerStyles()

    // Note: MapLibre automatically preserves layer visibility state
    // No need to manually re-add layers like with Leaflet
    console.log('[MapDatasets] Refreshed layer styles after map style change')
  }

  /**
   * Disable all dataset layers (for drawing/editing mode)
   * Note: Currently does nothing - layers stay visible during drawing/editing
   * Popups and cursor changes are disabled via isInDrawingMode() checks instead
   */
  function disableAllLayers() {
    // Intentionally left empty - we no longer hide layers during drawing/editing
    // The cursor and popup behavior is controlled by isInDrawingMode() checks
    // in the event handlers instead
  }

  /**
   * Re-enable all dataset layers (after drawing/editing mode)
   * Restores visibility based on checkbox state
   */
  function enableAllLayers() {
    if (!mapInstance) return

    Object.keys(DATASETS).forEach((datasetId) => {
      const checkbox = document.querySelector(`#dataset-${datasetId}`)
      if (checkbox && checkbox.checked) {
        showDataset(datasetId)
      }
    })
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
  window.MapDatasets.disableAllLayers = disableAllLayers
  window.MapDatasets.enableAllLayers = enableAllLayers
  window.MapDatasets.getCookiePreference = getVisibilityFromCookie
})()
