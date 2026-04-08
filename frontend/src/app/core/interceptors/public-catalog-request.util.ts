const PUBLIC_CATALOG_PATH_PATTERNS = [
  /\/vehicles$/,
  /\/vehicles\/[^/]+$/,
  /\/vehicles\/[^/]+\/pricing-preview$/,
];

export function isPublicCatalogRequest(url: string, method: string) {
  if (method.toUpperCase() !== 'GET') {
    return false;
  }

  const normalizedUrl = normalizeUrl(url);

  return PUBLIC_CATALOG_PATH_PATTERNS.some((pattern) =>
    pattern.test(normalizedUrl.pathname),
  );
}

function normalizeUrl(url: string) {
  try {
    return new URL(url, globalThis.location?.origin ?? 'http://localhost');
  } catch {
    return new URL('http://localhost');
  }
}
