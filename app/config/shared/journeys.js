/**
 * Shared journey configuration
 * Used by both the application and tests to maintain consistency
 */

/**
 * All available journeys in the application
 * Each journey has a base path and optional start page
 */
const JOURNEYS = [
  {
    name: 'NRF Estimate 1',
    displayName: 'Get an estimate for Nature Restoration Fund Levy (V1)',
    basePath: '/nrf-estimate-1',
    hasStartPage: true,
    description:
      'A user journey for developers to obtain a quote for the Nature Restoration Fund levy required when submitting planning permission. Includes map-based boundary drawing and EDP area validation.'
  },
  {
    name: 'NRF Estimate 3',
    displayName: 'Estimate, Commit and Pay Nature Restoration Fund Levy (V2)',
    basePath: '/nrf-estimate-3',
    hasStartPage: true,
    description:
      'A user journey for developers to estimate, commit and pay for the Nature Restoration Fund levy required when submitting planning permission. This journey allows users to commit to using the levy and complete payment.'
  },
  {
    name: 'LPA Approve 1',
    displayName: 'LPA Approval',
    basePath: '/lpa-approve-1',
    hasStartPage: false,
    entryPath: '/lpa-approval-email-content',
    description:
      'A user journey for the LPA to check and approve the details sent from the developer.'
  },
  {
    name: 'NRF Quote 4',
    displayName: 'Get a quote for Nature Restoration Fund Levy (V3)',
    basePath: '/nrf-quote-4',
    hasStartPage: true,
    description:
      'A user journey for developers to obtain a quote for the Nature Restoration Fund levy required when submitting planning permission. Includes map-based boundary drawing and EDP area validation.'
  },
  {
    name: 'NRF Estimate 4',
    displayName: 'Get a quote for Nature Restoration Fund Levy (V4)',
    basePath: '/nrf-estimate-4',
    hasStartPage: true,
    description:
      'A user journey for developers to obtain a quote for the Nature Restoration Fund levy (v4). Quote journey with check your answers, confirmation and estimate email content.'
  },
  {
    name: 'NRF Estimate 5',
    displayName: 'Get a quote for Nature Restoration Fund Levy (V5)',
    basePath: '/nrf-estimate-5',
    hasStartPage: true,
    description:
      'A user journey for developers to obtain a quote for the Nature Restoration Fund levy (v5).'
  },
  {
    name: 'NRF Estimate 6',
    displayName: 'Get a quote for Nature Restoration Fund Levy (V6)',
    basePath: '/nrf-estimate-6',
    hasStartPage: true,
    description:
      'A user journey for developers to obtain a quote for the Nature Restoration Fund levy (v6).'
  },
  {
    name: 'LPA Approve 2',
    displayName: 'LPA approve developer request to pay NRF (V2)',
    basePath: '/lpa-approve-2',
    hasStartPage: false,
    entryPath: '/lpa-approval-email-content',
    description:
      'A user journey for the LPA to check and approve the details sent from the developer.'
  },
  {
    name: 'LPA Approve 3',
    displayName: 'LPA approve developer request to pay NRF (V3)',
    basePath: '/lpa-approve-3',
    hasStartPage: false,
    entryPath: '/lpa-approval-email-content',
    description:
      'A user journey for the LPA to check and approve the details sent from the developer.'
  },
  {
    name: 'NRF Quote 6',
    displayName: 'Get a quote for Nature Restoration Fund levy (V6)',
    basePath: '/nrf-quote-6',
    hasStartPage: true,
    description:
      'A simplified quote-only journey for developers to obtain a quote for the Nature Restoration Fund levy. Covers planning permission type, housing units, red line boundary, and email entry.'
  },
  {
    name: 'LPA Approve 4',
    displayName: 'LPA approve developer request to pay NRF (V4)',
    basePath: '/lpa-approve-4',
    hasStartPage: false,
    entryPath: '/lpa-approval-email-content',
    description:
      'A user journey for the LPA to check and approve or reject the details sent from the developer. Includes a rejection flow with reason capture.'
  }
]

/**
 * Get all journeys that have a start page
 * Useful for testing journey entry points
 */
function getJourneysWithStartPage() {
  return JOURNEYS.filter((journey) => journey.hasStartPage).map((journey) => ({
    name: journey.name,
    path: `${journey.basePath}/start`
  }))
}

/**
 * Get all journey base paths
 */
function getAllJourneyPaths() {
  return JOURNEYS.map((journey) => journey.basePath)
}

/**
 * Get journey by base path
 */
function getJourneyByPath(basePath) {
  return JOURNEYS.find((journey) => journey.basePath === basePath)
}

module.exports = {
  JOURNEYS,
  getJourneysWithStartPage,
  getAllJourneyPaths,
  getJourneyByPath
}
