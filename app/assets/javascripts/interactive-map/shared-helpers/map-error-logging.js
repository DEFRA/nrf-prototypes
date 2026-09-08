function ignoreMapError() {
  // MapLibre 'error' events include tile fetch failures which are non-fatal
  // (network blips, missing tiles) — intentionally empty to suppress log noise
}

export function wireMapErrorLogging(mapInstance) {
  mapInstance.on('error', ignoreMapError)
}
