/*
  Boundary map for the journey engine's `:::map` block.

  The engine renders the saved red line boundary as an inline SVG so the
  page works without JavaScript and in print. When the production map
  plugin (@defra/interactive-map, served by the kit from /plugin-assets/)
  is on the page, this script draws the same boundary on a small read-only
  basemap instead: the keyless Streets style the drawing page also offers.
*/
;(function () {
  var STREETS_STYLE = {
    id: 'openfreemap',
    label: 'Streets',
    url: 'https://tiles.openfreemap.org/styles/liberty',
    attribution: 'OpenFreeMap &copy; OpenMapTiles Data from OpenStreetMap',
    backgroundColor: '#f5f5f0'
  }
  var BOUNDARY_COLOUR = '#d4351c'
  // Extra room around the boundary, as a share of its width and height
  var FIT_BUFFER_RATIO = 0.5

  function bufferedBounds(ring) {
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
    var lngBuffer = (east - west) * FIT_BUFFER_RATIO
    var latBuffer = (north - south) * FIT_BUFFER_RATIO
    return [
      west - lngBuffer,
      south - latBuffer,
      east + lngBuffer,
      north + latBuffer
    ]
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
                strokeWidth: 3,
                fill: 'rgba(212, 53, 28, 0.3)'
              }
            }
          ]
        })
      )
    }

    try {
      var map = new defra.InteractiveMap(canvas.id, {
        behaviour: 'inline',
        mapProvider: defra.maplibreProvider(),
        mapStyle: STREETS_STYLE,
        bounds: bufferedBounds(ring),
        containerHeight: '100%',
        urlPosition: 'none',
        plugins: plugins
      })
      map.on('map:ready', function () {
        if (svg) {
          svg.hidden = true
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
