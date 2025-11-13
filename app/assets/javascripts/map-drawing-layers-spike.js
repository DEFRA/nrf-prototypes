/**
 * Map Drawing Interface for NRF Estimate
 * Handles interactive boundary drawing using Leaflet and Leaflet-Draw
 */

;(function () {
  'use strict'

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  // Map Configuration
  const ENGLAND_CENTER_LAT = 52.5
  const ENGLAND_CENTER_LNG = -1.5
  const ENGLAND_DEFAULT_ZOOM = 6

  // Colors
  const COLOR_BOUNDARY_RED = '#d4351c' // GOV.UK red for user-drawn boundaries
  const COLOR_CATCHMENT_PURPLE = '#ab47bc' // Purple for EDP catchment areas
  const COLOR_ERROR_YELLOW = '#e1e100' // Warning yellow for draw errors

  // Boundary Styles
  const BOUNDARY_STYLE = {
    color: COLOR_BOUNDARY_RED,
    weight: 3,
    opacity: 0.8,
    fillColor: COLOR_BOUNDARY_RED,
    fillOpacity: 0.2
  }

  const CATCHMENT_STYLE = {
    color: COLOR_CATCHMENT_PURPLE,
    weight: 2,
    opacity: 0.8,
    fillColor: COLOR_CATCHMENT_PURPLE,
    fillOpacity: 0.3
  }

  const CATCHMENT_STYLE_SATELLITE = {
    color: '#e0e0e0',
    weight: 2,
    opacity: 1,
    fillColor: '#ffffff',
    fillOpacity: 0.3
  }

  // Timing Constants (milliseconds)
  const DEBOUNCE_SEARCH_MS = 300 // Delay before executing search
  const DELAY_GOVUK_READY_MS = 1000 // Wait for GOV.UK components to initialize
  const DELAY_TOOLBAR_HIDE_MS = 100 // Wait for Leaflet toolbar to render before hiding
  const DELAY_ACCESSIBLE_CONTROLS_MS = 500 // Wait for map to be fully ready
  const DELAY_MODAL_SETUP_MS = 50 // Wait for modal DOM to be ready
  const DELAY_OUTSIDE_CLICK_MS = 100 // Prevent immediate outside click triggers
  const DELAY_MAP_RESIZE_MS = 100 // Wait for CSS transitions before recalculating map size

  // Cookie Configuration
  const COOKIE_MAP_LAYER = 'mapBaseLayer'
  const COOKIE_MAP_HINTS_CLOSED = 'mapHintsClosed'
  const COOKIE_EXPIRY_DAYS = 365

  // API Configuration
  const POSTCODES_API_BASE = 'https://api.postcodes.io/places'
  const POSTCODES_API_LIMIT = 50 // Request more results to filter for England
  const POSTCODES_MAX_DISPLAY_RESULTS = 10

  // Search Configuration
  const SEARCH_MIN_QUERY_LENGTH = 2

  // Zoom Levels by Location Type
  const ZOOM_LEVEL_BY_TYPE = {
    City: 11, // Large cities - zoomed out
    Town: 12, // Medium towns
    'Suburban Area': 13, // Suburban areas
    Village: 14, // Small villages
    Hamlet: 15, // Very small hamlets - street level
    'Other Settlement': 14, // Default for settlements
    Locality: 14 // Other localities
  }
  const ZOOM_LEVEL_DEFAULT = 13

  // Map Animation
  const FLY_TO_DURATION_SECONDS = 1.5

  // Padding for map bounds
  const MAP_BOUNDS_PADDING = 0.1

  // DOM Element IDs
  const DOM_IDS = {
    map: 'map',
    mapLoading: 'map-loading',
    boundaryData: 'boundary-data',
    errorSummary: 'client-error-summary',
    errorLink: 'client-error-link',
    startDrawing: 'start-drawing',
    editBoundary: 'edit-boundary',
    deleteBoundary: 'delete-boundary',
    zoomToEngland: 'zoom-to-england',
    zoomToBoundary: 'zoom-to-boundary',
    confirmEdit: 'confirm-edit-btn',
    cancelEdit: 'cancel-edit-btn',
    saveButtonContainer: 'map-save-button-container',
    editButtonsContainer: 'map-edit-buttons-container',
    locationSearchButton: 'location-search-button',
    locationSearchContainer: 'location-search-container',
    locationSearchInput: 'location-search-input',
    locationSearchResults: 'location-search-results',
    mapKeyButton: 'map-key-button',
    mapHelpButton: 'map-help-button'
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  let isDrawing = false
  let isEditing = false
  let drawnItems = null
  let catchmentLayers = []
  let currentMapStyle = 'street'

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
  // ERROR HANDLING
  // ============================================================================

  function showErrorSummary(message) {
    const errorSummary = document.getElementById(DOM_IDS.errorSummary)
    const errorLink = document.getElementById(DOM_IDS.errorLink)

    if (errorSummary && errorLink) {
      errorLink.textContent = message
      errorSummary.classList.remove('hidden')
      errorSummary.scrollIntoView({ behavior: 'smooth', block: 'start' })
      errorSummary.focus()
    }
  }

  function hideErrorSummary() {
    const errorSummary = document.getElementById(DOM_IDS.errorSummary)
    if (errorSummary) {
      errorSummary.classList.add('hidden')
    }
  }

  // ============================================================================
  // UTILITY HELPERS
  // ============================================================================

  /**
   * Convert hex color to rgba with alpha transparency
   * @param {string} hex - Hex color code (e.g., '#ffffff')
   * @param {number} alpha - Alpha value between 0 and 1
   * @returns {string} rgba color string (e.g., 'rgba(255, 255, 255, 0.5)')
   */
  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  // ============================================================================
  // ELEMENT STATE HELPERS
  // ============================================================================
  function enableElement(element) {
    element.disabled = false
  }

  function disableElement(element) {
    element.disabled = true
  }

  function showElement(element) {
    element.classList.remove('hidden')
  }

  function hideElement(element) {
    element.classList.add('hidden')
  }

  // ============================================================================
  // MAP INITIALIZATION
  // ============================================================================

  // Helper function to create catchment polygon from GeoJSON feature
  function createCatchmentPolygon(feature, index, map) {
    const properties = feature.properties
    const geometry = feature.geometry

    // Extract catchment name from properties
    const catchmentName =
      properties.Label || properties.N2K_Site_N || `Catchment ${index + 1}`

    // Convert GeoJSON coordinates to Leaflet format
    if (geometry.type === 'Polygon') {
      const coordinates = geometry.coordinates[0].map((coord) => [
        coord[1],
        coord[0]
      ]) // Convert [lng, lat] to [lat, lng]

      // Use appropriate style based on current map style
      const style =
        currentMapStyle === 'satellite'
          ? CATCHMENT_STYLE_SATELLITE
          : CATCHMENT_STYLE
      const polygon = L.polygon(coordinates, style).addTo(map)

      // Add popup with catchment information
      const popupContent = buildCatchmentPopupContent(catchmentName, properties)
      polygon.bindPopup(popupContent)

      return {
        name: catchmentName,
        polygon: polygon,
        coordinates: coordinates,
        properties: properties
      }
    }

    return null
  }

  function buildCatchmentPopupContent(catchmentName, properties) {
    return `
      <strong>${catchmentName}</strong><br>
      ${properties.PopupInfo ? `Type: ${properties.PopupInfo}<br>` : ''}
      ${properties.DateAmend ? `Last Updated: ${properties.DateAmend}<br>` : ''}
      ${properties.Notes ? `Notes: ${properties.Notes}` : ''}
    `
  }

  // Helper function to load existing boundary from hidden input
  function loadExistingBoundary(drawnItems, map) {
    const existingBoundaryData = document.getElementById(
      DOM_IDS.boundaryData
    ).value

    if (existingBoundaryData) {
      try {
        const boundaryData = JSON.parse(existingBoundaryData)

        if (
          boundaryData.coordinates &&
          Array.isArray(boundaryData.coordinates) &&
          boundaryData.coordinates.length > 0
        ) {
          const latLngs = boundaryData.coordinates.map((point) => [
            point[1],
            point[0]
          ])

          const existingPolygon = L.polygon(latLngs, BOUNDARY_STYLE)

          drawnItems.addLayer(existingPolygon)
          map.fitBounds(existingPolygon.getBounds().pad(MAP_BOUNDS_PADDING))

          return true
        }
      } catch (error) {
        console.error('Error loading existing boundary:', error)
      }
    }

    return false
  }

  // Helper function to setup form validation
  function setupFormValidation() {
    document.querySelector('form').addEventListener('submit', function (e) {
      if (isDrawing) {
        e.preventDefault()
        showErrorSummary('Finish or delete the red line boundary to continue')
        return false
      }

      if (isEditing) {
        e.preventDefault()
        showErrorSummary(
          'Stop editing or delete the red line boundary to continue'
        )
        return false
      }

      const boundaryData = document.getElementById(DOM_IDS.boundaryData).value
      if (!boundaryData) {
        e.preventDefault()
        showErrorSummary('Draw a red line boundary to continue')
        return false
      }

      hideErrorSummary()

      // Check for nav=summary query parameter
      if (shouldRedirectToSummary(boundaryData)) {
        e.preventDefault()
        window.location.href = '/nrf-estimate-2-map-layers-spike/summary'
        return false
      }
    })
  }

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

  function initMap() {
    // Additional delay to ensure GOV.UK components are ready
    setTimeout(function () {
      if (!checkLeafletLoaded()) {
        return
      }

      const mapContainer = document.getElementById(DOM_IDS.map)
      if (!mapContainer) {
        console.error('Map container not found')
        return
      }

      try {
        hideLoadingMessage()

        // Initialize the map centered on England
        const map = createBaseMap()

        // Setup base layers (street and satellite)
        const { streetMap, satelliteMap } = createBaseLayers()
        addSavedLayerToMap(map, streetMap, satelliteMap)

        // Add map controls
        addMapStyleSwitcher(map, mapContainer, streetMap, satelliteMap)
        addZoomControl(map)

        // Load GeoJSON boundaries
        const edpData = {
          boundaries: [],
          layers: []
        }
        loadCatchmentData(map, edpData)

        // Initialize the draw control
        drawnItems = new L.FeatureGroup()
        map.addLayer(drawnItems)

        configureDrawTooltips()
        const drawControl = createDrawControl(drawnItems)
        map.addControl(drawControl)

        hideDrawToolbar()

        // Initialize location search
        initLocationSearch(map)

        // Initialize map key
        initMapKey(map)

        // Initialize map help button
        initMapHelp(map)

        // Load existing boundary data if available
        loadExistingBoundary(drawnItems, map)

        // Form submission validation
        setupFormValidation()

        // Initialize accessible controls
        initAccessibleControlsDelayed(map, drawControl, drawnItems, edpData)
      } catch (error) {
        console.error('Error initializing map:', error)
        showMapError()
      }
    }, DELAY_GOVUK_READY_MS)
  }

  function checkLeafletLoaded() {
    if (typeof L === 'undefined') {
      console.error('Leaflet library not loaded')
      const loadingDiv = document.getElementById(DOM_IDS.mapLoading)
      if (loadingDiv) {
        loadingDiv.innerHTML =
          '<p class="govuk-body map-error-message">Error: Map library not loaded. Please refresh the page.</p>'
      }
      return false
    }
    return true
  }

  function hideLoadingMessage() {
    const loadingDiv = document.getElementById(DOM_IDS.mapLoading)
    if (loadingDiv) {
      loadingDiv.classList.add('hidden')
    }
  }

  function createBaseMap() {
    return L.map(DOM_IDS.map, {
      zoomControl: false
    }).setView([ENGLAND_CENTER_LAT, ENGLAND_CENTER_LNG], ENGLAND_DEFAULT_ZOOM)
  }

  function createBaseLayers() {
    const streetMap = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '© OpenStreetMap contributors'
      }
    )

    const satelliteMap = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution:
          'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and others'
      }
    )

    return { streetMap, satelliteMap }
  }

  function getSavedLayerPreference() {
    if (!window.Cookies) {
      return null
    }
    return window.Cookies.get(COOKIE_MAP_LAYER)
  }

  function addSavedLayerToMap(map, streetMap, satelliteMap) {
    const savedLayer = getSavedLayerPreference()

    if (savedLayer === 'satellite') {
      satelliteMap.addTo(map)
      currentMapStyle = 'satellite'
    } else {
      streetMap.addTo(map)
      currentMapStyle = 'street'
    }
  }

  function addMapStyleSwitcher(map, mapContainer, streetMap, satelliteMap) {
    const mapStyleButton = L.control({ position: 'topright' })
    mapStyleButton.onAdd = function () {
      const button = createMapStyleButton()
      L.DomEvent.disableClickPropagation(button)
      L.DomEvent.on(button, 'click', function (e) {
        L.DomEvent.stopPropagation(e)
        showMapStyleModal(map, mapContainer, streetMap, satelliteMap)
      })
      return button
    }
    mapStyleButton.addTo(map)
  }

  function createMapStyleButton() {
    const button = L.DomUtil.create('button', 'map-style-button')
    button.type = 'button'
    button.innerHTML = getMapStyleButtonSVG()
    button.title = 'Change map style'
    button.setAttribute('aria-label', 'Change map style')
    return button
  }

  function getMapStyleButtonSVG() {
    return `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="9" height="9" fill="#505a5f" stroke="none"/>
        <rect x="13" y="2" width="9" height="9" fill="#b1b4b6" stroke="none"/>
        <rect x="2" y="13" width="9" height="9" fill="#b1b4b6" stroke="none"/>
        <rect x="13" y="13" width="9" height="9" fill="#505a5f" stroke="none"/>
      </svg>
    `
  }

  function addZoomControl(map) {
    L.control
      .zoom({
        position: 'topright'
      })
      .addTo(map)
  }

  function configureDrawTooltips() {
    // Disable tooltips
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

  function createDrawControl(drawnItems) {
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
        featureGroup: drawnItems,
        remove: true
      }
    })
  }

  function hideDrawToolbar() {
    setTimeout(() => {
      const toolbar = document.querySelector('.leaflet-draw-toolbar')
      if (toolbar) {
        toolbar.classList.add('hidden')
      }
    }, DELAY_TOOLBAR_HIDE_MS)
  }

  function initAccessibleControlsDelayed(
    map,
    drawControl,
    drawnItems,
    edpData
  ) {
    setTimeout(() => {
      if (map && drawControl && drawnItems) {
        initAccessibleControls(map, drawControl, drawnItems, edpData.layers)
      }
    }, DELAY_ACCESSIBLE_CONTROLS_MS)
  }

  function showMapError() {
    const loadingDiv = document.getElementById(DOM_IDS.mapLoading)
    if (loadingDiv) {
      loadingDiv.innerHTML =
        '<p class="govuk-body map-error-message">Error loading map. Please refresh the page.</p>'
    }
  }

  // Map style modal instance
  let mapStyleModal = null

  // Create map style modal
  function showMapStyleModal(map, mapContainer, streetMap, satelliteMap) {
    // Hide error banner when opening modal
    hideErrorSummary()

    // Re-read the cookie each time the modal opens to get the current selection
    const currentLayer = getSavedLayerPreference()

    // Create modal content
    const modalContent = createMapStyleModalContent(currentLayer)

    // Create modal using component
    mapStyleModal = new Modal({
      title: 'Map style',
      position: 'top-right',
      content: modalContent,
      container: mapContainer,
      closeOnOutsideClick: false, // We'll handle this manually to exclude the button
      onClose: () => {
        mapStyleModal = null
      }
    })

    mapStyleModal.open()

    // Setup event handlers after modal is created
    setupMapStyleModalHandlers(map, streetMap, satelliteMap)
  }

  function createMapStyleModalContent(currentLayer) {
    const streetSelected =
      currentLayer !== 'satellite' ? 'map-style-option--selected' : ''
    const satelliteSelected =
      currentLayer === 'satellite' ? 'map-style-option--selected' : ''

    return `
      <div class="map-style-options">
        <button class="map-style-option ${streetSelected}" data-style="street">
          <div class="map-style-thumbnail">
            <img src="${getStreetMapThumbnail()}" alt="Street map preview" />
          </div>
          <span class="map-style-label">Street map</span>
        </button>
        <button class="map-style-option ${satelliteSelected}" data-style="satellite">
          <div class="map-style-thumbnail">
            <img src="${getSatelliteMapThumbnail()}" alt="Satellite view preview" />
          </div>
          <span class="map-style-label">Satellite</span>
        </button>
      </div>
    `
  }

  function getStreetMapThumbnail() {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23f2efe9' width='100' height='100'/%3E%3Cpath fill='%23fff' d='M20 30h15v20H20zM50 25h30v15H50zM25 60h20v25H25zM60 55h25v30H60z'/%3E%3Cpath stroke='%23ccc' stroke-width='2' fill='none' d='M0 40h100M40 0v100'/%3E%3Cpath fill='%23d4d4d4' d='M5 5h8v8H5zM65 70h6v6h-6z'/%3E%3C/svg%3E"
  }

  function getSatelliteMapThumbnail() {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3Cpattern id='terrain' width='10' height='10' patternUnits='userSpaceOnUse'%3E%3Crect fill='%234a5f3a' width='10' height='10'/%3E%3Crect fill='%235d7047' x='2' y='2' width='4' height='4'/%3E%3C/pattern%3E%3C/defs%3E%3Crect fill='url(%23terrain)' width='100' height='100'/%3E%3Cpath fill='%23667d52' d='M20 40h25v20H20z'/%3E%3Cpath fill='%2378916a' d='M60 60h30v25H60z'/%3E%3Cpath fill='%233d4f2f' d='M10 75h15v15H10z'/%3E%3C/svg%3E"
  }

  function setupMapStyleModalHandlers(map, streetMap, satelliteMap) {
    setTimeout(() => {
      const modalElement = mapStyleModal.getElement()
      if (!modalElement) return

      // Style option handlers
      const options = modalElement.querySelectorAll('.map-style-option')
      options.forEach((option) => {
        option.addEventListener('click', () => {
          const style = option.getAttribute('data-style')
          handleMapStyleChange(style, options, map, streetMap, satelliteMap)
        })
      })

      // Custom outside click handler (exclude the map style button)
      setupOutsideClickHandler(modalElement)
    }, DELAY_MODAL_SETUP_MS)
  }

  function updateCatchmentStyles(style) {
    const targetStyle =
      style === 'satellite' ? CATCHMENT_STYLE_SATELLITE : CATCHMENT_STYLE
    catchmentLayers.forEach((polygon) => {
      polygon.setStyle(targetStyle)
    })
  }

  function updateMapKey(style, map) {
    if (map._keyModal) {
      const newContent = getKeyContent(style)
      map._keyModal.updateContent(newContent)
    }
  }

  function handleMapStyleChange(style, options, map, streetMap, satelliteMap) {
    // Update selected state visually
    options.forEach((opt) => {
      opt.classList.remove('map-style-option--selected')
    })
    options.forEach((opt) => {
      if (opt.getAttribute('data-style') === style) {
        opt.classList.add('map-style-option--selected')
      }
    })

    // Remove all tile layers
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer)
      }
    })

    // Add selected layer and save preference
    if (style === 'satellite') {
      satelliteMap.addTo(map)
      saveLayerPreference('satellite')
      currentMapStyle = 'satellite'
    } else {
      streetMap.addTo(map)
      saveLayerPreference('street')
      currentMapStyle = 'street'
    }

    // Update catchment polygon styles
    updateCatchmentStyles(style)

    // Update map key to reflect new style
    updateMapKey(style, map)

    // Close modal
    mapStyleModal.close()
  }

  function saveLayerPreference(layerType) {
    if (window.Cookies) {
      window.Cookies.set(COOKIE_MAP_LAYER, layerType, {
        expires: COOKIE_EXPIRY_DAYS,
        path: '/'
      })
    }
  }

  function setupOutsideClickHandler(modalElement) {
    const outsideClickHandler = (e) => {
      if (
        modalElement &&
        !modalElement.contains(e.target) &&
        !e.target.closest('.map-style-button')
      ) {
        mapStyleModal.close()
        document.removeEventListener('click', outsideClickHandler, true)
      }
    }

    setTimeout(() => {
      document.addEventListener('click', outsideClickHandler, true)
    }, DELAY_OUTSIDE_CLICK_MS)
  }

  function loadCatchmentData(map, edpData) {
    fetch('/nrf-estimate-2-map-layers-spike/catchments.geojson')
      .then((response) => response.json())
      .then((data) => {
        processCatchmentFeatures(data.features, map, edpData)
      })
      .catch((error) => {
        console.error('Error loading GeoJSON data:', error)
        showCatchmentLoadError()
      })
  }

  function processCatchmentFeatures(features, map, edpData) {
    features.forEach((feature, index) => {
      const catchmentData = createCatchmentPolygon(feature, index, map)

      if (catchmentData) {
        edpData.layers.push(catchmentData)
        edpData.boundaries.push({
          name: catchmentData.name,
          coordinates: catchmentData.coordinates
        })
        // Store catchment layers globally for style updates
        catchmentLayers.push(catchmentData.polygon)
      }
    })

    // Re-check any existing drawn polygons for intersections
    recheckExistingPolygons(edpData.layers)

    // Only fit map to catchments if no existing boundary is loaded
    fitMapToCatchmentsIfNeeded(map, edpData.layers)
  }

  function recheckExistingPolygons(edpLayers) {
    if (!drawnItems) return

    drawnItems.eachLayer(function (layer) {
      if (layer instanceof L.Polygon) {
        const intersectingCatchment = findIntersectingCatchment(
          layer,
          edpLayers
        )
        updateBoundaryData(layer, intersectingCatchment)
      }
    })
  }

  function fitMapToCatchmentsIfNeeded(map, edpLayers) {
    const existingBoundaryData = document.getElementById(
      DOM_IDS.boundaryData
    ).value

    if (edpLayers.length > 0 && !existingBoundaryData) {
      const group = new L.featureGroup(edpLayers.map((edp) => edp.polygon))
      map.fitBounds(group.getBounds().pad(MAP_BOUNDS_PADDING))
    }
  }

  function showCatchmentLoadError() {
    const loadingDiv = document.getElementById(DOM_IDS.mapLoading)
    if (loadingDiv) {
      loadingDiv.innerHTML =
        '<p class="govuk-body">Map loaded successfully. Catchment data temporarily unavailable.</p>'
    }
  }

  // ============================================================================
  // GEOMETRY CALCULATION HELPERS
  // ============================================================================

  // Helper function to check if two line segments intersect
  function lineSegmentsIntersect(p1, q1, p2, q2) {
    function orientation(p, q, r) {
      const val = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1])
      if (val === 0) return 0
      return val > 0 ? 1 : 2
    }

    function onSegment(p, q, r) {
      return (
        q[0] <= Math.max(p[0], r[0]) &&
        q[0] >= Math.min(p[0], r[0]) &&
        q[1] <= Math.max(p[1], r[1]) &&
        q[1] >= Math.min(p[1], r[1])
      )
    }

    const o1 = orientation(p1, q1, p2)
    const o2 = orientation(p1, q1, q2)
    const o3 = orientation(p2, q2, p1)
    const o4 = orientation(p2, q2, q1)

    if (o1 !== o2 && o3 !== o4) return true

    if (o1 === 0 && onSegment(p1, p2, q1)) return true
    if (o2 === 0 && onSegment(p1, q2, q1)) return true
    if (o3 === 0 && onSegment(p2, p1, q2)) return true
    if (o4 === 0 && onSegment(p2, q1, q2)) return true

    return false
  }

  function isPointInPolygon(point, polygon) {
    const x = point[0],
      y = point[1]
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0],
        yi = polygon[i][1]
      const xj = polygon[j][0],
        yj = polygon[j][1]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside
      }
    }
    return inside
  }

  function polygonIntersects(polygon1, polygon2) {
    const poly2 = polygon2.map((coord) => [coord[1], coord[0]])

    const bounds1 = getPolygonBounds(polygon1)
    const bounds2 = getPolygonBounds(poly2)

    if (!boundsOverlap(bounds1, bounds2)) {
      return false
    }

    for (let i = 0; i < polygon1.length; i++) {
      if (isPointInPolygon(polygon1[i], poly2)) {
        return true
      }
    }

    for (let i = 0; i < poly2.length; i++) {
      if (isPointInPolygon(poly2[i], polygon1)) {
        return true
      }
    }

    const centerLng =
      polygon1.reduce((sum, coord) => sum + coord[0], 0) / polygon1.length
    const centerLat =
      polygon1.reduce((sum, coord) => sum + coord[1], 0) / polygon1.length
    if (isPointInPolygon([centerLng, centerLat], poly2)) {
      return true
    }

    for (let i = 0; i < polygon1.length; i++) {
      const p1 = polygon1[i]
      const q1 = polygon1[(i + 1) % polygon1.length]

      for (let j = 0; j < poly2.length; j++) {
        const p2 = poly2[j]
        const q2 = poly2[(j + 1) % poly2.length]

        if (lineSegmentsIntersect(p1, q1, p2, q2)) {
          return true
        }
      }
    }

    return false
  }

  function getPolygonBounds(polygon) {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    for (const point of polygon) {
      minX = Math.min(minX, point[0])
      minY = Math.min(minY, point[1])
      maxX = Math.max(maxX, point[0])
      maxY = Math.max(maxY, point[1])
    }
    return { minX, minY, maxX, maxY }
  }

  function boundsOverlap(bounds1, bounds2) {
    return !(
      bounds1.maxX < bounds2.minX ||
      bounds2.maxX < bounds1.minX ||
      bounds1.maxY < bounds2.minY ||
      bounds2.maxY < bounds1.minY
    )
  }

  // ============================================================================
  // BOUNDARY DATA MANAGEMENT
  // ============================================================================

  // Helper function to check polygon intersection with catchments
  function findIntersectingCatchment(layer, edpLayers) {
    if (!layer || !edpLayers || edpLayers.length === 0) {
      return null
    }

    const drawnPolygon = layer.getLatLngs()[0]
    const drawnPoints = drawnPolygon.map((latLng) => [latLng.lng, latLng.lat])

    for (const catchment of edpLayers) {
      if (polygonIntersects(drawnPoints, catchment.coordinates)) {
        return catchment
      }
    }

    return null
  }

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
  // DRAWING CONTROLS
  // ============================================================================

  function initAccessibleControls(map, drawControl, drawnItems, edpLayers) {
    if (!map || !drawControl || !drawnItems) {
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

    // Setup all button event handlers
    setupDrawingControls(
      controls,
      map,
      drawControl,
      drawnItems,
      currentDrawingLayer
    )
    setupMapEventHandlers(map, drawnItems, edpLayers)

    updateLinkStates(controls, drawnItems)
  }

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

  function setupDrawingControls(
    controls,
    map,
    drawControl,
    drawnItems,
    currentDrawingLayer
  ) {
    // Start drawing
    controls.startDrawingBtn.addEventListener('click', function (e) {
      e.preventDefault()
      handleStartDrawingClick(drawControl, currentDrawingLayer, drawnItems, map)
    })

    // Edit boundary
    controls.editBoundaryBtn.addEventListener('click', function (e) {
      e.preventDefault()
      handleEditBoundaryClick(drawControl, drawnItems, map)
    })

    // Delete boundary
    controls.deleteBoundaryBtn.addEventListener('click', function (e) {
      e.preventDefault()
      handleDeleteBoundaryClick(drawControl, drawnItems, controls)
    })

    // Confirm edit/drawing
    controls.confirmEditBtn.addEventListener('click', function (e) {
      e.preventDefault()
      handleConfirmEdit(drawControl, map)
    })

    // Cancel edit/drawing
    controls.cancelEditBtn.addEventListener('click', function (e) {
      e.preventDefault()
      handleCancelEdit(drawControl, currentDrawingLayer, drawnItems, map)
    })

    // Zoom to England
    controls.zoomToEnglandBtn.addEventListener('click', function (e) {
      e.preventDefault()
      map.setView(
        [ENGLAND_CENTER_LAT, ENGLAND_CENTER_LNG],
        ENGLAND_DEFAULT_ZOOM
      )
    })

    // Zoom to boundary
    controls.zoomToBoundaryBtn.addEventListener('click', function (e) {
      e.preventDefault()
      handleZoomToBoundary(drawnItems, map)
    })
  }

  function handleStartDrawingClick(
    drawControl,
    currentDrawingLayer,
    drawnItems,
    map
  ) {
    if (isDrawing) {
      if (currentDrawingLayer) {
        drawnItems.removeLayer(currentDrawingLayer)
        currentDrawingLayer = null
      }
      const polygonHandler = getPolygonHandler(drawControl, 'draw')
      if (polygonHandler) {
        polygonHandler.disable()
      }
      isDrawing = false
      hideErrorSummary()
      exitEditMode(map)
    } else {
      const polygonHandler = getPolygonHandler(drawControl, 'draw')
      if (polygonHandler) {
        polygonHandler.enable()
        isDrawing = true
        enterEditMode(map)
      }
    }
  }

  function handleEditBoundaryClick(drawControl, drawnItems, map) {
    if (isEditing) {
      const editHandler = getEditHandler(drawControl)
      if (editHandler) {
        editHandler.save()
        editHandler.disable()
      }
      isEditing = false
      hideErrorSummary()
      exitEditMode(map)
    } else {
      if (drawnItems.getLayers().length > 0) {
        const editHandler = getEditHandler(drawControl)
        if (editHandler) {
          editHandler.enable()
          isEditing = true
          enterEditMode(map)
        }
      } else {
        showErrorSummary('No boundary to edit. Please draw a boundary first.')
      }
    }
  }

  function handleDeleteBoundaryClick(drawControl, drawnItems, controls) {
    if (drawnItems.getLayers().length > 0) {
      // Delete the boundary immediately
      drawnItems.clearLayers()
      updateBoundaryData(null, null)
      hideErrorSummary()
      updateLinkStates(controls, drawnItems)

      // Reset editing and drawing states
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
      showErrorSummary('No boundary to delete.')
    }
  }

  function handleConfirmEdit(drawControl, map) {
    // Handle drawing mode - complete the drawing
    if (isDrawing) {
      const drawHandler = getPolygonHandler(drawControl, 'draw')
      if (drawHandler && drawHandler._enabled) {
        drawHandler.completeShape()
      }
    }

    // Handle edit mode - save edits
    if (isEditing) {
      const editHandler = getEditHandler(drawControl)
      if (editHandler && editHandler._enabled) {
        editHandler.save()
        editHandler.disable()
      }
      isEditing = false
    }

    // Exit drawing mode
    if (isDrawing) {
      const polygonHandler = getPolygonHandler(drawControl, 'draw')
      if (polygonHandler) {
        polygonHandler.disable()
      }
      isDrawing = false
    }

    hideErrorSummary()
    exitEditMode(map)

    // Ensure save button is shown after confirming edit
    const saveButtonContainer = document.getElementById(
      DOM_IDS.saveButtonContainer
    )
    if (
      saveButtonContainer &&
      drawnItems &&
      drawnItems.getLayers().length > 0
    ) {
      saveButtonContainer.classList.remove('hidden')
    }
  }

  function handleCancelEdit(drawControl, currentDrawingLayer, drawnItems, map) {
    // Cancel drawing mode - remove any partial drawing
    if (isDrawing) {
      if (currentDrawingLayer) {
        drawnItems.removeLayer(currentDrawingLayer)
        currentDrawingLayer = null
      }
      const polygonHandler = getPolygonHandler(drawControl, 'draw')
      if (polygonHandler) {
        polygonHandler.disable()
      }
      isDrawing = false
    }

    // Cancel edit mode - revert any changes
    if (isEditing) {
      const editHandler = getEditHandler(drawControl)
      if (editHandler && editHandler._enabled) {
        editHandler.revertLayers()
        editHandler.disable()
      }
      isEditing = false
    }

    hideErrorSummary()
    exitEditMode(map)
  }

  function handleZoomToBoundary(drawnItems, map) {
    if (drawnItems.getLayers().length > 0) {
      const group = new L.featureGroup(drawnItems.getLayers())
      map.fitBounds(group.getBounds().pad(MAP_BOUNDS_PADDING))
      hideErrorSummary()
    } else {
      showErrorSummary('No boundary to zoom to.')
    }
  }

  // Helper to safely access Leaflet draw handlers
  function getPolygonHandler(drawControl, type) {
    if (type === 'draw') {
      return drawControl._toolbars?.draw?._modes?.polygon?.handler
    }
    return null
  }

  function getEditHandler(drawControl) {
    return drawControl._toolbars?.edit?._modes?.edit?.handler
  }

  // Helper functions for edit mode UI
  function enterEditMode(map) {
    const panel = document.querySelector('.map-controls-panel')
    const saveButtonContainer = document.getElementById(
      DOM_IDS.saveButtonContainer
    )
    const editButtonsContainer = document.getElementById(
      DOM_IDS.editButtonsContainer
    )

    // Hide the side panel
    if (panel) {
      panel.classList.add('hidden')
    }

    // Hide the save button, show edit buttons
    if (saveButtonContainer) {
      saveButtonContainer.classList.add('hidden')
    }
    if (editButtonsContainer) {
      editButtonsContainer.classList.remove('hidden')
    }

    // Hide search button and container
    if (map._searchButton) {
      hideElement(map._searchButton)
    }
    if (map._searchContainer) {
      hideElement(map._searchContainer)
    }

    // Hide key button and modal
    if (map._keyButton) {
      hideElement(map._keyButton)
    }
    if (map._keyModal) {
      map._keyModal.close()
    }

    // Hide help button and modal
    if (map._helpButton) {
      hideElement(map._helpButton)
    }
    if (map._helpModal) {
      map._helpModal.close()
    }

    // Force Leaflet to recalculate map size after panel is hidden
    setTimeout(() => {
      map.invalidateSize()
    }, DELAY_MAP_RESIZE_MS)
  }

  function exitEditMode(map) {
    const panel = document.querySelector('.map-controls-panel')
    const saveButtonContainer = document.getElementById(
      DOM_IDS.saveButtonContainer
    )
    const editButtonsContainer = document.getElementById(
      DOM_IDS.editButtonsContainer
    )

    // Show the side panel
    if (panel) {
      panel.classList.remove('hidden')
    }

    // Show the save button if boundary exists, hide edit buttons
    if (
      saveButtonContainer &&
      drawnItems &&
      drawnItems.getLayers().length > 0
    ) {
      saveButtonContainer.classList.remove('hidden')
    }
    if (editButtonsContainer) {
      editButtonsContainer.classList.add('hidden')
    }

    // Show search button (but not the container)
    if (map._searchButton) {
      showElement(map._searchButton)
    }

    // Show key button (modal stays closed)
    if (map._keyButton) {
      showElement(map._keyButton)
    }

    // Show help button
    if (map._helpButton) {
      showElement(map._helpButton)
    }

    // Force Leaflet to recalculate map size after panel is shown
    setTimeout(() => {
      map.invalidateSize()
    }, DELAY_MAP_RESIZE_MS)
  }

  function setupMapEventHandlers(map, drawnItems, edpLayers) {
    map.on(L.Draw.Event.CREATED, function (event) {
      const layer = event.layer
      drawnItems.addLayer(layer)
      isDrawing = false
      hideErrorSummary()

      const controls = getControlElements()
      if (controls) {
        updateLinkStates(controls, drawnItems)
      }

      exitEditMode(map)

      const intersectingCatchment = findIntersectingCatchment(layer, edpLayers)
      updateBoundaryData(layer, intersectingCatchment)
    })

    map.on(L.Draw.Event.EDITED, function (event) {
      const layers = event.layers
      layers.eachLayer(function (layer) {
        const intersectingCatchment = findIntersectingCatchment(
          layer,
          edpLayers
        )
        updateBoundaryData(layer, intersectingCatchment)
      })
    })

    map.on(L.Draw.Event.DELETED, function () {
      const controls = getControlElements()
      if (controls) {
        updateLinkStates(controls, drawnItems)
      }
      document.getElementById(DOM_IDS.boundaryData).value = ''
    })
  }

  // Helper function to update button states based on boundary existence
  function updateLinkStates(controls, drawnItems) {
    const hasBoundary = drawnItems.getLayers().length > 0
    const saveButtonContainer = document.getElementById(
      DOM_IDS.saveButtonContainer
    )

    if (hasBoundary) {
      // Hide start drawing button when boundary exists
      hideElement(controls.startDrawingBtn)

      // Show and enable edit/delete/zoom buttons
      showElement(controls.editBoundaryBtn)
      enableElement(controls.editBoundaryBtn)
      enableElement(controls.deleteBoundaryBtn)
      enableElement(controls.zoomToBoundaryBtn)

      // Show the floating save button
      if (saveButtonContainer) {
        saveButtonContainer.classList.remove('hidden')
      }
    } else {
      // Show start drawing button when no boundary
      showElement(controls.startDrawingBtn)

      // Hide and disable edit button, disable delete/zoom buttons
      hideElement(controls.editBoundaryBtn)
      disableElement(controls.editBoundaryBtn)
      disableElement(controls.deleteBoundaryBtn)
      disableElement(controls.zoomToBoundaryBtn)

      // Hide the floating save button
      if (saveButtonContainer) {
        saveButtonContainer.classList.add('hidden')
      }
    }
  }

  // ============================================================================
  // LOCATION SEARCH
  // ============================================================================

  // Helper function to toggle search visibility and related UI elements
  function toggleSearchVisibility(
    searchContainer,
    searchButton,
    searchInput,
    resultsDropdown,
    map
  ) {
    const isVisible = !searchContainer.classList.contains('hidden')

    if (isVisible) {
      hideElement(searchContainer)
      showElement(searchButton)
    } else {
      showElement(searchContainer)
      hideElement(searchButton)
    }

    // Toggle key button and modal visibility based on search panel state
    if (map._keyButton) {
      if (isVisible) {
        showElement(map._keyButton)
      } else {
        hideElement(map._keyButton)
      }
    }
    if (map._keyModal) {
      // Always close modal when toggling search
      map._keyModal.close()
    }

    // Toggle help button visibility based on search panel state
    if (map._helpButton) {
      if (isVisible) {
        showElement(map._helpButton)
      } else {
        hideElement(map._helpButton)
      }
    }
    if (map._helpModal) {
      // Always close help modal when toggling search
      map._helpModal.close()
    }

    if (!isVisible) {
      searchInput.focus()
      // Show results dropdown if there are results and input has value
      if (
        searchInput.value.trim().length > 0 &&
        resultsDropdown.children.length > 0
      ) {
        showElement(resultsDropdown)
      }
    }
  }

  // Helper function to hide search and show related UI elements
  function hideSearchPanel(searchContainer, searchButton, map) {
    hideElement(searchContainer)
    showElement(searchButton)

    // Show key button when search is hidden
    if (map._keyButton) {
      showElement(map._keyButton)
    }

    // Show help button when search is hidden
    if (map._helpButton) {
      showElement(map._helpButton)
    }
  }

  function initLocationSearch(map) {
    // Get existing elements from DOM
    const searchButton = document.getElementById(DOM_IDS.locationSearchButton)
    const searchContainer = document.getElementById(
      DOM_IDS.locationSearchContainer
    )
    const searchInput = document.getElementById(DOM_IDS.locationSearchInput)
    const resultsDropdown = document.getElementById(
      DOM_IDS.locationSearchResults
    )

    if (!searchButton || !searchContainer || !searchInput || !resultsDropdown) {
      console.error('Search elements not found in DOM')
      return
    }

    // Disable map scroll zoom when hovering over results dropdown
    L.DomEvent.disableScrollPropagation(resultsDropdown)

    let searchTimeout

    // Toggle search container
    searchButton.addEventListener('click', function (e) {
      e.preventDefault()
      e.stopPropagation()
      toggleSearchVisibility(
        searchContainer,
        searchButton,
        searchInput,
        resultsDropdown,
        map
      )
    })

    // Hide search when clicking outside
    document.addEventListener('click', function (e) {
      if (
        !searchContainer.contains(e.target) &&
        !searchButton.contains(e.target)
      ) {
        hideSearchPanel(searchContainer, searchButton, map)
        hideElement(resultsDropdown)
      }
    })

    // Show results when input is focused if there are existing results
    searchInput.addEventListener('focus', function () {
      if (
        searchInput.value.trim().length > 0 &&
        resultsDropdown.children.length > 0
      ) {
        showElement(resultsDropdown)
      }
    })

    // Search input handler
    searchInput.addEventListener('input', function (e) {
      const query = e.target.value.trim()

      clearTimeout(searchTimeout)

      if (query.length < SEARCH_MIN_QUERY_LENGTH) {
        hideElement(resultsDropdown)
        return
      }

      searchTimeout = setTimeout(() => {
        searchLocation(query, resultsDropdown, map)
      }, DEBOUNCE_SEARCH_MS)
    })

    // Handle keyboard navigation
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        hideElement(searchContainer)
        showElement(searchButton)
        hideElement(resultsDropdown)
      }
    })

    // Store reference to search elements for hiding during edit/draw mode
    map._searchButton = searchButton
    map._searchContainer = searchContainer
  }

  // Search for location using postcodes.io API
  function searchLocation(query, resultsDropdown, map) {
    // Request more results to account for filtering out non-English locations
    const apiUrl = `${POSTCODES_API_BASE}?q=${encodeURIComponent(query)}&limit=${POSTCODES_API_LIMIT}`

    fetch(apiUrl)
      .then((response) => response.json())
      .then((data) => {
        handleSearchResults(data, resultsDropdown, map)
      })
      .catch((error) => {
        console.error('Error searching location:', error)
        resultsDropdown.innerHTML =
          '<div class="search-error">Error searching location</div>'
        showElement(resultsDropdown)
      })
  }

  function handleSearchResults(data, resultsDropdown, map) {
    if (data.status === 200 && data.result && data.result.length > 0) {
      // Filter results to only include English locations
      const englishResults = data.result.filter(
        (result) => result.country === 'England'
      )

      if (englishResults.length > 0) {
        // Limit to max results after filtering
        displaySearchResults(
          englishResults.slice(0, POSTCODES_MAX_DISPLAY_RESULTS),
          resultsDropdown,
          map
        )
      } else {
        resultsDropdown.innerHTML =
          '<div class="search-message">No English locations found. Try a different search term.</div>'
        showElement(resultsDropdown)
      }
    } else {
      resultsDropdown.innerHTML =
        '<div class="search-message">No results found</div>'
      showElement(resultsDropdown)
    }
  }

  // Display search results
  function displaySearchResults(results, resultsDropdown, map) {
    resultsDropdown.innerHTML = ''
    showElement(resultsDropdown)

    results.forEach((result) => {
      const resultItem = createSearchResultItem(result, map, resultsDropdown)
      resultsDropdown.appendChild(resultItem)
    })
  }

  function createSearchResultItem(result, map, resultsDropdown) {
    const resultItem = document.createElement('button')
    resultItem.type = 'button'
    resultItem.className = 'location-search-result-item'

    // Create result text with location details
    const nameText = document.createElement('div')
    nameText.className = 'search-result-name'
    nameText.textContent = result.name_1

    const detailsText = document.createElement('div')
    detailsText.className = 'search-result-details'
    const details = []
    if (result.local_type) details.push(result.local_type)
    if (result.county_unitary) details.push(result.county_unitary)
    if (result.region) details.push(result.region)
    detailsText.textContent = details.join(', ')

    resultItem.appendChild(nameText)
    resultItem.appendChild(detailsText)

    // Click handler
    resultItem.addEventListener('click', function () {
      zoomToLocation(result, map)
      hideElement(resultsDropdown)
      const searchContainer = document.getElementById(
        DOM_IDS.locationSearchContainer
      )
      const searchButton = document.getElementById(DOM_IDS.locationSearchButton)
      hideSearchPanel(searchContainer, searchButton, map)
    })

    return resultItem
  }

  /**
   * Calculate zoom level based on location type
   * @param {'City' | 'Town' | 'Suburban Area' | 'Village' | 'Hamlet' | 'Other Settlement' | 'Locality' | string} localType - The type of location from postcodes.io API
   * @returns {number} The appropriate zoom level (11-15)
   */
  function getZoomLevelFromLocationType(localType) {
    // Return zoom level or default if type not found
    return ZOOM_LEVEL_BY_TYPE[localType] || ZOOM_LEVEL_DEFAULT
  }

  // Zoom to selected location
  function zoomToLocation(location, map) {
    const lat = location.latitude
    const lng = location.longitude
    const localType = location.local_type

    const zoomLevel = getZoomLevelFromLocationType(localType)

    // Animate to location
    map.flyTo([lat, lng], zoomLevel, {
      duration: FLY_TO_DURATION_SECONDS
    })
  }

  // ============================================================================
  // MAP KEY
  // ============================================================================

  function getKeyContent(style) {
    const catchmentStyle =
      style === 'satellite' ? CATCHMENT_STYLE_SATELLITE : CATCHMENT_STYLE

    // Convert hex color to rgba with opacity for fill
    const fillColor = catchmentStyle.fillColor
    const fillOpacity = catchmentStyle.fillOpacity
    const rgba = hexToRgba(fillColor, fillOpacity)

    return `
      <div class="map-key-item">
        <div class="map-key-swatch" style="background-color: ${rgba}; border: 2px solid ${catchmentStyle.color};"></div>
        <span class="map-key-label">Nutrient EDP areas</span>
      </div>
    `
  }

  function initMapKey(map) {
    const mapContainer = document.getElementById(DOM_IDS.map)
    const keyButton = document.getElementById(DOM_IDS.mapKeyButton)

    if (!keyButton || !mapContainer) {
      console.error('Key button or map container not found in DOM')
      return
    }

    // Create key content based on current map style
    const keyContent = getKeyContent(currentMapStyle)

    // Create modal instance
    const keyModal = new Modal({
      title: 'Key',
      position: 'top-left',
      content: keyContent,
      container: mapContainer,
      closeOnOutsideClick: false
    })

    // Position modal below the buttons after it's created
    const modalElement = keyModal.getElement()
    if (modalElement) {
      modalElement.style.top = '65px'
      modalElement.style.left = '10px'
    }

    // Toggle key modal on button click
    keyButton.addEventListener('click', function (e) {
      e.preventDefault()
      e.stopPropagation()
      const modalElement = keyModal.getElement()
      if (modalElement && !modalElement.classList.contains('hidden')) {
        keyModal.close()
      } else {
        // Close help modal if it's open
        if (map._helpModal && map._helpModal.isOpened()) {
          map._helpModal.close()
        }
        keyModal.open()
      }
    })

    // Close modal when clicking outside
    document.addEventListener('click', function (e) {
      const modalElement = keyModal.getElement()
      if (
        modalElement &&
        !modalElement.classList.contains('hidden') &&
        !modalElement.contains(e.target) &&
        !keyButton.contains(e.target)
      ) {
        keyModal.close()
      }
    })

    // Store references for hiding during edit/draw mode and when search is open
    map._keyModal = keyModal
    map._keyButton = keyButton
  }

  // ============================================================================
  // MAP HELP
  // ============================================================================

  function initMapHelp(map) {
    const mapContainer = document.getElementById(DOM_IDS.map)
    const helpButton = document.getElementById(DOM_IDS.mapHelpButton)

    if (!helpButton || !mapContainer) {
      console.error('Help button or map container not found in DOM')
      return
    }

    // Create help modal content
    const hintsContent = `
      <div class="map-hints-content">
        <h3 class="govuk-heading-s">How to draw a boundary</h3>
        <p class="govuk-body">Click on the map to start drawing a red line boundary around your development site.</p>
        <p class="govuk-body">Click on each corner of your site to create the boundary. Double-click to finish.</p>

        <h3 class="govuk-heading-s govuk-!-margin-top-4">Keyboard controls</h3>
        <p class="govuk-body">Use Tab and arrow keys to navigate the map. Press Enter to interact with controls.</p>
      </div>
    `

    // Create modal instance with onClose callback to save cookie
    const helpModal = new Modal({
      title: 'Map hints',
      position: 'top-left',
      content: hintsContent,
      container: mapContainer,
      closeOnOutsideClick: false,
      onClose: function () {
        // Save closed state to cookie whenever modal is closed
        window.Cookies.set(COOKIE_MAP_HINTS_CLOSED, 'true', {
          expires: COOKIE_EXPIRY_DAYS,
          path: '/'
        })
      }
    })

    // Check cookie to see if modal should be shown on page load
    const hintsClosed = window.Cookies.get(COOKIE_MAP_HINTS_CLOSED)
    if (!hintsClosed || hintsClosed !== 'true') {
      // Open modal on first visit or if not explicitly closed before
      helpModal.open()
    }

    // Toggle help modal on button click
    helpButton.addEventListener('click', function (e) {
      e.preventDefault()
      e.stopPropagation()

      if (helpModal.isOpened()) {
        helpModal.close()
      } else {
        // Close key modal if it's open
        if (map._keyModal && map._keyModal.isOpened()) {
          map._keyModal.close()
        }
        helpModal.open()
        // Remove closed state cookie when user explicitly opens it
        window.Cookies.remove(COOKIE_MAP_HINTS_CLOSED, { path: '/' })
      }
    })

    // Close modal when clicking outside (but not on help button)
    document.addEventListener('click', function (e) {
      if (
        helpModal.isOpened() &&
        !helpButton.contains(e.target) &&
        !helpModal.getElement().contains(e.target)
      ) {
        helpModal.close()
      }
    })

    // Store references for hiding during edit/draw mode
    map._helpButton = helpButton
    map._helpModal = helpModal
  }
})()
