/**
 * Zoom Aesthetics Component
 *
 * Two related behaviours that kick in at high zoom levels:
 *
 * 1. FILL FADE-OUT
 *    At zoom >= ZOOM_THRESHOLD the fill of both EDP vector layers is set to
 *    opacity 0 (stroke/border remains). A MapLibre 'step' expression on the
 *    fill-opacity paint property handles this continuously — no per-zoom events.
 *
 * 2. MAP BORDER
 *    When the viewport centre sits inside an EDP polygon at high zoom,
 *    a coloured inset box-shadow is applied to the map container to indicate
 *    which levy area the user is looking at. Cleared on zoom-out or on pan
 *    outside the area.
 */

window.ZoomAesthetics = (function () {
  'use strict';

  // Zoom level at which fills disappear and the border indicator activates.
  var ZOOM_THRESHOLD = 12;

  // Per-dataset configuration — must match the IDs used by the datasetsPlugin.
  // Layer naming convention: `${datasetId}-fill` and `${datasetId}-border` or `-line`.
  var DATASETS = [
    {
      id: 'gcn-edp',
      fillLayerId: 'gcn-edp',
      queryLayerIds: ['gcn-edp', 'gcn-edp-fill', 'gcn-edp-border', 'gcn-edp-line', 'gcn-edp-stroke'],
      color: '#f47738',
      label: 'Nature Restoration Fund great crested newt levy'
    },
    {
      id: 'catchments',
      fillLayerId: 'catchments',
      queryLayerIds: ['catchments', 'catchments-fill', 'catchments-border', 'catchments-line', 'catchments-stroke'],
      color: '#0000ff',
      label: 'Nature Restoration Fund nutrients levy'
    }
  ];

  var maplibreMap = null;
  var mapEl = null;

  // Stores the original fill-opacity for each dataset, read once at init.
  var originalOpacity = {};

  // ------------------------------------------------------------------
  // Public init
  // ------------------------------------------------------------------

  function init(map, mapElement) {
    maplibreMap = map;
    mapEl = mapElement || document.getElementById('map');

    if (!maplibreMap) {
      console.warn('[ZoomAesthetics] No MapLibre map instance provided');
      return;
    }

    maplibreMap.once('idle', function () {
      captureOpacities();
      applyFillOpacity();
      updateMapBorder();
    });

    maplibreMap.on('style.load', function () {
      maplibreMap.once('idle', function () {
        captureOpacities();
        applyFillOpacity();
      });
    });

    maplibreMap.on('zoomend', function () {
      applyFillOpacity();
      scheduleBorderUpdate();
    });

    maplibreMap.on('moveend', function () {
      scheduleBorderUpdate();
    });

    console.log('[ZoomAesthetics] Initialized (fill threshold: zoom ' + ZOOM_THRESHOLD + ')');
  }

  // ------------------------------------------------------------------
  // Feature 1: zoom-based fill opacity
  // ------------------------------------------------------------------

  /** Read and store each layer's current fill-opacity before we touch it. */
  function captureOpacities() {
    DATASETS.forEach(function (ds) {
      if (!maplibreMap.getLayer(ds.fillLayerId)) return;
      var val = maplibreMap.getPaintProperty(ds.fillLayerId, 'fill-opacity');
      // If the datasetsPlugin set a zoom expression, fall back to a sensible default.
      originalOpacity[ds.fillLayerId] = (typeof val === 'number') ? val : 1;
    });
  }

  /** Set fill-opacity to 0 above the threshold, original value below. */
  function applyFillOpacity() {
    var aboveThreshold = maplibreMap.getZoom() >= ZOOM_THRESHOLD;
    DATASETS.forEach(function (ds) {
      if (!maplibreMap.getLayer(ds.fillLayerId)) return;
      var opacity = aboveThreshold ? 0.0000001 : (originalOpacity[ds.fillLayerId] !== undefined ? originalOpacity[ds.fillLayerId] : 1);
      maplibreMap.setPaintProperty(ds.fillLayerId, 'fill-opacity', opacity);
    });
  }

  // ------------------------------------------------------------------
  // Feature 2: map border when inside an EDP area
  // ------------------------------------------------------------------

  /**
   * Check whether the viewport centre is inside any EDP polygon and apply
   * a coloured border to the map container.
   */
  function updateMapBorder() {
    if (!mapEl || !maplibreMap) return;

    var zoom = maplibreMap.getZoom();
    if (zoom < ZOOM_THRESHOLD) {
      clearBorder();
      return;
    }

    var queryLayerIds = DATASETS.reduce(function (acc, ds) {
      var ids = ds.queryLayerIds || [ds.fillLayerId];
      for (var i = 0; i < ids.length; i++) {
        if (maplibreMap.getLayer(ids[i])) acc.push(ids[i]);
      }
      return acc;
    }, []);

    if (queryLayerIds.length === 0) {
      clearBorder();
      return;
    }

    var canvas = maplibreMap.getCanvas();
    var cx = canvas.offsetWidth / 2;
    var cy = canvas.offsetHeight / 2;

    var features = maplibreMap.queryRenderedFeatures([cx, cy], {
      layers: queryLayerIds
    });

    if (!features || features.length === 0) {
      clearBorder();
      return;
    }

    // Collect all datasets whose fill layer has a feature at the centre point.
    var matched = [];
    for (var i = 0; i < DATASETS.length; i++) {
      var ids = DATASETS[i].queryLayerIds || [DATASETS[i].fillLayerId];
      for (var j = 0; j < features.length; j++) {
        if (ids.indexOf(features[j].layer.id) !== -1) {
          matched.push(DATASETS[i]);
          break;
        }
      }
    }

    if (matched.length === 0) {
      clearBorder();
      return;
    }

    // Border colour: first matched dataset takes priority (gcn-edp listed first).
    // When in multiple areas use GDS blue as a neutral indicator.
    var borderColor = matched.length === 1 ? matched[0].color : '#1d70b8';
    var borderLabel = matched.length === 1
      ? 'You\u2019re in: ' + matched[0].label
      : 'You\u2019re in ' + matched.length + ' levy areas';

    applyBorder(borderColor, borderLabel);
  }

  var borderOverlay = null;
  var labelStrip = null;
  var borderDebounceTimer = null;

  function scheduleBorderUpdate() {
    if (borderDebounceTimer) clearTimeout(borderDebounceTimer);
    borderDebounceTimer = setTimeout(updateMapBorder, 150);
  }

  function getBorderOverlay() {
    if (!borderOverlay) {
      borderOverlay = document.createElement('div');
      borderOverlay.style.cssText = [
        'position:absolute',
        'inset:0',
        'pointer-events:none',
        'z-index:9999',
        'border:0px solid transparent',
        'box-sizing:border-box',
        'transition:border-color 0.2s ease'
      ].join(';');
      if (mapEl) mapEl.appendChild(borderOverlay);
    }
    return borderOverlay;
  }

  function getLabelStrip() {
    if (!labelStrip) {
      labelStrip = document.createElement('div');
      labelStrip.style.cssText = [
        'position:absolute',
        'bottom:12px',
        'left:50%',
        'transform:translateX(-50%)',
        'pointer-events:none',
        'z-index:10000',
        'color:#ffffff',
        'font-family:GDS Transport,arial,sans-serif',
        'font-size:14px',
        'font-weight:700',
        'padding:8px 16px',
        'white-space:nowrap',
        'border-radius:2px',
        'opacity:0',
        'transition:opacity 0.2s ease, background-color 0.2s ease'
      ].join(';');
      if (mapEl) mapEl.appendChild(labelStrip);
    }
    return labelStrip;
  }

  function applyBorder(color, label) {
    var el = getBorderOverlay();
    el.style.borderWidth = '8px';
    el.style.borderColor = color;

    var strip = getLabelStrip();
    strip.textContent = label;
    strip.style.backgroundColor = color;
    strip.style.opacity = '1';
  }

  function clearBorder() {
    var el = getBorderOverlay();
    el.style.borderColor = 'transparent';
    el.style.borderWidth = '0px';

    var strip = getLabelStrip();
    strip.style.opacity = '0';
  }

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  return {
    init: init
  };
})();
