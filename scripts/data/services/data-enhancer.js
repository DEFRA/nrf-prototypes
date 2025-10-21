/**
 * Data Enhancer service for Planning Data Analyser
 */

const Logger = require('../utils/logger')
const LLMAnalyser = require('./llm-analyser')

class DataEnhancer {
  static async enhancePlanningData(
    planningApplications,
    localAuthorities,
    localPlanningAuthorities
  ) {
    Logger.info('Starting data enhancement process...')

    const enhancedApplications = []
    const localAuthorityMap = this.createLocalAuthorityMap(localAuthorities)
    const localPlanningAuthorityMap = this.createLocalPlanningAuthorityMap(
      localPlanningAuthorities
    )

    // Extract all descriptions for batch LLM processing
    const descriptions = planningApplications.map(
      (app) => app.description || ''
    )
    Logger.info(`Processing ${descriptions.length} applications in batch...`)

    try {
      // Process all descriptions in a single batch call
      const llmAnalyses =
        await LLMAnalyser.analyzePlanningDescriptionsBatch(descriptions)
      Logger.success(
        `Batch LLM analysis completed for ${llmAnalyses.length} applications`
      )

      // Enhance each application with the batch results
      for (let i = 0; i < planningApplications.length; i++) {
        const application = planningApplications[i]
        const llmAnalysis = llmAnalyses[i]

        Logger.info(
          `Enhancing application ${i + 1}/${planningApplications.length}`
        )

        try {
          const enhancedApplication = await this.enhanceSingleApplication(
            application,
            llmAnalysis,
            localAuthorityMap,
            localPlanningAuthorityMap
          )
          enhancedApplications.push(enhancedApplication)
        } catch (error) {
          Logger.error(
            `Failed to enhance application ${application.entity || i}`,
            error
          )
          // Add application with minimal enhancement
          enhancedApplications.push({
            ...application,
            houseCount: 0,
            commercialBuildingCount: 0,
            infrastructureBuildCount: 0,
            developmentCategory: 'unknown',
            localAuthorityName: 'Unknown',
            localPlanningAuthorityName: 'Unknown'
          })
        }
      }
    } catch (error) {
      Logger.error(
        'Batch LLM analysis failed, falling back to individual processing',
        error
      )

      // Fallback to individual processing if batch fails
      for (let i = 0; i < planningApplications.length; i++) {
        const application = planningApplications[i]
        Logger.info(
          `Enhancing application ${i + 1}/${planningApplications.length} (individual mode)`
        )

        try {
          const enhancedApplication = await this.enhanceSingleApplication(
            application,
            null, // No pre-computed LLM analysis
            localAuthorityMap,
            localPlanningAuthorityMap
          )
          enhancedApplications.push(enhancedApplication)
        } catch (error) {
          Logger.error(
            `Failed to enhance application ${application.entity || i}`,
            error
          )
          // Add application with minimal enhancement
          enhancedApplications.push({
            ...application,
            houseCount: 0,
            commercialBuildingCount: 0,
            infrastructureBuildCount: 0,
            developmentCategory: 'unknown',
            localAuthorityName: 'Unknown',
            localPlanningAuthorityName: 'Unknown'
          })
        }
      }
    }

    Logger.success(
      `Enhanced ${enhancedApplications.length} planning applications`
    )
    return enhancedApplications
  }

  static async enhanceSingleApplication(
    application,
    llmAnalysis,
    localAuthorityMap,
    localPlanningAuthorityMap
  ) {
    // Use pre-computed LLM analysis if available, otherwise analyze individually
    let analysis
    if (llmAnalysis) {
      analysis = llmAnalysis
    } else {
      const description = application.description || ''
      analysis = await LLMAnalyser.analyzePlanningDescription(description)
    }

    // Get local authority name
    const organizationId =
      application['organisation-entity'] || application.organization_id
    const localAuthorityName =
      localAuthorityMap.get(organizationId) || 'Unknown'

    // Get local planning authority name - use reference as the key
    const planningAuthorityRef = application.reference || application.prefix
    const localPlanningAuthorityName =
      localPlanningAuthorityMap.get(planningAuthorityRef) || 'Unknown'

    return {
      ...application,
      houseCount: analysis.houseCount,
      commercialBuildingCount: analysis.commercialBuildingCount,
      infrastructureBuildCount: analysis.infrastructureBuildCount,
      developmentCategory: analysis.developmentCategory,
      localAuthorityName,
      localPlanningAuthorityName
    }
  }

  static createLocalAuthorityMap(localAuthorities) {
    const map = new Map()
    localAuthorities.forEach((authority) => {
      const id = authority.id || authority.organization_id
      const name = authority.name || authority.title
      if (id && name) {
        map.set(id, name)
      }
    })
    return map
  }

  static createLocalPlanningAuthorityMap(localPlanningAuthorities) {
    const map = new Map()
    localPlanningAuthorities.forEach((authority) => {
      const ref = authority.reference || authority.id
      const name = authority.name || authority.title
      if (ref && name) {
        map.set(ref, name)
      }
    })
    return map
  }
}

module.exports = DataEnhancer
