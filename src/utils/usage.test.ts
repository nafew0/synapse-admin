import { describe, expect, it } from 'vitest';
import { modelRowKey } from './usage';

describe('modelRowKey', () => {
  it('separates two labels that run on the same model', () => {
    const office = { displayName: 'Office Assistant', modelKey: 'claude-haiku-4-5' };
    const chat = { displayName: 'Claude Haiku', modelKey: 'claude-haiku-4-5' };
    expect(modelRowKey(office)).not.toBe(modelRowKey(chat));
  });

  it('separates unlabeled rows for one model id from different providers', () => {
    const viaOpenRouter = { providerKey: 'openrouter', modelKey: 'gpt-4.1-mini' };
    const direct = { providerKey: 'openai', modelKey: 'gpt-4.1-mini' };
    expect(modelRowKey(viaOpenRouter)).not.toBe(modelRowKey(direct));
  });
});
