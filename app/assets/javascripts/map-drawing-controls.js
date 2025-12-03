/**
 * Map Drawing Controls Module
 * Handles drawing and editing functionality for boundaries
 */

;(function () {
  'use strict'

  // Create global namespace for drawing functions
  window.MapDrawingControls = window.MapDrawingControls || {}

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  const COLOR_BOUNDARY_RED = '#d4351c'
  const COLOR_ERROR_YELLOW = '#e1e100'

  const BOUNDARY_STYLE = {
    color: COLOR_BOUNDARY_RED,
    weight: 3,
    opacity: 0.8,
    fillColor: COLOR_BOUNDARY_RED,
    fillOpacity: 0.2
  }

  const DELAY_TOOLBAR_HIDE_MS = 100

  const DOM_IDS = {
    startDrawing: 'start-drawing',
    editBoundary: 'edit-boundary',
    deleteBoundary: 'delete-boundary',
    zoomToEngland: 'zoom-to-england',
    zoomToBoundary: 'zoom-to-boundary',
    confirmEdit: 'confirm-edit-btn',
    cancelEdit: 'cancel-edit-btn',
    boundaryData: 'boundary-data',
    saveButtonContainer: 'save-btn-container',
    boundaryProcessing: 'boundary-processing',
    boundaryCheckError: 'boundary-check-error',
    map: 'map'
  }

  const ERROR_MESSAGES = {
    noBoundary: 'No boundary drawn',
    unableToVerify: 'Unable to verify boundary. Please try again.'
  }

  const MAP_BOUNDS_PADDING = 0.1

  // ============================================================================
  // STATE
  // ============================================================================

  let isDrawing = false
  let isEditing = false
  let drawnItems = null
  let drawInstance = null

  // ============================================================================
  // MAPBOXDRAW HELPER FUNCTIONS
  // ============================================================================

  /**
   * Get features from MapboxDraw instance
   * @param {MapboxDraw} draw - MapboxDraw instance
   * @returns {Array} Array of GeoJSON features
   */
  function getFeatures(draw) {
    if (!draw || !draw.getAll) return []
    return draw.getAll().features
  }

  /**
   * Check if MapboxDraw has any features
   * @param {MapboxDraw} draw - MapboxDraw instance
   * @returns {boolean} True if features exist
   */
  function hasFeatures(draw) {
    return getFeatures(draw).length > 0
  }

  /**
   * Set the MapboxDraw instance
   * @param {MapboxDraw} instance - MapboxDraw instance
   */
  function setDrawInstance(instance) {
    drawInstance = instance
    drawnItems = instance // For backward compatibility
  }

  /**
   * Get the MapboxDraw instance
   * @returns {MapboxDraw|null} MapboxDraw instance or null
   */
  function getDrawInstance() {
    return drawInstance
  }

  /**
   * Set the drawn items reference
   * @param {MapboxDraw} instance - MapboxDraw instance
   */
  function setDrawnItems(instance) {
    drawnItems = instance
    drawInstance = instance
  }

  /**
   * Get the drawn items reference
   * @returns {MapboxDraw|null} MapboxDraw instance or null
   */
  function getDrawnItems() {
    return drawnItems
  }

  // ============================================================================
  // DRAW CONTROL SETUP (Legacy Leaflet functions - kept for reference)
  // ============================================================================

  /**
   * Configure draw tooltips (disable them)
   */
  function configureDrawTooltips() {
    L.drawLocal.draw.handlers.polygon.tooltip = {
      start: '',
      cont: '',
      end: ''
    }
    L.drawLocal.edit.handlers.edit.tooltip = {
      text: '',
      subtext: ''
    }
    L.drawLocal.edit.handlers.remove.tooltip = {
      text: ''
    }
  }

  /**
   * Create draw control with configuration
   * @param {L.FeatureGroup} drawnItemsGroup - Feature group for drawn items
   * @returns {L.Control.Draw} Draw control instance
   */
  function createDrawControl(drawnItemsGroup) {
    return new L.Control.Draw({
      position: 'topleft',
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          showLength: true,
          metric: true,
          feet: false,
          nautic: false,
          drawError: {
            color: COLOR_ERROR_YELLOW,
            message: '<strong>Error:</strong> shape edges cannot cross!'
          },
          shapeOptions: BOUNDARY_STYLE
        },
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false
      },
      edit: {
        featureGroup: drawnItemsGroup,
        remove: true
      }
    })
  }

  /**
   * Hide the draw toolbar
   */
  function hideDrawToolbar() {
    setTimeout(() => {
      const toolbar = document.querySelector('.leaflet-draw-toolbar')
      if (toolbar) {
        toolbar.classList.add('hidden')
      }
    }, DELAY_TOOLBAR_HIDE_MS)
  }

  /**
   * Get polygon handler from draw control
   * @param {L.Control.Draw} drawControl - Draw control instance
   * @param {string} type - Type of handler ('draw')
   * @returns {Object|null} Handler object or null
   */
  function getPolygonHandler(drawControl, type) {
    if (type === 'draw') {
      return drawControl._toolbars?.draw?._modes?.polygon?.handler
    }
    return null
  }

  /**
   * Get edit handler from draw control
   * @param {L.Control.Draw} drawControl - Draw control instance
   * @returns {Object|null} Handler object or null
   */
  function getEditHandler(drawControl) {
    return drawControl._toolbars?.edit?._modes?.edit?.handler
  }

  // ============================================================================
  // BOUNDARY DATA MANAGEMENT
  // ============================================================================

  /**
   * Update boundary data in hidden form field
   * @param {Object} feature - GeoJSON feature from MapboxDraw
   * @param {Object} intersections - Intersection results from API
   */
  function updateBoundaryData(feature, intersections) {
    if (!feature) {
      document.getElementById(DOM_IDS.boundaryData).value = ''
      return
    }

    // Extract coordinates from GeoJSON feature
    const coordinates = feature.geometry.coordinates[0]

    // Calculate center from coordinates
    const lngs = coordinates.map((coord) => coord[0])
    const lats = coordinates.map((coord) => coord[1])
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2

    const boundaryData = {
      center: [centerLng, centerLat],
      coordinates: coordinates,
      // Store new intersection structure
      intersections: intersections || { nutrient: null, gcn: null },
      // Keep legacy field for backward compatibility
      intersectingCatchment: intersections?.nutrient || null
    }

    document.getElementById(DOM_IDS.boundaryData).value =
      JSON.stringify(boundaryData)

    // Note: Intersections display will be updated automatically by MapAPI
    // after the API response is received
  }

  /**
   * Handle intersection check - extracted to avoid duplication
   * @param {Array} coordinates - Polygon coordinates
   * @param {Object} feature - GeoJSON feature
   * @returns {Promise} Promise resolving when check is complete
   */
  async function handleIntersectionCheck(coordinates, feature) {
    const intersections = await window.MapAPI.checkEDPIntersection(coordinates)
    updateBoundaryData(feature, intersections)

    if (window.MapAPI) {
      window.MapAPI.hideLoadingState()
    }

    const saveButtonContainer = document.getElementById(
      DOM_IDS.saveButtonContainer
    )
    if (saveButtonContainer) {
      saveButtonContainer.classList.remove('hidden')
    }

    return intersections
  }

  // ============================================================================
  // CONTROL ELEMENTS
  // ============================================================================

  /**
   * Get control elements from DOM
   * @returns {Object|null} Object with control elements or null
   */
  function getControlElements() {
    const startDrawingBtn = document.getElementById(DOM_IDS.startDrawing)
    const editBoundaryBtn = document.getElementById(DOM_IDS.editBoundary)
    const deleteBoundaryBtn = document.getElementById(DOM_IDS.deleteBoundary)
    const zoomToEnglandBtn = document.getElementById(DOM_IDS.zoomToEngland)
    const zoomToBoundaryBtn = document.getElementById(DOM_IDS.zoomToBoundary)
    const confirmEditBtn = document.getElementById(DOM_IDS.confirmEdit)
    const cancelEditBtn = document.getElementById(DOM_IDS.cancelEdit)

    if (
      !startDrawingBtn ||
      !editBoundaryBtn ||
      !deleteBoundaryBtn ||
      !zoomToEnglandBtn ||
      !zoomToBoundaryBtn ||
      !confirmEditBtn ||
      !cancelEditBtn
    ) {
      return null
    }

    return {
      startDrawingBtn,
      editBoundaryBtn,
      deleteBoundaryBtn,
      zoomToEnglandBtn,
      zoomToBoundaryBtn,
      confirmEditBtn,
      cancelEditBtn
    }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handle start drawing button click (MapboxDraw version)
   * @param {Object} drawControl - Not used, kept for compatibility
   * @param {MapboxDraw} draw - MapboxDraw instance
   * @param {maplibregl.Map} map - MapLibre map instance
   */
  function handleStartDrawingClick(drawControl, draw, map) {
    const canvasContainer = map.getCanvasContainer()

    if (isDrawing) {
      // Cancel drawing mode
      draw.changeMode('simple_select')
      isDrawing = false
      window.MapUI.hideErrorSummary()
      window.MapUI.exitEditMode(map, draw)
      // Remove mode classes
      canvasContainer.classList.remove(
        'mode-draw_polygon',
        'mode-direct_select'
      )
      canvasContainer.classList.add('mode-simple_select')

      // Notify stats panel that drawing stopped
      if (window.MapStats && window.MapStats.handleDrawStop) {
        window.MapStats.handleDrawStop()
      }
    } else {
      // Enter drawing mode
      draw.changeMode('draw_polygon')
      isDrawing = true
      window.MapUI.enterEditMode(map)
      // Add mode class for cursor styling
      canvasContainer.classList.remove(
        'mode-simple_select',
        'mode-direct_select'
      )
      canvasContainer.classList.add('mode-draw_polygon')

      // Notify stats panel that drawing started
      if (window.MapStats && window.MapStats.handleDrawStart) {
        window.MapStats.handleDrawStart()
      }
    }
  }

  /**
   * Handle edit boundary button click (MapboxDraw version)
   * @param {Object} drawControl - Not used, kept for compatibility
   * @param {MapboxDraw} draw - MapboxDraw instance
   * @param {maplibregl.Map} map - MapLibre map instance
   */
  function handleEditBoundaryClick(drawControl, draw, map) {
    const canvasContainer = map.getCanvasContainer()

    if (isEditing) {
      // Exit edit mode
      draw.changeMode('simple_select')
      isEditing = false
      window.MapUI.hideErrorSummary()
      window.MapUI.exitEditMode(map, draw)
      // Remove mode classes
      canvasContainer.classList.remove(
        'mode-draw_polygon',
        'mode-direct_select'
      )
      canvasContainer.classList.add('mode-simple_select')

      // Notify stats panel that editing stopped
      if (window.MapStats && window.MapStats.handleEditStop) {
        window.MapStats.handleEditStop()
      }
    } else {
      // Check if there's a feature to edit
      if (hasFeatures(draw)) {
        // Enter direct_select mode for vertex editing
        const featureId = getFeatures(draw)[0].id
        draw.changeMode('direct_select', {
          featureId: featureId
        })
        isEditing = true
        window.MapUI.enterEditMode(map)
        // Add mode class for cursor styling
        canvasContainer.classList.remove(
          'mode-simple_select',
          'mode-draw_polygon'
        )
        canvasContainer.classList.add('mode-direct_select')

        // Notify stats panel that editing started
        if (window.MapStats && window.MapStats.handleEditStart) {
          window.MapStats.handleEditStart()
        }
      } else {
        window.MapUI.showErrorSummary(
          'No boundary to edit. Please draw a boundary first.'
        )
      }
    }
  }

  /**
   * Handle delete boundary button click (MapboxDraw version)
   * @param {Object} drawControl - Not used, kept for compatibility
   * @param {MapboxDraw} draw - MapboxDraw instance
   * @param {Object} controls - Control elements object
   * @param {maplibregl.Map} map - MapLibre map instance
   */
  function handleDeleteBoundaryClick(drawControl, draw, controls, map) {
    if (hasFeatures(draw)) {
      // Delete all features
      draw.deleteAll()
      updateBoundaryData(null, null)
      window.MapUI.hideErrorSummary()
      window.MapUI.updateLinkStates(controls, draw)

      // Update stats panel after delete
      if (window.MapStats && window.MapStats.handlePolygonDelete) {
        window.MapStats.handlePolygonDelete()
      }

      // Update help modal after delete
      if (
        window.MapInitialisation &&
        window.MapInitialisation.updateHelpModalContent
      ) {
        window.MapInitialisation.updateHelpModalContent(map)
      }

      // Reset to simple_select mode
      draw.changeMode('simple_select')

      isEditing = false
      isDrawing = false
    } else {
      window.MapUI.showErrorSummary('No boundary to delete.')
    }
  }

  /**
   * Handle confirm area button click - calls API to check EDP intersection (MapboxDraw version)
   * @param {Object} drawControl - Not used, kept for compatibility
   * @param {maplibregl.Map} map - MapLibre map instance
   * @param {MapboxDraw} draw - MapboxDraw instance
   */
  async function handleConfirmEdit(drawControl, map, draw) {
    // Exit any active modes
    if (isDrawing || isEditing) {
      draw.changeMode('simple_select')
      isDrawing = false
      isEditing = false
    }

    window.MapUI.hideErrorSummary()

    const features = getFeatures(draw)
    if (features.length === 0) {
      console.error(ERROR_MESSAGES.noBoundary)
      return
    }

    const feature = features[0]
    const coordinates = feature.geometry.coordinates[0]

    if (window.MapAPI) {
      window.MapAPI.showLoadingState()
    }

    try {
      await handleIntersectionCheck(coordinates, feature)

      if (window.MapAPI) {
        window.MapAPI.hideErrorState()
      }

      window.MapUI.exitEditMode(map, draw)
    } catch (error) {
      console.error('Error checking EDP intersection:', error)

      if (window.MapAPI) {
        window.MapAPI.showErrorState(
          error.message || ERROR_MESSAGES.unableToVerify,
          () => handleConfirmEdit(drawControl, map, draw)
        )
      }
    }
  }

  /**
   * Handle cancel edit button click (MapboxDraw version)
   * @param {Object} drawControl - Not used, kept for compatibility
   * @param {Object} currentDrawingLayer - Not used, kept for compatibility
   * @param {MapboxDraw} draw - MapboxDraw instance
   * @param {maplibregl.Map} map - MapLibre map instance
   */
  function handleCancelEdit(drawControl, currentDrawingLayer, draw, map) {
    // Exit any active modes and return to simple_select
    if (isDrawing || isEditing) {
      draw.changeMode('simple_select')
      isDrawing = false
      isEditing = false
    }

    window.MapUI.hideErrorSummary()
    window.MapUI.exitEditMode(map, draw)
  }

  /**
   * Handle zoom to boundary button click (MapboxDraw version)
   * @param {MapboxDraw} draw - MapboxDraw instance
   * @param {maplibregl.Map} map - MapLibre map instance
   */
  function handleZoomToBoundary(draw, map) {
    if (hasFeatures(draw)) {
      const feature = getFeatures(draw)[0]
      const coordinates = feature.geometry.coordinates[0]

      // Calculate bounds from coordinates
      const bounds = new maplibregl.LngLatBounds()
      coordinates.forEach((coord) => {
        bounds.extend(coord)
      })

      // Add padding and fit to bounds
      map.fitBounds(bounds, {
        padding: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      })

      window.MapUI.hideErrorSummary()
    } else {
      window.MapUI.showErrorSummary('No boundary to zoom to.')
    }
  }

  // ============================================================================
  // DRAWING CONTROLS SETUP (MapboxDraw version)
  // ============================================================================

  /**
   * Setup drawing control event handlers for MapboxDraw
   * @param {maplibregl.Map} map - MapLibre map instance
   * @param {MapboxDraw} draw - MapboxDraw instance
   * @param {Array} edpLayers - EDP layer references (not used currently)
   */
  function setupDrawingControls(map, draw, edpLayers) {
    const controls = getControlElements()
    if (!controls) {
      console.error('Control elements not found')
      return
    }

    controls.startDrawingBtn.addEventListener('click', function (e) {
      e.preventDefault()
      handleStartDrawingClick(null, draw, map)
    })

    controls.editBoundaryBtn.addEventListener('click', function (e) {
      e.preventDefault()
      handleEditBoundaryClick(null, draw, map)
    })

    controls.deleteBoundaryBtn.addEventListener('click', function (e) {
      e.preventDefault()
      handleDeleteBoundaryClick(null, draw, controls, map)
    })

    controls.confirmEditBtn.addEventListener('click', function (e) {
      e.preventDefault()
      handleConfirmEdit(null, map, draw)
    })

    controls.cancelEditBtn.addEventListener('click', function (e) {
      e.preventDefault()
      handleCancelEdit(null, null, draw, map)
    })

    controls.zoomToEnglandBtn.addEventListener('click', function (e) {
      e.preventDefault()
      // Zoom to England using MapLibre's flyTo
      map.flyTo({
        center: [
          window.MapInitialisation.ENGLAND_CENTER_LNG,
          window.MapInitialisation.ENGLAND_CENTER_LAT
        ],
        zoom: window.MapInitialisation.ENGLAND_DEFAULT_ZOOM
      })
    })

    controls.zoomToBoundaryBtn.addEventListener('click', function (e) {
      e.preventDefault()
      handleZoomToBoundary(draw, map)
    })

    // Setup MapboxDraw event handlers
    setupMapEventHandlers(map, draw, edpLayers)
  }

  /**
   * Handle polygon created event (MapboxDraw version)
   * @param {Object} event - MapboxDraw event with features array
   * @param {maplibregl.Map} map - MapLibre map instance
   * @param {MapboxDraw} draw - MapboxDraw instance
   */
  async function handlePolygonCreated(event, map, draw) {
    const feature = event.features[0]
    isDrawing = false
    window.MapUI.hideErrorSummary()

    const controls = getControlElements()
    if (controls) {
      window.MapUI.updateLinkStates(controls, draw)
    }

    window.MapUI.exitEditMode(map, draw)

    const coordinates = feature.geometry.coordinates[0]

    if (window.MapAPI) {
      window.MapAPI.showLoadingState()
    }

    try {
      await handleIntersectionCheck(coordinates, feature)
    } catch (error) {
      console.error('Error checking EDP intersection on create:', error)
      if (window.MapAPI) {
        window.MapAPI.showErrorState(
          error.message || ERROR_MESSAGES.unableToVerify,
          async () => {
            try {
              window.MapAPI.hideErrorState()
              window.MapAPI.showLoadingState()
              await handleIntersectionCheck(coordinates, feature)
            } catch (retryError) {
              window.MapAPI.showErrorState(
                retryError.message || ERROR_MESSAGES.unableToVerify,
                null
              )
            }
          }
        )
      }
    }

    if (
      window.MapInitialisation &&
      window.MapInitialisation.updateHelpModalContent
    ) {
      window.MapInitialisation.updateHelpModalContent(map)
    }
  }

  /**
   * Handle polygon edited event (MapboxDraw version)
   * @param {Object} event - MapboxDraw event with features array
   * @param {maplibregl.Map} map - MapLibre map instance
   */
  function handlePolygonEdited(event, map) {
    if (
      window.MapInitialisation &&
      window.MapInitialisation.updateHelpModalContent
    ) {
      window.MapInitialisation.updateHelpModalContent(map)
    }
  }

  /**
   * Handle polygon deleted event (MapboxDraw version)
   */
  function handlePolygonDeleted() {
    const controls = getControlElements()
    if (controls) {
      window.MapUI.updateLinkStates(controls, drawInstance)
    }
  }

  /**
   * Setup map event handlers for drawing (MapboxDraw version)
   * @param {maplibregl.Map} map - MapLibre map instance
   * @param {MapboxDraw} draw - MapboxDraw instance
   * @param {Array} edpLayers - Array of EDP layer data (not used currently)
   */
  function setupMapEventHandlers(map, draw, edpLayers) {
    map.on('draw.create', (event) => handlePolygonCreated(event, map, draw))

    map.on('draw.update', (event) => handlePolygonEdited(event, map))

    map.on('draw.delete', () => {
      handlePolygonDeleted()
      document.getElementById(DOM_IDS.boundaryData).value = ''
    })
  }

  /**
   * Initialize accessible drawing controls (MapboxDraw version)
   * @param {maplibregl.Map} map - MapLibre map instance
   * @param {Object} drawControl - Not used, kept for compatibility
   * @param {MapboxDraw} draw - MapboxDraw instance
   * @param {Array} edpLayers - Array of EDP layer data
   * @param {number} englandCenterLat - England center latitude (not used)
   * @param {number} englandCenterLng - England center longitude (not used)
   * @param {number} englandDefaultZoom - England default zoom level (not used)
   */
  function initAccessibleControls(
    map,
    drawControl,
    draw,
    edpLayers,
    englandCenterLat,
    englandCenterLng,
    englandDefaultZoom
  ) {
    if (!map || !draw) {
      console.error('Missing required parameters')
      return
    }

    if (!edpLayers) {
      edpLayers = []
    }

    const controls = getControlElements()
    if (!controls) {
      console.error('Control elements not found')
      return
    }

    // Note: setupDrawingControls is already called from orchestrator
    // This function is mainly for backward compatibility
    window.MapUI.updateLinkStates(controls, draw)
  }

  /**
   * Get drawing state
   * @returns {Object} Object with isDrawing and isEditing flags
   */
  function getDrawingState() {
    return { isDrawing, isEditing }
  }

  // Export functions to global namespace
  window.MapDrawingControls.configureDrawTooltips = configureDrawTooltips
  window.MapDrawingControls.createDrawControl = createDrawControl
  window.MapDrawingControls.hideDrawToolbar = hideDrawToolbar
  window.MapDrawingControls.setupDrawingControls = setupDrawingControls
  window.MapDrawingControls.initAccessibleControls = initAccessibleControls
  window.MapDrawingControls.updateBoundaryData = updateBoundaryData
  window.MapDrawingControls.getDrawingState = getDrawingState
  window.MapDrawingControls.setDrawnItems = setDrawnItems
  window.MapDrawingControls.getDrawnItems = getDrawnItems
  window.MapDrawingControls.setDrawInstance = setDrawInstance
  window.MapDrawingControls.getDrawInstance = getDrawInstance
  window.MapDrawingControls.BOUNDARY_STYLE = BOUNDARY_STYLE
})()
