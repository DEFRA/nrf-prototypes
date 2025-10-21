/**
 * Data Standardizer service for Planning Data Analyser
 * Handles standardization of development categories and population of authority names
 */

const Logger = require('../utils/logger')
const fs = require('fs')
const path = require('path')

class DataStandardiser {
  /**
   * Development category mapping rules
   * Maps long descriptive text to standardized categories
   */
  static CATEGORY_MAPPING = {
    // Mixed use developments
    'mixed-use development comprising residential units, commercial floor space, hotel, cinema and associated car parking, cycle parking, public realm and landscaping':
      'mixed_use',
    'mixed-use development comprising residential units and commercial floorspace':
      'mixed_use',
    'mixed-use development comprising residential units and commercial space etc.':
      'mixed_use',
    'mixed-use development comprising two new buildings': 'mixed_use',
    'mixed residential/commercial buildings': 'mixed_use',
    'mixed residential/commercial development': 'mixed_use',
    'mixed use development': 'mixed_use',
    'mixed use development comprising two new buildings': 'mixed_use',
    'mixed use redevelopment': 'mixed_use',
    'mixed-use development': 'mixed_use',
    'mixed-use redevelopment': 'mixed_use',
    'mixed-use scheme': 'mixed_use',
    mixed_residential_commercial: 'mixed_use',
    mixed_residential_commercial_build: 'mixed_use',
    mixed_use_development: 'mixed_use',
    mixed_use_redevelopment: 'mixed_use',

    // Standard categories (keep as is)
    extension: 'extension',
    other: 'other',
    renovation: 'renovation',
    house_build: 'house_build',
    infrastructure_build: 'infrastructure_build',
    commercial_build: 'commercial_build',
    mixed_use: 'mixed_use',
    school_build: 'school_build',
    demolition: 'demolition'
  }

  /**
   * Standardize development categories in planning applications
   * @param {Array} planningApps - Array of planning application objects
   * @returns {Array} Array of planning applications with standardized categories
   */
  static standardiseDevelopmentCategories(planningApps) {
    Logger.info('Standardising development categories...')

    let updatedCount = 0
    const standardisedApps = planningApps.map((app) => {
      const originalCategory = app.developmentCategory
      const standardisedCategory = this.standardiseCategory(originalCategory)

      if (originalCategory !== standardisedCategory) {
        updatedCount++
        if (updatedCount <= 10) {
          Logger.info(
            `  ${app.entity}: "${originalCategory}" → "${standardisedCategory}"`
          )
        }
      }

      return {
        ...app,
        developmentCategory: standardisedCategory,
        originalDevelopmentCategory: originalCategory // Keep original for reference
      }
    })

    Logger.success(`Updated ${updatedCount} development categories`)
    return standardisedApps
  }

  /**
   * Standardize a single development category
   * @param {string} category - Original development category
   * @returns {string} Standardized development category
   */
  static standardiseCategory(category) {
    if (!category) return 'unknown'

    // Check if we have a direct mapping
    if (this.CATEGORY_MAPPING[category]) {
      return this.CATEGORY_MAPPING[category]
    }

    // Check if it contains any of our mapping keys
    for (const [key, value] of Object.entries(this.CATEGORY_MAPPING)) {
      if (category.includes(key) || key.includes(category)) {
        return value
      }
    }

    // Default to 'other' for unrecognized categories
    return 'other'
  }

  /**
   * Populate local authority names in planning applications
   * @param {Array} planningApps - Array of planning application objects
   * @param {Array} localAuthorities - Array of local authority objects
   * @returns {Array} Array of planning applications with populated local authority names
   */
  static populateLocalAuthorityNames(planningApps, localAuthorities) {
    Logger.info('Populating local authority names...')

    // Create lookup map
    const authorityLookup = {}
    localAuthorities.forEach((authority) => {
      if (authority['organisation-entity'] && authority.name) {
        authorityLookup[authority['organisation-entity']] = authority.name
      }
    })

    Logger.info(
      `Created lookup map with ${Object.keys(authorityLookup).length} local authorities`
    )

    // Populate names
    let updatedCount = 0
    let notFoundCount = 0

    const updatedApps = planningApps.map((app) => {
      const orgEntity = app['organisation-entity']

      if (orgEntity && authorityLookup[orgEntity]) {
        app.localAuthorityName = authorityLookup[orgEntity]
        updatedCount++
      } else if (orgEntity) {
        app.localAuthorityName = 'Unknown'
        notFoundCount++
      } else {
        app.localAuthorityName = 'Unknown'
        notFoundCount++
      }

      return app
    })

    Logger.success(
      `Updated ${updatedCount} planning applications with local authority names`
    )
    Logger.info(
      `Could not find local authority for ${notFoundCount} applications`
    )

    return updatedApps
  }

