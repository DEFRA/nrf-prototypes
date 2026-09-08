/**
 * @param {string} url
 * @param {object} body
 * @param {{ parseJson?: boolean }} [params]
 * @returns {Promise<{ response: Response, payload: object|null }>}
 */
export async function postJson(url, body, { parseJson = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }

  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })
  } catch (error) {
    console.error(`Failed to POST to ${url}`, error)
    throw error
  }

  if (!response.ok) {
    console.error(`POST to ${url} returned status ${response.status}`)
  }

  if (!parseJson) {
    return { response, payload: null }
  }

  let payload = null
  try {
    payload = await response.json()
  } catch (error) {
    console.error('Failed to parse JSON response', error)
  }

  return { response, payload }
}
