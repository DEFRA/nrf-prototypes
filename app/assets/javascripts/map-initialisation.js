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
      // Find the first non-raster layer to insert base layer before it
      // This ensures base layers stay at the bottom of the stack
      const layers = map.getStyle().layers
      let firstNonRasterLayer = null
      for (const layer of layers) {
        if (layer.type !== 'raster') {
          firstNonRasterLayer = layer.id
          break
        }
      }

      // Default to satellite view unless explicitly set to street
      if (savedLayer === 'street') {
        map.addSource(streetMap.sourceId, streetMap.source)
        map.addLayer(streetMap.layer, firstNonRasterLayer)
        window.MapStyles.setCurrentStyle('street')
      } else {
        map.addSource(satelliteMap.sourceId, satelliteMap.source)
        map.addLayer(satelliteMap.layer, firstNonRasterLayer)
        window.MapStyles.setCurrentStyle('satellite')
      }

      // Update the style toggle button thumbnail now that currentMapStyle is set
      if (window.MapStyles && window.MapStyles.updateMapStyleButtonThumbnail) {
        window.MapStyles.updateMapStyleButtonThumbnail()
      }
    })
  }

  /**
   * Add zoom control to map
   * @param {maplibregl.Map} map - MapLibre map instance
   */
  function addZoomControl(map) {
    // Custom control with specific positioning to avoid info panel overlap
    class CustomNavigationControl {
      onAdd(map) {
        this._map = map
        this._container = document.createElement('div')
        this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group'

        // Create zoom in button with explicit + text
        const zoomInButton = document.createElement('button')
        zoomInButton.className = 'maplibregl-ctrl-icon maplibregl-ctrl-zoom-in'
        zoomInButton.type = 'button'
        zoomInButton.title = 'Zoom in'
        zoomInButton.setAttribute('aria-label', 'Zoom in')
        zoomInButton.textContent = '+'
        zoomInButton.style.cssText = `
          font-size: 20px;
          font-weight: bold;
          line-height: 1;
        `
        zoomInButton.addEventListener('click', () => {
          this._map.zoomIn()
        })

        // Create zoom out button with explicit - text
        const zoomOutButton = document.createElement('button')
        zoomOutButton.className =
          'maplibregl-ctrl-icon maplibregl-ctrl-zoom-out'
        zoomOutButton.type = 'button'
        zoomOutButton.title = 'Zoom out'
        zoomOutButton.setAttribute('aria-label', 'Zoom out')
        zoomOutButton.textContent = '−'
        zoomOutButton.style.cssText = `
          font-size: 20px;
          font-weight: bold;
          line-height: 1;
        `
        zoomOutButton.addEventListener('click', () => {
          this._map.zoomOut()
        })

        this._container.appendChild(zoomInButton)
        this._container.appendChild(zoomOutButton)

        return this._container
      }

      onRemove() {
        this._container.parentNode.removeChild(this._container)
        this._map = undefined
      }
    }

    map.addControl(new CustomNavigationControl(), 'top-right')
  }

  // ============================================================================
  // CATCHMENT DATA LOADING
  // ============================================================================

  /**
   * Load catchment data from vector tiles (tileserver)
   * @param {maplibregl.Map} map - MapLibre map instance
   * @param {Object} edpData - EDP data object
   */
  function loadCatchmentData(map, edpData) {
    // Use proxied tiles endpoint (goes through Express server on same port)
    // This avoids CORS and port issues in production
    const tilesPath = `${window.location.origin}/tiles/data/catchments_nn_catchments_03_2024/{z}/{x}/{y}.pbf`

    // Add vector tile source for nutrient catchments
    const sourceId = 'nutrient-catchments'
    const layerId = 'nutrient-catchments' // MapStyles will append '-border' for border layer
    const borderLayerId = 'nutrient-catchments-border'

    try {
      // Check if source already exists
      if (map.getSource(sourceId)) {
        console.log('Vector tile source already exists, skipping')
        return
      }

      // Add vector tile source
      // Set maxzoom to match MBTiles file so MapLibre knows tile availability
      // MapLibre will automatically overzoom beyond this level
      map.addSource(sourceId, {
        type: 'vector',
        tiles: [tilesPath],
        minzoom: 0,
        maxzoom: 10 // Catchment tiles only available up to zoom 10, will overzoom beyond
      })

      // Get current style for catchments
      const style = window.MapStyles
        ? window.MapStyles.getCatchmentStyle()
        : {
            fillColor: '#FF6B6B',
            fillOpacity: 0.3,
            color: '#C92A2A',
            weight: 2,
            opacity: 0.8
          }

      // Check cookie preference for initial visibility
      let initialVisibility = 'visible'
      if (window.MapDatasets && window.MapDatasets.getCookiePreference) {
        const savedVisibility = window.MapDatasets.getCookiePreference()
        if (savedVisibility && savedVisibility.nutrientEdp === false) {
          initialVisibility = 'none'
        }
      }

      // Add fill layer
      map.addLayer({
        id: layerId,
        type: 'fill',
        source: sourceId,
        'source-layer': 'catchments_nn_catchments_03_2024',
        layout: {
          visibility: initialVisibility
        },
        paint: {
          'fill-color': style.fillColor || style.color,
          'fill-opacity': style.fillOpacity || 0.3
        }
      })

      // Add border layer
      map.addLayer({
        id: borderLayerId,
        type: 'line',
        source: sourceId,
        'source-layer': 'catchments_nn_catchments_03_2024',
        layout: {
          visibility: initialVisibility
        },
        paint: {
          'line-color': style.color,
          'line-width': style.weight || 2,
          'line-opacity': style.opacity || 0.8
        }
      })

      // Register layers with MapStyles for visibility control
      if (window.MapStyles && window.MapStyles.addCatchmentLayer) {
        window.MapStyles.addCatchmentLayer(layerId, sourceId)
      }

      // Add click handler for popups
      map.on('click', layerId, (e) => {
        if (
          window.MapDrawingControls &&
          window.MapDrawingControls.isInDrawingMode()
        ) {
          return
        }

        if (!e.features || e.features.length === 0) return

        const feature = e.features[0]
        const props = feature.properties
        const name =
          props.Label || props.NAME || props.name || 'Nutrient Catchment'

        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`<strong>${name}</strong>`)
          .addTo(map)
      })

      // Add hover cursor
      map.on('mouseenter', layerId, () => {
        if (
          window.MapDrawingControls &&
          window.MapDrawingControls.isInDrawingMode()
        ) {
          return
        }
        map.getCanvas().style.cursor = 'pointer'
      })

      map.on('mouseleave', layerId, () => {
        if (
          window.MapDrawingControls &&
          window.MapDrawingControls.isInDrawingMode()
        ) {
          return
        }
        map.getCanvas().style.cursor = ''
      })

      console.log('Vector tile catchments loaded successfully from tileserver')
    } catch (error) {
      console.error('Error loading vector tile catchments:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      showMapError(
        'Map loaded successfully. Catchment data temporarily unavailable.'
      )
    }
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
          // Convert coordinates to [lng, lat] format for GeoJSON
          const coordinates = boundaryData.coordinates.map((point) => [
            point[0], // lng
            point[1] // lat
          ])

          // Ensure polygon is closed
          if (
            coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
            coordinates[0][1] !== coordinates[coordinates.length - 1][1]
          ) {
            coordinates.push(coordinates[0])
          }

          // Create GeoJSON feature for MapboxDraw
          const feature = {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [coordinates]
            }
          }

          // Add to MapboxDraw
          const featureIds = draw.add(feature)

          // Fit map to boundary
          const bounds = coordinates.reduce(
            (bounds, coord) => {
              return bounds.extend(coord)
            },
            new maplibregl.LngLatBounds(coordinates[0], coordinates[0])
          )
          map.fitBounds(bounds, { padding: 50 })

          // Re-validate boundary via API using the polygon's current coordinates
          if (window.MapAPI) {
            window.MapAPI.showLoadingState()

            try {
              // Remove closing point for API (API expects open polygon)
              const coordinatesForAPI = coordinates.slice(0, -1)

              const intersections =
                await window.MapAPI.checkEDPIntersection(coordinatesForAPI)

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
                window.MapStats.handlePolygonComplete(feature)
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
