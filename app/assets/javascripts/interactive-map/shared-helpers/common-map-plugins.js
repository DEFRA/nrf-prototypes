import { getMapStyles } from './styles.js'
import { createMapDatasetsPlugin } from './datasets.js'

/**
 * @param {{ hasOsKey?: boolean }} [params]
 */
export function createCommonMapPlugins({ hasOsKey = false } = {}) {
  const {
    mapStylesPlugin: createMapStylesPlugin,
    scaleBarPlugin: createScaleBarPlugin,
    mapKeyPlugin: createMapKeyPlugin
  } = window.defra

  const mapStyles = getMapStyles({ hasOsKey })
  const datasetsPlugin = createMapDatasetsPlugin()
  // The datasets plugin no longer renders a key itself; map-key reads the
  // datasets registry and renders one (list it after datasetsPlugin).
  const mapKeyPlugin = createMapKeyPlugin()
  const mapStylesPlugin = createMapStylesPlugin({ mapStyles })
  const scaleBarPlugin = createScaleBarPlugin({ units: 'metric' })

  return {
    mapStyles,
    datasetsPlugin,
    mapKeyPlugin,
    mapStylesPlugin,
    scaleBarPlugin
  }
}
