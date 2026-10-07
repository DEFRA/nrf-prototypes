// EDP overlays, identical to the production frontend's datasets.js. The tile
// URLs follow production's impact assessor service; the prototype serves them
// from app/routes/tileserver-proxy.js (sliced from local GeoJSON). There is no
// local data for excluded areas yet, so that layer stays in the key but renders
// nothing until app/assets/map-layers/edp_excluded_areas.geojson exists (or
// IMPACT_ASSESSOR_BASE_URL points at the real service).

export const FILL_LAYER_IDS = ['edp_boundaries', 'excluded_areas']
export const ALL_LAYER_IDS = FILL_LAYER_IDS.flatMap((id) => [
  id,
  `${id}-stroke`
])
export const EDP_BOUNDARY_STROKE_COLOUR = '#FD0'

// A production map (quote V7.1) asks production's tile path, which comes
// from the real impact assessor when IMPACT_ASSESSOR_BASE_URL is set. Other
// maps (quote V7) always draw the prototype's own EDP data.
const PRODUCTION_TILES_BASE = '/impact-assessor-map/tiles'
const PROTOTYPE_TILES_BASE = '/prototype-map/tiles'

/**
 * @param {{ production?: boolean }} [params]
 */
export function createMapDatasetsPlugin({ production = false } = {}) {
  const { datasetsPlugin: createDatasetsPlugin } = window.defra
  const tilesBase = production ? PRODUCTION_TILES_BASE : PROTOTYPE_TILES_BASE

  return createDatasetsPlugin({
    datasets: [
      {
        id: 'edp_boundaries',
        label:
          'Broads SAC, Broadland Ramsar and River Wensum SAC Environmental Delivery Plan addressing nutrient pollution (2026 to 2036)',
        tiles: [`${tilesBase}/edp_boundaries/{z}/{x}/{y}.mvt`],
        sourceLayer: 'edp_boundaries',
        showInKey: true,
        style: {
          stroke: EDP_BOUNDARY_STROKE_COLOUR,
          fillPattern: 'horizontal-hatch',
          fillPatternForegroundColor: 'rgba(255, 221, 0, 0.6)',
          fillPatternBackgroundColor: 'transparent'
        }
      },
      {
        id: 'excluded_areas',
        label: 'Excluded areas',
        tiles: [`${tilesBase}/edp_excluded_areas/{z}/{x}/{y}.mvt`],
        sourceLayer: 'edp_excluded_areas',
        showInKey: true,
        style: {
          stroke: '#f47738',
          fillPattern: 'vertical-hatch',
          fillPatternForegroundColor: 'rgba(244, 119, 56, 0.6)',
          fillPatternBackgroundColor: 'transparent'
        }
      }
    ]
  })
}
