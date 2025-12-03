/**
 * Map UI Module
 * Handles UI state management, edit mode, buttons, and error messages
 */

;(function () {
  'use strict'

  // Create global namespace for UI functions
  window.MapUI = window.MapUI || {}

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  const DELAY_MAP_RESIZE_MS = 100

  const DOM_IDS = {
    errorSummary: 'client-error-summary',
    errorLink: 'client-error-link',
    saveButtonContainer: 'map-save-button-container',
    editButtonsContainer: 'map-edit-buttons-container'
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  /**
   * Show error summary with message
   * @param {string} message - Error message to display
   */
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

  /**
   * Hide error summary
   */
  function hideErrorSummary() {
    const errorSummary = document.getElementById(DOM_IDS.errorSummary)
    if (errorSummary) {
      errorSummary.classList.add('hidden')
    }
  }

  // ============================================================================
  // ELEMENT STATE HELPERS
  // ============================================================================

  /**
   * Enable an element
   * @param {HTMLElement} element - Element to enable
   */
  function enableElement(element) {
    element.disabled = false
  }

  /**
   * Disable an element
   * @param {HTMLElement} element - Element to disable
   */
  function disableElement(element) {
    element.disabled = true
  }

  /**
   * Show an element by removing hidden class
   * @param {HTMLElement} element - Element to show
   */
  function showElement(element) {
    element.classList.remove('hidden')
  }

  /**
   * Hide an element by adding hidden class
   * @param {HTMLElement} element - Element to hide
   */
  function hideElement(element) {
    element.classList.add('hidden')
  }

  // ============================================================================
  // EDIT MODE UI
  // ============================================================================

  /**
   * Enter edit mode - hide panels and show edit buttons
   * @param {maplibregl.Map} map - MapLibre map instance
   */
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

    // Disable dataset layers during drawing/editing
    if (window.MapDatasets && window.MapDatasets.disableAllLayers) {
      window.MapDatasets.disableAllLayers()
    }

    // Force MapLibre to recalculate map size after panel is hidden
    setTimeout(() => {
      map.resize()
    }, DELAY_MAP_RESIZE_MS)
  }

  /**
   * Exit edit mode - show panels and hide edit buttons
   * @param {maplibregl.Map} map - MapLibre map instance
   * @param {MapboxDraw} drawnItems - MapboxDraw instance
   */
  function exitEditMode(map, drawnItems) {
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
      drawnItems.getAll &&
      drawnItems.getAll().features.length > 0
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

    // Re-enable dataset layers after drawing/editing
    if (window.MapDatasets && window.MapDatasets.enableAllLayers) {
      window.MapDatasets.enableAllLayers()
    }

    // Force MapLibre to recalculate map size after panel is shown
    setTimeout(() => {
      map.resize()
    }, DELAY_MAP_RESIZE_MS)
  }

  /**
   * Update button states based on boundary existence
   * @param {Object} controls - Object containing control elements
   * @param {MapboxDraw} drawnItems - MapboxDraw instance
   */
  function updateLinkStates(controls, drawnItems) {
    const hasBoundary =
      drawnItems && drawnItems.getAll && drawnItems.getAll().features.length > 0
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

  // Export functions to global namespace
  window.MapUI.showErrorSummary = showErrorSummary
  window.MapUI.hideErrorSummary = hideErrorSummary
  window.MapUI.enableElement = enableElement
  window.MapUI.disableElement = disableElement
  window.MapUI.showElement = showElement
  window.MapUI.hideElement = hideElement
  window.MapUI.enterEditMode = enterEditMode
  window.MapUI.exitEditMode = exitEditMode
  window.MapUI.updateLinkStates = updateLinkStates
})()
