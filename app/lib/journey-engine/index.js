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
  TYPES
} = require('./loader')
const { createJourneyRouter, previewData } = require('./router')
const { watchContent } = require('./watch')
const {
  getEdges,
  layoutLevels,
  mainChain,
  exportScreens,
  previewVariants,
  toMermaid,
  toFlowJson,
  toFlowGraph
} = require('./flow')
const { captureScreens, canExportScreens, VIEWPORTS } = require('./screenshots')
const { createRenderer, interpolate } = require('./markdown')
const { evaluate, firstMatch, describeCondition } = require('./expressions')

module.exports = {
  loadJourney,
  getJourneyIds,
  getRouteConstants,
  isQuestionType,
  TYPES,
  createJourneyRouter,
  previewData,
  watchContent,
  getEdges,
  layoutLevels,
  mainChain,
  exportScreens,
  previewVariants,
  captureScreens,
  canExportScreens,
  VIEWPORTS,
  toMermaid,
  toFlowJson,
  toFlowGraph,
  createRenderer,
  interpolate,
  evaluate,
  firstMatch,
  describeCondition
}
