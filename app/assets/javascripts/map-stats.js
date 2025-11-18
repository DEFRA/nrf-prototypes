/**
 * Map Statistics Module
 * Handles real-time calculation and display of drawing statistics
 * Uses Turf.js for geometric calculations
 */

;(function () {
  'use strict'

  // Create global namespace
  window.MapStats = window.MapStats || {}

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  const SQUARE_METERS_TO_HECTARES = 10000
  const SQUARE_METERS_TO_ACRES = 4046.86
  const METERS_TO_KILOMETERS = 1000
  const METERS_TO_MILES = 1609.34

  // ============================================================================
  // STATE
  // ============================================================================

  let statsPanel = null
  let currentStats = {
    totalArea: 0,
    currentLineDistance: 0,
    totalPerimeter: 0,
    vertexCount: 0
  }
  let map = null
  let drawnItems = null
  let isDrawingActive = false
  let isEditingActive = false
  let currentMousePosition = null
  let lastPlottedPoint = null
  let drawnPoints = []

  // ============================================================================
  // UI HELPERS
  // ============================================================================

  /**
   * Format area for display
   * @param {number} squareMeters - Area in square meters
   * @returns {string} Formatted area string
   */
  function formatArea(squareMeters) {
    const hectares = squareMeters / SQUARE_METERS_TO_HECTARES
    const acres = squareMeters / SQUARE_METERS_TO_ACRES

    if (hectares < 0.01) {
      return `${squareMeters.toFixed(0)} m²`
    } else if (hectares < 1) {
      return `${hectares.toFixed(2)} ha (${acres.toFixed(2)} acres)`
    } else {
      return `${hectares.toFixed(2)} ha (${acres.toFixed(1)} acres)`
    }
  }

  /**
   * Format distance for display
   * @param {number} meters - Distance in meters
   * @returns {string} Formatted distance string
   */
  function formatDistance(meters) {
    const kilometers = meters / METERS_TO_KILOMETERS
    const miles = meters / METERS_TO_MILES

    if (meters < 1000) {
      return `${meters.toFixed(0)} m`
    } else {
      return `${kilometers.toFixed(2)} km (${miles.toFixed(2)} mi)`
    }
  }

  /**
   * Create statistics panel HTML
   * @returns {HTMLElement} Stats panel element
   */
  function createStatsPanel() {
    const panel = document.createElement('div')
    panel.id = 'map-stats-panel'
    panel.className = 'map-stats-panel hidden'
    panel.setAttribute('role', 'status')
    panel.setAttribute('aria-live', 'polite')

    panel.innerHTML = `
      <div class="map-stats-content">
        <h3>Boundary information</h3>

        <dl class="map-stats-list">
          <div class="map-stat-item" id="stat-total-area-container" style="display: none;">
            <dt class="map-stat-label">Area</dt>
            <dd class="map-stat-value" id="stat-total-area">—</dd>
          </div>

          <div class="map-stat-item" id="stat-current-line-container" style="display: none;">
            <dt class="map-stat-label">Current segment</dt>
            <dd class="map-stat-value" id="stat-current-line">—</dd>
          </div>

          <div class="map-stat-item" id="stat-perimeter-container" style="display: none;">
            <dt class="map-stat-label">Perimeter</dt>
            <dd class="map-stat-value" id="stat-perimeter">—</dd>
          </div>
        </dl>
      </div>
    `

    return panel
  }

  /**
   * Update statistics display
   * @param {Object} stats - Statistics object
   */
  function updateStatsDisplay(stats) {
    if (!statsPanel) {
      console.warn('⚠️ statsPanel is null!')
      return
    }

    const totalAreaEl = document.getElementById('stat-total-area')
    const currentLineEl = document.getElementById('stat-current-line')
    const perimeterEl = document.getElementById('stat-perimeter')

    const totalAreaContainer = document.getElementById(
      'stat-total-area-container'
    )
    const currentLineContainer = document.getElementById(
      'stat-current-line-container'
    )
    const perimeterContainer = document.getElementById(
      'stat-perimeter-container'
    )

    // Show/hide containers based on what's available
    // Always show Area when drawing or when area exists
    if (stats.totalArea > 0.01) {
      // Show area if it's meaningful (> 0.01 square meters)
      totalAreaContainer.style.display = 'flex'
      totalAreaEl.textContent = formatArea(stats.totalArea)
    } else if (isDrawingActive) {
      totalAreaContainer.style.display = 'flex'
      totalAreaEl.textContent = '—'
    } else {
      totalAreaContainer.style.display = 'none'
    }

    // Show current segment ONLY during active drawing (hide when polygon is complete)
    if (isDrawingActive && drawnPoints.length >= 1) {
      currentLineContainer.style.display = 'flex'
      if (stats.currentLineDistance > 0) {
        currentLineEl.textContent = formatDistance(stats.currentLineDistance)
      } else {
        currentLineEl.textContent = '—'
      }
    } else {
      currentLineContainer.style.display = 'none'
    }

    // Show Perimeter when drawing or when perimeter exists
    if (stats.totalPerimeter > 0) {
      perimeterContainer.style.display = 'flex'
      perimeterEl.textContent = formatDistance(stats.totalPerimeter)
    } else if (isDrawingActive) {
      perimeterContainer.style.display = 'flex'
      perimeterEl.textContent = '—'
    } else {
      perimeterContainer.style.display = 'none'
    }

    // Show panel if we have any stats OR if drawing is active
    if (
      stats.totalArea > 0 ||
      stats.currentLineDistance > 0 ||
      stats.totalPerimeter > 0 ||
      isDrawingActive
    ) {
      statsPanel.classList.remove('hidden')
    } else {
      statsPanel.classList.add('hidden')
    }
  }

  // ============================================================================
  // CALCULATION FUNCTIONS
  // ============================================================================

  /**
   * Calculate statistics for a polygon layer
   * @param {L.Polygon} layer - Leaflet polygon layer
   * @returns {Object} Statistics object
   */
  function calculatePolygonStats(layer) {
    if (!layer || !window.turf) {
      return { totalArea: 0, totalPerimeter: 0, vertexCount: 0 }
    }

    try {
      const latLngs = layer.getLatLngs()[0]
      const coordinates = latLngs.map((latLng) => [latLng.lng, latLng.lat])
      coordinates.push(coordinates[0]) // Close the polygon

      const polygon = window.turf.polygon([coordinates])

      // Calculate area in square meters
      const area = window.turf.area(polygon)

      // Calculate perimeter
      const perimeter = window.turf.length(polygon, { units: 'meters' })

      return {
        totalArea: area,
        totalPerimeter: perimeter,
        vertexCount: latLngs.length
      }
    } catch (error) {
      console.error('Error calculating polygon stats:', error)
      return { totalArea: 0, totalPerimeter: 0, vertexCount: 0 }
    }
  }

  /**
   * Calculate distance for current drawing line (total of all segments drawn)
   * @param {Array} points - Array of L.LatLng points
   * @returns {number} Distance in meters
   */
  function calculateTotalDrawnDistance(points) {
    if (!points || points.length < 2 || !window.turf) {
      return 0
    }

    try {
      const coordinates = points.map((point) => [point.lng, point.lat])
      const line = window.turf.lineString(coordinates)
      return window.turf.length(line, { units: 'meters' })
    } catch (error) {
      console.error('Error calculating line distance:', error)
      return 0
    }
  }

  /**
   * Calculate distance for current segment (last point to mouse cursor)
   * @param {L.LatLng} lastPoint - Last plotted point
   * @param {L.LatLng} mousePoint - Current mouse position
   * @returns {number} Distance in meters
   */
  function calculateCurrentSegmentDistance(lastPoint, mousePoint) {
    if (!lastPoint || !mousePoint || !window.turf) {
      return 0
    }

    try {
      const line = window.turf.lineString([
        [lastPoint.lng, lastPoint.lat],
        [mousePoint.lng, mousePoint.lat]
      ])
      return window.turf.length(line, { units: 'meters' })
    } catch (error) {
      console.error('Error calculating segment distance:', error)
      return 0
    }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handle drawing vertex addition
   * @param {Object} event - Leaflet draw event
   */
  function handleDrawVertex(event) {
    if (!isDrawingActive) {
      return
    }

    // The DRAWVERTEX event contains the newly added vertex in event.layers
    if (event.layers) {
      const layers = event.layers.getLayers()

      if (layers.length > 0) {
        const points = layers.map((layer) => layer.getLatLng())
        drawnPoints = points

        // Set last plotted point
        if (drawnPoints.length > 0) {
          lastPlottedPoint = drawnPoints[drawnPoints.length - 1]
        }

        // Update stats
        if (drawnPoints.length === 1) {
          currentStats.currentLineDistance = 0
          currentStats.totalPerimeter = 0
        } else {
          currentStats.currentLineDistance = 0
          currentStats.totalPerimeter = calculateTotalDrawnDistance(drawnPoints)
        }

        currentStats.totalArea = 0
        updateStatsDisplay(currentStats)
      }
    }
  }

  /**
   * Calculate area for polygon being drawn (with current mouse position)
   * @param {Array} points - Array of L.LatLng points already placed
   * @param {L.LatLng} mousePoint - Current mouse position
   * @returns {number} Area in square meters
   */
  function calculateDrawingArea(points, mousePoint) {
    if (!points || points.length < 2 || !mousePoint || !window.turf) {
      return 0
    }

    try {
      // Create a temporary polygon with all placed points plus mouse position
      const allPoints = [...points, mousePoint]
      const coordinates = allPoints.map((point) => [point.lng, point.lat])
      // Close the polygon
      coordinates.push(coordinates[0])

      const polygon = window.turf.polygon([coordinates])
      return window.turf.area(polygon)
    } catch (error) {
      console.error('Error calculating drawing area:', error)
      return 0
    }
  }

  /**
   * Monitor drawing progress in real-time
   * This polls the current drawing state to update stats as user moves mouse
   */
  function monitorDrawingProgress() {
    if (!isDrawingActive || !map) return

    // Only update if we have at least one point and mouse position
    if (lastPlottedPoint && currentMousePosition) {
      // Calculate current segment distance (last point to mouse cursor)
      const currentSegmentDistance = calculateCurrentSegmentDistance(
        lastPlottedPoint,
        currentMousePosition
      )

      // Calculate total distance including the current segment being drawn
      let totalDrawnDistance = 0
      if (drawnPoints.length >= 2) {
        // Get distance of already completed segments
        totalDrawnDistance = calculateTotalDrawnDistance(drawnPoints)
      }

      // Add the current segment distance to show what total would be
      const projectedTotalDistance = totalDrawnDistance + currentSegmentDistance

      // Calculate area if we have at least 2 points (will form triangle with mouse)
      let projectedArea = 0
      if (drawnPoints.length >= 2) {
        projectedArea = calculateDrawingArea(drawnPoints, currentMousePosition)
      }

      // Only update if values have changed (using threshold to prevent floating point issues)
      const areaChanged = Math.abs(currentStats.totalArea - projectedArea) > 1
      const segmentChanged =
        Math.abs(currentStats.currentLineDistance - currentSegmentDistance) >
        0.1
      const perimeterChanged =
        Math.abs(currentStats.totalPerimeter - projectedTotalDistance) > 0.1

      if (segmentChanged || perimeterChanged || areaChanged) {
        currentStats.currentLineDistance = currentSegmentDistance
        currentStats.totalPerimeter = projectedTotalDistance
        currentStats.totalArea = projectedArea
        updateStatsDisplay(currentStats)
      }
    }

    if (isDrawingActive) {
      requestAnimationFrame(monitorDrawingProgress)
    }
  }

  /**
   * Monitor editing progress in real-time
   */
  function monitorEditingProgress() {
    if (!isEditingActive || !drawnItems) return

    const layers = drawnItems.getLayers()
    if (layers.length > 0) {
      const layer = layers[0]
      const stats = calculatePolygonStats(layer)

      // Only update if stats have changed (to avoid unnecessary DOM updates)
      if (
        currentStats.totalArea !== stats.totalArea ||
        currentStats.totalPerimeter !== stats.totalPerimeter
      ) {
        currentStats = {
          totalArea: stats.totalArea,
          currentLineDistance: 0,
          totalPerimeter: stats.totalPerimeter,
          vertexCount: stats.vertexCount
        }
        updateStatsDisplay(currentStats)
      }
    }

    if (isEditingActive) {
      setTimeout(monitorEditingProgress, 100)
    }
  }

  /**
   * Handle polygon completion
   * @param {L.Polygon} layer - Completed polygon layer
   */
  function handlePolygonComplete(layer) {
    if (!layer) return

    const stats = calculatePolygonStats(layer)
    currentStats = {
      totalArea: stats.totalArea,
      currentLineDistance: 0,
      totalPerimeter: stats.totalPerimeter,
      vertexCount: stats.vertexCount
    }
    updateStatsDisplay(currentStats)
  }

  /**
   * Handle polygon edit
   * @param {L.Polygon} layer - Edited polygon layer
   */
  function handlePolygonEdit(layer) {
    handlePolygonComplete(layer)
  }

  /**
   * Handle polygon deletion
   */
  function handlePolygonDelete() {
    currentStats = {
      totalArea: 0,
      currentLineDistance: 0,
      totalPerimeter: 0,
      vertexCount: 0
    }
    updateStatsDisplay(currentStats)
  }

  /**
   * Handle drawing start
   */
  function handleDrawStart() {
    isDrawingActive = true
    drawnPoints = []
    lastPlottedPoint = null
    currentMousePosition = null
    currentStats = {
      totalArea: 0,
      currentLineDistance: 0,
      totalPerimeter: 0,
      vertexCount: 0
    }
    updateStatsDisplay(currentStats)

    // Add mousemove listener to track cursor position
    if (map) {
      map.on('mousemove', handleMouseMove)
    }

    // Start monitoring drawing progress
    requestAnimationFrame(monitorDrawingProgress)
  }

  /**
   * Handle mouse move during drawing
   * @param {Object} event - Leaflet mouse event
   */
  function handleMouseMove(event) {
    if (!isDrawingActive) return
    currentMousePosition = event.latlng
  }

  /**
   * Handle drawing stop
   */
  function handleDrawStop() {
    isDrawingActive = false
    drawnPoints = []
    lastPlottedPoint = null
    currentMousePosition = null

    // Remove mousemove listener
    if (map) {
      map.off('mousemove', handleMouseMove)
    }
  }

  /**
   * Handle edit start
   */
  function handleEditStart() {
    isEditingActive = true
    monitorEditingProgress()
  }

  /**
   * Handle edit stop
   */
  function handleEditStop() {
    isEditingActive = false

    // When editing stops (e.g., cancel button), recalculate stats from the actual polygon
    // Use a small timeout to avoid triggering during the EDITED event
    setTimeout(() => {
      if (drawnItems && drawnItems.getLayers().length > 0) {
        const existingLayer = drawnItems.getLayers()[0]
        const stats = calculatePolygonStats(existingLayer)
        currentStats = {
          totalArea: stats.totalArea,
          currentLineDistance: 0,
          totalPerimeter: stats.totalPerimeter,
          vertexCount: stats.vertexCount
        }
        updateStatsDisplay(currentStats)
      } else {
        // No polygon exists, reset stats
        currentStats = {
          totalArea: 0,
          currentLineDistance: 0,
          totalPerimeter: 0,
          vertexCount: 0
        }
        updateStatsDisplay(currentStats)
      }
    }, 50)
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize statistics panel
   * @param {L.Map} mapInstance - Leaflet map instance
   * @param {L.FeatureGroup} drawnItemsGroup - Feature group for drawn items
   */
  function init(mapInstance, drawnItemsGroup) {
    if (!mapInstance || !drawnItemsGroup) {
      console.error('❌ Map or drawnItems not provided')
      return
    }

    // Store references
    map = mapInstance
    drawnItems = drawnItemsGroup

    // Check if Turf.js is loaded
    if (!window.turf) {
      console.warn('⚠️ Turf.js not loaded, statistics will be disabled')
      return
    }

    // Create and append stats panel
    const mapContainer = document.getElementById('map')
    if (!mapContainer) {
      console.error('❌ Map container not found')
      return
    }

    statsPanel = createStatsPanel()
    mapContainer.appendChild(statsPanel)

    // Set up event listeners
    map.on(L.Draw.Event.DRAWSTART, handleDrawStart)

    map.on(L.Draw.Event.DRAWSTOP, handleDrawStop)

    map.on(L.Draw.Event.DRAWVERTEX, handleDrawVertex)

    map.on(L.Draw.Event.CREATED, function (event) {
      isDrawingActive = false
      handlePolygonComplete(event.layer)
    })

    map.on(L.Draw.Event.EDITSTART, handleEditStart)

    map.on(L.Draw.Event.EDITSTOP, handleEditStop)

    map.on(L.Draw.Event.EDITED, function (event) {
      isEditingActive = false
      event.layers.eachLayer(handlePolygonEdit)
    })

    map.on(L.Draw.Event.DELETED, handlePolygonDelete)

    // Check for existing polygon
    if (drawnItems.getLayers().length > 0) {
      const existingLayer = drawnItems.getLayers()[0]
      handlePolygonComplete(existingLayer)
    }
  }

  /**
   * Clean up and reset statistics
   */
  function reset() {
    currentStats = {
      totalArea: 0,
      currentLineDistance: 0,
      totalPerimeter: 0,
      vertexCount: 0
    }
    updateStatsDisplay(currentStats)
  }

  // Export functions
  window.MapStats.init = init
  window.MapStats.reset = reset
  window.MapStats.handleDrawVertex = handleDrawVertex
  window.MapStats.handlePolygonComplete = handlePolygonComplete
  window.MapStats.handlePolygonEdit = handlePolygonEdit
  window.MapStats.handlePolygonDelete = handlePolygonDelete
})()
