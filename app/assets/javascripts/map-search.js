/**
 * Map Search Module
 * Handles location search feature using postcodes.io API
 */

;(function () {
  'use strict'

  // Create global namespace for search functions
  window.MapSearch = window.MapSearch || {}

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  const POSTCODES_API_BASE = 'https://api.postcodes.io/places'
  const POSTCODES_API_LIMIT = 50
  const POSTCODES_MAX_DISPLAY_RESULTS = 10

  const SEARCH_MIN_QUERY_LENGTH = 2
  const DEBOUNCE_SEARCH_MS = 300

  const ZOOM_LEVEL_BY_TYPE = {
    City: 11,
    Town: 12,
    'Suburban Area': 13,
    Village: 14,
    Hamlet: 15,
    'Other Settlement': 14,
    Locality: 14
  }
  const ZOOM_LEVEL_DEFAULT = 13
  const FLY_TO_DURATION_SECONDS = 1.5

  const DOM_IDS = {
    locationSearchButton: 'location-search-button',
    locationSearchContainer: 'location-search-container',
    locationSearchInput: 'location-search-input',
    locationSearchResults: 'location-search-results'
  }

  // ============================================================================
  // LOCATION SEARCH
  // ============================================================================

  /**
   * Toggle search visibility and related UI elements
   * @param {HTMLElement} searchContainer - Search container element
   * @param {HTMLElement} searchButton - Search button element
   * @param {HTMLElement} searchInput - Search input element
   * @param {HTMLElement} resultsDropdown - Results dropdown element
   * @param {L.Map} map - Leaflet map instance
   */
  function toggleSearchVisibility(
    searchContainer,
    searchButton,
    searchInput,
    resultsDropdown,
    map
  ) {
    const isVisible = !searchContainer.classList.contains('hidden')

    if (isVisible) {
      window.MapUI.hideElement(searchContainer)
      window.MapUI.showElement(searchButton)
    } else {
      window.MapUI.showElement(searchContainer)
      window.MapUI.hideElement(searchButton)
    }

    // Toggle key button and modal visibility based on search panel state
    if (map._keyButton) {
      if (isVisible) {
        window.MapUI.showElement(map._keyButton)
      } else {
        window.MapUI.hideElement(map._keyButton)
      }
    }
    if (map._keyModal) {
      // Always close modal when toggling search
      map._keyModal.close()
    }

    // Toggle help button visibility based on search panel state
    if (map._helpButton) {
      if (isVisible) {
        window.MapUI.showElement(map._helpButton)
      } else {
        window.MapUI.hideElement(map._helpButton)
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
        window.MapUI.showElement(resultsDropdown)
      }
    }
  }

  /**
   * Hide search panel and show related UI elements
   * @param {HTMLElement} searchContainer - Search container element
   * @param {HTMLElement} searchButton - Search button element
   * @param {L.Map} map - Leaflet map instance
   */
  function hideSearchPanel(searchContainer, searchButton, map) {
    window.MapUI.hideElement(searchContainer)
    window.MapUI.showElement(searchButton)

    // Show key button when search is hidden
    if (map._keyButton) {
      window.MapUI.showElement(map._keyButton)
    }

    // Show help button when search is hidden
    if (map._helpButton) {
      window.MapUI.showElement(map._helpButton)
    }
  }

  /**
   * Calculate zoom level based on location type
   * @param {string} localType - The type of location from postcodes.io API
   * @returns {number} The appropriate zoom level (11-15)
   */
  function getZoomLevelFromLocationType(localType) {
    return ZOOM_LEVEL_BY_TYPE[localType] || ZOOM_LEVEL_DEFAULT
  }

  /**
   * Zoom to selected location
   * @param {Object} location - Location object from API
   * @param {L.Map} map - Leaflet map instance
   */
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

  /**
   * Create search result item element
   * @param {Object} result - Search result object
   * @param {L.Map} map - Leaflet map instance
   * @param {HTMLElement} resultsDropdown - Results dropdown element
   * @returns {HTMLElement} Result item element
   */
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
      window.MapUI.hideElement(resultsDropdown)
      const searchContainer = document.getElementById(
        DOM_IDS.locationSearchContainer
      )
      const searchButton = document.getElementById(DOM_IDS.locationSearchButton)
      hideSearchPanel(searchContainer, searchButton, map)
    })

    return resultItem
  }

  /**
   * Display search results
   * @param {Array} results - Array of search results
   * @param {HTMLElement} resultsDropdown - Results dropdown element
   * @param {L.Map} map - Leaflet map instance
   */
  function displaySearchResults(results, resultsDropdown, map) {
    resultsDropdown.innerHTML = ''
    window.MapUI.showElement(resultsDropdown)

    results.forEach((result) => {
      const resultItem = createSearchResultItem(result, map, resultsDropdown)
      resultsDropdown.appendChild(resultItem)
    })
  }

  /**
   * Handle search results from API
   * @param {Object} data - API response data
   * @param {HTMLElement} resultsDropdown - Results dropdown element
   * @param {L.Map} map - Leaflet map instance
   */
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
        window.MapUI.showElement(resultsDropdown)
      }
    } else {
      resultsDropdown.innerHTML =
        '<div class="search-message">No results found</div>'
      window.MapUI.showElement(resultsDropdown)
    }
  }

  /**
   * Search for location using postcodes.io API
   * @param {string} query - Search query
   * @param {HTMLElement} resultsDropdown - Results dropdown element
   * @param {L.Map} map - Leaflet map instance
   */
  function searchLocation(query, resultsDropdown, map) {
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
        window.MapUI.showElement(resultsDropdown)
      })
  }

  /**
   * Initialize location search functionality
   * @param {L.Map} map - Leaflet map instance
   */
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
        window.MapUI.hideElement(resultsDropdown)
      }
    })

    // Show results when input is focused if there are existing results
    searchInput.addEventListener('focus', function () {
      if (
        searchInput.value.trim().length > 0 &&
        resultsDropdown.children.length > 0
      ) {
        window.MapUI.showElement(resultsDropdown)
      }
    })

    // Search input handler
    searchInput.addEventListener('input', function (e) {
      const query = e.target.value.trim()

      clearTimeout(searchTimeout)

      if (query.length < SEARCH_MIN_QUERY_LENGTH) {
        window.MapUI.hideElement(resultsDropdown)
        return
      }

      searchTimeout = setTimeout(() => {
        searchLocation(query, resultsDropdown, map)
      }, DEBOUNCE_SEARCH_MS)
    })

    // Handle keyboard navigation
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        window.MapUI.hideElement(searchContainer)
        window.MapUI.showElement(searchButton)
        window.MapUI.hideElement(resultsDropdown)
      }
    })

    // Store reference to search elements for hiding during edit/draw mode
    map._searchButton = searchButton
    map._searchContainer = searchContainer
  }

  // Export functions to global namespace
  window.MapSearch.initLocationSearch = initLocationSearch
})()
