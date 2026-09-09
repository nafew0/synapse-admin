export function normalizeBasePath(value?: string): string {
  const basePath = value?.trim();
  if (!basePath || basePath === '/') return '';

  const rootedBasePath = basePath.startsWith('/') ? basePath : `/${basePath}`;
  return rootedBasePath.replace(/\/+$/, '');
}

export function basePathHref(value?: string): string {
  const basePath = normalizeBasePath(value);
  return basePath ? `${basePath}/` : '/';
}
