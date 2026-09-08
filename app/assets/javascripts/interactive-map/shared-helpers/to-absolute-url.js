// Some contexts have no implicit base URL to resolve a relative path against
// — a MapLibre Web Worker, or Node's fetch in tests (unlike a browser's) —
// so relative URLs must be resolved to absolute up front.
export function toAbsoluteUrl(url) {
  return typeof url === 'string' && url.startsWith('/')
    ? `${window.location.origin}${url}`
    : url
}
