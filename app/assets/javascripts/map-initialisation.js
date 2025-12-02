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

  // UI positioning constants
  const UI_POSITIONS = {
    MODAL_KEY: { top: '65px', left: '10px' },
    BUTTON_KEY: { top: '10px', left: '145px' },
    BUTTON_HELP: { top: '10px', left: '253px' }
  }

  // ============================================================================
  // MAP CREATION
  // ============================================================================

  /**
   * Check if MapLibre is loaded
   * @returns {boolean} True if MapLibre is available
   */
  function checkMapLibreLoaded() {
    if (typeof maplibregl === 'undefined') {
      console.error('MapLibre library not loaded')
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
   * @param {string} message - Optional custom error message
   */
  function showMapError(message) {
    const loadingDiv = document.getElementById(DOM_IDS.mapLoading)
    if (loadingDiv) {
      const errorMessage =
        message ||
        'There was a problem loading the map. Please refresh the page and try again.'
      loadingDiv.innerHTML = `
        <div class="govuk-error-summary" role="alert" style="max-width: 400px; margin: 0 auto;">
          <h2 class="govuk-error-summary__title">
            There is a problem
          </h2>
          <div class="govuk-error-summary__body">
            <p class="govuk-body">${errorMessage}</p>
          </div>
        </div>
      `
    }
  }

  /**
   * Create base map instance
   * @returns {maplibregl.Map} MapLibre map instance
   */
  function createBaseMap() {
    const map = new maplibregl.Map({
      container: DOM_IDS.map,
      style: {
        version: 8,
        sources: {},
        layers: []
      },
      center: [ENGLAND_CENTER_LNG, ENGLAND_CENTER_LAT], // MapLibre uses [lng, lat]
      zoom: ENGLAND_DEFAULT_ZOOM
    })

    return map
  }

  /**
   * Create base tile layer configurations
   * @returns {Object} Object with streetMap and satelliteMap source configs
   */
  function createBaseLayers() {
    const streetMap = {
      sourceId: 'osm-tiles',
      layerId: 'osm-layer',
      source: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors'
      },
      layer: {
        id: 'osm-layer',
        type: 'raster',
        source: 'osm-tiles'
      }
    }

    const satelliteMap = {
      sourceId: 'esri-tiles',
      layerId: 'esri-layer',
      source: {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256,
        attribution:
          'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and others'
      },
      layer: {
        id: 'esri-layer',
        type: 'raster',
        source: 'esri-tiles'
      }
    }

    return { streetMap, satelliteMap }
  }

  /**
   * Add saved layer to map based on cookie preference (defaults to satellite)
   * @param {maplibregl.Map} map - MapLibre map instance
   * @param {Object} streetMap - Street tile layer config
   * @param {Object} satelliteMap - Satellite tile layer config
   */
  function addSavedLayerToMap(map, streetMap, satelliteMap) {
    const savedLayer = window.MapStyles.getSavedLayerPreference()

    // Add layer after map loads
    map.on('load', () => {
      // Default to satellite view unless explicitly set to street
      if (savedLayer === 'street') {
        map.addSource(streetMap.sourceId, streetMap.source)
        map.addLayer(streetMap.layer)
        window.MapStyles.setCurrentStyle('street')
      } else {
        map.addSource(satelliteMap.sourceId, satelliteMap.source)
        map.addLayer(satelliteMap.layer)
        window.MapStyles.setCurrentStyle('satellite')
      }
    })
  }

  /**
   * Add zoom control to map
   * @param {maplibregl.Map} map - MapLibre map instance
   */
  function addZoomControl(map) {
    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: false
      }),
      'top-right'
    )
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
   * @param {maplibregl.Map} map - MapLibre map instance
   * @returns {Object|null} Catchment data object or null
   */
  function createCatchmentPolygon(feature, index, map) {
    const properties = feature.properties
    const geometry = feature.geometry

    const catchmentName =
      properties.Label || properties.N2K_Site_N || `Catchment ${index + 1}`

    if (geometry.type === 'Polygon') {
      // Keep coordinates in GeoJSON format [lng, lat] for MapLibre
      const coordinates = geometry.coordinates

      const sourceId = `catchment-${index}`
      const layerId = `catchment-layer-${index}`

      // Add source
      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: geometry,
          properties: properties
        }
      })

      // Get style from MapStyles
      const style = window.MapStyles.getCatchmentStyle(
        window.MapStyles.getCurrentStyle()
      )

      // Add fill layer
      map.addLayer({
        id: layerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': style.fillColor || style.color,
          'fill-opacity': style.fillOpacity || 0.5
        }
      })

      // Add border layer
      map.addLayer({
        id: `${layerId}-border`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': style.color,
          'line-width': style.weight || 2,
          'line-opacity': style.opacity || 1
        }
      })

      // Add click handler for popup
      const popupContent = buildCatchmentPopupContent(catchmentName, properties)
      map.on('click', layerId, (e) => {
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(popupContent)
          .addTo(map)
      })

      // Change cursor on hover
      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = ''
      })

      // Register layer with MapStyles
      window.MapStyles.addCatchmentLayer(layerId, sourceId)

      return {
        name: catchmentName,
        layerId: layerId,
        sourceId: sourceId,
        coordinates: coordinates,
        properties: properties,
        geometry: geometry
      }
    }

    return null
  }

  /**
   * Recheck existing polygons for catchment intersections
   * @param {Array} edpLayers - Array of EDP layer data
   */
  function recheckExistingPolygons(edpLayers) {
    const draw = window.MapDrawingControls.getDrawInstance()
    if (!draw) return

    const allFeatures = draw.getAll()
    if (allFeatures.features && allFeatures.features.length > 0) {
      allFeatures.features.forEach((feature) => {
        if (feature.geometry.type === 'Polygon') {
          const intersectingCatchment =
            window.MapGeometry.findIntersectingCatchment(feature, edpLayers)
          window.MapDrawingControls.updateBoundaryData(
            feature,
            intersectingCatchment
          )
        }
      })
    }
  }

  /**
   * Fit map to catchments if no existing boundary
   * @param {maplibregl.Map} map - MapLibre map instance
   * @param {Array} edpLayers - Array of EDP layer data
   */
  function fitMapToCatchmentsIfNeeded(map, edpLayers) {
    const existingBoundaryData = document.getElementById(
      DOM_IDS.boundaryData
    ).value

    if (edpLayers.length > 0 && !existingBoundaryData) {
      // Calculate bounds from all catchment geometries
      const bounds = new maplibregl.LngLatBounds()

      edpLayers.forEach((edp) => {
        if (edp.geometry && edp.geometry.coordinates) {
          // Extend bounds with all coordinates
          edp.geometry.coordinates[0].forEach((coord) => {
            bounds.extend(coord)
          })
        }
      })

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 50 })
      }
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
    const catchmentsUrl =
      window.CATCHMENTS_GEOJSON_URL ||
      '/nrf-estimate-2-map-layers-spike/catchments.geojson'
    fetch(catchmentsUrl)
      .then((response) => response.json())
      .then((data) => {
        processCatchmentFeatures(data.features, map, edpData)

        // Check cookie preference and hide nutrient layers if needed
        if (window.MapDatasets && window.MapDatasets.getCookiePreference) {
          const savedVisibility = window.MapDatasets.getCookiePreference()
          if (savedVisibility && savedVisibility.nutrientEdp === false) {
            // Hide nutrient layers immediately after loading
            if (window.MapStyles && window.MapStyles.hideCatchmentLayers) {
              window.MapStyles.hideCatchmentLayers(map)
            }
          }
        }
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
   * Load existing boundary and re-validate via API
   * @param {MapboxDraw} draw - Mapbox Draw instance
   * @param {maplibregl.Map} map - MapLibre map instance
   * @returns {Promise<boolean>} Promise resolving to true if boundary loaded
   */
  async function loadExistingBoundary(draw, map) {
    // TODO: Update for MapboxDraw in Phase 4
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

          // Ensure boundary is on top of other layers
          drawnItems.bringToFront()

          // Re-validate boundary via API using the polygon's current coordinates
          if (window.MapAPI) {
            window.MapAPI.showLoadingState()

            try {
              // Get coordinates from the actual polygon layer
              const latLngs = existingPolygon.getLatLngs()[0]
              const coordinates = latLngs.map((latLng) => [
                latLng.lng,
                latLng.lat
              ])

              const intersections =
                await window.MapAPI.checkEDPIntersection(coordinates)

              // Update boundary data with fresh validation results
              const updatedBoundaryData = {
                ...boundaryData,
                intersections: intersections,
                intersectingCatchment: intersections.nutrient
              }

              document.getElementById(DOM_IDS.boundaryData).value =
                JSON.stringify(updatedBoundaryData)

              window.MapAPI.hideLoadingState()

              // Update stats for area/perimeter
              // Note: Intersections display is already updated by MapAPI after API response
              if (window.MapStats && window.MapStats.handlePolygonComplete) {
                window.MapStats.handlePolygonComplete(existingPolygon)
              }
            } catch (error) {
              console.error('Error re-validating existing boundary:', error)
              window.MapAPI.hideLoadingState()
              // Don't block user - existing data is still usable
            }
          }

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
      modalElement.style.top = UI_POSITIONS.MODAL_KEY.top
      modalElement.style.left = UI_POSITIONS.MODAL_KEY.left
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
   * Get hints content based on whether boundary exists
   * @returns {string} HTML content for hints
   */
  function getHintsContent() {
    const existingBoundaryData = document.getElementById(DOM_IDS.boundaryData)
    const hasBoundary = existingBoundaryData && existingBoundaryData.value

    if (hasBoundary) {
      return `
        <div class="map-hints-content">
          <h3 class="govuk-heading-s">How to edit a boundary</h3>
          <p class="govuk-body">Click "Edit" in the side panel to begin. Move each point to the correct location. Press "Confirm area" to finish.</p>
        </div>
      `
    } else {
      return `
        <div class="map-hints-content">
          <h3 class="govuk-heading-s">How to add a boundary</h3>
          <p class="govuk-body">Click "Add" in the side panel to begin. Then click on each corner of your site on the map to create the boundary. Click the first point again, "double-click", or press "Confirm area" to finish.</p>
        </div>
      `
    }
  }

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

    const hintsContent = getHintsContent()

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

  /**
   * Update help modal content based on current boundary state
   * @param {L.Map} map - Leaflet map instance
   */
  function updateHelpModalContent(map) {
    if (map && map._helpModal) {
      const newContent = getHintsContent()
      map._helpModal.updateContent(newContent)
    }
  }

  // Export functions and constants to global namespace
  window.MapInitialisation.ENGLAND_CENTER_LAT = ENGLAND_CENTER_LAT
  window.MapInitialisation.ENGLAND_CENTER_LNG = ENGLAND_CENTER_LNG
  window.MapInitialisation.ENGLAND_DEFAULT_ZOOM = ENGLAND_DEFAULT_ZOOM
  window.MapInitialisation.checkMapLibreLoaded = checkMapLibreLoaded
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
  window.MapInitialisation.updateHelpModalContent = updateHelpModalContent
})()
