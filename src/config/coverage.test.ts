import { describe, expect, it } from 'vitest';
import { getConfigCoverage, getConfigSchemaKeys, getUnclassifiedConfigKeys } from './coverage';

describe('global configuration coverage', () => {
  it('classifies every top-level configSchema field', () => {
    expect(getUnclassifiedConfigKeys()).toEqual([]);
    expect(Object.keys(getConfigCoverage()).sort()).toEqual(getConfigSchemaKeys().sort());
  });

  it('requires reasons for non-editable fields and scope metadata for editable fields', () => {
    for (const disposition of Object.values(getConfigCoverage())) {
      if (disposition.kind === 'editable') {
        expect(disposition.tab).toBeTruthy();
        expect(disposition.sectionId).toBeTruthy();
      } else {
        expect(disposition.reason).toBeTruthy();
      }
    }
  });
});
