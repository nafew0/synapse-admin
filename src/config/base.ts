import { loadEnv } from 'vite';
import { basePathHref } from './basePath';

export function resolveViteBasePath(
  mode: string,
  cwd = process.cwd(),
  runtimeValue = process.env.VITE_BASE_PATH,
): string {
  const fileValue = loadEnv(mode, cwd, 'VITE_').VITE_BASE_PATH;
  return basePathHref(runtimeValue ?? fileValue);
}
