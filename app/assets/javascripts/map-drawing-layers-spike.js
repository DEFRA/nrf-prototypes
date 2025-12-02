/**
 * Map Drawing Interface for NRF Estimate
 * Main orchestrator that coordinates all map modules
 */

;(function () {
  'use strict'

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  const DELAY_GOVUK_READY_MS = 1000
  const DELAY_ACCESSIBLE_CONTROLS_MS = 500

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  // Wait for everything to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMap)
  } else {
    initMap()
  }

  // ============================================================================
  // FORM VALIDATION
  // ============================================================================

  /**
   * Check if should redirect to summary
   * @param {string} boundaryData - Boundary data JSON string
   * @returns {boolean} True if should redirect
   */
  function shouldRedirectToSummary(boundaryData) {
    const urlParams = new URLSearchParams(window.location.search)
    const navParam = urlParams.get('nav')

    if (navParam === 'summary') {
      try {
        const parsedData = JSON.parse(boundaryData)
        return parsedData.intersectingCatchment !== null
      } catch (error) {
        console.error('Error parsing boundary data:', error)
      }
    }

    return false
  }

  /**
   * Setup form validation
   */
  function setupFormValidation() {
    document.querySelector('form').addEventListener('submit', function (e) {
      const drawingState = window.MapDrawingControls.getDrawingState()

      if (drawingState.isDrawing) {
        e.preventDefault()
        window.MapUI.showErrorSummary(
          'Finish or delete the red line boundary to continue'
        )
        return false
      }

      if (drawingState.isEditing) {
        e.preventDefault()
        window.MapUI.showErrorSummary(
          'Stop editing or delete the red line boundary to continue'
        )
        return false
      }

      const boundaryData = document.getElementById('boundary-data').value
      if (!boundaryData) {
        e.preventDefault()
        window.MapUI.showErrorSummary('Draw a red line boundary to continue')
        return false
      }

      window.MapUI.hideErrorSummary()

      if (shouldRedirectToSummary(boundaryData)) {
        e.preventDefault()
        window.location.href = '/nrf-estimate-2-map-layers-spike/summary'
        return false
      }
    })
  }

  // ============================================================================
  // MAP INITIALIZATION
  // ============================================================================

  /**
   * Initialize accessible controls with delay
   * @param {L.Map} map - Leaflet map instance
   * @param {L.Control.Draw} drawControl - Draw control instance
   * @param {L.FeatureGroup} drawnItems - Feature group for drawn items
   * @param {Object} edpData - EDP data object (for visualization only)
   */
  function initAccessibleControlsDelayed(
    map,
    drawControl,
    drawnItems,
    edpData
  ) {
    setTimeout(() => {
      if (map && drawControl && drawnItems) {
        window.MapDrawingControls.initAccessibleControls(
          map,
          drawControl,
          drawnItems,
          edpData.layers,
          window.MapInitialisation.ENGLAND_CENTER_LAT,
          window.MapInitialisation.ENGLAND_CENTER_LNG,
          window.MapInitialisation.ENGLAND_DEFAULT_ZOOM
        )
      }
    }, DELAY_ACCESSIBLE_CONTROLS_MS)
  }

  /**
   * Initialize the map
   */
  function initMap() {
    setTimeout(function () {
      if (!window.MapInitialisation.checkMapLibreLoaded()) {
        window.MapInitialisation.showMapError()
        return
      }

      const mapContainer = document.getElementById('map')
      if (!mapContainer) {
        console.error('Map container not found')
        window.MapInitialisation.showMapError()
        return
      }

      try {
        window.MapInitialisation.hideLoadingMessage()

        // Initialize the map centered on England
        const map = window.MapInitialisation.createBaseMap()

        // Setup base layers (street and satellite)
        const { streetMap, satelliteMap } =
          window.MapInitialisation.createBaseLayers()
        window.MapInitialisation.addSavedLayerToMap(
          map,
          streetMap,
          satelliteMap
        )

        // Add map controls
        window.MapStyles.addMapStyleSwitcher(
          map,
          mapContainer,
          streetMap,
          satelliteMap
        )
        window.MapInitialisation.addZoomControl(map)

        // Load catchment GeoJSON for visualization (not used for intersection checking anymore)
        const edpData = {
          boundaries: [],
          layers: []
        }
        window.MapInitialisation.loadCatchmentData(map, edpData)

        // TODO: Phase 4 - Initialize drawing controls with MapboxDraw
        // Temporarily stub out drawing functionality
        const drawnItems = null // Will be MapboxDraw instance in Phase 4
        // window.MapDrawingControls.setDrawnItems(drawnItems)

        // window.MapDrawingControls.configureDrawTooltips()
        // const drawControl =
        //   window.MapDrawingControls.createDrawControl(drawnItems)
        // map.addControl(drawControl)

        // window.MapDrawingControls.hideDrawToolbar()

        // Initialize location search
        // window.MapSearch.initLocationSearch(map)

        // Initialize map key
        window.MapInitialisation.initMapKey(map)

        // Initialize map help button
        window.MapInitialisation.initMapHelp(map)

        // Initialize map statistics first so it's ready to receive updates
        // if (window.MapStats && window.MapStats.init) {
        //   window.MapStats.init(map, drawnItems)
        // }

        // Load existing boundary data if available (async - will trigger intersection display update)
        // Then initialize datasets after boundary is loaded to avoid race condition
        window.MapInitialisation.loadExistingBoundary(drawnItems, map).then(
          () => {
            // Initialize datasets (GCN EDP layers) after boundary loads
            if (window.MapDatasets && window.MapDatasets.init) {
              window.MapDatasets.init(map)
            }
          }
        )

        // Form submission validation
        setupFormValidation()

        // TODO: Phase 4 - Initialize accessible controls with MapboxDraw
        // initAccessibleControlsDelayed(map, drawControl, drawnItems, edpData)
      } catch (error) {
        console.error('Error initializing map:', error)
        window.MapInitialisation.showMapError()
      }
    }, DELAY_GOVUK_READY_MS)
  }
})()
