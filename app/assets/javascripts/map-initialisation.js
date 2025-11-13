/**
 * Map Initialisation Module
 * Handles map setup and configuration
 */

;(function () {
  'use strict'

  // Create global namespace for initialisation functions
  window.MapInitialisation = window.MapInitialisation || {}

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  const ENGLAND_CENTER_LAT = 52.5
  const ENGLAND_CENTER_LNG = -1.5
  const ENGLAND_DEFAULT_ZOOM = 6

  const MAP_BOUNDS_PADDING = 0.1

  const DOM_IDS = {
    map: 'map',
    mapLoading: 'map-loading',
    boundaryData: 'boundary-data',
    mapKeyButton: 'map-key-button',
    mapHelpButton: 'map-help-button'
  }

  const COOKIE_MAP_HINTS_CLOSED = 'mapHintsClosed'
  const COOKIE_EXPIRY_DAYS = 365

  // ============================================================================
  // MAP CREATION
  // ============================================================================

  /**
   * Check if Leaflet is loaded
   * @returns {boolean} True if Leaflet is available
   */
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

  /**
   * Hide loading message
   */
  function hideLoadingMessage() {
    const loadingDiv = document.getElementById(DOM_IDS.mapLoading)
    if (loadingDiv) {
      loadingDiv.classList.add('hidden')
    }
  }

  /**
   * Show map error message
   */
  function showMapError() {
    const loadingDiv = document.getElementById(DOM_IDS.mapLoading)
    if (loadingDiv) {
      loadingDiv.innerHTML =
        '<p class="govuk-body map-error-message">Error loading map. Please refresh the page.</p>'
    }
  }

  /**
   * Create base map instance
   * @returns {L.Map} Leaflet map instance
   */
  function createBaseMap() {
    return L.map(DOM_IDS.map, {
      zoomControl: false
    }).setView([ENGLAND_CENTER_LAT, ENGLAND_CENTER_LNG], ENGLAND_DEFAULT_ZOOM)
  }

  /**
   * Create base tile layers
   * @returns {Object} Object with streetMap and satelliteMap layers
   */
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

  /**
   * Add saved layer to map based on cookie preference
   * @param {L.Map} map - Leaflet map instance
   * @param {L.TileLayer} streetMap - Street tile layer
   * @param {L.TileLayer} satelliteMap - Satellite tile layer
   */
  function addSavedLayerToMap(map, streetMap, satelliteMap) {
    const savedLayer = window.MapStyles.getSavedLayerPreference()

    if (savedLayer === 'satellite') {
      satelliteMap.addTo(map)
      window.MapStyles.setCurrentStyle('satellite')
    } else {
      streetMap.addTo(map)
      window.MapStyles.setCurrentStyle('street')
    }
  }

  /**
   * Add zoom control to map
   * @param {L.Map} map - Leaflet map instance
   */
  function addZoomControl(map) {
    L.control
      .zoom({
        position: 'topright'
      })
      .addTo(map)
  }

  // ============================================================================
  // CATCHMENT DATA LOADING
  // ============================================================================

  /**
   * Build catchment popup content
   * @param {string} catchmentName - Catchment name
   * @param {Object} properties - Catchment properties
   * @returns {string} Popup HTML content
   */
  function buildCatchmentPopupContent(catchmentName, properties) {
    return `
      <strong>${catchmentName}</strong><br>
      ${properties.PopupInfo ? `Type: ${properties.PopupInfo}<br>` : ''}
      ${properties.DateAmend ? `Last Updated: ${properties.DateAmend}<br>` : ''}
      ${properties.Notes ? `Notes: ${properties.Notes}` : ''}
    `
  }

  /**
   * Create catchment polygon from GeoJSON feature
   * @param {Object} feature - GeoJSON feature
   * @param {number} index - Feature index
   * @param {L.Map} map - Leaflet map instance
   * @returns {Object|null} Catchment data object or null
   */
  function createCatchmentPolygon(feature, index, map) {
    const properties = feature.properties
    const geometry = feature.geometry

    const catchmentName =
      properties.Label || properties.N2K_Site_N || `Catchment ${index + 1}`

    if (geometry.type === 'Polygon') {
      const coordinates = geometry.coordinates[0].map((coord) => [
        coord[1],
        coord[0]
      ])

      const style = window.MapStyles.getCatchmentStyle(
        window.MapStyles.getCurrentStyle()
      )
      const polygon = L.polygon(coordinates, style).addTo(map)

      const popupContent = buildCatchmentPopupContent(catchmentName, properties)
      polygon.bindPopup(popupContent)

      window.MapStyles.addCatchmentLayer(polygon)

      return {
        name: catchmentName,
        polygon: polygon,
        coordinates: coordinates,
        properties: properties
      }
    }

    return null
  }

  /**
   * Recheck existing polygons for catchment intersections
   * @param {Array} edpLayers - Array of EDP layer data
   */
  function recheckExistingPolygons(edpLayers) {
    const drawnItems = window.MapDrawingControls.getDrawnItems()
    if (!drawnItems) return

    drawnItems.eachLayer(function (layer) {
      if (layer instanceof L.Polygon) {
        const intersectingCatchment =
          window.MapGeometry.findIntersectingCatchment(layer, edpLayers)
        window.MapDrawingControls.updateBoundaryData(
          layer,
          intersectingCatchment
        )
      }
    })
  }

  /**
   * Fit map to catchments if no existing boundary
   * @param {L.Map} map - Leaflet map instance
   * @param {Array} edpLayers - Array of EDP layer data
   */
  function fitMapToCatchmentsIfNeeded(map, edpLayers) {
    const existingBoundaryData = document.getElementById(
      DOM_IDS.boundaryData
    ).value

    if (edpLayers.length > 0 && !existingBoundaryData) {
      const group = new L.featureGroup(edpLayers.map((edp) => edp.polygon))
      map.fitBounds(group.getBounds().pad(MAP_BOUNDS_PADDING))
    }
  }

  /**
   * Show catchment load error message
   */
  function showCatchmentLoadError() {
    const loadingDiv = document.getElementById(DOM_IDS.mapLoading)
    if (loadingDiv) {
      loadingDiv.innerHTML =
        '<p class="govuk-body">Map loaded successfully. Catchment data temporarily unavailable.</p>'
    }
  }

  /**
   * Process catchment features
   * @param {Array} features - Array of GeoJSON features
   * @param {L.Map} map - Leaflet map instance
   * @param {Object} edpData - EDP data object
   */
  function processCatchmentFeatures(features, map, edpData) {
    features.forEach((feature, index) => {
      const catchmentData = createCatchmentPolygon(feature, index, map)

      if (catchmentData) {
        edpData.layers.push(catchmentData)
        edpData.boundaries.push({
          name: catchmentData.name,
          coordinates: catchmentData.coordinates
        })
      }
    })

    recheckExistingPolygons(edpData.layers)
    fitMapToCatchmentsIfNeeded(map, edpData.layers)
  }

  /**
   * Load catchment data from GeoJSON
   * @param {L.Map} map - Leaflet map instance
   * @param {Object} edpData - EDP data object
   */
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

  // ============================================================================
  // BOUNDARY LOADING
  // ============================================================================

  /**
   * Load existing boundary from hidden input
   * @param {L.FeatureGroup} drawnItems - Feature group for drawn items
   * @param {L.Map} map - Leaflet map instance
   * @returns {boolean} True if boundary was loaded
   */
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

          const existingPolygon = L.polygon(
            latLngs,
            window.MapDrawingControls.BOUNDARY_STYLE
          )

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

  // ============================================================================
  // MAP KEY
  // ============================================================================

  /**
   * Initialize map key modal
   * @param {L.Map} map - Leaflet map instance
   */
  function initMapKey(map) {
    const mapContainer = document.getElementById(DOM_IDS.map)
    const keyButton = document.getElementById(DOM_IDS.mapKeyButton)

    if (!keyButton || !mapContainer) {
      console.error('Key button or map container not found in DOM')
      return
    }

    const keyContent = window.MapStyles.getKeyContent(
      window.MapStyles.getCurrentStyle()
    )

    const keyModal = new Modal({
      title: 'Key',
      position: 'top-left',
      content: keyContent,
      container: mapContainer,
      closeOnOutsideClick: false
    })

    const modalElement = keyModal.getElement()
    if (modalElement) {
      modalElement.style.top = '65px'
      modalElement.style.left = '10px'
    }

    keyButton.addEventListener('click', function (e) {
      e.preventDefault()
      e.stopPropagation()
      const modalElement = keyModal.getElement()
      if (modalElement && !modalElement.classList.contains('hidden')) {
        keyModal.close()
      } else {
        if (map._helpModal && map._helpModal.isOpened()) {
          map._helpModal.close()
        }
        keyModal.open()
      }
    })

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

    map._keyModal = keyModal
    map._keyButton = keyButton
  }

  // ============================================================================
  // MAP HELP
  // ============================================================================

  /**
   * Initialize map help modal
   * @param {L.Map} map - Leaflet map instance
   */
  function initMapHelp(map) {
    const mapContainer = document.getElementById(DOM_IDS.map)
    const helpButton = document.getElementById(DOM_IDS.mapHelpButton)

    if (!helpButton || !mapContainer) {
      console.error('Help button or map container not found in DOM')
      return
    }

    const hintsContent = `
      <div class="map-hints-content">
        <h3 class="govuk-heading-s">How to draw a boundary</h3>
        <p class="govuk-body">Click on the map to start drawing a red line boundary around your development site.</p>
        <p class="govuk-body">Click on each corner of your site to create the boundary. Double-click to finish.</p>

        <h3 class="govuk-heading-s govuk-!-margin-top-4">Keyboard controls</h3>
        <p class="govuk-body">Use Tab and arrow keys to navigate the map. Press Enter to interact with controls.</p>
      </div>
    `

    const helpModal = new Modal({
      title: 'Map hints',
      position: 'top-left',
      content: hintsContent,
      container: mapContainer,
      closeOnOutsideClick: false,
      onClose: function () {
        window.Cookies.set(COOKIE_MAP_HINTS_CLOSED, 'true', {
          expires: COOKIE_EXPIRY_DAYS,
          path: '/'
        })
      }
    })

    const hintsClosed = window.Cookies.get(COOKIE_MAP_HINTS_CLOSED)
    if (!hintsClosed || hintsClosed !== 'true') {
      helpModal.open()
    }

    helpButton.addEventListener('click', function (e) {
      e.preventDefault()
      e.stopPropagation()

      if (helpModal.isOpened()) {
        helpModal.close()
      } else {
        if (map._keyModal && map._keyModal.isOpened()) {
          map._keyModal.close()
        }
        helpModal.open()
        window.Cookies.remove(COOKIE_MAP_HINTS_CLOSED, { path: '/' })
      }
    })

    document.addEventListener('click', function (e) {
      if (
        helpModal.isOpened() &&
        !helpButton.contains(e.target) &&
        !helpModal.getElement().contains(e.target)
      ) {
        helpModal.close()
      }
    })

    map._helpButton = helpButton
    map._helpModal = helpModal
  }

  // Export functions and constants to global namespace
  window.MapInitialisation.ENGLAND_CENTER_LAT = ENGLAND_CENTER_LAT
  window.MapInitialisation.ENGLAND_CENTER_LNG = ENGLAND_CENTER_LNG
  window.MapInitialisation.ENGLAND_DEFAULT_ZOOM = ENGLAND_DEFAULT_ZOOM
  window.MapInitialisation.checkLeafletLoaded = checkLeafletLoaded
  window.MapInitialisation.hideLoadingMessage = hideLoadingMessage
  window.MapInitialisation.showMapError = showMapError
  window.MapInitialisation.createBaseMap = createBaseMap
  window.MapInitialisation.createBaseLayers = createBaseLayers
  window.MapInitialisation.addSavedLayerToMap = addSavedLayerToMap
  window.MapInitialisation.addZoomControl = addZoomControl
  window.MapInitialisation.loadCatchmentData = loadCatchmentData
  window.MapInitialisation.loadExistingBoundary = loadExistingBoundary
  window.MapInitialisation.initMapKey = initMapKey
  window.MapInitialisation.initMapHelp = initMapHelp
})()
