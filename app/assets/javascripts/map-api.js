/**
 * Map API Module
 * Handles server-side API calls for EDP boundary checking
 */

;(function () {
  'use strict'

  // Create global namespace
  window.MapAPI = window.MapAPI || {}

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  const API_ENDPOINT = '/nrf-estimate-3/api/check-edp-intersection'
  const API_TIMEOUT_MS = 10000 // 10 seconds

  // ============================================================================
  // API CALLS
  // ============================================================================

  /**
   * Check if boundary intersects with EDP areas
   * @param {Array} coordinates - Polygon coordinates [[lng, lat], ...]
   * @returns {Promise<Object>} Promise resolving to intersection results
   */
  async function checkEDPIntersection(coordinates) {
    if (!coordinates || !Array.isArray(coordinates)) {
      throw new Error('Invalid coordinates provided')
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ coordinates }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Unknown error occurred')
      }

      // Immediately update the intersections display with the fresh API response data
      if (window.MapStats && window.MapStats.updateIntersections) {
        window.MapStats.updateIntersections(data.intersections)
      }

      return data.intersections
    } catch (error) {
      clearTimeout(timeoutId)

      if (error.name === 'AbortError') {
        throw new Error(
          'Request timed out. Please check your connection and try again.'
        )
      }

      throw error
    }
  }

  // ============================================================================
  // UI STATE MANAGEMENT
  // ============================================================================

  // DOM IDs
  const DOM_IDS = {
    boundaryProcessing: 'boundary-processing',
    boundaryCheckError: 'boundary-check-error',
    boundaryCheckRetry: 'boundary-check-retry',
    map: 'map'
  }

  /**
   * Show loading state - centered on map without blocking background
   */
  function showLoadingState() {
    let loadingEl = document.getElementById(DOM_IDS.boundaryProcessing)
    if (!loadingEl) {
      // Create dedicated loading indicator for boundary processing
      loadingEl = document.createElement('div')
      loadingEl.id = DOM_IDS.boundaryProcessing
      loadingEl.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        pointer-events: none;
      `
      loadingEl.innerHTML = `
        <div style="text-align: center; pointer-events: auto; background: rgba(255, 255, 255, 0.95); padding: 15px; border-radius: 4px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);">
          <div class="map-loading-spinner"></div>
          <p class="govuk-body govuk-!-margin-top-2" style="font-weight: 600;">Processing boundary...</p>
        </div>
      `
      const mapEl = document.getElementById(DOM_IDS.map)
      if (mapEl) {
        mapEl.appendChild(loadingEl)
      }
    }
    loadingEl.style.display = 'flex'

    const form = document.querySelector('form')
    if (form) {
      form.classList.add('api-checking')
    }
  }

  /**
   * Hide loading state
   */
  function hideLoadingState() {
    const loadingEl = document.getElementById(DOM_IDS.boundaryProcessing)
    if (loadingEl) {
      loadingEl.style.display = 'none'
    }

    const form = document.querySelector('form')
    if (form) {
      form.classList.remove('api-checking')
    }
  }

  /**
   * Show error state with retry option
   * @param {string} message - Error message to display
   * @param {Function} retryCallback - Function to call on retry
   */
  function showErrorState(message, retryCallback) {
    hideLoadingState()

    let errorEl = document.getElementById(DOM_IDS.boundaryCheckError)
    if (!errorEl) {
      errorEl = document.createElement('div')
      errorEl.id = DOM_IDS.boundaryCheckError
      errorEl.className = 'govuk-error-summary'
      errorEl.setAttribute('role', 'alert')
      errorEl.setAttribute('aria-labelledby', 'error-summary-title')
      errorEl.style.cssText = 'margin-bottom: 15px;'

      const mapSidebar = document.querySelector('.map-sidebar')
      if (mapSidebar && mapSidebar.firstChild) {
        mapSidebar.insertBefore(errorEl, mapSidebar.firstChild)
      }
    }

    errorEl.innerHTML = `
      <h2 class="govuk-error-summary__title" id="error-summary-title">
        There is a problem
      </h2>
      <div class="govuk-error-summary__body">
        <p class="govuk-body-s">${message}</p>
        <button type="button" class="govuk-button govuk-button--secondary govuk-!-margin-bottom-0" id="boundary-check-retry">
          Try again
        </button>
      </div>
    `

    errorEl.style.display = 'block'

    const retryBtn = document.getElementById(DOM_IDS.boundaryCheckRetry)
    if (retryBtn && retryCallback) {
      retryBtn.addEventListener('click', function () {
        errorEl.style.display = 'none'
        retryCallback()
      })
    }

    errorEl.focus()
  }

  /**
   * Hide error state
   */
  function hideErrorState() {
    const errorEl = document.getElementById(DOM_IDS.boundaryCheckError)
    if (errorEl) {
      errorEl.style.display = 'none'
    }
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  window.MapAPI.checkEDPIntersection = checkEDPIntersection
  window.MapAPI.showLoadingState = showLoadingState
  window.MapAPI.hideLoadingState = hideLoadingState
  window.MapAPI.showErrorState = showErrorState
  window.MapAPI.hideErrorState = hideErrorState
})()
