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

  // ============================================================================
  // DRAW CONTROL SETUP
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
   * @param {L.Layer} layer - The drawn layer
   * @param {Object} intersections - Intersection results from API
   */
  function updateBoundaryData(layer, intersections) {
    if (!layer) {
      document.getElementById(DOM_IDS.boundaryData).value = ''
      return
    }

    const bounds = layer.getBounds()
    const center = bounds.getCenter()
    const latLngs = layer.getLatLngs()[0]
    const coordinates = latLngs.map((latLng) => [latLng.lng, latLng.lat])

    const boundaryData = {
      center: [center.lng, center.lat],
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
   * @param {L.Layer} layer - Leaflet layer
   * @returns {Promise} Promise resolving when check is complete
   */
  async function handleIntersectionCheck(coordinates, layer) {
    const intersections = await window.MapAPI.checkEDPIntersection(coordinates)
    updateBoundaryData(layer, intersections)

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
   * Handle start drawing button click
   * @param {L.Control.Draw} drawControl - Draw control instance
   * @param {L.Layer} currentDrawingLayer - Current drawing layer
   * @param {L.FeatureGroup} drawnItemsGroup - Feature group for drawn items
   * @param {L.Map} map - Leaflet map instance
   */
  function handleStartDrawingClick(
    drawControl,
    currentDrawingLayer,
    drawnItemsGroup,
    map
  ) {
    if (isDrawing) {
      if (currentDrawingLayer) {
        drawnItemsGroup.removeLayer(currentDrawingLayer)
        currentDrawingLayer = null
      }
      const polygonHandler = getPolygonHandler(drawControl, 'draw')
      if (polygonHandler) {
        polygonHandler.disable()
      }
      isDrawing = false
      window.MapUI.hideErrorSummary()
      window.MapUI.exitEditMode(map, drawnItemsGroup)
    } else {
      const polygonHandler = getPolygonHandler(drawControl, 'draw')
      if (polygonHandler) {
        polygonHandler.enable()
        isDrawing = true
        window.MapUI.enterEditMode(map)
      }
    }
  }

  /**
   * Handle edit boundary button click
   * @param {L.Control.Draw} drawControl - Draw control instance
   * @param {L.FeatureGroup} drawnItemsGroup - Feature group for drawn items
   * @param {L.Map} map - Leaflet map instance
   */
  function handleEditBoundaryClick(drawControl, drawnItemsGroup, map) {
    if (isEditing) {
      const editHandler = getEditHandler(drawControl)
      if (editHandler) {
        editHandler.save()
        editHandler.disable()
      }
      isEditing = false
      window.MapUI.hideErrorSummary()
      window.MapUI.exitEditMode(map, drawnItemsGroup)
    } else {
      if (drawnItemsGroup.getLayers().length > 0) {
        const editHandler = getEditHandler(drawControl)
        if (editHandler) {
          editHandler.enable()
          isEditing = true
          window.MapUI.enterEditMode(map)
        }
      } else {
        window.MapUI.showErrorSummary(
          'No boundary to edit. Please draw a boundary first.'
        )
      }
    }
  }

  /**
   * Handle delete boundary button click
   * @param {L.Control.Draw} drawControl - Draw control instance
   * @param {L.FeatureGroup} drawnItemsGroup - Feature group for drawn items
   * @param {Object} controls - Control elements object
   * @param {L.Map} map - Leaflet map instance
   */
  function handleDeleteBoundaryClick(
    drawControl,
    drawnItemsGroup,
    controls,
    map
  ) {
    if (drawnItemsGroup.getLayers().length > 0) {
      drawnItemsGroup.clearLayers()
      updateBoundaryData(null, null)
      window.MapUI.hideErrorSummary()
      window.MapUI.updateLinkStates(controls, drawnItemsGroup)

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

      const editHandler = getEditHandler(drawControl)
      if (editHandler) {
        editHandler.save()
        editHandler.disable()
      }

      const polygonHandler = getPolygonHandler(drawControl, 'draw')
      if (polygonHandler) {
        polygonHandler.disable()
      }

      isEditing = false
      isDrawing = false
    } else {
      window.MapUI.showErrorSummary('No boundary to delete.')
    }
  }

  /**
   * Handle confirm area button click - calls API to check EDP intersection
   * @param {L.Control.Draw} drawControl - Draw control instance
   * @param {L.Map} map - Leaflet map instance
   * @param {L.FeatureGroup} drawnItemsGroup - Feature group for drawn items
   */
  async function handleConfirmEdit(drawControl, map, drawnItemsGroup) {
    // Complete any in-progress drawing
    if (isDrawing) {
      const drawHandler = getPolygonHandler(drawControl, 'draw')
      if (drawHandler && drawHandler._enabled) {
        drawHandler.completeShape()
      }
    }

    // Save any in-progress edits
    if (isEditing) {
      const editHandler = getEditHandler(drawControl)
      if (editHandler && editHandler._enabled) {
        editHandler.save()
        editHandler.disable()
      }
      isEditing = false
    }

    // Disable drawing mode
    if (isDrawing) {
      const polygonHandler = getPolygonHandler(drawControl, 'draw')
      if (polygonHandler) {
        polygonHandler.disable()
      }
      isDrawing = false
    }

    window.MapUI.hideErrorSummary()

    const layers = drawnItemsGroup.getLayers()
    if (layers.length === 0) {
      console.error(ERROR_MESSAGES.noBoundary)
      return
    }

    const layer = layers[0]
    const latLngs = layer.getLatLngs()[0]
    const coordinates = latLngs.map((latLng) => [latLng.lng, latLng.lat])

    if (window.MapAPI) {
      window.MapAPI.showLoadingState()
    }

    try {
      await handleIntersectionCheck(coordinates, layer)

      if (window.MapAPI) {
        window.MapAPI.hideErrorState()
      }

      window.MapUI.exitEditMode(map, drawnItemsGroup)
    } catch (error) {
      console.error('Error checking EDP intersection:', error)

      if (window.MapAPI) {
        window.MapAPI.showErrorState(
          error.message || ERROR_MESSAGES.unableToVerify,
          () => handleConfirmEdit(drawControl, map, drawnItemsGroup)
        )
      }
    }
  }

  /**
   * Handle cancel edit button click
   * @param {L.Control.Draw} drawControl - Draw control instance
   * @param {L.Layer} currentDrawingLayer - Current drawing layer
   * @param {L.FeatureGroup} drawnItemsGroup - Feature group for drawn items
   * @param {L.Map} map - Leaflet map instance
   */
  function handleCancelEdit(
    drawControl,
    currentDrawingLayer,
    drawnItemsGroup,
    map
  ) {
    if (isDrawing) {
      if (currentDrawingLayer) {
        drawnItemsGroup.removeLayer(currentDrawingLayer)
        currentDrawingLayer = null
      }
      const polygonHandler = getPolygonHandler(drawControl, 'draw')
      if (polygonHandler) {
        polygonHandler.disable()
      }
      isDrawing = false
    }

    if (isEditing) {
      const editHandler = getEditHandler(drawControl)
      if (editHandler && editHandler._enabled) {
        editHandler.revertLayers()
        editHandler.disable()
      }
      isEditing = false
    }

    window.MapUI.hideErrorSummary()
    window.MapUI.exitEditMode(map, drawnItemsGroup)
  }

  /**
   * Handle zoom to boundary button click
   * @param {L.FeatureGroup} drawnItemsGroup - Feature group for drawn items
   * @param {L.Map} map - Leaflet map instance
   */
  function handleZoomToBoundary(drawnItemsGroup, map) {
    if (drawnItemsGroup.getLayers().length > 0) {
      const group = new L.featureGroup(drawnItemsGroup.getLayers())
      map.fitBounds(group.getBounds().pad(MAP_BOUNDS_PADDING))
      window.MapUI.hideErrorSummary()
    } else {
      window.MapUI.showErrorSummary('No boundary to zoom to.')
    }
  }

  // ============================================================================
  // DRAWING CONTROLS SETUP
  // ============================================================================

  /**
   * Setup drawing control event handlers
   * @param {Object} controls - Control elements object
   * @param {L.Map} map - Leaflet map instance
   * @param {L.Control.Draw} drawControl - Draw control instance
   * @param {L.FeatureGroup} drawnItemsGroup - Feature group for drawn items
   * @param {L.Layer} currentDrawingLayer - Current drawing layer
   * @param {number} englandCenterLat - England center latitude
   * @param {number} englandCenterLng - England center longitude
   * @param {number} englandDefaultZoom - England default zoom level
   */
  function setupDrawingControls(
    controls,
    map,
    drawControl,
    drawnItemsGroup,
    currentDrawingLayer,
    englandCenterLat,
    englandCenterLng,
    englandDefaultZoom
  ) {
    controls.startDrawingBtn.addEventListener('click', function (e) {
      e.preventDefault()
      handleStartDrawingClick(
        drawControl,
        currentDrawingLayer,
        drawnItemsGroup,
        map
      )
    })

    controls.editBoundaryBtn.addEventListener('click', function (e) {
      e.preventDefault()
      handleEditBoundaryClick(drawControl, drawnItemsGroup, map)
    })

    controls.deleteBoundaryBtn.addEventListener('click', function (e) {
      e.preventDefault()
      handleDeleteBoundaryClick(drawControl, drawnItemsGroup, controls, map)
    })

    controls.confirmEditBtn.addEventListener('click', function (e) {
      e.preventDefault()
      handleConfirmEdit(drawControl, map, drawnItemsGroup)
    })

    controls.cancelEditBtn.addEventListener('click', function (e) {
      e.preventDefault()
      handleCancelEdit(drawControl, currentDrawingLayer, drawnItemsGroup, map)
    })

    controls.zoomToEnglandBtn.addEventListener('click', function (e) {
      e.preventDefault()
      map.setView([englandCenterLat, englandCenterLng], englandDefaultZoom)
    })

    controls.zoomToBoundaryBtn.addEventListener('click', function (e) {
      e.preventDefault()
      handleZoomToBoundary(drawnItemsGroup, map)
    })
  }

  /**
   * Handle polygon created event
   * @param {Object} event - Leaflet draw event
   * @param {L.Map} map - Leaflet map instance
   * @param {L.FeatureGroup} drawnItemsGroup - Feature group for drawn items
   */
  async function handlePolygonCreated(event, map, drawnItemsGroup) {
    const layer = event.layer
    drawnItemsGroup.addLayer(layer)
    isDrawing = false
    window.MapUI.hideErrorSummary()

    const controls = getControlElements()
    if (controls) {
      window.MapUI.updateLinkStates(controls, drawnItemsGroup)
    }

    window.MapUI.exitEditMode(map, drawnItemsGroup)

    const latLngs = layer.getLatLngs()[0]
    const coordinates = latLngs.map((latLng) => [latLng.lng, latLng.lat])

    if (window.MapAPI) {
      window.MapAPI.showLoadingState()
    }

    try {
      await handleIntersectionCheck(coordinates, layer)
    } catch (error) {
      console.error('Error checking EDP intersection on create:', error)
      if (window.MapAPI) {
        window.MapAPI.showErrorState(
          error.message || ERROR_MESSAGES.unableToVerify,
          async () => {
            try {
              window.MapAPI.hideErrorState()
              window.MapAPI.showLoadingState()
              await handleIntersectionCheck(coordinates, layer)
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
   * Handle polygon edited event
   * @param {Object} event - Leaflet draw event
   * @param {L.Map} map - Leaflet map instance
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
   * Handle polygon deleted event
   */
  function handlePolygonDeleted() {
    const controls = getControlElements()
    if (controls) {
      window.MapUI.updateLinkStates(controls, drawnItems)
    }
  }

  /**
   * Setup map event handlers for drawing
   * @param {L.Map} map - Leaflet map instance
   * @param {L.FeatureGroup} drawnItemsGroup - Feature group for drawn items
   * @param {Array} edpLayers - Array of EDP layer data
   */
  function setupMapEventHandlers(map, drawnItemsGroup, edpLayers) {
    map.on(L.Draw.Event.CREATED, (event) =>
      handlePolygonCreated(event, map, drawnItemsGroup)
    )

    map.on(L.Draw.Event.EDITED, (event) => handlePolygonEdited(event, map))

    map.on(L.Draw.Event.DELETED, () => {
      handlePolygonDeleted()
      document.getElementById(DOM_IDS.boundaryData).value = ''
    })
  }

  /**
   * Initialize accessible drawing controls
   * @param {L.Map} map - Leaflet map instance
   * @param {L.Control.Draw} drawControl - Draw control instance
   * @param {L.FeatureGroup} drawnItemsGroup - Feature group for drawn items
   * @param {Array} edpLayers - Array of EDP layer data
   * @param {number} englandCenterLat - England center latitude
   * @param {number} englandCenterLng - England center longitude
   * @param {number} englandDefaultZoom - England default zoom level
   */
  function initAccessibleControls(
    map,
    drawControl,
    drawnItemsGroup,
    edpLayers,
    englandCenterLat,
    englandCenterLng,
    englandDefaultZoom
  ) {
    if (!map || !drawControl || !drawnItemsGroup) {
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

    let currentDrawingLayer = null

    setupDrawingControls(
      controls,
      map,
      drawControl,
      drawnItemsGroup,
      currentDrawingLayer,
      englandCenterLat,
      englandCenterLng,
      englandDefaultZoom
    )
    setupMapEventHandlers(map, drawnItemsGroup, edpLayers)

    window.MapUI.updateLinkStates(controls, drawnItemsGroup)
  }

  /**
   * Get drawing state
   * @returns {Object} Object with isDrawing and isEditing flags
   */
  function getDrawingState() {
    return { isDrawing, isEditing }
  }

  /**
   * Set drawn items reference
   * @param {L.FeatureGroup} items - Feature group for drawn items
   */
  function setDrawnItems(items) {
    drawnItems = items
  }

  /**
   * Get drawn items reference
   * @returns {L.FeatureGroup} Feature group for drawn items
   */
  function getDrawnItems() {
    return drawnItems
  }

  /**
   * Get MapboxDraw instance (stub for Phase 4)
   * @returns {Object|null} MapboxDraw instance
   */
  function getDrawInstance() {
    // TODO: Implement in Phase 4
    return null
  }

  // Export functions to global namespace
  window.MapDrawingControls.configureDrawTooltips = configureDrawTooltips
  window.MapDrawingControls.createDrawControl = createDrawControl
  window.MapDrawingControls.hideDrawToolbar = hideDrawToolbar
  window.MapDrawingControls.initAccessibleControls = initAccessibleControls
  window.MapDrawingControls.updateBoundaryData = updateBoundaryData
  window.MapDrawingControls.getDrawingState = getDrawingState
  window.MapDrawingControls.setDrawnItems = setDrawnItems
  window.MapDrawingControls.getDrawnItems = getDrawnItems
  window.MapDrawingControls.getDrawInstance = getDrawInstance
  window.MapDrawingControls.BOUNDARY_STYLE = BOUNDARY_STYLE
})()
