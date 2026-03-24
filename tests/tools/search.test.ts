import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { Vault } from '../../src/core/vault.js';

function tmpVaultPath(): string {
  return path.join(os.tmpdir(), 'memory-mcp-test-' + Math.random().toString(36).slice(2));
}

describe('memory_search tool handler', () => {
  let vault: Vault;
  let vaultPath: string;

  beforeEach(async () => {
    vaultPath = tmpVaultPath();
    vault = new Vault(vaultPath);
    await vault.initialize();

    await vault.save({ name: 'React Hooks Guide', type: 'note', content: 'useState useEffect patterns' });
    await vault.save({ name: 'Python FastAPI Setup', type: 'project', content: 'Async endpoints with FastAPI' });
    await vault.save({ name: 'User Profile', type: 'user', content: 'personal info here', tags: ['personal'] });
  });

  afterEach(async () => {
    await fs.rm(vaultPath, { recursive: true, force: true });
  });

  it('returns results with score property', async () => {
    const results = await vault.search('React');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('score');
    expect(results[0].score).toBeGreaterThan(0);
  });

  it('empty query returns empty results', async () => {
    const results = await vault.search('');
    expect(results).toEqual([]);
  });

  it('filters by type', async () => {
    const results = await vault.search('profile', { type: 'user' });
    expect(results.every(r => r.type === 'user')).toBe(true);
  });

  it('respects limit filter', async () => {
    await vault.save({ name: 'Extra Note 1', type: 'note', content: 'extra stuff' });
    await vault.save({ name: 'Extra Note 2', type: 'note', content: 'extra content' });

    const results = await vault.search('extra', { limit: 1 });
    expect(results.length).toBeLessThanOrEqual(1);
  });

  it('filters by tags', async () => {
    const results = await vault.search('personal', { tags: ['personal'] });
    expect(results.every(r => r.tags.includes('personal'))).toBe(true);
  });

  it('score is between 0 and 1', async () => {
    const results = await vault.search('FastAPI');
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
  });
});
