/**
 * Initialize the @defra/interactive-map component
 * This file initializes the map using the UMD bundles loaded via script tags
 */

window.MapInit = (function() {
  'use strict';

  // Store the feature globally
  let feature = null;
  let drawPlugin = null;
  let interactPlugin = null;
  let isDrawingMode = false;
  let isEditingMode = false;
  let editModeEnteredViaButton = false; // Track if edit mode was started by user clicking Edit button
  let mapStatsReady = false;
  let maplibreMap = null;
  let snapModeActive = false;
  let pointsPlaced = 0;
  let justCompletedDrawing = false; // Track if we just finished drawing (not confirming)
  let latestUpdateFeature = null; // Track the latest feature from draw:update events
  let drawCancelled = false; // Guard against late draw:create events after cancel
  const INITIAL_IDLE_HINT = 'Select Draw to begin drawing your red line boundary.';

  // Drawing hints panel helper functions
  function showDrawingHint(message, snapHint) {
    const panel = document.getElementById('drawing-hints-panel');
    const messageEl = document.getElementById('drawing-hints-message');
    const snapEl = document.getElementById('drawing-hints-snap');
    
    if (panel && messageEl) {
      messageEl.textContent = message;
      
      if (snapEl) {
        if (snapHint) {
          snapEl.textContent = snapHint;
          snapEl.style.display = 'block';
        } else {
          snapEl.style.display = 'none';
        }
      }
      
      panel.style.display = 'block';
    }
  }

  function hideDrawingHint() {
    const panel = document.getElementById('drawing-hints-panel');
    if (panel) {
      panel.style.display = 'none';
    }
  }

  function updateHintForState(state) {
    const snapHint = snapModeActive 
      ? 'Snap tool is enabled. Points will snap to outlines and features.'
      : null;

    switch(state) {
      case 'no-points':
        showDrawingHint(
          'Click on map to draw first point.',
          snapHint
        );
        break;
      case 'has-points':
        showDrawingHint(
          pointsPlaced < 3
            ? 'Move cursor and click to add points.'
            : 'Click on first point to join shape. You can also select the tick to complete your shape.',
          snapHint
        );
        break;
      case 'edit-mode':
        showDrawingHint(
          'Click to select point to move or delete. Select done when you are finished drawing.',
          snapHint
        );
        break;
      case 'vertex-selected':
        showDrawingHint(
          'Press delete key to remove this point. Drag to move.',
          snapHint
        );
        break;
      default:
        hideDrawingHint();
    }
  }

  function getDrawSnapButton() {
    return document.querySelector(
      'button[id$="draw-snap"], button[id$="drawsnap"], button[aria-label="Snap to line"]'
    );
  }

  function getDrawDeletePointButton() {
    return document.querySelector('button[id$="draw-delete-point"]');
  }

  function triggerDeleteSelectedVertex() {
    const deleteButton = getDrawDeletePointButton();
    if (!deleteButton) {
      return false;
    }

    const isDisabled =
      deleteButton.disabled ||
      deleteButton.getAttribute('aria-disabled') === 'true' ||
      deleteButton.classList.contains('disabled');

    if (isDisabled) {
      return false;
    }

    deleteButton.click();
    return true;
  }

  function isDrawCancelButton(target) {
    if (!target || !target.closest) {
      return false;
    }

    const cancelButton = target.closest(
      'button[id$="draw-cancel"], button[id$="drawcancel"], button[aria-label*="Cancel"], button[title*="Cancel"]'
    );

    if (cancelButton) {
      return true;
    }

    const anyButton = target.closest('button');
    return !!(anyButton && /cancel/i.test(anyButton.textContent || ''));
  }

  function resetAfterCancelledDraw() {
    isDrawingMode = false;
    isEditingMode = false;
    editModeEnteredViaButton = false;
    latestUpdateFeature = null;

    hideDrawingHint();

    const desktopMenu = document.querySelector('.map-drawing-menu-desktop');
    if (desktopMenu) {
      desktopMenu.style.display = '';
    }

    // Ensure mobile users can get back to drawing controls immediately.
    if (window.interactiveMapInstance && window.interactiveMapInstance.showPanel) {
      window.interactiveMapInstance.showPanel('drawing-menu');
    }

    if (window.updateDrawButtonStates) {
      window.updateDrawButtonStates();
    }
  }

  function forceDeleteTransientBoundary() {
    try {
      if (drawPlugin && drawPlugin.deleteFeature) {
        drawPlugin.deleteFeature('boundary');
      }
    } catch (error) {
      console.log('Force delete transient boundary skipped:', error?.message || error);
    }

    feature = null;
    updateIntersectionsForFeature(null);

    const statsPanel = document.getElementById('map-stats-panel');
    if (statsPanel) {
      statsPanel.classList.add('hidden');
    }

    if (mapStatsReady && window.MapStats && window.MapStats.handlePolygonDelete) {
      window.MapStats.handlePolygonDelete();
    }
  }

  function updateHintForCurrentState() {
    if (isEditingMode) {
      updateHintForState('edit-mode');
      return;
    }

    if (isDrawingMode) {
      updateHintForState(pointsPlaced > 0 ? 'has-points' : 'no-points');
      return;
    }

    // Initial idle guidance: only show when no boundary exists yet.
    if (!feature) {
      showDrawingHint(INITIAL_IDLE_HINT);
      return;
    }

    hideDrawingHint();
  }

  function syncSnapModeFromButton() {
    const button = getDrawSnapButton();
    if (!button) {
      return;
    }

    snapModeActive = button.getAttribute('aria-pressed') === 'true';

    if (isDrawingMode || isEditingMode) {
      updateHintForCurrentState();
    }
  }

  function currentStyleSupportsSnap() {
    if (!maplibreMap || !maplibreMap.getStyle) {
      return true;
    }

    const style = maplibreMap.getStyle();
    const layerIds = new Set((style?.layers || []).map((layer) => layer?.id).filter(Boolean));
    const snapLayerList = Array.isArray(window.MapConfig?.snapLayers) ? window.MapConfig.snapLayers : [];

    if (!snapLayerList.length) {
      return false;
    }

    return snapLayerList.some((layerId) => layerIds.has(layerId));
  }

  function syncSnapButtonAvailability() {
    const button = getDrawSnapButton();
    if (!button) {
      return;
    }

    const canSnap = currentStyleSupportsSnap();

    button.disabled = !canSnap;
    button.setAttribute('aria-disabled', canSnap ? 'false' : 'true');
    button.style.pointerEvents = canSnap ? '' : 'none';
    button.style.opacity = canSnap ? '' : '0.5';

    if (!canSnap) {
      button.setAttribute('title', 'Snap is unavailable for this map style');
      if (snapModeActive && button.getAttribute('aria-pressed') === 'true') {
        button.click();
      }
      snapModeActive = false;
    } else {
      button.removeAttribute('title');
    }

    updateHintForCurrentState();
  }

  // const DRAW_BUTTON_LABELS = {
  //   Done: 'Confirm area',
  //   'Finish shape': 'Confirm area'
  // };

  // Transform function for geocoding requests - adds OS API key
  function transformGeocodeRequest(request) {
    const url = new URL(request.url, window.location.origin);
    // OS API key will be added on the backend, or we can add it here if needed
    return request;
  }

  function getPolygonBounds(coordinates) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    coordinates.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });
    return { minX, minY, maxX, maxY };
  }

  function updateBoundaryDataValue(boundaryData) {
    const boundaryInput = document.getElementById('boundary-data');
    if (boundaryInput) {
      boundaryInput.value = boundaryData ? JSON.stringify(boundaryData) : '';
    }
  }

  function logAllFeatures(label) {
    const allFeatures = drawPlugin.getAll?.() || { features: [] };
    console.log(`[${label}] drawPlugin.getAll() returned ${allFeatures.features?.length || 0} feature(s)`);
    if (allFeatures.features?.length) {
      allFeatures.features.forEach((f, idx) => {
        const coords = f?.geometry?.coordinates?.[0];
        console.log(`  Feature ${idx}: ${coords?.length || 0} coordinate points, id=${f.id}`);
      });
    } else {
      console.log(`[${label}] WARNING: drawPlugin.getAll() returned no features - relying on event data`);
    }
    return allFeatures;
  }

  async function updateIntersectionsForFeature(feature) {
    if (!feature?.geometry?.coordinates?.length) {
      updateBoundaryDataValue(null);
      return;
    }

    const ring = feature.geometry.coordinates[0] || [];
    const isClosed = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
    const coordinates = isClosed ? ring.slice(0, -1) : ring.slice();

    const bounds = getPolygonBounds(coordinates);
    const center = [(bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2];

    const boundaryData = {
      center,
      coordinates,
      intersectingCatchment: null,
      intersections: null
    };

    if (window.MapAPI && window.MapAPI.checkEDPIntersection) {
      window.MapAPI.showLoadingState?.();
      try {
        const intersections = await window.MapAPI.checkEDPIntersection(coordinates);
        boundaryData.intersections = intersections;
        boundaryData.intersectingCatchment = intersections?.nutrient || null;
        updateBoundaryDataValue(boundaryData);
        window.MapAPI.hideLoadingState?.();
        return;
      } catch (error) {
        console.error('Error checking EDP intersections:', error);
        window.MapAPI.hideLoadingState?.();
        window.MapAPI.showErrorState?.(error.message, () => updateIntersectionsForFeature(feature));
      }
    }

    updateBoundaryDataValue(boundaryData);
  }

  // function updateDrawToolbarLabels() {
  //   const mapContainer = document.getElementById('map');
  //   if (!mapContainer) {
  //     return;
  //   }
  //
  //   mapContainer.querySelectorAll('button').forEach((button) => {
  //     const label = button.textContent?.trim();
  //     if (label && DRAW_BUTTON_LABELS[label]) {
  //       button.textContent = DRAW_BUTTON_LABELS[label];
  //     }
  //   });
  // }

  function initMap() {
    // Get the global defra namespace from the UMD bundles
    const defra = window.defra;

    console.log('Initializing new interactive map');
    console.log('window.defra:', window.defra);
    console.log('window.defra keys:', Object.keys(window.defra || {}));

    // Check that all required components are available
    if (!defra?.InteractiveMap) {
      console.error('InteractiveMap not found on window.defra - ensure script tags are loaded');
      return;
    }

    if (!defra?.maplibreProvider) {
      console.error('maplibreProvider not found on window.defra - ensure im-core.js script is loaded');
      return;
    }

    // Get configuration
    const config = window.MapConfig;
    const utils = window.MapUtils;
    const menuHelper = window.MapMenu;

    console.log('Snap layers config:', config.snapLayers);

    // Create draw plugin WITHOUT initializing snapLayers yet
    // (they're passed dynamically on each newPolygon/editFeature call instead)
    // This allows snapping to work regardless of initial style
    drawPlugin = defra.drawMLPlugin({});

    // Create interact plugin (for layer interactions)
    interactPlugin = defra.interactPlugin({
      dataLayers: [
        {
          layerId: 'fill-inactive.cold',
          idProperty: 'id'
        },
        {
          layerId: 'stroke-inactive.cold',
          idProperty: 'id'
        }
      ],
      interactionMode: 'select',
      multiSelect: true,
      contiguous: true
    });

    console.log('Creating InteractiveMap with map provider');

    const englandCenterLng = window.MapInitialisation?.ENGLAND_CENTER_LNG ?? -1.5;
    const englandCenterLat = window.MapInitialisation?.ENGLAND_CENTER_LAT ?? 52.5;
    const englandDefaultZoom = window.MapInitialisation?.ENGLAND_DEFAULT_ZOOM ?? 6;

    let map;
    try {
      map = new defra.InteractiveMap('map', {
        behaviour: 'hybrid',
        mapLabel: 'Map showing UK',
        containerHeight: '100%',
        mapProvider: defra.maplibreProvider(),
        center: [englandCenterLng, englandCenterLat],
        zoom: englandDefaultZoom,
        minZoom: 6,
        maxZoom: 20,
        autoColorScheme: true,
        enableZoomControls: true,
        plugins: [
          defra.mapStylesPlugin({
            mapStyles: config.mapStyles
          }),
          defra.scaleBarPlugin({
            units: 'metric'
          }),
          interactPlugin,
          defra.searchPlugin({
            transformRequest: transformGeocodeRequest,
            osNamesURL: config.defaultData.OS_NAMES_URL,
            width: '300px',
            showMarker: false,
            isExpanded:true
          }),
          defra.datasetsPlugin({
            datasets: config.datasets
          }),
          drawPlugin
        ]
      });

      // Map ready event
      map.on('map:ready', function(e) {
        console.log('Map ready');
        maplibreMap = e?.map || maplibreMap;

        if (maplibreMap && maplibreMap.on) {
          maplibreMap.on('style.load', function() {
            setTimeout(syncSnapButtonAvailability, 0);
          });
        }

        // Initialize layer controls now that map is ready
        if (window.LayerControls && window.LayerControls.init && maplibreMap) {
          window.LayerControls.init(maplibreMap);
        }

        // Initialize zoom-based fill fade and map border indicator
        if (window.ZoomAesthetics && window.ZoomAesthetics.init && maplibreMap) {
          window.ZoomAesthetics.init(maplibreMap);
        }
        
        // Initialize stats panel (Turf.js + MapStats) after map is ready
        if (!mapStatsReady && window.MapStats && window.MapStats.init) {
          const drawStatsAdapter = {
            getAll: () => ({ features: feature ? [feature] : [] })
          };
          window.MapStats.init(map, drawStatsAdapter);
          mapStatsReady = !!document.querySelector('.map-stats-panel');
        }
      });

      // App ready event - add buttons and panels
      map.on('app:ready', function(e) {
        console.log('App ready - adding buttons and panels');

        // Filters panel + button — library panel for all breakpoints.
        // render() reads current LayerControls state so checkboxes reflect the live toggle state
        // on every open (avoids Preact re-render resetting the HTML snapshot).
        map.addPanel('filters', {
          label: 'Environmental Delivery Plan areas',
          mobile: { slot: 'bottom-left', modal: true, dismissable: true, initiallyOpen: true },
          tablet: { slot: 'inset', modal: false, width: '395px', dismissable: true, initiallyOpen: true },
          desktop: { slot: 'inset', modal: false, width: '386px', dismissable: true, initiallyOpen: true },
          render: function() {
            var h = window.preactCompat && window.preactCompat.createElement;
            if (!h) return null;
            var lc = window.LayerControls;
            var gcnChecked    = !lc || lc.getLayerVisibility('gcn-edp')    !== 'none';
            var catchChecked  = !lc || lc.getLayerVisibility('catchments') !== 'none';
            var html =
              '<style>' +
              '.edp-layer-item{margin-bottom:10px}' +
              '.edp-layer-color{display:inline-block;width:20px;height:20px;border:1px solid #0b0c0c;' +
              'border-radius:0;margin-right:8px;vertical-align:middle;margin-top:-2px}' +
              '</style>' +
              '<div class="govuk-checkboxes govuk-checkboxes--small" data-module="govuk-checkboxes">' +
              '<div class="govuk-checkboxes__item edp-layer-item">' +
              '<input class="govuk-checkboxes__input" id="layer-gcn-edp" name="layer-gcn-edp"' +
              ' type="checkbox" value="gcn-edp"' + (gcnChecked ? ' checked' : '') + '>' +
              '<label class="govuk-label govuk-checkboxes__label" for="layer-gcn-edp">' +
              '<span class="edp-layer-color" style="background-color:#f47738"></span>' +
              ' Nature Restoration Fund great crested newt levy' +
              '</label></div>' +
              '<div class="govuk-checkboxes__item edp-layer-item">' +
              '<input class="govuk-checkboxes__input" id="layer-catchments" name="layer-catchments"' +
              ' type="checkbox" value="catchments"' + (catchChecked ? ' checked' : '') + '>' +
              '<label class="govuk-label govuk-checkboxes__label" for="layer-catchments">' +
              '<span class="edp-layer-color" style="background-color:#0000ff"></span>' +
              ' Nature Restoration Fund nutrients levy areas' +
              '</label></div>' +
              '</div>';
            return h('div', {
              style: { padding: '16px' },
              dangerouslySetInnerHTML: { __html: html }
            });
          }
        });
        map.addButton('filters', {
          label: 'Key',
          panelId: 'filters',
          iconSvgContent: '<path d="M3 4h18v2H3V4zm3 7h12v2H6v-2zm3 7h6v2H9v-2z"/>',
          mobile: { slot: 'top-left', order: 2 },
          tablet: { slot: 'top-left', order: 2, showLabel: true },
          desktop: { slot: 'top-left', order: 2, showLabel: true },
        });

        // Drawing menu panel — always-open at bottom-left, no button.
        // Rendered once on app:ready; updateMenuState() updates aria-disabled directly in the DOM.
        map.addPanel('drawing-menu', {
          inline:false,
          mobile: { slot: 'bottom-left', modal: true, dismissable: true, initiallyOpen: false },
          tablet: { slot: 'bottom-left', modal: false, dismissable: false, initiallyOpen: false },
          desktop: { slot: 'inset', modal: false, dismissable: false, initiallyOpen: false },
          render: function() {
            var h = window.preactCompat && window.preactCompat.createElement;
            if (!h) return null;
            return h('div', {
              dangerouslySetInnerHTML: { __html: window.MapMenu.renderMenu(feature) }
            });
          }
        });
          map.addButton('drawing-menu', {
          inline:false,
          label: 'Drawing Tools',
          panelId: 'drawing-menu',
          iconSvgContent: '<path d="M19.5 7v10M4.5 7v10M7 19.5h10M7 4.5h10"/><path d="M22 18v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zm0-15v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zM7 18v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zM7 3v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1z"/>',
          mobile: { slot: 'top-left', order: 2 },
          tablet: { slot: 'top-left', order: 2 },
          desktop: { slot: 'top-left', order: 2 },
        });


        // Note: Drawing hints panel is now managed via HTML/CSS in the template
        // See drawing-hints-panel element in map.html
      });

      // Draw ready event
      map.on('draw:ready', function() {
        console.log('Draw ready');
        // updateDrawToolbarLabels();

        // Capture cancel intent before plugin click handlers run.
        document.addEventListener('click', function(e) {
          if (isDrawCancelButton(e.target)) {
            drawCancelled = true;
          }
        }, true);

        // Escape key also cancels draw/edit in the library toolbar.
        // Backspace/Delete both run the same delete-point action as the toolbar button.
        document.addEventListener('keydown', function(e) {
          if (e.key === 'Escape') {
            drawCancelled = true;
            return;
          }

          const isTypingTarget = e.target && (
            e.target.tagName === 'INPUT' ||
            e.target.tagName === 'TEXTAREA' ||
            e.target.isContentEditable
          );

          const isDeleteKey = e.key === 'Delete' || e.key === 'Backspace';
          if (!isTypingTarget && (isDrawingMode || isEditingMode) && isDeleteKey) {
            const deleted = triggerDeleteSelectedVertex();
            if (deleted || e.key === 'Backspace') {
              e.preventDefault();
              e.stopPropagation();
            }
          }
        }, true);

        setTimeout(syncSnapButtonAvailability, 0);

        // Initialize button states
        function updateButtonStates() {
          const saveAndContinueBtn = document.getElementById('save-and-continue-btn');

          // Update drawing menu button states
          if (window.MapMenu) {
            window.MapMenu.updateMenuState(feature);
          }

          if (saveAndContinueBtn) {
            if (feature) {
              saveAndContinueBtn.removeAttribute('disabled');
            } else {
              saveAndContinueBtn.setAttribute('disabled', '');
            }
          }
        }

        // Set initial state
        updateButtonStates();

        // Add a feature if provided (from session data)
        if (window.INITIAL_BOUNDARY_FEATURE) {
          feature = window.INITIAL_BOUNDARY_FEATURE;
          drawPlugin.addFeature(feature);
          updateButtonStates();
          if (mapStatsReady && window.MapStats && window.MapStats.handlePolygonComplete) {
            window.MapStats.handlePolygonComplete(feature);
          }
          updateIntersectionsForFeature(feature);
        }

        // Show initial non-draw guidance when the page first loads.
        updateHintForCurrentState();

        // Wire up drawing control buttons using event delegation
        document.addEventListener('click', function(e) {
          const startDrawingBtn = e.target.closest('#start-drawing');
          if (startDrawingBtn && startDrawingBtn.getAttribute('aria-disabled') !== 'true') {
            e.preventDefault();
            map.hidePanel('drawing-menu');
            const desktopMenu = document.querySelector('.map-drawing-menu-desktop');
            if (desktopMenu) desktopMenu.style.display = 'none';
            console.log('Starting draw mode...');
            drawCancelled = false;
            isDrawingMode = true;
            isEditingMode = false;
            pointsPlaced = 0;
            justCompletedDrawing = false;
            
            // Show initial hint
            updateHintForState('no-points');
            syncSnapModeFromButton();
            syncSnapButtonAvailability();
            
            if (mapStatsReady && window.MapStats && window.MapStats.handleDrawStart) {
              window.MapStats.handleDrawStart();
            }
            drawPlugin.newPolygon('boundary', { snapLayers: config.snapLayers });
            
            // Update hint after each point is placed
            if (maplibreMap && maplibreMap.on) {
              maplibreMap.on('click', function onDrawClick() {
                if (!isDrawingMode) {
                  maplibreMap.off('click', onDrawClick);
                  return;
                }
                pointsPlaced++;
                updateHintForCurrentState();
              });
            }
            // setTimeout(updateDrawToolbarLabels, 0);
          }

          // Edit area
          const editBoundaryBtn = e.target.closest('#edit-boundary');
          if (editBoundaryBtn && editBoundaryBtn.getAttribute('aria-disabled') !== 'true') {
            e.preventDefault();
            map.hidePanel('drawing-menu');
            const desktopMenu = document.querySelector('.map-drawing-menu-desktop');
            if (desktopMenu) desktopMenu.style.display = 'none';
            console.log('Starting edit mode...');
            if (feature) {
              isEditingMode = true;
              editModeEnteredViaButton = true; // Mark that user clicked Edit button
              isDrawingMode = false;
              justCompletedDrawing = false;
              
              if (mapStatsReady && window.MapStats && window.MapStats.handleEditStart) {
                window.MapStats.handleEditStart();
              }
              
              drawPlugin.editFeature('boundary', { snapLayers: config.snapLayers });
              
              // Show edit mode hint after edit starts (ensures intersections are hidden first)
              setTimeout(() => {
                updateHintForState('edit-mode');
                syncSnapModeFromButton();
                syncSnapButtonAvailability();
              }, 0);
              // setTimeout(updateDrawToolbarLabels, 0);
            }
          }

          // Snap toggle button
          const drawSnapBtn = e.target.closest('button[id$="draw-snap"], button[id$="drawsnap"], button[aria-label="Snap to line"]');
          if (drawSnapBtn) {
            setTimeout(syncSnapModeFromButton, 0);
          }

          // Delete area
          const deleteBoundaryBtn = e.target.closest('#delete-boundary');
          if (deleteBoundaryBtn && deleteBoundaryBtn.getAttribute('aria-disabled') !== 'true') {
            e.preventDefault();
            map.hidePanel('drawing-menu');
            console.log('Deleting feature...');
            if (feature) {
              drawPlugin.deleteFeature('boundary');
              feature = null;
              isDrawingMode = false;
              isEditingMode = false;
              if (mapStatsReady && window.MapStats && window.MapStats.handlePolygonDelete) {
                window.MapStats.handlePolygonDelete();
              }
              updateIntersectionsForFeature(null);
              updateButtonStates();
            }
          }
        });

        // Expose updateButtonStates for event handlers
        window.updateDrawButtonStates = updateButtonStates;
      });

      // Drawing event handlers
      map.on('draw:edited', async function(e) {
        console.log('\n✏️  EVENT: draw:edited (EDIT SESSION COMPLETED)');
        console.log('├─ Event data:', e);
        console.log('├─ e.newFeature:', e.newFeature);
        console.log('├─ Event feature coords:', (e.newFeature || e.feature)?.geometry?.coordinates?.[0]?.length || 'NONE');
        console.log('├─ Currently stored feature coords:', feature?.geometry?.coordinates?.[0]?.length || 'NONE');
        logAllFeatures('draw:edited');
        
        const featureFromEvent = e.feature || e.newFeature || (e.features && e.features[0]);
        if (featureFromEvent?.geometry?.coordinates?.[0]) {
          console.log('├─ Event coordinates (first 3 points):');
          console.table(featureFromEvent.geometry.coordinates[0].slice(0, 3));
        }
        
        isDrawingMode = false;
        isEditingMode = false;
        console.log('├─ State: isDrawingMode=false, isEditingMode=false');
        
        // Confirmed area - hide hints
        console.log('├─ Hiding hints');
        hideDrawingHint();
        
        if (mapStatsReady && window.MapStats && window.MapStats.handleDrawStop) {
          console.log('├─ Calling handleDrawStop');
          window.MapStats.handleDrawStop();
        }
        
        // Get the confirmed feature from the event (new event names should include correct geometry)
        feature = featureFromEvent || (drawPlugin.getAll?.().features?.[0]);
        console.log('├─ Feature source:', featureFromEvent ? 'from event' : 'from drawPlugin.getAll()');

        console.log('├─ ✅ Feature STORED with coords:', feature?.geometry?.coordinates?.[0]?.length);
        console.log('├─ Feature ID:', feature?.id);
        
        // Wait for intersections to be calculated FIRST before updating display
        console.log('├─ Processing intersections...');
        await updateIntersectionsForFeature(feature);
        console.log('├─ ✅ Intersections processed');
        
        // NOW update the display with the fresh intersection data
        if (mapStatsReady && window.MapStats && window.MapStats.handlePolygonComplete) {
          console.log('├─ Calling handlePolygonComplete');
          window.MapStats.handlePolygonComplete(feature);
        }
        
        // Show the boundary panel now that drawing/editing is confirmed and data is ready
        const statsPanel = document.getElementById('map-stats-panel');
        if (statsPanel) {
          statsPanel.classList.remove('hidden');
          console.log('├─ ✅ Boundary panel shown');
        }
        
        if (window.updateDrawButtonStates) {
          console.log('├─ Calling updateDrawButtonStates');
          window.updateDrawButtonStates();
          console.log('└─ ✅ Button states updated');
        }
      });

      map.on('draw:updated', function(e) {
        // Capture the latest feature from update events
        const updatedFeature = e?.feature || e?.newFeature || (e?.features && e.features[0]) || feature;
        if (updatedFeature) {
          latestUpdateFeature = updatedFeature;
        }
        
        // Only update stats display for real-time feedback during editing
        if (updatedFeature && mapStatsReady && window.MapStats && window.MapStats.handlePolygonEdit) {
          window.MapStats.handlePolygonEdit(updatedFeature);
        }
      });

      // Drawing event handlers
      // NOTE: Event semantics for v0.0.10-alpha:
      // draw:started - fired on entering draw mode
      // draw:created - fired after a new shape has been created (initial confirmation)
      // draw:updated - fired after geometry has changed during edit mode
      // draw:edited - fired after an edit session has completed
      // draw:cancelled - fired after newPolygon, newLine or editFeature has been cancelled

      // CATCH-ALL: Listen for ALL draw events to debug what's actually firing
      console.log('🔍 Setting up universal event listener for draw events...');
      const drawEvents = ['draw:ready', 'draw:create', 'draw:update', 'draw:done', 'draw:edited', 'draw:cancel', 'draw:add', 'draw:delete', 'draw:vertexselection'];
      let eventSequence = [];
      let eventStartTime = Date.now();
      
      drawEvents.forEach(eventName => {
        map.on(eventName, function(e) {
          const elapsed = Date.now() - eventStartTime;
          eventSequence.push({ event: eventName, time: elapsed });
          console.log(`📡 CAUGHT EVENT: ${eventName} [+${elapsed}ms]`, e);
          console.log('📊 EVENT SEQUENCE:', eventSequence.map(ev => `${ev.event}(+${ev.time}ms)`).join(' → '));
        });
      });

      // Handle draw:started - fired when user enters draw mode
      map.on('draw:started', function(e) {
        console.log('\n🎨 EVENT: draw:started (ENTERING DRAW MODE)');
        drawCancelled = false;
        isDrawingMode = true;
        pointsPlaced = 0;
        console.log('├─ State: isDrawingMode=true');
        console.log('├─ Showing drawing hints (no-points)...');
        updateHintForState('no-points');
        syncSnapModeFromButton();
      });

      // Handle draw:create - fired when user double-clicks to finish initial drawing
      // User is now in EDIT mode (can adjust points), show edit mode hints
      map.on('draw:create', async function(e) {
        console.log('\n🎯 EVENT: draw:create (DOUBLE-CLICKED - NOW IN EDIT MODE)');
        console.log('├─ Event data:', e);
        console.log('├─ e.feature:', e.feature);

        // Defensive guard: some cancel flows can still emit draw:create afterwards.
        // Ignore those late events to avoid getting stuck in edit mode with hidden tools.
        if (drawCancelled || !isDrawingMode) {
          console.log('├─ Ignoring draw:create because drawing was cancelled or is no longer active');
          if (drawCancelled) {
            forceDeleteTransientBoundary();
            resetAfterCancelledDraw();
          }
          return;
        }
        
        // User has moved into edit mode (double-clicked to finish points)
        isDrawingMode = false;
        isEditingMode = true;
        editModeEnteredViaButton = false;
        console.log('├─ State: isDrawingMode=false, isEditingMode=true (CAN NOW EDIT POINTS)');
        
        // Show EDIT mode hints - user can now adjust the shape
        console.log('├─ Showing EDIT mode hints');
        updateHintForState('edit-mode');
        
        // Get the feature from the event
        const featureFromEvent = e.feature || e.newFeature || (e.features && e.features[0]);
        console.log('├─ Feature from event:', !!featureFromEvent);
        
        if (featureFromEvent) {
          feature = featureFromEvent;
          console.log('├─ ✅ Feature STORED for editing: coords=' + feature?.geometry?.coordinates?.[0]?.length);
        } else {
          console.log('├─ ❌ NO FEATURE IN EVENT');
        }
      });

      // Handle draw:done - fired when user clicks the "Done" button
      // This confirms the shape (whether initially drawn or edited), process and update UI
      map.on('draw:done', async function(e) {
        console.log('\n✅ draw:done | editing:', isEditingMode);

        // Library can emit draw:done during cancel in some flows.
        // If cancel intent was set, skip completion and force reset.
        if (drawCancelled) {
          console.log('├─ draw:done ignored because cancel intent is active');
          forceDeleteTransientBoundary();
          resetAfterCancelledDraw();
          return;
        }

        drawCancelled = false;
        
        const wasEditingBeforeClear = isEditingMode;
        isDrawingMode = false;
        isEditingMode = false;
        editModeEnteredViaButton = false;
        
        hideDrawingHint();
        
        // Restore desktop drawing menu
        const desktopMenuDone = document.querySelector('.map-drawing-menu-desktop');
        if (desktopMenuDone) desktopMenuDone.style.display = '';
        
        // If editing, use the latest feature captured from draw:update events
        if (wasEditingBeforeClear && latestUpdateFeature) {
          console.log('├─ Using latestUpdateFeature from edits, coords:', latestUpdateFeature?.geometry?.coordinates?.[0]?.length);
          feature = latestUpdateFeature;
          latestUpdateFeature = null; // Clear it
        } else {
          // Try event feature for initial draw
          const featureFromEvent = e.feature || e.newFeature || (e.features && e.features[0]);
          console.log('├─ Event feature coords:', featureFromEvent?.geometry?.coordinates?.[0]?.length);
          if (featureFromEvent) {
            feature = featureFromEvent;
          }
        }
        
        if (feature) {
          console.log('├─ Final feature coords:', feature?.geometry?.coordinates?.[0]?.length);
          await updateIntersectionsForFeature(feature);
          
          if (mapStatsReady && window.MapStats && window.MapStats.handlePolygonComplete) {
            window.MapStats.handlePolygonComplete(feature);
          }
          
          const statsPanel = document.getElementById('map-stats-panel');
          if (statsPanel) {
            statsPanel.classList.remove('hidden');
          }
          
          if (window.updateDrawButtonStates) {
            window.updateDrawButtonStates();
          }
        }
      });

      async function handleDrawCancel(e) {
        console.log('\n❌ EVENT: draw:cancel (CLICKED CANCEL BUTTON)');
        console.log('├─ Event data:', e);
        console.log('├─ Event originalFeature:', e?.originalFeature);
        console.log('├─ Currently stored feature:', feature?.id);
        console.log('├─ Was editing:', isEditingMode);
        drawCancelled = true;
        
        // Exit drawing/editing modes
        const wasDrawing = isDrawingMode;
        const wasEditing = isEditingMode;
        isDrawingMode = false;
        isEditingMode = false;
        editModeEnteredViaButton = false;
        console.log('├─ State: isDrawingMode=false, isEditingMode=false');

        // Workaround for library bug: cancelling an in-progress draw can emit completion events.
        // Remove transient geometry so the app cannot be left in hidden edit mode.
        if (wasDrawing && !wasEditing) {
          console.log('├─ Force deleting transient in-progress boundary');
          forceDeleteTransientBoundary();
        }
        
        // Hide hints panel
        console.log('├─ Hiding hints panel');
        hideDrawingHint();
        
        // Restore desktop drawing menu
        const desktopMenuCancel = document.querySelector('.map-drawing-menu-desktop');
        if (desktopMenuCancel) desktopMenuCancel.style.display = '';
        
        // If originalFeature is null, the cancel means no feature remains on the map
        // Clear our stored feature reference
        if (e?.originalFeature === null) {
          console.log('├─ Cancel event has originalFeature=null - clearing stored feature');
          feature = null;
        }
        
        // If we were editing and still have a feature, reprocess it (may have been partially edited)
        if (wasEditing && feature) {
          console.log('├─ Cancel during edit - reprocessing kept feature');
          console.log('├─ Processing intersections...');
          await updateIntersectionsForFeature(feature);
          console.log('├─ ✅ Intersections processed');
          
          if (mapStatsReady && window.MapStats && window.MapStats.handlePolygonComplete) {
            console.log('├─ Calling handlePolygonComplete');
            window.MapStats.handlePolygonComplete(feature);
          }
        }
        
        // Let the button state logic handle the UI based on whether feature exists
        // If feature exists → show Edit/Delete buttons and boundary panel
        // If no feature → show Add button and hide boundary panel
        if (window.updateDrawButtonStates) {
          console.log('├─ Calling updateDrawButtonStates (will check if feature exists)');
          window.updateDrawButtonStates();
          console.log('└─ ✅ Button states updated (UI reflects feature state)');
        }

        // Run a one-tick hard reset to beat any late plugin state transition.
        setTimeout(() => {
          resetAfterCancelledDraw();
        }, 0);
      }

      // Some library versions emit draw:cancel, others emit draw:cancelled.
      map.on('draw:cancel', handleDrawCancel);
      map.on('draw:cancelled', handleDrawCancel);

      // Handle draw:vertexselection - fired when user selects/hovers over a vertex
      // Can be used to show contextual help like "Press Delete to remove this point"
      map.on('draw:vertexselection', function(e) {
        console.log('\n📍 EVENT: draw:vertexselection (VERTEX STATE CHANGED)');
        console.log('├─ Event data:', e);
        console.log('├─ Vertex index:', e?.index);
        
        // Check if this is a deselect (index = -1)
        if (e?.index === -1) {
          console.log('├─ Vertex DESELECTED - returning to edit mode hints');
          updateHintForState('edit-mode');
        } else if (e?.index !== undefined && e.index >= 0) {
          // Vertex selected
          console.log('├─ Vertex SELECTED - showing vertex-specific hint');
          updateHintForState('vertex-selected');
        }
      });

      map.on('draw:delete', function(e) {
        console.log('\n🗑️ EVENT: draw:delete (BOUNDARY DELETED)');
        console.log('├─ Event object:', e);
        console.log('├─ Clearing stored feature');
        
        feature = null;
        isDrawingMode = false;
        isEditingMode = false;
        console.log('├─ State: feature=null, isDrawingMode=false, isEditingMode=false');
        
        // Hide hints panel
        console.log('├─ Hiding hints panel');
        hideDrawingHint();
        
        // Hide the boundary stats panel
        const statsPanel = document.getElementById('map-stats-panel');
        if (statsPanel) {
          statsPanel.classList.add('hidden');
          console.log('├─ ✅ Boundary panel hidden');
        }
        
        if (mapStatsReady && window.MapStats && window.MapStats.handlePolygonDelete) {
          console.log('├─ Calling handlePolygonDelete');
          window.MapStats.handlePolygonDelete();
        }
        
        console.log('├─ Clearing intersections');
        updateIntersectionsForFeature(null);
        
        if (window.updateDrawButtonStates) {
          console.log('├─ Calling updateDrawButtonStates');
          window.updateDrawButtonStates();
          console.log('└─ ✅ Button states updated (Add visible)');
        }
      });

      // Store map instance globally for access from other scripts
      window.interactiveMapInstance = map;
      window.currentBoundaryFeature = feature;

      // Prevent form submission unless explicitly clicking the submit button
      const mapForm = document.getElementById('map-form');
      if (mapForm) {
        mapForm.addEventListener('submit', function(e) {
          // Always prevent default - only allow submission via explicit submit button click
          e.preventDefault();
          
          // Only actually submit if there's a boundary feature AND the submit button was clicked
          const submitBtn = document.getElementById('save-and-continue-btn');
          if (feature && e.submitter === submitBtn) {
            mapForm.submit();
          }
        });
      }
      
    } catch (error) {
      console.error('Error initializing map:', error);
    }
    
    console.log('App ready finished - returning map');
    return map;
  }

  return {
    initMap
  };
})();
