/*
  Boundary map for the journey engine's `:::map` block.

  The engine renders the saved red line boundary as an inline SVG so the
  page works without JavaScript and in print. When the production map
  plugin (@defra/interactive-map, served by the kit from /plugin-assets/)
  is on the page, this script draws the same boundary on a small read-only
  basemap instead, looking like the location plan on a planning
  application: the Ordnance Survey Black and white style, which draws OS
  MasterMap (building outlines, plot boundaries, house numbers and road
  names) at site scale. The style JSON goes through the
  app/routes/os-base-map.js proxy, so it needs an OS key on the server (the
  script tag carries data-has-os-key); without one the keyless OpenFreeMap
  Positron style, the nearest street map in greys, stands in.
*/
;(function () {
  var script = document.currentScript
  var hasOsKey = Boolean(
    script && script.getAttribute('data-has-os-key') === 'true'
  )
  var PLANNING_STYLE = {
    id: 'black-and-white',
    label: 'Black and white',
    url: '/public/data/vts/OS_VTS_3857_Black_and_White.json',
    attribution:
      '&copy; Crown copyright and database rights ' +
      new Date().getFullYear() +
      ' Ordnance Survey',
    backgroundColor: '#ffffff',
    showAttributionOnMobile: true
  }
  var KEYLESS_STYLE = {
    id: 'positron',
    label: 'Streets',
    url: 'https://tiles.openfreemap.org/styles/positron',
    attribution: 'OpenFreeMap &copy; OpenMapTiles Data from OpenStreetMap',
    backgroundColor: '#ffffff',
    showAttributionOnMobile: true
  }
  // The red line as the production draw tool draws it, a little heavier so
  // it reads at this size
  var BOUNDARY_COLOUR = '#d4351c'
  var BOUNDARY_FILL = 'rgba(212, 53, 28, 0.1)'
  var BOUNDARY_WIDTH = 3
  // Room around the boundary, as a share of the frame's shorter side
  var FIT_PADDING_RATIO = 0.2
  // Zoomed in no further than this, so the smallest sites still show the
  // streets around them (about 1:1250, a planning location plan's scale)
  var FIT_MAX_ZOOM = 18

  // A MapLibre web worker has no page URL to resolve the OS style's
  // relative tile and font paths against (see
  // interactive-map/shared-helpers/to-absolute-url.js)
  function transformRequest(url) {
    return {
      url:
        typeof url === 'string' && url.charAt(0) === '/'
          ? window.location.origin + url
          : url
    }
  }

  function boundsOf(ring) {
    var west = Infinity
    var south = Infinity
    var east = -Infinity
    var north = -Infinity
    ring.forEach(function (point) {
      west = Math.min(west, point[0])
      east = Math.max(east, point[0])
      south = Math.min(south, point[1])
      north = Math.max(north, point[1])
    })
    return [west, south, east, north]
  }

  function fitBoundary(map, canvas, bounds) {
    var padding = Math.round(
      Math.min(canvas.clientWidth, canvas.clientHeight) * FIT_PADDING_RATIO
    )
    map.fitBounds(
      [
        [bounds[0], bounds[1]],
        [bounds[2], bounds[3]]
      ],
      { padding: padding, maxZoom: FIT_MAX_ZOOM, animate: false }
    )
  }

  function drawMap(figure) {
    var defra = window.defra
    if (!defra || !defra.InteractiveMap || !defra.maplibreProvider) {
      return
    }
    var ring
    try {
      ring = JSON.parse(figure.getAttribute('data-coordinates'))
    } catch (error) {
      return
    }
    if (!Array.isArray(ring) || ring.length < 4) {
      return
    }
    var canvas = figure.querySelector('.app-boundary-map__canvas')
    var svg = figure.querySelector('.app-boundary-map__svg')
    if (!canvas) {
      return
    }
    canvas.id =
      canvas.id || 'boundary-map-' + Math.random().toString(36).slice(2)
    canvas.hidden = false

    var geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 1,
          properties: { name: 'Red line boundary' },
          geometry: { type: 'Polygon', coordinates: [ring] }
        }
      ]
    }
    var plugins = []
    if (typeof defra.datasetsPlugin === 'function') {
      plugins.push(
        defra.datasetsPlugin({
          datasets: [
            {
              id: 'red-line-boundary',
              label: 'Red line boundary',
              geojson: geojson,
              minZoom: 0,
              maxZoom: 24,
              showInKey: false,
              showInMenu: false,
              style: {
                stroke: BOUNDARY_COLOUR,
                strokeWidth: BOUNDARY_WIDTH,
                fill: BOUNDARY_FILL
              }
            }
          ]
        })
      )
    }
    if (typeof defra.scaleBarPlugin === 'function') {
      plugins.push(defra.scaleBarPlugin({ units: 'metric' }))
    }

    var bounds = boundsOf(ring)
    try {
      var map = new defra.InteractiveMap(canvas.id, {
        behaviour: 'inline',
        mapProvider: defra.maplibreProvider(),
        mapLabel: 'Red line boundary of the development',
        mapStyle: hasOsKey ? PLANNING_STYLE : KEYLESS_STYLE,
        bounds: bounds,
        containerHeight: '100%',
        urlPosition: 'none',
        // A picture, not something to move about: no control buttons
        enableMapControls: false,
        enableZoomControls: false,
        transformRequest: transformRequest,
        plugins: plugins
      })
      map.on('map:ready', function (event) {
        if (event && event.map && typeof event.map.fitBounds === 'function') {
          fitBoundary(event.map, canvas, bounds)
        }
        // The SVG is not an HTML element, so it has no `hidden` property:
        // the attribute (and the stylesheet) hide it
        if (svg) {
          svg.setAttribute('hidden', '')
        }
      })
    } catch (error) {
      canvas.hidden = true
      if (window.console && console.warn) {
        console.warn('Boundary map could not be drawn', error)
      }
    }
  }

  function init() {
    var figures = document.querySelectorAll('[data-module="app-boundary-map"]')
    Array.prototype.forEach.call(figures, drawMap)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
