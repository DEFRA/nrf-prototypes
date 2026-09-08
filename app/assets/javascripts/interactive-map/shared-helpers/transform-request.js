import { toAbsoluteUrl } from './to-absolute-url.js'

export function transformRequest(url) {
  return { url: toAbsoluteUrl(url) }
}
