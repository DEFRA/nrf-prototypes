# MapLibre Migration Progress

## ✅ COMPLETED: Phases 1-3 (Committed: cf7c05e)

### Phase 1: HTML Templates ✅

**Files Updated:**

- app/views/nrf-estimate-1/map.html
- app/views/nrf-estimate-2/map.html
- app/views/nrf-estimate-2-map-layers-spike/map.html
- app/views/nrf-estimate-3/map.html
- app/views/nrf-quote-4/map.html

**Changes:**

- Replaced Leaflet CDN links with MapLibre GL JS v5.13.0
- Replaced Leaflet Draw with Mapbox GL Draw v1.5.1
- Updated CSS classes: `.leaflet-*` → `.maplibregl-*`
- Specific updates:
  - `.leaflet-bottom.leaflet-left` → `.maplibregl-ctrl-bottom-left`
  - `.leaflet-top.leaflet-right` → `.maplibregl-ctrl-top-right`
  - `.leaflet-control-attribution` → `.maplibregl-ctrl-attrib`

### Phase 2: Map Initialization (map-initialisation.js) ✅

**Key Changes:**

1. **Library Check:** `checkLeafletLoaded()` → `checkMapLibreLoaded()`
2. **Map Creation:**
   - `L.map()` → `new maplibregl.Map()`
   - Uses style object with version 8, empty sources/layers
   - Coordinate order: `[lng, lat]` not `[lat, lng]`
3. **Base Layers:**
   - Returns config objects instead of Leaflet tile layers
   - Structure: `{sourceId, layerId, source, layer}`
4. **Layer Addition:**
   - Uses `map.on('load')` event
   - `map.addSource()` and `map.addLayer()`
5. **Zoom Control:** `L.control.zoom()` → `maplibregl.NavigationControl()`
6. **Catchment Polygons:**
   - Creates GeoJSON sources for each catchment
   - Adds fill + border layers with unique IDs
   - Implements click handlers for popups with `maplibregl.Popup()`
   - Mouse cursor changes on hover
7. **Bounds Fitting:** `L.featureGroup().getBounds()` → `maplibregl.LngLatBounds()`

### Phase 3: Layer Management (map-styles.js) ✅

**Key Changes:**

1. **State Storage:**
   - Changed from storing Leaflet layer objects to storing `{layerId, sourceId, borderLayerId}`
   - `streetMapLayer/satelliteMapLayer` → `streetMapConfig/satelliteMapConfig`
2. **Layer Visibility:**
   - `map.addLayer()/removeLayer()` → `setLayoutProperty('visibility', 'visible/none')`
3. **Style Updates:**
   - `polygon.setStyle()` → `setPaintProperty()` for fill-color, fill-opacity, line-color, etc.
4. **Button Creation:**
   - `L.DomUtil.create()` → `document.createElement()`
5. **Style Toggle:**
   - Remove source + layer, then add new ones
   - Uses `map.removeLayer()`, `map.removeSource()`, `map.addSource()`, `map.addLayer()`
6. **Control Addition:**
   - Custom control class with `onAdd()`/`onRemove()` methods
   - `map.addControl(new StyleSwitcherControl(), 'bottom-left')`

### Additional Files Modified ✅

**app/assets/sass/\_map-drawing.scss:**

- `.leaflet-draw-toolbar, .leaflet-draw-actions` → `.mapbox-gl-draw_ctrl-draw-btn, .mapbox-gl-draw_trash`

**app/assets/javascripts/map-drawing-controls.js:**

- Added stub `getDrawInstance()` function (returns null for now)

**app/assets/javascripts/map-datasets.js:**

- Temporarily disabled GCN dataset loading (returns null from `createGeoJSONLayer()`)
- Added null checks to prevent errors

**app/assets/javascripts/map-drawing-layers-spike.js:**

- Commented out drawing control initialization
- Commented out stats initialization
- Commented out search initialization
- Commented out accessible controls initialization

### Phase 4: Drawing Controls ✅

**Files Updated:**

- app/assets/javascripts/map-drawing-layers-spike.js
- app/assets/javascripts/map-drawing-controls.js
- app/assets/javascripts/map-ui.js

**Key Changes:**

