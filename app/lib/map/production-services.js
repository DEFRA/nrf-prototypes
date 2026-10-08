/**
 * Whether quote V7.1's production map uses production's services. Each one
 * needs its URL and its key: the impact assessor and the backend reject a
 * request without the key, so a URL alone would give a map with no aerial
 * imagery or EDP outlines. Without both, the prototype's own data answers.
 */

function usesImpactAssessor() {
  return Boolean(
    process.env.IMPACT_ASSESSOR_BASE_URL && process.env.IMPACT_ASSESSOR_API_KEY
  )
}

function usesBackend() {
  return Boolean(process.env.NRF_BACKEND_API_URL && process.env.BACKEND_API_KEY)
}

module.exports = { usesImpactAssessor, usesBackend }
