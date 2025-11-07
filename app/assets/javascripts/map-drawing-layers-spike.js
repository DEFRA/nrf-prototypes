/**
 * Map Drawing Interface for NRF Estimate
 * Handles interactive boundary drawing using Leaflet and Leaflet-Draw
 */

;(function () {
  'use strict'

  let isDrawing = false
  let isEditing = false

  // Wait for everything to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMap)
  } else {
    initMap()
  }

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

  // Helper functions for managing element states
  function enableElement(element) {
    element.removeAttribute('aria-disabled')
    element.setAttribute('tabindex', '0')
  }

  function disableElement(element) {
    element.setAttribute('aria-disabled', 'true')
    element.setAttribute('tabindex', '-1')
  }

  function showElement(element) {
    element.style.display = 'block'
  }

  function hideElement(element) {
    element.style.display = 'none'
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
            '<p class="govuk-body" style="color: red;">Error: Map library not loaded. Please refresh the page.</p>'
        }
        return
      }

      // Check if map container exists
      const mapContainer = document.getElementById('map')
      if (!mapContainer) {
        console.error('Map container not found')
        return
      }

      try {
        // Hide loading message
        const loadingDiv = document.getElementById('map-loading')
        if (loadingDiv) {
          loadingDiv.style.display = 'none'
        }

        // Initialize the map centered on England
        const map = L.map('map').setView([52.5, -1.5], 6)

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map)

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
              const properties = feature.properties
              const geometry = feature.geometry

              // Extract catchment name from properties
              const catchmentName =
                properties.Label ||
                properties.N2K_Site_N ||
                `Catchment ${index + 1}`

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
                  fillOpacity: 0.3
                }).addTo(map)

                // Add popup with catchment information
                const popupContent = `
                  <strong>${catchmentName}</strong><br>
                  ${properties.PopupInfo ? `Type: ${properties.PopupInfo}<br>` : ''}
                  ${properties.DateAmend ? `Last Updated: ${properties.DateAmend}<br>` : ''}
                  ${properties.Notes ? `Notes: ${properties.Notes}` : ''}
                `
                polygon.bindPopup(popupContent)

                edpLayers.push({
                  name: catchmentName,
                  polygon: polygon,
                  coordinates: coordinates,
                  properties: properties
                })

                edpBoundaries.push({
                  name: catchmentName,
                  coordinates: coordinates
                })
              }
            })

            // Re-check any existing drawn polygons for intersections
            drawnItems.eachLayer(function (layer) {
              if (layer instanceof L.Polygon) {
                const drawnPolygon = layer.getLatLngs()[0]
                const drawnPoints = drawnPolygon.map((latLng) => [
                  latLng.lng,
                  latLng.lat
                ])

                let intersectingCatchment = null
                edpLayers.forEach((catchment) => {
                  if (polygonIntersects(drawnPoints, catchment.coordinates)) {
                    intersectingCatchment = catchment
                  }
                })

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

        // Load existing boundary data if available
        const existingBoundaryData =
          document.getElementById('boundary-data').value

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
            }
          } catch (error) {
            console.error('Error loading existing boundary:', error)
          }
        }

        // Form submission validation
        document.querySelector('form').addEventListener('submit', function (e) {
          if (isDrawing) {
            e.preventDefault()
            showErrorSummary(
              'Finish or delete the red line boundary to continue'
            )
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
                window.location.href =
                  '/nrf-estimate-2-map-layers-spike/summary'
                return false
              }
            } catch (error) {
              console.error('Error parsing boundary data:', error)
            }
          }
        })

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
            '<p class="govuk-body" style="color: red;">Error loading map. Please refresh the page.</p>'
        }
      }
    }, 1000)
  }

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
    const toggleCatchmentsBtn = document.getElementById('toggle-catchments')

    if (
      !startDrawingBtn ||
      !editBoundaryBtn ||
      !deleteBoundaryBtn ||
      !zoomToEnglandBtn ||
      !zoomToBoundaryBtn ||
      !toggleCatchmentsBtn
    ) {
      console.error('Control elements not found')
      return
    }

    let catchmentsVisible = true
    let currentDrawingLayer = null

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
        startDrawingBtn.textContent = 'Start drawing boundary'
        startDrawingBtn.classList.remove('govuk-link--destructive')
        exitEditMode()
      } else {
        if (drawControl._toolbars?.draw?._modes?.polygon) {
          drawControl._toolbars.draw._modes.polygon.handler.enable()
          isDrawing = true
          startDrawingBtn.textContent = 'Cancel drawing'
          startDrawingBtn.classList.add('govuk-link--destructive')
          enterEditMode()
        }
      }
    })

    // Edit boundary
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

      // Force Leaflet to recalculate map size after panel is shown
      setTimeout(() => {
        map.invalidateSize()
      }, 100)
    }

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
        editBoundaryBtn.textContent = 'Edit boundary'
        editBoundaryBtn.classList.remove('govuk-link--destructive')
        exitEditMode()
      } else {
        if (drawnItems.getLayers().length > 0) {
          if (drawControl._toolbars?.edit?._modes?.edit) {
            drawControl._toolbars.edit._modes.edit.handler.enable()
            isEditing = true
            editBoundaryBtn.textContent = 'Stop editing'
            editBoundaryBtn.classList.add('govuk-link--destructive')
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

        // Reset button text and styling
        editBoundaryBtn.textContent = 'Edit boundary'
        editBoundaryBtn.classList.remove('govuk-link--destructive')
        startDrawingBtn.textContent = 'Start drawing boundary'
        startDrawingBtn.classList.remove('govuk-link--destructive')
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
          editBoundaryBtn.textContent = 'Edit boundary'
          editBoundaryBtn.classList.remove('govuk-link--destructive')
        }

        // Exit drawing mode
        if (isDrawing) {
          if (drawControl._toolbars?.draw?._modes?.polygon) {
            drawControl._toolbars.draw._modes.polygon.handler.disable()
          }
          isDrawing = false
          startDrawingBtn.textContent = 'Start drawing boundary'
          startDrawingBtn.classList.remove('govuk-link--destructive')
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
          startDrawingBtn.textContent = 'Start drawing boundary'
          startDrawingBtn.classList.remove('govuk-link--destructive')
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
          editBoundaryBtn.textContent = 'Edit boundary'
          editBoundaryBtn.classList.remove('govuk-link--destructive')
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

    // Toggle catchments
    toggleCatchmentsBtn.addEventListener('click', function (e) {
      e.preventDefault()
      if (edpLayers && edpLayers.length > 0) {
        catchmentsVisible = !catchmentsVisible
        edpLayers.forEach((edp) => {
          if (catchmentsVisible) {
            map.addLayer(edp.polygon)
          } else {
            map.removeLayer(edp.polygon)
          }
        })
        toggleCatchmentsBtn.textContent = catchmentsVisible
          ? 'Hide catchments'
          : 'Show catchments'
        hideErrorSummary()
      } else {
        showErrorSummary('Catchment data is not available.')
      }
    })

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

    // Drawing events
    map.on(L.Draw.Event.CREATED, function (event) {
      const layer = event.layer
      drawnItems.addLayer(layer)
      currentDrawingLayer = layer
      isDrawing = false
      startDrawingBtn.textContent = 'Start drawing boundary'
      startDrawingBtn.classList.remove('govuk-link--destructive')
      hideErrorSummary()
      updateLinkStates()
      exitEditMode()

      if (edpLayers && edpLayers.length > 0) {
        const drawnPolygon = layer.getLatLngs()[0]
        const drawnPoints = drawnPolygon.map((latLng) => [
          latLng.lng,
          latLng.lat
        ])

        let intersectingCatchment = null
        for (const catchment of edpLayers) {
          if (polygonIntersects(drawnPoints, catchment.coordinates)) {
            intersectingCatchment = catchment
            break
          }
        }
        updateBoundaryData(layer, intersectingCatchment)
      } else {
        updateBoundaryData(layer, null)
      }
    })

    map.on(L.Draw.Event.EDITED, function (event) {
      const layers = event.layers
      layers.eachLayer(function (layer) {
        if (edpLayers && edpLayers.length > 0) {
          const drawnPolygon = layer.getLatLngs()[0]
          const drawnPoints = drawnPolygon.map((latLng) => [
            latLng.lng,
            latLng.lat
          ])

          let intersectingCatchment = null
          for (const catchment of edpLayers) {
            if (polygonIntersects(drawnPoints, catchment.coordinates)) {
              intersectingCatchment = catchment
              break
            }
          }
          updateBoundaryData(layer, intersectingCatchment)
        } else {
          updateBoundaryData(layer, null)
        }
      })
    })

    map.on(L.Draw.Event.DELETED, function () {
      updateLinkStates()
      document.getElementById('boundary-data').value = ''
    })

    updateLinkStates()
  }
})()
