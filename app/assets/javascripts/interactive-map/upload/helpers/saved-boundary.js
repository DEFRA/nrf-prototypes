// Renders the saved boundary as a static, non-interactive GeoJSON source with
// fixed fill/line paint layers. This is only for read-only preview use (the
// file preview page). The draw map hydrates the saved boundary into the draw
// plugin instead (see ../../draw/helpers/saved-boundary.js), because there
// it must stay editable.

/**
 * @param {object} map - MapLibre map instance
 * @param {object} options
 * @param {string} options.sourceId
 * @param {object} options.geojson
 * @param {string} options.color
 * @param {number} options.fillOpacity
 * @param {number} options.lineWidth
 * @param {object} [options.linePaint]
 * @returns {boolean}
 */
export function renderSavedBoundary(
  map,
  { sourceId, geojson, color, fillOpacity, lineWidth, linePaint = {} }
) {
  if (!geojson) {
    return false
  }

  if (map.getSource(sourceId)) {
    return false
  }

  map.addSource(sourceId, {
    type: 'geojson',
    data: geojson,
    // Disable geojson-vt's simplification: a small red line boundary (a
    // single building footprint a few metres across) gets simplified down
    // to a degenerate shape in the low-zoom internal tiles, so it silently
    // disappears when the map is zoomed out. This is a single static shape,
    // so full precision at every zoom is cheap.
    tolerance: 0
  })

  map.addLayer({
    id: `${sourceId}-fill`,
    type: 'fill',
    source: sourceId,
    paint: {
      'fill-color': color,
      'fill-opacity': fillOpacity
    }
  })

  map.addLayer({
    id: `${sourceId}-line`,
    type: 'line',
    source: sourceId,
    paint: {
      'line-color': color,
      'line-width': lineWidth,
      ...linePaint
    }
  })

  return true
}

const BOUNDARY_SOURCE_ID = 'boundary'

// Copied from the shapeStroke/shapeFill/strokeWidth defaults in
// @defra/interactive-map's draw plugin, which has no public API for these
// values, so the read-only preview matches the boundary drawn by the draw
// tool.
const BOUNDARY_COLOR = 'rgba(212,53,28,1)'
const BOUNDARY_FILL_OPACITY = 0.1
const BOUNDARY_LINE_WIDTH = 2

/**
 * @param {object} map
 * @param {object|null} initialFeature
 */
export function wireSavedBoundary(map, initialFeature) {
  // 'styledata' fires several times while a style is being built up, so
  // re-check isStyleLoaded() on every occurrence rather than trusting the
  // first one. The listener stays subscribed because switching the basemap
  // (map styles panel) replaces the style and clears manually-added
  // sources and layers, including this boundary; re-running re-adds it, and
  // renderSavedBoundary is a no-op while the source still exists.
  function renderIfStyleReady() {
    if (!map.isStyleLoaded()) {
      return
    }

    renderSavedBoundary(map, {
      sourceId: BOUNDARY_SOURCE_ID,
      geojson: initialFeature,
      color: BOUNDARY_COLOR,
      fillOpacity: BOUNDARY_FILL_OPACITY,
      lineWidth: BOUNDARY_LINE_WIDTH
    })
  }

  renderIfStyleReady()
  map.on('styledata', renderIfStyleReady)
}
