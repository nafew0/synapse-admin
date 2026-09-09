import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveViteBasePath } from './base';
import { basePathHref, normalizeBasePath } from './basePath';

const temporaryDirectories: string[] = [];

async function createEnvironmentFile(value: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'synapse-admin-vite-'));
  temporaryDirectories.push(directory);
  await writeFile(join(directory, '.env'), `VITE_BASE_PATH=${value}\n`);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

describe('normalizeBasePath', () => {
  it.each(['/adminpanel', '/adminpanel/'])(
    'normalizes %s to a route prefix without a trailing slash',
    (value) => {
      expect(normalizeBasePath(value)).toBe('/adminpanel');
    },
  );

  it('preserves root deployments', () => {
    expect(normalizeBasePath('/')).toBe('');
    expect(normalizeBasePath()).toBe('');
  });

  it('adds a leading slash when omitted', () => {
    expect(normalizeBasePath('adminpanel')).toBe('/adminpanel');
  });
});

describe('basePathHref', () => {
  it.each(['/adminpanel', '/adminpanel/'])(
    'normalizes %s to an asset-safe trailing-slash path',
    (value) => {
      expect(basePathHref(value)).toBe('/adminpanel/');
    },
  );

  it('preserves the root href', () => {
    expect(basePathHref('/')).toBe('/');
  });
});

describe('resolveViteBasePath', () => {
  it('loads the base path from an environment file during configuration', async () => {
    const directory = await createEnvironmentFile('/adminpanel');

    expect(resolveViteBasePath('production', directory, undefined)).toBe('/adminpanel/');
  });

  it('gives an existing runtime variable precedence over the environment file', async () => {
    const directory = await createEnvironmentFile('/from-file');

    expect(resolveViteBasePath('production', directory, '/from-runtime')).toBe('/from-runtime/');
  });
});
