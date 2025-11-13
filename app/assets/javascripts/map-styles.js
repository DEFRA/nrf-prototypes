/**
 * Map Styles Module
 * Handles style switching and catchment display
 */

;(function () {
  'use strict'

  // Create global namespace for style functions
  window.MapStyles = window.MapStyles || {}

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  const COLOR_CATCHMENT_PURPLE = '#ab47bc'

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

  const COOKIE_MAP_LAYER = 'mapBaseLayer'
  const COOKIE_EXPIRY_DAYS = 365

  const DELAY_MODAL_SETUP_MS = 50
  const DELAY_OUTSIDE_CLICK_MS = 100

  // ============================================================================
  // STATE
  // ============================================================================

  let currentMapStyle = 'street'
  let catchmentLayers = []
  let mapStyleModal = null

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
  // STYLE MANAGEMENT
  // ============================================================================

  /**
   * Get saved layer preference from cookie
   * @returns {string|null} Saved layer preference or null
   */
  function getSavedLayerPreference() {
    if (!window.Cookies) {
      return null
    }
    return window.Cookies.get(COOKIE_MAP_LAYER)
  }

  /**
   * Save layer preference to cookie
   * @param {string} layerType - Layer type to save ('street' or 'satellite')
   */
  function saveLayerPreference(layerType) {
    if (window.Cookies) {
      window.Cookies.set(COOKIE_MAP_LAYER, layerType, {
        expires: COOKIE_EXPIRY_DAYS,
        path: '/'
      })
    }
  }

  /**
   * Get current map style
   * @returns {string} Current style ('street' or 'satellite')
   */
  function getCurrentStyle() {
    return currentMapStyle
  }

  /**
   * Set current map style
   * @param {string} style - Style to set ('street' or 'satellite')
   */
  function setCurrentStyle(style) {
    currentMapStyle = style
  }

  /**
   * Add catchment layer to tracking array
   * @param {L.Polygon} polygon - Leaflet polygon layer
   */
  function addCatchmentLayer(polygon) {
    catchmentLayers.push(polygon)
  }

  /**
   * Update catchment polygon styles based on map style
   * @param {string} style - Target style ('street' or 'satellite')
   */
  function updateCatchmentStyles(style) {
    const targetStyle =
      style === 'satellite' ? CATCHMENT_STYLE_SATELLITE : CATCHMENT_STYLE
    catchmentLayers.forEach((polygon) => {
      polygon.setStyle(targetStyle)
    })
  }

  /**
   * Get appropriate catchment style for current map style
   * @param {string} style - Map style ('street' or 'satellite')
   * @returns {Object} Catchment style object
   */
  function getCatchmentStyle(style) {
    return style === 'satellite' ? CATCHMENT_STYLE_SATELLITE : CATCHMENT_STYLE
  }

  // ============================================================================
  // MAP STYLE SWITCHER UI
  // ============================================================================

  /**
   * Create map style button SVG
   * @returns {string} SVG markup
   */
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

  /**
   * Create map style button element
   * @returns {HTMLElement} Button element
   */
  function createMapStyleButton() {
    const button = L.DomUtil.create('button', 'map-style-button')
    button.type = 'button'
    button.innerHTML = getMapStyleButtonSVG()
    button.title = 'Change map style'
    button.setAttribute('aria-label', 'Change map style')
    return button
  }

  /**
   * Get street map thumbnail data URI
   * @returns {string} Data URI
   */
  function getStreetMapThumbnail() {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23f2efe9' width='100' height='100'/%3E%3Cpath fill='%23fff' d='M20 30h15v20H20zM50 25h30v15H50zM25 60h20v25H25zM60 55h25v30H60z'/%3E%3Cpath stroke='%23ccc' stroke-width='2' fill='none' d='M0 40h100M40 0v100'/%3E%3Cpath fill='%23d4d4d4' d='M5 5h8v8H5zM65 70h6v6h-6z'/%3E%3C/svg%3E"
  }

  /**
   * Get satellite map thumbnail data URI
   * @returns {string} Data URI
   */
  function getSatelliteMapThumbnail() {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3Cpattern id='terrain' width='10' height='10' patternUnits='userSpaceOnUse'%3E%3Crect fill='%234a5f3a' width='10' height='10'/%3E%3Crect fill='%235d7047' x='2' y='2' width='4' height='4'/%3E%3C/pattern%3E%3C/defs%3E%3Crect fill='url(%23terrain)' width='100' height='100'/%3E%3Cpath fill='%23667d52' d='M20 40h25v20H20z'/%3E%3Cpath fill='%2378916a' d='M60 60h30v25H60z'/%3E%3Cpath fill='%233d4f2f' d='M10 75h15v15H10z'/%3E%3C/svg%3E"
  }

  /**
   * Create map style modal content
   * @param {string} currentLayer - Current layer selection
   * @returns {string} Modal HTML content
   */
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

  /**
   * Handle map style change
   * @param {string} style - Selected style
   * @param {NodeList} options - Option elements
   * @param {L.Map} map - Leaflet map instance
   * @param {L.TileLayer} streetMap - Street tile layer
   * @param {L.TileLayer} satelliteMap - Satellite tile layer
   */
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
    if (mapStyleModal) {
      mapStyleModal.close()
    }
  }

  /**
   * Setup map style modal event handlers
   * @param {L.Map} map - Leaflet map instance
   * @param {L.TileLayer} streetMap - Street tile layer
   * @param {L.TileLayer} satelliteMap - Satellite tile layer
   */
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

  /**
   * Setup outside click handler for modal
   * @param {HTMLElement} modalElement - Modal element
   */
  function setupOutsideClickHandler(modalElement) {
    const outsideClickHandler = (e) => {
      if (
        modalElement &&
        !modalElement.contains(e.target) &&
        !e.target.closest('.map-style-button')
      ) {
        if (mapStyleModal) {
          mapStyleModal.close()
        }
        document.removeEventListener('click', outsideClickHandler, true)
      }
    }

    setTimeout(() => {
      document.addEventListener('click', outsideClickHandler, true)
    }, DELAY_OUTSIDE_CLICK_MS)
  }

  /**
   * Show map style modal
   * @param {L.Map} map - Leaflet map instance
   * @param {HTMLElement} mapContainer - Map container element
   * @param {L.TileLayer} streetMap - Street tile layer
   * @param {L.TileLayer} satelliteMap - Satellite tile layer
   */
  function showMapStyleModal(map, mapContainer, streetMap, satelliteMap) {
    // Hide error banner when opening modal
    if (window.MapUI) {
      window.MapUI.hideErrorSummary()
    }

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
      closeOnOutsideClick: false,
      onClose: () => {
        mapStyleModal = null
      }
    })

    mapStyleModal.open()

    // Setup event handlers after modal is created
    setupMapStyleModalHandlers(map, streetMap, satelliteMap)
  }

  /**
   * Add map style switcher control to map
   * @param {L.Map} map - Leaflet map instance
   * @param {HTMLElement} mapContainer - Map container element
   * @param {L.TileLayer} streetMap - Street tile layer
   * @param {L.TileLayer} satelliteMap - Satellite tile layer
   */
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

  // ============================================================================
  // MAP KEY
  // ============================================================================

  /**
   * Get key content HTML
   * @param {string} style - Current map style
   * @returns {string} Key content HTML
   */
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

  /**
   * Update map key content based on style
   * @param {string} style - Current map style
   * @param {L.Map} map - Leaflet map instance
   */
  function updateMapKey(style, map) {
    if (map._keyModal) {
      const newContent = getKeyContent(style)
      map._keyModal.updateContent(newContent)
    }
  }

  // Export functions to global namespace
  window.MapStyles.getSavedLayerPreference = getSavedLayerPreference
  window.MapStyles.saveLayerPreference = saveLayerPreference
  window.MapStyles.getCurrentStyle = getCurrentStyle
  window.MapStyles.setCurrentStyle = setCurrentStyle
  window.MapStyles.addCatchmentLayer = addCatchmentLayer
  window.MapStyles.updateCatchmentStyles = updateCatchmentStyles
  window.MapStyles.getCatchmentStyle = getCatchmentStyle
  window.MapStyles.addMapStyleSwitcher = addMapStyleSwitcher
  window.MapStyles.getKeyContent = getKeyContent
  window.MapStyles.updateMapKey = updateMapKey
})()
