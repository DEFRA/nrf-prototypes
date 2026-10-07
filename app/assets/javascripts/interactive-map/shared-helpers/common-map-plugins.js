import { getMapStyles } from './styles.js'
import { createMapDatasetsPlugin } from './datasets.js'

/**
 * @param {{ hasOsKey?: boolean, hasAerial?: boolean, production?: boolean }} [params]
 */
export function createCommonMapPlugins({
  hasOsKey = false,
  hasAerial = false,
  production = false
} = {}) {
  const {
    mapStylesPlugin: createMapStylesPlugin,
    scaleBarPlugin: createScaleBarPlugin,
    mapKeyPlugin: createMapKeyPlugin
  } = window.defra

  const mapStyles = getMapStyles({ hasOsKey, hasAerial, production })
  const datasetsPlugin = createMapDatasetsPlugin({ production })
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
