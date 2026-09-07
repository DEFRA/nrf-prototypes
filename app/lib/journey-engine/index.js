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
const { getEdges, layoutLevels, toMermaid, toFlowJson } = require('./flow')
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
  getEdges,
  layoutLevels,
  toMermaid,
  toFlowJson,
  createRenderer,
  interpolate,
  evaluate,
  firstMatch,
  describeCondition
}
