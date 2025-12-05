/**
 * Map Event Handlers Utility Module
 * Shared event handler creation for map dataset layers
 */

;(function () {
  'use strict'

  // Create global namespace
  window.MapEventHandlers = window.MapEventHandlers || {}

  /**
   * Build popup content from feature properties
   * @param {Object} properties - Feature properties
   * @returns {string} HTML string for popup
   */
  function buildPopupContent(properties) {
    const name =
      properties.NAME ||
      properties.name ||
      properties.Label ||
      properties.N2K_Site_N ||
      properties.ZoneName ||
      'Feature'

    let description = `<strong>${name}</strong>`
    if (properties.DESCRIPTIO || properties.Description) {
      const type = properties.DESCRIPTIO || properties.Description
      description += `<br><small>Type: ${type}</small>`
    }

    return description
  }

  /**
   * Check if user is currently in drawing or editing mode
   * @returns {boolean} True if in drawing/editing mode
   */
  function isInDrawingMode() {
    return (
      window.MapDrawingControls &&
      window.MapDrawingControls.isInDrawingMode &&
      window.MapDrawingControls.isInDrawingMode()
    )
  }

  /**
   * Create click event handler for layer popups
   * @param {maplibregl.Map} map - MapLibre map instance
   * @returns {Function} Click handler function
   */
  function createClickHandler(map) {
    return function (e) {
      // Don't show popups during drawing/editing
      if (isInDrawingMode()) {
        return
      }

      if (!e.features || e.features.length === 0) return

      const feature = e.features[0]
      const props = feature.properties

      const popupContent = buildPopupContent(props)

      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(popupContent)
        .addTo(map)
    }
  }

  /**
   * Create mouseenter event handler for cursor changes
   * @param {maplibregl.Map} map - MapLibre map instance
   * @returns {Function} Mouseenter handler function
   */
  function createMouseenterHandler(map) {
    return function () {
      // Don't change cursor during drawing/editing - keep crosshair
      if (isInDrawingMode()) {
        return
      }
      map.getCanvas().style.cursor = 'pointer'
    }
  }

  /**
   * Create mouseleave event handler for cursor reset
   * @param {maplibregl.Map} map - MapLibre map instance
   * @returns {Function} Mouseleave handler function
   */
  function createMouseleaveHandler(map) {
    return function () {
      // Don't change cursor during drawing/editing
      if (isInDrawingMode()) {
        return
      }
      map.getCanvas().style.cursor = ''
    }
  }

  /**
   * Create all event handlers for a layer
   * @param {maplibregl.Map} map - MapLibre map instance
   * @returns {Object} Object containing all event handlers
   */
  function createLayerEventHandlers(map) {
    return {
      clickHandler: createClickHandler(map),
      mouseenterHandler: createMouseenterHandler(map),
      mouseleaveHandler: createMouseleaveHandler(map)
    }
  }

  /**
   * Attach event handlers to a layer
   * @param {maplibregl.Map} map - MapLibre map instance
   * @param {string} layerId - Layer ID to attach handlers to
   * @param {Object} handlers - Handlers object from createLayerEventHandlers
   */
  function attachEventHandlers(map, layerId, handlers) {
    map.on('click', layerId, handlers.clickHandler)
    map.on('mouseenter', layerId, handlers.mouseenterHandler)
    map.on('mouseleave', layerId, handlers.mouseleaveHandler)
  }

  /**
   * Remove event handlers from a layer
   * @param {maplibregl.Map} map - MapLibre map instance
   * @param {string} layerId - Layer ID to remove handlers from
   * @param {Object} handlers - Handlers object from createLayerEventHandlers
   */
  function removeEventHandlers(map, layerId, handlers) {
    map.off('click', layerId, handlers.clickHandler)
    map.off('mouseenter', layerId, handlers.mouseenterHandler)
    map.off('mouseleave', layerId, handlers.mouseleaveHandler)
  }

  // Export functions
  window.MapEventHandlers.buildPopupContent = buildPopupContent
  window.MapEventHandlers.isInDrawingMode = isInDrawingMode
  window.MapEventHandlers.createClickHandler = createClickHandler
  window.MapEventHandlers.createMouseenterHandler = createMouseenterHandler
  window.MapEventHandlers.createMouseleaveHandler = createMouseleaveHandler
  window.MapEventHandlers.createLayerEventHandlers = createLayerEventHandlers
  window.MapEventHandlers.attachEventHandlers = attachEventHandlers
  window.MapEventHandlers.removeEventHandlers = removeEventHandlers
})()
