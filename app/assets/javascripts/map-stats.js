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

  // Unit conversion constants
  const SQUARE_METERS_TO_HECTARES = 10000
  const SQUARE_METERS_TO_ACRES = 4046.8564224 // Exact conversion factor
  const METERS_TO_KILOMETERS = 1000
  const METERS_TO_MILES = 1609.34

  // Display thresholds
  const THRESHOLD_MIN_AREA_DISPLAY = 1.0 // m² - Don't show areas smaller than 1m²
  const THRESHOLD_AREA_UPDATE = 1.0 // m² - Only update if area changes by more than this
  const THRESHOLD_DISTANCE_UPDATE = 0.1 // m - Only update if distance changes by more than this

  // Performance constants
  const UPDATE_INTERVAL_MS = 100 // Update stats 10 times per second (throttled from 60fps)
  const EDIT_MONITOR_INTERVAL_MS = 100 // Monitor editing changes every 100ms

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

  // Performance tracking
  let lastUpdateTime = 0
  let editMonitorTimeoutId = null

  // ============================================================================
  // UI HELPERS
  // ============================================================================

  /**
   * Validate that all required dependencies are available
   * @returns {Object} Object with boolean flags for each dependency
   */
  function validateDependencies() {
    return {
      hasTurf: !!window.turf,
      hasMap: !!map,
      hasDrawnItems: !!drawnItems,
      hasStatsPanel: !!statsPanel
    }
  }

  /**
   * Reset current stats to zero values
   * @returns {Object} Reset stats object
   */
  function resetCurrentStats() {
    return {
      totalArea: 0,
      currentLineDistance: 0,
      totalPerimeter: 0,
      vertexCount: 0
    }
  }

  /**
   * Format area for display
   * @param {number} squareMeters - Area in square meters
   * @returns {string} Formatted area string
   */
  function formatArea(squareMeters) {
    const hectares = squareMeters / SQUARE_METERS_TO_HECTARES
    const acres = squareMeters / SQUARE_METERS_TO_ACRES

    if (hectares < 0.01) {
      return `${squareMeters.toFixed(0)}m²`
    } else if (hectares < 1) {
      return `${hectares.toFixed(2)}ha (${acres.toFixed(2)}acres)`
    } else {
      return `${hectares.toFixed(2)}ha (${acres.toFixed(1)}acres)`
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
      return `${meters.toFixed(0)}m`
    } else {
      return `${kilometers.toFixed(2)}km (${miles.toFixed(2)}mi)`
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
        <h2>Boundary information</h2>

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

        <div id="stat-intersections-container" style="display: none; margin-top: 20px; padding-top: 15px; border-top: 2px solid #b1b4b6;">
          <h3 class="govuk-heading-s" style="margin: 0 0 12px 0; font-size: 16px; font-weight: 700;">EDPs in your red line boundary</h3>
          <div id="stat-intersections-content"></div>
        </div>
      </div>
    `

    return panel
  }

  /**
   * Update intersections display
   * Shows lists of intersecting nutrient and GCN EDP areas
   * Called directly by MapAPI after each API response with fresh data
   * @param {Object} intersections - Intersections data from API {nutrient, gcn, intersections: [...]}
   */
  function updateIntersectionsDisplay(intersections) {
    const container = document.getElementById('stat-intersections-container')
    const content = document.getElementById('stat-intersections-content')

    if (!container || !content) {
      return
    }

    // Check if we have intersection data structure (not checking length - we want to show even if empty)
    if (!intersections || !intersections.intersections) {
      container.style.display = 'none'
      return
    }

    // Group intersections by type
    const nutrientAreas = intersections.intersections.filter(
      (i) => i.type === 'nutrient'
    )
    const gcnAreas = intersections.intersections.filter((i) => i.type === 'gcn')

    let html = ''

    // Nutrient EDPs - always show heading
    html +=
      '<div style="margin-bottom: 15px;"><h4 style="font-size: 14px; font-weight: 700; margin-bottom: 8px;">Nature Restoration Fund nutrients levy areas</h4>'
    if (nutrientAreas.length > 0) {
      html +=
        '<ul class="govuk-list govuk-list--bullet" style="margin: 0; font-size: 14px; padding-left: 20px;">'
      nutrientAreas.forEach((area) => {
        html += `<li style="margin-bottom: 5px;">${area.name}</li>`
      })
      html += '</ul>'
    } else {
      html +=
        '<p class="govuk-body-s" style="margin: 0; color: #505a5f;">None</p>'
    }
    html += '</div>'

    // GCN EDPs - always show heading
    html +=
      '<div><h4 style="font-size: 14px; font-weight: 700; margin-bottom: 8px;">Nature Restoration Fund great crested newt levy areas</h4>'
    if (gcnAreas.length > 0) {
      html +=
        '<ul class="govuk-list govuk-list--bullet" style="margin: 0; font-size: 14px; padding-left: 20px;">'
      gcnAreas.forEach((area) => {
        html += `<li style="margin-bottom: 5px;">${area.name}</li>`
      })
      html += '</ul>'
    } else {
      html +=
        '<p class="govuk-body-s" style="margin: 0; color: #505a5f;">None</p>'
    }
    html += '</div>'

    content.innerHTML = html
    container.style.display = 'block'
  }

  /**
   * Update statistics display
   * @param {Object} stats - Statistics object
   */
  function updateStatsDisplay(stats) {
    const deps = validateDependencies()
    if (!deps.hasStatsPanel) {
      console.warn('[MapStats] Stats panel is not available')
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
    if (stats.totalArea > THRESHOLD_MIN_AREA_DISPLAY) {
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

    // Note: updateIntersectionsDisplay() is NOT called here
    // It's called automatically by MapAPI after each API response

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
   * Calculate statistics for a polygon feature (MapboxDraw version)
   * @param {Object} feature - GeoJSON feature from MapboxDraw
   * @returns {Object} Statistics object
   */
  function calculatePolygonStats(feature) {
    const deps = validateDependencies()
    if (!feature || !deps.hasTurf) {
      return { totalArea: 0, totalPerimeter: 0, vertexCount: 0 }
    }

    try {
      // Extract coordinates from GeoJSON feature
      // MapboxDraw features have coordinates in [lng, lat] format already
      const coordinates = feature.geometry.coordinates[0]

      // Create a closed polygon for Turf.js (if not already closed)
      const closedCoordinates = [...coordinates]
      const first = closedCoordinates[0]
      const last = closedCoordinates[closedCoordinates.length - 1]
      if (first[0] !== last[0] || first[1] !== last[1]) {
        closedCoordinates.push(closedCoordinates[0])
      }

      const polygon = window.turf.polygon([closedCoordinates])

      // Calculate area in square meters
      const area = window.turf.area(polygon)

      // Calculate perimeter
      const perimeter = window.turf.length(polygon, { units: 'meters' })

      return {
        totalArea: area,
        totalPerimeter: perimeter,
        vertexCount: coordinates.length
      }
    } catch (error) {
      console.error('[MapStats] Error calculating polygon stats:', error)
      return { totalArea: 0, totalPerimeter: 0, vertexCount: 0 }
    }
  }

  /**
   * Calculate distance for current drawing line (total of all segments drawn)
   * @param {Array} points - Array of L.LatLng points
   * @returns {number} Distance in meters
   */
  function calculateTotalDrawnDistance(points) {
    const deps = validateDependencies()
    if (!points || points.length < 2 || !deps.hasTurf) {
      return 0
    }

    try {
      const coordinates = points.map((point) => [point.lng, point.lat])
      const line = window.turf.lineString(coordinates)
      return window.turf.length(line, { units: 'meters' })
    } catch (error) {
      console.error('[MapStats] Error calculating line distance:', error)
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
    const deps = validateDependencies()
    if (!lastPoint || !mousePoint || !deps.hasTurf) {
      return 0
    }

    try {
      const line = window.turf.lineString([
        [lastPoint.lng, lastPoint.lat],
        [mousePoint.lng, mousePoint.lat]
      ])
      return window.turf.length(line, { units: 'meters' })
    } catch (error) {
      console.error('[MapStats] Error calculating segment distance:', error)
      return 0
    }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  // Note: MapboxDraw doesn't provide DRAWVERTEX events like Leaflet Draw
  // Real-time drawing stats are handled by monitorDrawingProgress() which polls mouse position

  /**
   * Calculate area for polygon being drawn (with current mouse position)
   * @param {Array} points - Array of L.LatLng points already placed
   * @param {L.LatLng} mousePoint - Current mouse position
   * @returns {number} Area in square meters
   */
  function calculateDrawingArea(points, mousePoint) {
    const deps = validateDependencies()
    if (!points || points.length < 2 || !mousePoint || !deps.hasTurf) {
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
      console.error('[MapStats] Error calculating drawing area:', error)
      return 0
    }
  }

  /**
   * Monitor drawing progress in real-time (throttled)
   * This polls the current drawing state to update stats as user moves mouse
   * Throttled to UPDATE_INTERVAL_MS to prevent excessive CPU usage
   * @param {number} currentTime - Current timestamp from requestAnimationFrame
   */
  function monitorDrawingProgress(currentTime) {
    if (!isDrawingActive || !map) return

    // Throttle updates to reduce CPU usage and prevent 60fps calculations
    if (currentTime - lastUpdateTime < UPDATE_INTERVAL_MS) {
      if (isDrawingActive) {
        requestAnimationFrame(monitorDrawingProgress)
      }
      return
    }
    lastUpdateTime = currentTime

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
      const areaChanged =
        Math.abs(currentStats.totalArea - projectedArea) > THRESHOLD_AREA_UPDATE
      const segmentChanged =
        Math.abs(currentStats.currentLineDistance - currentSegmentDistance) >
        THRESHOLD_DISTANCE_UPDATE
      const perimeterChanged =
        Math.abs(currentStats.totalPerimeter - projectedTotalDistance) >
        THRESHOLD_DISTANCE_UPDATE

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
   * Monitor editing progress in real-time (MapboxDraw version)
   * Uses setTimeout with proper cleanup via editMonitorTimeoutId
   */
  function monitorEditingProgress() {
    if (!isEditingActive || !drawnItems) return

    const deps = validateDependencies()
    if (!deps.hasDrawnItems) return

    // Get features from MapboxDraw instance
    const features =
      drawnItems.getAll && drawnItems.getAll().features
        ? drawnItems.getAll().features
        : []

    if (features.length > 0) {
      // Currently only one polygon is supported
      if (features.length > 1) {
        console.warn(
          '[MapStats] Multiple polygons detected, only showing stats for first polygon'
        )
      }

      const feature = features[0]
      const stats = calculatePolygonStats(feature)

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
      editMonitorTimeoutId = setTimeout(
        monitorEditingProgress,
        EDIT_MONITOR_INTERVAL_MS
      )
    }
  }

  /**
   * Handle polygon completion (MapboxDraw version)
   * @param {Object} feature - GeoJSON feature from MapboxDraw
   */
  function handlePolygonComplete(feature) {
    if (!feature) return

    const stats = calculatePolygonStats(feature)
    currentStats = {
      totalArea: stats.totalArea,
      currentLineDistance: 0,
      totalPerimeter: stats.totalPerimeter,
      vertexCount: stats.vertexCount
    }
    updateStatsDisplay(currentStats)
  }

  /**
   * Handle polygon edit (MapboxDraw version)
   * @param {Object} feature - GeoJSON feature from MapboxDraw
   */
  function handlePolygonEdit(feature) {
    handlePolygonComplete(feature)
  }

  /**
   * Handle polygon deletion
   */
  function handlePolygonDelete() {
    currentStats = resetCurrentStats()
    updateStatsDisplay(currentStats)

    // Hide intersections display when boundary is deleted
    const container = document.getElementById('stat-intersections-container')
    if (container) {
      container.style.display = 'none'
    }
  }

  /**
   * Handle drawing start
   */
  function handleDrawStart() {
    isDrawingActive = true
    drawnPoints = []
    lastPlottedPoint = null
    currentMousePosition = null
    lastUpdateTime = 0 // Reset throttle timer
    currentStats = resetCurrentStats()
    updateStatsDisplay(currentStats)

    const deps = validateDependencies()
    if (!deps.hasMap) {
      console.warn('[MapStats] Map not available for drawing')
      return
    }

    // Add mousemove listener to track cursor position
    map.on('mousemove', handleMouseMove)

    // Start monitoring drawing progress
    requestAnimationFrame(monitorDrawingProgress)
  }

  /**
   * Handle mouse move during drawing (MapLibre version)
   * @param {Object} event - MapLibre mouse event
   */
  function handleMouseMove(event) {
    if (!isDrawingActive) return
    // MapLibre uses event.lngLat instead of event.latlng
    // Convert to format used by rest of code: { lng, lat }
    currentMousePosition = {
      lng: event.lngLat.lng,
      lat: event.lngLat.lat
    }
  }

  /**
   * Handle drawing stop
   */
  function handleDrawStop() {
    isDrawingActive = false
    drawnPoints = []
    lastPlottedPoint = null
    currentMousePosition = null

    const deps = validateDependencies()
    if (deps.hasMap) {
      map.off('mousemove', handleMouseMove)
    }
  }

  /**
   * Handle edit start
   */
  function handleEditStart() {
    isEditingActive = true
    monitorEditingProgress()

    // Hide intersections display while editing
    const container = document.getElementById('stat-intersections-container')
    if (container) {
      container.style.display = 'none'
    }
  }

  /**
   * Recalculate stats from the actual drawn polygon (MapboxDraw version)
   * Used after edit operations complete
   */
  function recalculateStatsFromDrawnItems() {
    const deps = validateDependencies()
    if (!deps.hasDrawnItems) return

    // Get features from MapboxDraw instance
    const features =
      drawnItems.getAll && drawnItems.getAll().features
        ? drawnItems.getAll().features
        : []

    if (features.length > 0) {
      const existingFeature = features[0]
      const stats = calculatePolygonStats(existingFeature)
      currentStats = {
        totalArea: stats.totalArea,
        currentLineDistance: 0,
        totalPerimeter: stats.totalPerimeter,
        vertexCount: stats.vertexCount
      }
      updateStatsDisplay(currentStats)
    } else {
      // No polygon exists, reset stats
      currentStats = resetCurrentStats()
      updateStatsDisplay(currentStats)
    }
  }

  /**
   * Handle edit stop
   * Uses requestAnimationFrame to ensure DOM is up to date
   * This replaces the previous setTimeout hack
   */
  function handleEditStop() {
    isEditingActive = false

    // Clear any pending edit monitor timeout
    if (editMonitorTimeoutId) {
      clearTimeout(editMonitorTimeoutId)
      editMonitorTimeoutId = null
    }

    // Queue recalculation to ensure it happens after EDITED event handlers complete
    // Using requestAnimationFrame ensures DOM is up to date
    requestAnimationFrame(() => {
      recalculateStatsFromDrawnItems()
    })
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Named handler for CREATED event (MapboxDraw version)
   * @param {Object} event - MapboxDraw event with features array
   */
  function handleCreated(event) {
    isDrawingActive = false
    if (event.features && event.features.length > 0) {
      handlePolygonComplete(event.features[0])
    }
  }

  /**
   * Named handler for EDITED event (MapboxDraw version)
   * @param {Object} event - MapboxDraw event with features array
   */
  function handleEdited(event) {
    isEditingActive = false

    // Clear any pending edit monitor timeout
    if (editMonitorTimeoutId) {
      clearTimeout(editMonitorTimeoutId)
      editMonitorTimeoutId = null
    }

    // Handle all edited features (usually just one)
    if (event.features && event.features.length > 0) {
      event.features.forEach(handlePolygonEdit)
    }
  }

  /**
   * Initialize statistics panel (MapboxDraw version)
   * @param {maplibregl.Map} mapInstance - MapLibre map instance
   * @param {MapboxDraw} drawInstance - MapboxDraw instance
   */
  function init(mapInstance, drawInstance) {
    if (!mapInstance || !drawInstance) {
      console.error('[MapStats] Map or draw instance not provided')
      return
    }

    // Store references
    map = mapInstance
    drawnItems = drawInstance

    // Check if Turf.js is loaded
    if (!window.turf) {
      console.warn('[MapStats] Turf.js not loaded, statistics will be disabled')
      return
    }

    // Create and append stats panel
    const mapContainer = document.getElementById('map')
    if (!mapContainer) {
      console.error('[MapStats] Map container not found')
      return
    }

    statsPanel = createStatsPanel()
    mapContainer.appendChild(statsPanel)

    // Set up event listeners with named functions for proper cleanup
    // MapboxDraw uses map.on('draw.create') instead of L.Draw.Event.CREATED
    map.on('draw.create', handleCreated)
    map.on('draw.update', handleEdited)
    map.on('draw.delete', handlePolygonDelete)

    // Note: MapboxDraw doesn't have DRAWSTART/DRAWSTOP/DRAWVERTEX/EDITSTART/EDITSTOP events
    // We'll handle these in the map-drawing-controls.js module

    // Check for existing polygon
    const features =
      drawnItems.getAll && drawnItems.getAll().features
        ? drawnItems.getAll().features
        : []
    if (features.length > 0) {
      handlePolygonComplete(features[0])
    }

    // Note: updateIntersectionsDisplay() is called automatically by MapAPI
    // after each /api/check-edp-intersection response
  }

  /**
   * Clean up event listeners and remove stats panel (MapboxDraw version)
   * Call this before re-initializing or when cleaning up the map
   */
  function destroy() {
    const deps = validateDependencies()

    // Remove event listeners
    if (deps.hasMap) {
      map.off('draw.create', handleCreated)
      map.off('draw.update', handleEdited)
      map.off('draw.delete', handlePolygonDelete)
      map.off('mousemove', handleMouseMove)
    }

    // Clear any pending timeouts
    if (editMonitorTimeoutId) {
      clearTimeout(editMonitorTimeoutId)
      editMonitorTimeoutId = null
    }

    // Remove stats panel from DOM
    if (statsPanel && statsPanel.parentNode) {
      statsPanel.parentNode.removeChild(statsPanel)
    }

    // Reset state
    statsPanel = null
    map = null
    drawnItems = null
    isDrawingActive = false
    isEditingActive = false
    currentMousePosition = null
    lastPlottedPoint = null
    drawnPoints = []
    lastUpdateTime = 0
    currentStats = resetCurrentStats()
  }

  /**
   * Clean up and reset statistics
   */
  function reset() {
    currentStats = resetCurrentStats()
    updateStatsDisplay(currentStats)
  }

  // Export functions
  window.MapStats.init = init
  window.MapStats.destroy = destroy
  window.MapStats.reset = reset
  window.MapStats.handleDrawStart = handleDrawStart
  window.MapStats.handleDrawStop = handleDrawStop
  window.MapStats.handleEditStart = handleEditStart
  window.MapStats.handleEditStop = handleEditStop
  window.MapStats.handlePolygonComplete = handlePolygonComplete
  window.MapStats.handlePolygonEdit = handlePolygonEdit
  window.MapStats.handlePolygonDelete = handlePolygonDelete
  window.MapStats.updateIntersections = updateIntersectionsDisplay
})()
