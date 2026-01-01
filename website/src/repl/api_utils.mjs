export const normalizeBaseUrl = (baseUrl = '/') => {
  if (typeof baseUrl !== 'string') return '';
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
};

export const buildApiUrl = (baseUrl, path) => {
  const base = normalizeBaseUrl(baseUrl);
  const suffix = typeof path === 'string' ? path : '';
  const normalizedPath = suffix.startsWith('/') ? suffix : `/${suffix}`;
  if (!base) return normalizedPath;
  return `${base}${normalizedPath}`;
};