1. **MapboxDraw Initialization (orchestrator):**
   - Created MapboxDraw instance with custom red boundary styles (#d4351c)
   - Configured polygon fill, stroke, and vertex point styles
   - Added draw control to map and stored instance via `setDrawInstance()`
   - Set `defaultMode: 'simple_select'` and `userProperties: true`

2. **Helper Functions:**
   - Added `getFeatures(draw)` - abstracts getting features from MapboxDraw
   - Added `hasFeatures(draw)` - checks if any features exist
   - Added `setDrawInstance(instance)` and `getDrawInstance()` for state management

3. **Event Handlers Updated:**
   - `handleStartDrawingClick` → uses `draw.changeMode('draw_polygon')`
   - `handleEditBoundaryClick` → uses `draw.changeMode('direct_select')` for vertex editing
   - `handleDeleteBoundaryClick` → uses `draw.deleteAll()`
   - `handleConfirmEdit` → gets features via `draw.getAll().features`
   - `handleCancelEdit` → uses `draw.changeMode('simple_select')`
   - `handleZoomToBoundary` → calculates bounds from GeoJSON coordinates using `maplibregl.LngLatBounds`
   - `handlePolygonCreated` → works with `event.features[0]` from MapboxDraw

4. **Map Event Handlers:**
   - Changed from `L.Draw.Event.CREATED` to `map.on('draw.create')`
   - Changed from `L.Draw.Event.EDITED` to `map.on('draw.update')`
   - Changed from `L.Draw.Event.DELETED` to `map.on('draw.delete')`

5. **Boundary Data Management:**
   - `updateBoundaryData()` now accepts GeoJSON feature instead of Leaflet layer
   - Extracts coordinates from `feature.geometry.coordinates[0]`
   - Calculates center from coordinate bounds
   - Maintains backward compatibility with `intersectingCatchment` field

6. **UI Updates (map-ui.js):**
   - Changed `.getLayers()` calls to `draw.getAll().features`
   - Changed `map.invalidateSize()` to `map.resize()` (Phase 7 partial)

7. **Control Setup:**
   - `setupDrawingControls()` updated to pass MapboxDraw instance
   - Zoom to England now uses `map.flyTo()` with [lng, lat] coordinates

8. **Cursor Customization:**
   - Added CSS rules targeting `.maplibregl-canvas-container.maplibregl-interactive.mode-{mode}`
   - Manually add mode classes in button click handlers (since `draw.modechange` event is unreliable)
   - Uses `!important` to override MapLibre's cursor changes
   - **Drawing mode**: crosshair cursor
   - **Edit mode**: move cursor
   - **Normal mode**: default cursor

### Phase 5: Stats Panel (map-stats.js) ✅

**Files Updated:**

- app/assets/javascripts/map-stats.js
- app/assets/javascripts/map-drawing-controls.js
- app/assets/javascripts/map-drawing-layers-spike.js

**Key Changes:**

1. **Coordinate Extraction:**
   - `calculatePolygonStats(layer)` → `calculatePolygonStats(feature)`
   - Changed from `layer.getLatLngs()[0]` to `feature.geometry.coordinates[0]`
   - Coordinates already in `[lng, lat]` format from GeoJSON
   - Added logic to ensure polygon is closed for Turf.js

2. **Edit Monitoring:**
   - `monitorEditingProgress()` now polls MapboxDraw instance
   - Changed from `drawnItems.getLayers()` to `drawnItems.getAll().features`
   - `recalculateStatsFromDrawnItems()` updated to use features

3. **Event Handlers:**
   - `handleCreated(event)` → works with `event.features[0]`
   - `handleEdited(event)` → iterates `event.features` array
   - `handlePolygonComplete(feature)` → accepts GeoJSON feature
   - `handlePolygonEdit(feature)` → accepts GeoJSON feature
   - Removed `handleDrawVertex()` (MapboxDraw doesn't support vertex events)

4. **Mouse Event Handling:**
   - `handleMouseMove()` updated for MapLibre events
   - Changed from `event.latlng` to `event.lngLat`
   - Converts to `{lng, lat}` format for consistency

5. **Initialization:**
   - `init(mapInstance, drawInstance)` → accepts MapLibre map + MapboxDraw
   - Changed from Leaflet Draw events to MapboxDraw events:
     - `L.Draw.Event.CREATED` → `map.on('draw.create')`
     - `L.Draw.Event.EDITED` → `map.on('draw.update')`
     - `L.Draw.Event.DELETED` → `map.on('draw.delete')`
   - Removed DRAWSTART, DRAWSTOP, EDITSTART, EDITSTOP event listeners

6. **Exported Handlers:**
   - Added exports for `handleDrawStart`, `handleDrawStop`, `handleEditStart`, `handleEditStop`
   - These are now called manually from map-drawing-controls.js
   - Called in `handleStartDrawingClick` and `handleEditBoundaryClick`

7. **Cleanup:**
   - `destroy()` updated to remove MapboxDraw event listeners
   - Removed Leaflet-specific event cleanup

8. **Turf.js Integration:**
   - All Turf.js calculations remain unchanged
   - Just pass coordinates in correct format (`[lng, lat]`)
   - Turf.js works seamlessly with GeoJSON coordinates

### Phase 6: Search & Datasets (map-search.js, map-datasets.js) ✅

**Files Updated:**

- app/assets/javascripts/map-datasets.js
- app/assets/javascripts/map-search.js

**Key Changes:**

**map-datasets.js:**

1. **Layer Creation:**
   - `createGeoJSONLayer()` now returns layer metadata object: `{sourceId, fillLayerId, borderLayerId, datasetId}`
   - Creates MapLibre GeoJSON source with `map.addSource()`
   - Adds separate fill and border layers with `map.addLayer()`
   - Implements click handlers for popups using `map.on('click', layerId)`
   - Adds hover cursor changes with `mouseenter`/`mouseleave` events

2. **Layer Visibility:**
   - `showDataset()` uses `setLayoutProperty(layerId, 'visibility', 'visible')`
   - `hideDataset()` uses `setLayoutProperty(layerId, 'visibility', 'none')`
   - No need to remove/add layers like Leaflet

3. **Style Updates:**
   - `updateLayerStyles()` uses `setPaintProperty()` for fill-color, fill-opacity, line-color, line-width, line-opacity
   - Applies dynamic styles based on current map style (street/satellite)

4. **Layer Refresh:**
   - `refreshLayers()` simplified - MapLibre preserves layers automatically
   - Only calls `updateLayerStyles()` after map style changes

5. **Storage:**
   - `loadedLayers` now stores layer info objects instead of Leaflet layer objects
   - Example: `{sourceId: 'gcnEdp-source', fillLayerId: 'gcnEdp-fill', borderLayerId: 'gcnEdp-border', datasetId: 'gcnEdp'}`

**map-search.js:**

1. **Coordinate System:**
   - `zoomToLocation()` changed from `map.flyTo([lat, lng], zoom)` to `map.flyTo({center: [lng, lat], zoom})`
   - Duration multiplied by 1000 (MapLibre uses milliseconds, Leaflet used seconds)

2. **Event Handling:**
   - Removed `L.DomEvent.disableScrollPropagation(resultsDropdown)`
   - Replaced with vanilla JS: `resultsDropdown.addEventListener('wheel', e => e.stopPropagation())`

3. **Documentation:**
   - Updated all function signatures from `@param {L.Map}` to `@param {maplibregl.Map}`

### Phase 6 Improvements: Popup Display & Layer Management ✅

**Files Updated:**

- app/assets/javascripts/map-datasets.js
- app/assets/javascripts/map-ui.js

**Key Changes:**

1. **Enhanced Popup Display:**
   - Fixed "Feature" fallback by checking `props.NAME` first (GCN EDP property)
   - Added support for multiple property name fields in priority order:
     - `props.NAME` (GCN EDP - e.g., "Ashfield District")
     - `props.name` (Generic name field)
     - `props.Label` (Other datasets)
     - `props.N2K_Site_N` (Natura 2000 sites)
     - `props.ZoneName` (Zone-based datasets)
   - Display feature type/description if available (`DESCRIPTIO` or `Description`)
   - Popup now shows: "Ashfield District\nType: District" instead of just "Feature"

2. **Layer Management During Edit Mode:**
   - Added `disableAllLayers()` function (now intentionally left empty)
   - Added `enableAllLayers()` function (now intentionally left empty)
   - Dataset layers remain visible during drawing/editing
   - Tooltips disabled during drawing/editing via `isInDrawingMode()` checks
   - Cursor changes disabled during drawing/editing via `isInDrawingMode()` checks

### Phase 7: Post-Migration Bug Fixes ✅

**Files Updated:**

- app/assets/sass/\_map-drawing.scss
- app/assets/javascripts/map-styles.js
- app/assets/javascripts/map-datasets.js
- app/assets/javascripts/map-drawing-controls.js
- app/assets/javascripts/map-initialisation.js

**Key Changes:**

1. **Style Switcher Button Clickability:**
   - Issue: MapLibre sets `pointer-events: none` on control containers
   - Fix: Added CSS override: `.maplibregl-ctrl-bottom-left { pointer-events: auto !important; }`
   - Location: [\_map-drawing.scss:372-374](_map-drawing.scss#L372-L374)

2. **EDP Layer Persistence During Style Switching:**
   - Issue: Base layers were being added on top, covering EDP layers
   - Fix: Insert base layers BEFORE other layers using `addLayer(layer, firstSymbolOrFillLayerId)`
   - Location: [map-styles.js:319-359](map-styles.js#L319-L359)

3. **Crosshair Cursor During Drawing/Editing:**
   - Issue: MapLibre's default CSS cursor styles override custom cursors
   - Root cause: CSS specificity battle between MapLibre and custom styles
   - Fix: Increased CSS specificity by targeting all MapLibre class combinations with mode classes
   - Location: [\_map-drawing.scss:177-199](_map-drawing.scss#L177-L199)
   - Approach: Multiple selector variants to achieve higher specificity than `.maplibregl-canvas-container.maplibregl-interactive`

4. **Tooltips and Cursor Changes During Drawing:**
   - Added `isInDrawingMode()` function that returns `isDrawing || isEditing`
   - Added checks in EDP layer event handlers to prevent:
     - Cursor changes to pointer during drawing/editing
     - Popup displays during drawing/editing
   - Location: [map-datasets.js](map-datasets.js) mouseenter/click handlers
   - Exported function: [map-drawing-controls.js:764-766](map-drawing-controls.js#L764-L766)

5. **Special Dataset Type Support:**
   - Added handling for `type: 'special'` datasets (nutrientEdp)
   - Special datasets use existing catchment layers instead of loading new data
   - Added placeholder layer objects: `{datasetId, isSpecial: true}`
   - Location: [map-datasets.js](map-datasets.js) loadDataset(), showDataset(), hideDataset()

6. **Leaflet Reference Removal:**
   - Issue: `L.polygon()` still referenced in loadExistingBoundary()
   - Fix: Converted to MapboxDraw GeoJSON format using `draw.add(feature)`
   - Location: [map-initialisation.js:458](map-initialisation.js#L458)
   - Coordinate format: `[lng, lat]` with closed polygon

7. **Layer Visibility During Drawing:**
   - Made `disableAllLayers()` a no-op function (intentionally left empty)
   - Dataset layers remain visible during drawing/editing
   - User can see EDP areas while drawing boundaries
   - Tooltips and interactions are controlled by `isInDrawingMode()` checks

## ✅ MIGRATION COMPLETE

All phases completed successfully with post-migration bug fixes applied.

## Current Working State

**What Works:**
✅ Map loads and displays with MapLibre GL JS v5.13.0
✅ Satellite and street view tiles display correctly
✅ Zoom controls functional
✅ Style switcher button clickable and working
✅ Purple catchment areas display (nutrient EDP)
✅ Orange GCN areas display (great crested newt EDP)
✅ Catchment popups work on click
✅ Drawing boundaries with crosshair cursor
✅ Editing boundaries with move cursor
✅ Edit mode UI transitions (Confirm/Cancel buttons)
✅ MapboxDraw polygon styling (red boundary)
✅ Stats panel (area, perimeter calculations)
✅ Real-time stats updates during drawing/editing
✅ Dataset layer visibility toggles
✅ Location search functionality
✅ EDP layers persist during style switching
✅ Layers remain visible during drawing/editing
✅ Tooltips disabled during drawing/editing
✅ Cursor stays consistent during drawing/editing
✅ No console errors
✅ Existing boundaries load correctly

**Known Limitations:**

- Crosshair cursor specificity requires `!important` due to MapLibre's dynamic cursor handling
- Dataset layers remain visible during drawing (intentional design decision)

## Key Architectural Decisions

1. **Coordinate Order:** MapLibre uses `[lng, lat]` everywhere, Leaflet used `[lat, lng]`
2. **Layer Management:** Store IDs instead of objects, use `getLayer()` to check existence
3. **Style Updates:** Use `setPaintProperty()` and `setLayoutProperty()` instead of `setStyle()`
4. **Event Handling:** MapLibre uses different event names and payload structures
5. **Deferred Operations:** Use `map.on('load')` for operations that need the map fully initialized

## Testing Checklist (After Full Migration)

- [ ] Map loads and displays correctly
- [ ] Base layer switching (street/satellite) works
- [ ] Drawing a new boundary works
- [ ] Editing an existing boundary works
- [ ] Deleting a boundary works
- [ ] Catchment layers display correctly
- [ ] Catchment popups work
- [ ] Location search works
- [ ] Zoom controls work
- [ ] Map key displays correctly
- [ ] Map help modal displays correctly
- [ ] Boundary data is saved correctly to hidden field
- [ ] Form submission validation works
- [ ] EDP intersection detection works
- [ ] Area and perimeter calculations are accurate
- [ ] Mobile responsiveness works

## Important Notes for Phase 4

1. **MapboxDraw Initialization:**

   ```javascript
   const draw = new MapboxDraw({
     displayControlsDefault: false,
     modes: MapboxDraw.modes
   })
   map.addControl(draw)
   ```

2. **Starting Drawing:**

   ```javascript
   draw.changeMode('draw_polygon')
   ```

3. **Getting Features:**

   ```javascript
   const features = draw.getAll().features
   ```

4. **Coordinate Format:**
   - Features are already in GeoJSON format with `[lng, lat]`
   - No need to convert coordinates like with Leaflet

5. **Events:**
   - Use `map.on('draw.create', callback)`
   - Event payload: `e.features` (array of GeoJSON features)
