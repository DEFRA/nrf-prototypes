import InteractiveMap from '@defra/interactive-map'
import maplibreProvider from '@defra/interactive-map/providers/maplibre'
import mapStylesPlugin from '@defra/interactive-map/plugins/map-styles'
import scaleBarPlugin from '@defra/interactive-map/plugins/scale-bar'
import interactPlugin from '@defra/interactive-map/plugins/interact'
import searchPlugin from '@defra/interactive-map/plugins/search'
import datasetsPlugin from '@defra/interactive-map/plugins/datasets'
import drawMLPlugin from '@defra/interactive-map/plugins/draw-ml'

import '@defra/interactive-map/css'
import '@defra/interactive-map/plugins/search/css'
import '@defra/interactive-map/plugins/interact/css'
import '@defra/interactive-map/plugins/map-styles/css'
import '@defra/interactive-map/plugins/scale-bar/css'
import '@defra/interactive-map/plugins/draw-ml/css'
import '@defra/interactive-map/plugins/datasets/css'

window.defra = {
  ...(window.defra || {}),
  InteractiveMap,
  maplibreProvider,
  mapStylesPlugin,
  scaleBarPlugin,
  interactPlugin,
  searchPlugin,
  datasetsPlugin,
  drawMLPlugin
}
