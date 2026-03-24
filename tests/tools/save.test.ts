import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { Vault } from '../../src/core/vault.js';

function tmpVaultPath(): string {
  return path.join(os.tmpdir(), 'memory-mcp-test-' + Math.random().toString(36).slice(2));
}

describe('memory_save tool handler', () => {
  let vault: Vault;
  let vaultPath: string;

  beforeEach(async () => {
    vaultPath = tmpVaultPath();
    vault = new Vault(vaultPath);
    await vault.initialize();
  });

  afterEach(async () => {
    await fs.rm(vaultPath, { recursive: true, force: true });
  });

  it('creates memory and returns correct shape', async () => {
    const memory = await vault.save({
      name: 'Test Save',
      type: 'note',
      content: 'Hello',
      tags: ['tag1'],
    });

    expect(memory).toMatchObject({
      name: 'Test Save',
      type: 'note',
      slug: 'test-save',
      tags: ['tag1'],
    });
    expect(memory.id).toBeTruthy();
    expect(memory.created).toBeTruthy();
    expect(memory.updated).toBeTruthy();
  });

  it('save is idempotent by name', async () => {
    await vault.save({ name: 'Idempotent', type: 'note', content: 'v1' });
    await vault.save({ name: 'Idempotent', type: 'note', content: 'v2' });

    const list = await vault.list();
    const matches = list.filter(m => m.name === 'Idempotent');
    expect(matches).toHaveLength(1);
    expect(matches[0].content).toBe('v2');
  });

  it('saves with all memory types', async () => {
    const types = ['user', 'feedback', 'project', 'reference', 'note'] as const;
    for (const type of types) {
      const m = await vault.save({ name: `Type ${type}`, type, content: 'body' });
      expect(m.type).toBe(type);
    }
  });

  it('handles empty tags array', async () => {
    const m = await vault.save({ name: 'No Tags', type: 'note', content: 'body', tags: [] });
    expect(m.tags).toEqual([]);
  });
});
