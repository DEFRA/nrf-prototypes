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
    boundaryData: 'boundary-data'
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
   * @param {L.Layer} layer - Leaflet layer
   * @param {Object} intersectingCatchment - Catchment data object
   */
  function updateBoundaryData(layer, intersectingCatchment) {
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
      intersectingCatchment: intersectingCatchment
        ? intersectingCatchment.name
        : null
    }

    document.getElementById(DOM_IDS.boundaryData).value =
      JSON.stringify(boundaryData)
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
   * Handle confirm edit button click
   * @param {L.Control.Draw} drawControl - Draw control instance
   * @param {L.Map} map - Leaflet map instance
   * @param {L.FeatureGroup} drawnItemsGroup - Feature group for drawn items
   */
  function handleConfirmEdit(drawControl, map, drawnItemsGroup) {
    if (isDrawing) {
      const drawHandler = getPolygonHandler(drawControl, 'draw')
      if (drawHandler && drawHandler._enabled) {
        drawHandler.completeShape()
      }
    }

    if (isEditing) {
      const editHandler = getEditHandler(drawControl)
      if (editHandler && editHandler._enabled) {
        editHandler.save()
        editHandler.disable()
      }
      isEditing = false
    }

    if (isDrawing) {
      const polygonHandler = getPolygonHandler(drawControl, 'draw')
      if (polygonHandler) {
        polygonHandler.disable()
      }
      isDrawing = false
    }

    window.MapUI.hideErrorSummary()
    window.MapUI.exitEditMode(map, drawnItemsGroup)

    const saveButtonContainer = document.getElementById(
      DOM_IDS.saveButtonContainer
    )
    if (
      saveButtonContainer &&
      drawnItemsGroup &&
      drawnItemsGroup.getLayers().length > 0
    ) {
      saveButtonContainer.classList.remove('hidden')
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
   * Setup map event handlers for drawing
   * @param {L.Map} map - Leaflet map instance
   * @param {L.FeatureGroup} drawnItemsGroup - Feature group for drawn items
   * @param {Array} edpLayers - Array of EDP layer data
   */
  function setupMapEventHandlers(map, drawnItemsGroup, edpLayers) {
    map.on(L.Draw.Event.CREATED, function (event) {
      const layer = event.layer
      drawnItemsGroup.addLayer(layer)
      isDrawing = false
      window.MapUI.hideErrorSummary()

      const controls = getControlElements()
      if (controls) {
        window.MapUI.updateLinkStates(controls, drawnItemsGroup)
      }

      window.MapUI.exitEditMode(map, drawnItemsGroup)

      const intersectingCatchment =
        window.MapGeometry.findIntersectingCatchment(layer, edpLayers)
      updateBoundaryData(layer, intersectingCatchment)

      // Update help modal AFTER boundary data is saved
      if (
        window.MapInitialisation &&
        window.MapInitialisation.updateHelpModalContent
      ) {
        window.MapInitialisation.updateHelpModalContent(map)
      }
    })

    map.on(L.Draw.Event.EDITED, function (event) {
      const layers = event.layers
      layers.eachLayer(function (layer) {
        const intersectingCatchment =
          window.MapGeometry.findIntersectingCatchment(layer, edpLayers)
        updateBoundaryData(layer, intersectingCatchment)
      })

      // Update help modal AFTER boundary data is saved
      if (
        window.MapInitialisation &&
        window.MapInitialisation.updateHelpModalContent
      ) {
        window.MapInitialisation.updateHelpModalContent(map)
      }
    })

    map.on(L.Draw.Event.DELETED, function () {
      const controls = getControlElements()
      if (controls) {
        window.MapUI.updateLinkStates(controls, drawnItemsGroup)
      }
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

  // Export functions to global namespace
  window.MapDrawingControls.configureDrawTooltips = configureDrawTooltips
  window.MapDrawingControls.createDrawControl = createDrawControl
  window.MapDrawingControls.hideDrawToolbar = hideDrawToolbar
  window.MapDrawingControls.initAccessibleControls = initAccessibleControls
  window.MapDrawingControls.updateBoundaryData = updateBoundaryData
  window.MapDrawingControls.getDrawingState = getDrawingState
  window.MapDrawingControls.setDrawnItems = setDrawnItems
  window.MapDrawingControls.getDrawnItems = getDrawnItems
  window.MapDrawingControls.BOUNDARY_STYLE = BOUNDARY_STYLE
})()
