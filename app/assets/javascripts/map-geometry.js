/**
 * Map Geometry Module
 * Handles polygon intersection calculations for boundary validation
 */

;(function () {
  'use strict'

  // Create global namespace for geometry functions
  window.MapGeometry = window.MapGeometry || {}

  // ============================================================================
  // GEOMETRY CALCULATION HELPERS
  // ============================================================================

  /**
   * Check if two line segments intersect
   * @param {Array} p1 - First point of first segment [lng, lat]
   * @param {Array} q1 - Second point of first segment [lng, lat]
   * @param {Array} p2 - First point of second segment [lng, lat]
   * @param {Array} q2 - Second point of second segment [lng, lat]
   * @returns {boolean} True if segments intersect
   */
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

  /**
   * Check if a point is inside a polygon using ray casting
   * @param {Array} point - Point to check [lng, lat]
   * @param {Array} polygon - Array of polygon points [[lng, lat], ...]
   * @returns {boolean} True if point is inside polygon
   */
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

  /**
   * Calculate bounding box for a polygon
   * @param {Array} polygon - Array of polygon points [[lng, lat], ...]
   * @returns {Object} Bounding box {minX, minY, maxX, maxY}
   */
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

  /**
   * Check if two bounding boxes overlap
   * @param {Object} bounds1 - First bounding box
   * @param {Object} bounds2 - Second bounding box
   * @returns {boolean} True if boxes overlap
   */
  function boundsOverlap(bounds1, bounds2) {
    return !(
      bounds1.maxX < bounds2.minX ||
      bounds2.maxX < bounds1.minX ||
      bounds1.maxY < bounds2.minY ||
      bounds2.maxY < bounds1.minY
    )
  }

  /**
   * Check if two polygons intersect
   * @param {Array} polygon1 - First polygon [[lng, lat], ...]
   * @param {Array} polygon2 - Second polygon [[lng, lat], ...]
   * @returns {boolean} True if polygons intersect
   */
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

  /**
   * Find intersecting catchment for a drawn layer
   * @param {L.Layer} layer - Leaflet layer to check
   * @param {Array} edpLayers - Array of catchment layer data
   * @returns {Object|null} Intersecting catchment data or null
   */
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

  // Export functions to global namespace
  window.MapGeometry.lineSegmentsIntersect = lineSegmentsIntersect
  window.MapGeometry.isPointInPolygon = isPointInPolygon
  window.MapGeometry.getPolygonBounds = getPolygonBounds
  window.MapGeometry.boundsOverlap = boundsOverlap
  window.MapGeometry.polygonIntersects = polygonIntersects
  window.MapGeometry.findIntersectingCatchment = findIntersectingCatchment
})()