  /**
   * Populate local planning authority names in planning applications
   * @param {Array} planningApps - Array of planning application objects
   * @param {Array} localAuthorities - Array of local authority objects
   * @param {Array} localPlanningAuthorities - Array of local planning authority objects
   * @returns {Array} Array of planning applications with populated local planning authority names
   */
  static populateLocalPlanningAuthorityNames(
    planningApps,
    localAuthorities,
    localPlanningAuthorities
  ) {
    Logger.info('Populating local planning authority names...')

    // Create lookup maps
    const authorityToPlanningAuthorityLookup = {}
    localAuthorities.forEach((authority) => {
      if (
        authority['organisation-entity'] &&
        authority['local-planning-authority']
      ) {
        authorityToPlanningAuthorityLookup[authority['organisation-entity']] =
          authority['local-planning-authority']
      }
    })

    const planningAuthorityLookup = {}
    localPlanningAuthorities.forEach((authority) => {
      if (authority.reference && authority.name) {
        planningAuthorityLookup[authority.reference] = authority.name
      }
    })

    Logger.info(
      `Created lookup maps: ${Object.keys(authorityToPlanningAuthorityLookup).length} authority mappings, ${Object.keys(planningAuthorityLookup).length} planning authorities`
    )

    // Populate names
    let updatedCount = 0
    let notFoundCount = 0

    const updatedApps = planningApps.map((app) => {
      const orgEntity = app['organisation-entity']

      if (orgEntity && authorityToPlanningAuthorityLookup[orgEntity]) {
        const planningAuthorityCode =
          authorityToPlanningAuthorityLookup[orgEntity]

        if (planningAuthorityLookup[planningAuthorityCode]) {
          app.localPlanningAuthorityName =
            planningAuthorityLookup[planningAuthorityCode]
          updatedCount++
        } else {
          app.localPlanningAuthorityName = 'Unknown'
          notFoundCount++
        }
      } else if (orgEntity) {
        app.localPlanningAuthorityName = 'Unknown'
        notFoundCount++
      } else {
        app.localPlanningAuthorityName = 'Unknown'
        notFoundCount++
      }

      return app
    })

    Logger.success(
      `Updated ${updatedCount} planning applications with local planning authority names`
    )
    Logger.info(
      `Could not find local planning authority for ${notFoundCount} applications`
    )

    return updatedApps
  }

  /**
   * Get development category statistics
   * @param {Array} planningApps - Array of planning application objects
   * @returns {Object} Development category statistics
   */
  static getDevelopmentCategoryStats(planningApps) {
    const stats = {}

    planningApps.forEach((app) => {
      const category = app.developmentCategory || 'unknown'
      if (!stats[category]) {
        stats[category] = 0
      }
      stats[category]++
    })

    return stats
  }

  /**
   * Save standardized data to file
   * @param {Array} data - Standardized data to save
   * @param {string} outputPath - Output file path
   * @returns {boolean} Success status
   */
  static saveStandardisedData(data, outputPath) {
    try {
      fs.writeFileSync(outputPath, JSON.stringify(data, null, 2))
      const fileSize = (JSON.stringify(data).length / 1024 / 1024).toFixed(2)
      Logger.success(`Standardised data saved: ${outputPath} (${fileSize} MB)`)
      return true
    } catch (error) {
      Logger.error(`Failed to save standardised data: ${error.message}`)
      return false
    }
  }
}

module.exports = DataStandardiser
