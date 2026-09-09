/**
 * @param {{ interactiveMap: object, interactPlugin: object, drawPlugin: object, startDrawPolygon: Function, getSelectedFeatureIds: Function, setBoundaryState: Function }} params
 */
export function buildDrawToolsMenuItems({
  interactiveMap,
  interactPlugin,
  drawPlugin,
  startDrawPolygon,
  getSelectedFeatureIds,
  setBoundaryState
}) {
  function onEditFeatureClick() {
    if (!drawPlugin.editFeature(getSelectedFeatureIds()[0])) {
      return
    }
    interactiveMap.toggleButtonState('drawTools', 'hidden', true)
    interactPlugin.disable()
    setBoundaryState(true)
  }

  function onDeleteFeatureClick() {
    drawPlugin.deleteFeature(getSelectedFeatureIds())
    interactPlugin.clear()
    interactiveMap.toggleButtonState('drawTools', 'hidden', false)
    interactiveMap.toggleButtonState('editFeature', 'disabled', true)
    interactiveMap.toggleButtonState('deleteFeature', 'disabled', true)
    setBoundaryState(false)
  }

  return [
    {
      id: 'drawPolygon',
      label: 'Draw polygon',
      iconSvgContent:
        '<path d="M19.5 7v10M4.5 7v10M7 19.5h10M7 4.5h10"/><path d="M22 18v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zm0-15v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zM7 18v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zM7 3v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1z"/>',
      onClick: startDrawPolygon
    },
    {
      id: 'editFeature',
      label: 'Edit feature',
      iconSvgContent:
        '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
      isDisabled: true,
      onClick: onEditFeatureClick
    },
    {
      id: 'deleteFeature',
      label: 'Delete feature',
      iconSvgContent:
        '<path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
      isDisabled: true,
      onClick: onDeleteFeatureClick
    }
  ]
}
