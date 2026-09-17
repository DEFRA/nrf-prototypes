/**
 * Journey engine
 *
 * Builds GOV.UK Prototype Kit journeys from plain content files:
 *   content/<journey>/journey.yaml   flow, branching, session keys (logic)
 *   content/<journey>/pages/*.md     copy, options, hints, errors (content)
 *
 * See content/README.md for the authoring guide.
 */

const {
  loadJourney,
  getJourneyIds,
  getRouteConstants,
  isQuestionType,
  validateChoiceValues,
  answerLabels,
  TYPES
} = require('./loader')
const { createJourneyRouter, dispatch, previewData } = require('./router')
const { watchContent } = require('./watch')
const {
  getEdges,
  journeyGroups,
  journeySections,
  exportSections,
  layoutLevels,
  mainChain,
  exportScreens,
  previewVariants,
  toMermaid,
  toFlowJson,
  toFlowGraph
} = require('./flow')
const {
  captureScreens,
  captureScreen,
  canExportScreens,
  VIEWPORTS
} = require('./screenshots')
const { createRenderer, interpolate } = require('./markdown')
const { pageHandoff, journeyHandoffs, isHandoffDate } = require('./history')
const {
  loadFrozenJourney,
  resolveHandoffCommit,
  extractSnapshot,
  snapshotDir,
  MOUNT: HANDOFFS_MOUNT
} = require('./snapshots')
const { evaluate, firstMatch, describeCondition } = require('./expressions')

module.exports = {
  loadJourney,
  getJourneyIds,
  getRouteConstants,
  isQuestionType,
  validateChoiceValues,
  answerLabels,
  TYPES,
  createJourneyRouter,
  dispatch,
  previewData,
  watchContent,
  getEdges,
  journeyGroups,
  journeySections,
  exportSections,
  layoutLevels,
  mainChain,
  exportScreens,
  previewVariants,
  captureScreens,
  captureScreen,
  canExportScreens,
  VIEWPORTS,
  toMermaid,
  toFlowJson,
  toFlowGraph,
  createRenderer,
  interpolate,
  pageHandoff,
  journeyHandoffs,
  isHandoffDate,
  loadFrozenJourney,
  resolveHandoffCommit,
  extractSnapshot,
  snapshotDir,
  HANDOFFS_MOUNT,
  evaluate,
  firstMatch,
  describeCondition
}
