/**
 * Map Drawing Interface for NRF Estimate
 * Handles interactive boundary drawing using Leaflet and Leaflet-Draw
 */

;(function () {
  'use strict'

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  let isDrawing = false
  let isEditing = false

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
    const errorSummary = document.getElementById('client-error-summary')
    const errorLink = document.getElementById('client-error-link')

    if (errorSummary && errorLink) {
      errorLink.textContent = message
      errorSummary.style.display = 'block'
      errorSummary.scrollIntoView({ behavior: 'smooth', block: 'start' })
      errorSummary.focus()
    }
  }

  function hideErrorSummary() {
    const errorSummary = document.getElementById('client-error-summary')
    if (errorSummary) {
      errorSummary.style.display = 'none'
    }
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
    element.style.display = 'flex'
  }

  function hideElement(element) {
    element.style.display = 'none'
  }

  // ============================================================================
  // MODAL FUNCTIONALITY
  // ============================================================================

  // Map hints modal - shows on page load
  function showMapHintsModal(container) {
    const hintsContent = `
      <div class="map-hints-content">
        <h3 class="govuk-heading-s">How to draw a boundary</h3>
        <p class="govuk-body">Click on the map to start drawing a red line boundary around your development site.</p>
        <p class="govuk-body">Click on each corner of your site to create the boundary. Double-click to finish.</p>

        <h3 class="govuk-heading-s govuk-!-margin-top-4">Keyboard controls</h3>
        <p class="govuk-body">Use Tab and arrow keys to navigate the map. Press Enter to interact with controls.</p>
      </div>
    `

    const hintsModal = new Modal({
      title: 'Map hints',
      position: 'center',
      content: hintsContent,
      container: container,
      closeOnOutsideClick: true
    })

    hintsModal.open()
  }

  // ============================================================================
  // MAP INITIALIZATION
  // ============================================================================

  // Helper function to create catchment polygon from GeoJSON feature
  function createCatchmentPolygon(feature, index, map, catchmentColor) {
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

      const polygon = L.polygon(coordinates, {
        color: catchmentColor,
        weight: 2,
        opacity: 0.8,
        fillColor: catchmentColor,
        fillOpacity: 0.6
      }).addTo(map)

      // Add popup with catchment information
      const popupContent = `
        <strong>${catchmentName}</strong><br>
        ${properties.PopupInfo ? `Type: ${properties.PopupInfo}<br>` : ''}
        ${properties.DateAmend ? `Last Updated: ${properties.DateAmend}<br>` : ''}
        ${properties.Notes ? `Notes: ${properties.Notes}` : ''}
      `
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

  // Helper function to load existing boundary from hidden input
  function loadExistingBoundary(drawnItems, map) {
    const existingBoundaryData = document.getElementById('boundary-data').value

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

          const existingPolygon = L.polygon(latLngs, {
            color: '#d4351c',
            weight: 3,
            opacity: 0.8,
            fillColor: '#d4351c',
            fillOpacity: 0.2
          })

          drawnItems.addLayer(existingPolygon)
          map.fitBounds(existingPolygon.getBounds().pad(0.1))

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

      const boundaryData = document.getElementById('boundary-data').value
      if (!boundaryData) {
        e.preventDefault()
        showErrorSummary('Draw a red line boundary to continue')
        return false
      }

      hideErrorSummary()

      // Check for nav=summary query parameter
      const urlParams = new URLSearchParams(window.location.search)
      const navParam = urlParams.get('nav')

      if (navParam === 'summary') {
        try {
          const parsedData = JSON.parse(boundaryData)
          const hasIntersection = parsedData.intersectingCatchment !== null

          if (hasIntersection) {
            e.preventDefault()
            window.location.href = '/nrf-estimate-2-map-layers-spike/summary'
            return false
          }
        } catch (error) {
          console.error('Error parsing boundary data:', error)
        }
      }
    })
  }

  function initMap() {
    // Additional delay to ensure GOV.UK components are ready
    setTimeout(function () {
      // Check if Leaflet is loaded
      if (typeof L === 'undefined') {
        console.error('Leaflet library not loaded')
        const loadingDiv = document.getElementById('map-loading')
        if (loadingDiv) {
          loadingDiv.innerHTML =
            '<p class="govuk-body map-error-message">Error: Map library not loaded. Please refresh the page.</p>'
        }
        return
      }

      // Check if map container exists
      const mapContainer = document.getElementById('map')
      if (!mapContainer) {
        console.error('Map container not found')
        return
      }

      // Show map hints modal on page load
      showMapHintsModal(mapContainer)

      try {
        // Hide loading message
        const loadingDiv = document.getElementById('map-loading')
        if (loadingDiv) {
          loadingDiv.style.display = 'none'
        }

        // Initialize the map centered on England
        const map = L.map('map', {
          zoomControl: false
        }).setView([52.5, -1.5], 6)

        // Create base layers for the layer control
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

        // Check for saved layer preference in cookie
        const savedLayer = window.CookieUtils
          ? window.CookieUtils.get('mapBaseLayer')
          : null

        // Add default layer based on saved preference or default to street map
        if (savedLayer === 'satellite') {
          satelliteMap.addTo(map)
        } else {
          streetMap.addTo(map)
        }

        // Create custom map style switcher button
        const mapStyleButton = L.control({ position: 'topright' })
        mapStyleButton.onAdd = function () {
          const button = L.DomUtil.create('button', 'map-style-button')
          button.type = 'button'
          button.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="9" height="9" fill="#505a5f" stroke="none"/>
              <rect x="13" y="2" width="9" height="9" fill="#b1b4b6" stroke="none"/>
              <rect x="2" y="13" width="9" height="9" fill="#b1b4b6" stroke="none"/>
              <rect x="13" y="13" width="9" height="9" fill="#505a5f" stroke="none"/>
            </svg>
          `
          button.title = 'Change map style'
          button.setAttribute('aria-label', 'Change map style')

          L.DomEvent.disableClickPropagation(button)
          L.DomEvent.on(button, 'click', function (e) {
            L.DomEvent.stopPropagation(e)
            showMapStyleModal()
          })

          return button
        }
        mapStyleButton.addTo(map)

        // Add zoom control to top-right (after map style button)
        L.control
          .zoom({
            position: 'topright'
          })
          .addTo(map)

        // Map style modal instance
        let mapStyleModal = null

        // Create map style modal
        function showMapStyleModal() {
          // Hide error banner when opening modal
          hideErrorSummary()

          // Re-read the cookie each time the modal opens to get the current selection
          const currentLayer = window.CookieUtils
            ? window.CookieUtils.get('mapBaseLayer')
            : null

          // Create modal content
          const modalContent = `
            <div class="map-style-options">
              <button class="map-style-option ${currentLayer !== 'satellite' ? 'map-style-option--selected' : ''}" data-style="street">
                <div class="map-style-thumbnail">
                  <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23f2efe9' width='100' height='100'/%3E%3Cpath fill='%23fff' d='M20 30h15v20H20zM50 25h30v15H50zM25 60h20v25H25zM60 55h25v30H60z'/%3E%3Cpath stroke='%23ccc' stroke-width='2' fill='none' d='M0 40h100M40 0v100'/%3E%3Cpath fill='%23d4d4d4' d='M5 5h8v8H5zM65 70h6v6h-6z'/%3E%3C/svg%3E" alt="Street map preview" />
                </div>
                <span class="map-style-label">Street map</span>
              </button>
              <button class="map-style-option ${currentLayer === 'satellite' ? 'map-style-option--selected' : ''}" data-style="satellite">
                <div class="map-style-thumbnail">
                  <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3Cpattern id='terrain' width='10' height='10' patternUnits='userSpaceOnUse'%3E%3Crect fill='%234a5f3a' width='10' height='10'/%3E%3Crect fill='%235d7047' x='2' y='2' width='4' height='4'/%3E%3C/pattern%3E%3C/defs%3E%3Crect fill='url(%23terrain)' width='100' height='100'/%3E%3Cpath fill='%23667d52' d='M20 40h25v20H20z'/%3E%3Cpath fill='%2378916a' d='M60 60h30v25H60z'/%3E%3Cpath fill='%233d4f2f' d='M10 75h15v15H10z'/%3E%3C/svg%3E" alt="Satellite view preview" />
                </div>
                <span class="map-style-label">Satellite</span>
              </button>
            </div>
          `

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
          setTimeout(() => {
            const modalElement = mapStyleModal.getElement()
            if (!modalElement) return

            // Style option handlers
            const options = modalElement.querySelectorAll('.map-style-option')
            options.forEach((option) => {
              option.addEventListener('click', () => {
                const style = option.getAttribute('data-style')

                // Update selected state visually
                options.forEach((opt) => {
                  opt.classList.remove('map-style-option--selected')
                })
                option.classList.add('map-style-option--selected')

                // Remove all layers
                map.eachLayer((layer) => {
                  if (layer instanceof L.TileLayer) {
                    map.removeLayer(layer)
                  }
                })

                // Add selected layer
                if (style === 'satellite') {
                  satelliteMap.addTo(map)
                  if (window.CookieUtils) {
                    window.CookieUtils.set('mapBaseLayer', 'satellite', 365)
                  }
                } else {
                  streetMap.addTo(map)
                  if (window.CookieUtils) {
                    window.CookieUtils.set('mapBaseLayer', 'street', 365)
                  }
                }

                // Close modal
                mapStyleModal.close()
              })
            })

            // Custom outside click handler (exclude the map style button)
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
            }, 100)
          }, 50)
        }

        // Load GeoJSON boundaries
        let edpBoundaries = []
        let edpLayers = []

        // Catchment color - purple for good contrast on map
        const catchmentColor = '#ab47bc'

        // Load GeoJSON data
        fetch('/nrf-estimate-2-map-layers-spike/catchments.geojson')
          .then((response) => {
            return response.json()
          })
          .then((data) => {
            // Process each feature in the GeoJSON
            data.features.forEach((feature, index) => {
              const catchmentData = createCatchmentPolygon(
                feature,
                index,
                map,
                catchmentColor
              )

              if (catchmentData) {
                edpLayers.push(catchmentData)
                edpBoundaries.push({
                  name: catchmentData.name,
                  coordinates: catchmentData.coordinates
                })
              }
            })

            // Re-check any existing drawn polygons for intersections
            drawnItems.eachLayer(function (layer) {
              if (layer instanceof L.Polygon) {
                const intersectingCatchment = findIntersectingCatchment(
                  layer,
                  edpLayers
                )
                updateBoundaryData(layer, intersectingCatchment)
              }
            })

            // Only fit map to catchments if no existing boundary is loaded
            if (edpLayers.length > 0 && !existingBoundaryData) {
              const group = new L.featureGroup(
                edpLayers.map((edp) => edp.polygon)
              )
              map.fitBounds(group.getBounds().pad(0.1))
            }
          })
          .catch((error) => {
            console.error('Error loading GeoJSON data:', error)
            const loadingDiv = document.getElementById('map-loading')
            if (loadingDiv) {
              loadingDiv.innerHTML =
                '<p class="govuk-body">Map loaded successfully. Catchment data temporarily unavailable.</p>'
            }
          })

        // Initialize the draw control
        const drawnItems = new L.FeatureGroup()
        map.addLayer(drawnItems)

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

        const drawControl = new L.Control.Draw({
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
                color: '#e1e100',
                message: '<strong>Error:</strong> shape edges cannot cross!'
              },
              shapeOptions: {
                color: '#d4351c',
                weight: 3,
                opacity: 0.8,
                fillColor: '#d4351c',
                fillOpacity: 0.2
              }
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

        map.addControl(drawControl)

        // Hide the toolbar
        setTimeout(() => {
          const toolbar = document.querySelector('.leaflet-draw-toolbar')
          if (toolbar) {
            toolbar.style.display = 'none'
          }
        }, 100)

        // Initialize location search
        initLocationSearch(map)

        // Initialize map key
        initMapKey(map)

        // Load existing boundary data if available
        const existingBoundaryData = loadExistingBoundary(drawnItems, map)

        // Form submission validation
        setupFormValidation()

        // Initialize accessible controls
        setTimeout(() => {
          if (map && drawControl && drawnItems) {
            initAccessibleControls(map, drawControl, drawnItems, edpLayers)
          }
        }, 500)
      } catch (error) {
        console.error('Error initializing map:', error)
        const loadingDiv = document.getElementById('map-loading')
        if (loadingDiv) {
          loadingDiv.innerHTML =
            '<p class="govuk-body map-error-message">Error loading map. Please refresh the page.</p>'
        }
      }
    }, 1000)
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
      document.getElementById('boundary-data').value = ''
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

    document.getElementById('boundary-data').value =
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

    const startDrawingBtn = document.getElementById('start-drawing')
    const editBoundaryBtn = document.getElementById('edit-boundary')
    const deleteBoundaryBtn = document.getElementById('delete-boundary')
    const zoomToEnglandBtn = document.getElementById('zoom-to-england')
    const zoomToBoundaryBtn = document.getElementById('zoom-to-boundary')

    if (
      !startDrawingBtn ||
      !editBoundaryBtn ||
      !deleteBoundaryBtn ||
      !zoomToEnglandBtn ||
      !zoomToBoundaryBtn
    ) {
      console.error('Control elements not found')
      return
    }

    let currentDrawingLayer = null

    // Helper functions for edit mode UI
    function enterEditMode() {
      const panel = document.querySelector('.map-controls-panel')
      const saveButtonContainer = document.getElementById(
        'map-save-button-container'
      )
      const editButtonsContainer = document.getElementById(
        'map-edit-buttons-container'
      )

      // Hide the side panel
      if (panel) {
        panel.style.display = 'none'
      }

      // Hide the save button, show edit buttons
      if (saveButtonContainer) {
        saveButtonContainer.style.display = 'none'
      }
      if (editButtonsContainer) {
        editButtonsContainer.style.display = 'block'
      }

      // Hide search button and container
      if (map._searchButton) {
        map._searchButton.style.display = 'none'
      }
      if (map._searchContainer) {
        map._searchContainer.style.display = 'none'
      }

      // Hide key button and modal
      if (map._keyButton) {
        map._keyButton.style.display = 'none'
      }
      if (map._keyModal) {
        map._keyModal.close()
      }

      // Force Leaflet to recalculate map size after panel is hidden
      setTimeout(() => {
        map.invalidateSize()
      }, 100)
    }

    function exitEditMode() {
      const panel = document.querySelector('.map-controls-panel')
      const saveButtonContainer = document.getElementById(
        'map-save-button-container'
      )
      const editButtonsContainer = document.getElementById(
        'map-edit-buttons-container'
      )

      // Show the side panel
      if (panel) {
        panel.style.display = 'block'
      }

      // Show the save button, hide edit buttons
      if (saveButtonContainer && drawnItems.getLayers().length > 0) {
        saveButtonContainer.style.display = 'block'
      }
      if (editButtonsContainer) {
        editButtonsContainer.style.display = 'none'
      }

      // Show search button (but not the container)
      if (map._searchButton) {
        map._searchButton.style.display = 'flex'
      }

      // Show key button (modal stays closed)
      if (map._keyButton) {
        map._keyButton.style.display = 'flex'
      }

      // Force Leaflet to recalculate map size after panel is shown
      setTimeout(() => {
        map.invalidateSize()
      }, 100)
    }

    // Button event handlers
    // Start drawing
    startDrawingBtn.addEventListener('click', function (e) {
      e.preventDefault()
      if (isDrawing) {
        if (currentDrawingLayer) {
          drawnItems.removeLayer(currentDrawingLayer)
          currentDrawingLayer = null
        }
        if (drawControl._toolbars?.draw?._modes?.polygon) {
          drawControl._toolbars.draw._modes.polygon.handler.disable()
        }
        isDrawing = false
        hideErrorSummary()
        exitEditMode()
      } else {
        if (drawControl._toolbars?.draw?._modes?.polygon) {
          drawControl._toolbars.draw._modes.polygon.handler.enable()
          isDrawing = true
          enterEditMode()
        }
      }
    })

    // Edit boundary
    editBoundaryBtn.addEventListener('click', function (e) {
      e.preventDefault()
      if (isEditing) {
        // Save the edits before disabling edit mode
        if (drawControl._toolbars?.edit?._modes?.edit) {
          drawControl._toolbars.edit._modes.edit.handler.save()
          drawControl._toolbars.edit._modes.edit.handler.disable()
        }
        isEditing = false
        hideErrorSummary()
        exitEditMode()
      } else {
        if (drawnItems.getLayers().length > 0) {
          if (drawControl._toolbars?.edit?._modes?.edit) {
            drawControl._toolbars.edit._modes.edit.handler.enable()
            isEditing = true
            enterEditMode()
          }
        } else {
          showErrorSummary('No boundary to edit. Please draw a boundary first.')
        }
      }
    })

    // Delete boundary - immediately delete without confirmation
    deleteBoundaryBtn.addEventListener('click', function (e) {
      e.preventDefault()
      if (drawnItems.getLayers().length > 0) {
        // Delete the boundary immediately
        drawnItems.clearLayers()
        updateBoundaryData(null, null)
        hideErrorSummary()
        updateLinkStates()

        // Reset editing and drawing states
        // Disable edit mode on the map
        if (drawControl._toolbars?.edit?._modes?.edit) {
          drawControl._toolbars.edit._modes.edit.handler.save()
          drawControl._toolbars.edit._modes.edit.handler.disable()
        }
        // Disable drawing mode on the map
        if (drawControl._toolbars?.draw?._modes?.polygon) {
          drawControl._toolbars.draw._modes.polygon.handler.disable()
        }

        isEditing = false
        isDrawing = false
      } else {
        showErrorSummary('No boundary to delete.')
      }
    })

    // Edit/Drawing mode: Confirm area button
    const confirmEditBtn = document.getElementById('confirm-edit-btn')
    if (confirmEditBtn) {
      confirmEditBtn.addEventListener('click', function (e) {
        e.preventDefault()

        // Handle drawing mode - complete the drawing
        if (isDrawing && drawControl._toolbars?.draw?._modes?.polygon) {
          const drawHandler = drawControl._toolbars.draw._modes.polygon.handler

          // If currently drawing, complete the polygon
          if (drawHandler._enabled) {
            drawHandler.completeShape()
          }
        }

        // Handle edit mode - save edits
        if (isEditing && drawControl._toolbars?.edit?._modes?.edit) {
          const editHandler = drawControl._toolbars.edit._modes.edit.handler

          // Complete any incomplete drawings
          if (editHandler._enabled) {
            // Save the edits
            editHandler.save()
            editHandler.disable()
          }

          // Exit edit mode
          isEditing = false
        }

        // Exit drawing mode
        if (isDrawing) {
          if (drawControl._toolbars?.draw?._modes?.polygon) {
            drawControl._toolbars.draw._modes.polygon.handler.disable()
          }
          isDrawing = false
        }

        hideErrorSummary()
        exitEditMode()
      })
    }

    // Edit/Drawing mode: Cancel button
    const cancelEditBtn = document.getElementById('cancel-edit-btn')
    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', function (e) {
        e.preventDefault()

        // Cancel drawing mode - remove any partial drawing
        if (isDrawing) {
          if (currentDrawingLayer) {
            drawnItems.removeLayer(currentDrawingLayer)
            currentDrawingLayer = null
          }
          if (drawControl._toolbars?.draw?._modes?.polygon) {
            drawControl._toolbars.draw._modes.polygon.handler.disable()
          }
          isDrawing = false
        }

        // Cancel edit mode - revert any changes
        if (isEditing) {
          if (drawControl._toolbars?.edit?._modes?.edit) {
            const editHandler = drawControl._toolbars.edit._modes.edit.handler

            // Disable edit mode without saving
            if (editHandler._enabled) {
              editHandler.revertLayers()
              editHandler.disable()
            }
          }
          isEditing = false
        }

        hideErrorSummary()
        exitEditMode()
      })
    }

    // Zoom to England
    zoomToEnglandBtn.addEventListener('click', function (e) {
      e.preventDefault()
      map.setView([52.5, -1.5], 6)
    })

    // Zoom to boundary
    zoomToBoundaryBtn.addEventListener('click', function (e) {
      e.preventDefault()
      if (drawnItems.getLayers().length > 0) {
        const group = new L.featureGroup(drawnItems.getLayers())
        map.fitBounds(group.getBounds().pad(0.1))
        hideErrorSummary()
      } else {
        showErrorSummary('No boundary to zoom to.')
      }
    })

    // Helper function to update button states based on boundary existence
    function updateLinkStates() {
      const hasBoundary = drawnItems.getLayers().length > 0
      const saveButtonContainer = document.getElementById(
        'map-save-button-container'
      )

      if (hasBoundary) {
        // Hide start drawing button when boundary exists
        hideElement(startDrawingBtn)

        // Show and enable edit/delete/zoom buttons
        showElement(editBoundaryBtn)
        enableElement(editBoundaryBtn)
        enableElement(deleteBoundaryBtn)
        enableElement(zoomToBoundaryBtn)

        // Show the floating save button
        if (saveButtonContainer) {
          saveButtonContainer.style.display = 'block'
        }
      } else {
        // Show start drawing button when no boundary
        showElement(startDrawingBtn)

        // Hide and disable edit button, disable delete/zoom buttons
        hideElement(editBoundaryBtn)
        disableElement(editBoundaryBtn)
        disableElement(deleteBoundaryBtn)
        disableElement(zoomToBoundaryBtn)

        // Hide the floating save button
        if (saveButtonContainer) {
          saveButtonContainer.style.display = 'none'
        }
      }
    }

    // Map drawing event handlers
    map.on(L.Draw.Event.CREATED, function (event) {
      const layer = event.layer
      drawnItems.addLayer(layer)
      currentDrawingLayer = layer
      isDrawing = false
      hideErrorSummary()
      updateLinkStates()
      exitEditMode()

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
      updateLinkStates()
      document.getElementById('boundary-data').value = ''
    })

    updateLinkStates()
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
    const isVisible = searchContainer.style.display === 'block'
    searchContainer.style.display = isVisible ? 'none' : 'block'
    searchButton.style.display = isVisible ? 'flex' : 'none'

    // Toggle key button and modal visibility based on search panel state
    if (map._keyButton) {
      map._keyButton.style.display = isVisible ? 'flex' : 'none'
    }
    if (map._keyModal) {
      if (isVisible) {
        // Search is closing, key button will be shown, close modal
        map._keyModal.close()
      } else {
        // Search is opening, hide modal and button
        map._keyModal.close()
      }
    }

    if (!isVisible) {
      searchInput.focus()
      // Show results dropdown if there are results and input has value
      if (
        searchInput.value.trim().length > 0 &&
        resultsDropdown.children.length > 0
      ) {
        resultsDropdown.style.display = 'block'
      }
    }
  }

  // Helper function to hide search and show related UI elements
  function hideSearchPanel(searchContainer, searchButton, map) {
    searchContainer.style.display = 'none'
    searchButton.style.display = 'flex'

    // Show key button when search is hidden
    if (map._keyButton) {
      map._keyButton.style.display = 'flex'
    }
  }

  function initLocationSearch(map) {
    // Create search button
    const searchButton = document.createElement('button')
    searchButton.id = 'location-search-button'
    searchButton.className = 'govuk-button govuk-button--secondary'
    searchButton.innerHTML = `
      <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 20 20" fill-rule="evenodd" fill="currentColor">
        <path d="M12.084 14.312c-1.117.711-2.444 1.123-3.866 1.123C4.235 15.435 1 12.201 1 8.218S4.235 1 8.218 1s7.217 3.235 7.217 7.218c0 1.422-.412 2.749-1.123 3.866L19 16.773 16.773 19l-4.689-4.688zM8.218 2.818c2.98 0 5.4 2.419 5.4 5.4s-2.42 5.4-5.4 5.4-5.4-2.42-5.4-5.4 2.419-5.4 5.4-5.4z"></path>
      </svg>
      <span>Search</span>
    `
    searchButton.setAttribute('aria-label', 'Search for location')

    // Create search container
    const searchContainer = document.createElement('div')
    searchContainer.id = 'location-search-container'

    // Create search input
    const searchInput = document.createElement('input')
    searchInput.id = 'location-search-input'
    searchInput.className = 'govuk-input'
    searchInput.type = 'text'
    searchInput.placeholder = 'Search for a place in England'

    // Create results dropdown
    const resultsDropdown = document.createElement('div')
    resultsDropdown.id = 'location-search-results'

    searchContainer.appendChild(searchInput)
    searchContainer.appendChild(resultsDropdown)

    // Add to map container
    const mapContainer = document.getElementById('map')
    mapContainer.appendChild(searchButton)
    mapContainer.appendChild(searchContainer)

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
        resultsDropdown.style.display = 'none'
      }
    })

    // Show results when input is focused if there are existing results
    searchInput.addEventListener('focus', function () {
      if (
        searchInput.value.trim().length > 0 &&
        resultsDropdown.children.length > 0
      ) {
        resultsDropdown.style.display = 'block'
      }
    })

    // Search input handler
    searchInput.addEventListener('input', function (e) {
      const query = e.target.value.trim()

      clearTimeout(searchTimeout)

      if (query.length < 2) {
        resultsDropdown.style.display = 'none'
        return
      }

      searchTimeout = setTimeout(() => {
        searchLocation(query, resultsDropdown, map)
      }, 300)
    })

    // Handle keyboard navigation
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        searchContainer.style.display = 'none'
        searchButton.style.display = 'flex'
        resultsDropdown.style.display = 'none'
      }
    })

    // Store reference to search elements for hiding during edit/draw mode
    map._searchButton = searchButton
    map._searchContainer = searchContainer
  }

  // Search for location using postcodes.io API
  function searchLocation(query, resultsDropdown, map) {
    // Request more results to account for filtering out non-English locations
    const apiUrl = `https://api.postcodes.io/places?q=${encodeURIComponent(query)}&limit=50`

    fetch(apiUrl)
      .then((response) => response.json())
      .then((data) => {
        if (data.status === 200 && data.result && data.result.length > 0) {
          // Filter results to only include English locations
          const englishResults = data.result.filter(
            (result) => result.country === 'England'
          )

          if (englishResults.length > 0) {
            // Limit to 10 results after filtering
            displaySearchResults(
              englishResults.slice(0, 10),
              resultsDropdown,
              map
            )
          } else {
            resultsDropdown.innerHTML =
              '<div class="search-message">No English locations found. Try a different search term.</div>'
            resultsDropdown.style.display = 'block'
          }
        } else {
          resultsDropdown.innerHTML =
            '<div class="search-message">No results found</div>'
          resultsDropdown.style.display = 'block'
        }
      })
      .catch((error) => {
        console.error('Error searching location:', error)
        resultsDropdown.innerHTML =
          '<div class="search-error">Error searching location</div>'
        resultsDropdown.style.display = 'block'
      })
  }

  // Display search results
  function displaySearchResults(results, resultsDropdown, map) {
    resultsDropdown.innerHTML = ''
    resultsDropdown.style.display = 'block'

    results.forEach((result) => {
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
        resultsDropdown.style.display = 'none'
        const searchContainer = document.getElementById(
          'location-search-container'
        )
        const searchButton = document.getElementById('location-search-button')
        hideSearchPanel(searchContainer, searchButton, map)
      })

      resultsDropdown.appendChild(resultItem)
    })
  }

  /**
   * Calculate zoom level based on location type
   * @param {'City' | 'Town' | 'Suburban Area' | 'Village' | 'Hamlet' | 'Other Settlement' | 'Locality' | string} localType - The type of location from postcodes.io API
   * @returns {number} The appropriate zoom level (11-15)
   */
  function getZoomLevelFromLocationType(localType) {
    // Map local_type to appropriate zoom levels
    // More specific types = more zoomed in
    const typeToZoom = {
      City: 11, // Large cities - zoomed out
      Town: 12, // Medium towns
      'Suburban Area': 13, // Suburban areas
      Village: 14, // Small villages
      Hamlet: 15, // Very small hamlets - street level
      'Other Settlement': 14, // Default for settlements
      Locality: 14 // Other localities
    }

    // Return zoom level or default to 13 if type not found
    return typeToZoom[localType] || 13
  }

  // Zoom to selected location
  function zoomToLocation(location, map) {
    const lat = location.latitude
    const lng = location.longitude
    const localType = location.local_type

    const zoomLevel = getZoomLevelFromLocationType(localType)

    // Animate to location
    map.flyTo([lat, lng], zoomLevel, {
      duration: 1.5
    })
  }

  // ============================================================================
  // MAP KEY
  // ============================================================================

  function initMapKey(map) {
    const mapContainer = document.getElementById('map')

    // Create key toggle button
    const keyButton = document.createElement('button')
    keyButton.id = 'map-key-button'
    keyButton.className = 'govuk-button govuk-button--secondary'
    keyButton.innerHTML = `
      <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 20 20" fill-rule="evenodd" fill="currentColor">
        <circle cx="3.5" cy="4" r="1.5"></circle>
        <circle cx="3.5" cy="10" r="1.5"></circle>
        <circle cx="3.5" cy="16" r="1.5"></circle>
        <path d="M7 4h11M7 10h11M7 16h11" fill="none" stroke="currentColor" stroke-width="2"></path>
      </svg>
      <span>Key</span>
    `
    keyButton.setAttribute('aria-label', 'Toggle map key')

    // Add to map container
    mapContainer.appendChild(keyButton)

    // Create key content
    const keyContent = `
      <div class="map-key-item">
        <div class="map-key-swatch"></div>
        <span class="map-key-label">EDP areas</span>
      </div>
    `

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
      if (modalElement && modalElement.style.display !== 'none') {
        keyModal.close()
        keyButton.style.display = 'flex'
      } else {
        keyModal.open()
        keyButton.style.display = 'none'
      }
    })

    // Close modal when clicking outside
    document.addEventListener('click', function (e) {
      const modalElement = keyModal.getElement()
      if (
        modalElement &&
        modalElement.style.display !== 'none' &&
        !modalElement.contains(e.target) &&
        !keyButton.contains(e.target)
      ) {
        keyModal.close()
        keyButton.style.display = 'flex'
      }
    })

    // Store references for hiding during edit/draw mode and when search is open
    map._keyModal = keyModal
    map._keyButton = keyButton
  }
})()
