import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { Vault } from '../../src/core/vault.js';

function tmpVaultPath(): string {
  return path.join(os.tmpdir(), 'memory-mcp-test-' + Math.random().toString(36).slice(2));
}

describe('Vault', () => {
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

  it('save creates a new memory', async () => {
    const memory = await vault.save({
      name: 'Alpha',
      type: 'note',
      content: 'Hello world',
      tags: ['test'],
    });

    expect(memory.id).toBeTruthy();
    expect(memory.name).toBe('Alpha');
    expect(memory.type).toBe('note');
    expect(memory.tags).toEqual(['test']);
    expect(memory.slug).toBe('alpha');

    const files = await fs.readdir(vaultPath);
    expect(files).toContain('alpha.md');
  });

  it('save updates existing memory by name', async () => {
    const first = await vault.save({ name: 'Beta', type: 'note', content: 'v1' });
    const second = await vault.save({ name: 'Beta', type: 'project', content: 'v2' });

    expect(second.id).toBe(first.id);
    expect(second.content).toBe('v2');
    expect(second.type).toBe('project');
  });

  it('save auto-resolves [[wiki-links]] to IDs', async () => {
    const target = await vault.save({ name: 'Target', type: 'note', content: 'I am target' });
    const source = await vault.save({
      name: 'Source',
      type: 'note',
      content: 'See [[Target]] for details',
    });

    expect(source.links).toContain(target.id);
  });

  it('save creates bidirectional links', async () => {
    const a = await vault.save({ name: 'NodeA', type: 'note', content: 'Links to [[NodeB]]' });
    const b = await vault.save({ name: 'NodeB', type: 'note', content: 'I am B' });

    const savedA = await vault.save({ name: 'NodeA', type: 'note', content: 'Links to [[NodeB]]' });
    const freshB = await vault.get(b.id);

    expect(savedA.links).toContain(b.id);
    expect(freshB?.links).toContain(a.id);
  });

  it('get finds by ID', async () => {
    const created = await vault.save({ name: 'Gamma', type: 'user', content: 'body' });
    const found = await vault.get(created.id);
    expect(found?.name).toBe('Gamma');
  });

  it('get finds by name case-insensitively', async () => {
    await vault.save({ name: 'Delta Memory', type: 'reference', content: 'ref' });
    const found = await vault.get('delta memory');
    expect(found?.name).toBe('Delta Memory');
  });

  it('get finds by slug', async () => {
    await vault.save({ name: 'Epsilon Node', type: 'note', content: 'ep' });
    const found = await vault.get('epsilon-node');
    expect(found?.name).toBe('Epsilon Node');
  });

  it('get returns undefined for unknown identifier', async () => {
    const found = await vault.get('does-not-exist');
    expect(found).toBeUndefined();
  });

  it('search returns relevant results', async () => {
    await vault.save({ name: 'Searchable Note', type: 'note', content: 'unique keyword here' });
    await vault.save({ name: 'Other', type: 'note', content: 'nothing special' });

    const results = await vault.search('unique keyword');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('Searchable Note');
  });

  it('search filters by type', async () => {
    await vault.save({ name: 'User Memory', type: 'user', content: 'hello' });
    await vault.save({ name: 'Note Memory', type: 'note', content: 'hello' });

    const results = await vault.search('hello', { type: 'user' });
    expect(results.every(r => r.type === 'user')).toBe(true);
  });

  it('search returns empty for blank query', async () => {
    await vault.save({ name: 'Any', type: 'note', content: 'content' });
    const results = await vault.search('');
    expect(results).toEqual([]);
  });

  it('delete removes the memory', async () => {
    const m = await vault.save({ name: 'Zeta', type: 'note', content: 'bye' });
    const deleted = await vault.delete(m.id);

    expect(deleted).toBe(true);
    expect(await vault.get(m.id)).toBeUndefined();

    const files = await fs.readdir(vaultPath);
    expect(files).not.toContain('zeta.md');
  });

  it('delete returns false for unknown identifier', async () => {
    const result = await vault.delete('ghost');
    expect(result).toBe(false);
  });

  it('delete cleans up bidirectional links in other memories', async () => {
    const a = await vault.save({ name: 'KeepA', type: 'note', content: 'Links to [[RemoveB]]' });
    const b = await vault.save({ name: 'RemoveB', type: 'note', content: 'ref' });

    await vault.save({ name: 'KeepA', type: 'note', content: 'Links to [[RemoveB]]' });

    await vault.delete(b.id);
    const freshA = await vault.get(a.id);
    expect(freshA?.links).not.toContain(b.id);
  });

  it('getGraphData returns correct nodes and edges', async () => {
    const a = await vault.save({ name: 'GraphA', type: 'note', content: 'See [[GraphB]]' });
    const b = await vault.save({ name: 'GraphB', type: 'note', content: 'ref' });
    await vault.save({ name: 'GraphA', type: 'note', content: 'See [[GraphB]]' });

    const graph = vault.getGraphData();
    const ids = graph.nodes.map(n => n.id);
    expect(ids).toContain(a.id);
    expect(ids).toContain(b.id);
    expect(graph.edges.length).toBeGreaterThan(0);
  });

  it('getStats returns correct counts', async () => {
    await vault.save({ name: 'S1', type: 'note', content: 'n1', tags: ['t'] });
    await vault.save({ name: 'S2', type: 'user', content: 'n2', tags: ['t'] });

    const stats = vault.getStats();
    expect(stats.total).toBe(2);
    expect(stats.byType.note).toBe(1);
    expect(stats.byType.user).toBe(1);
    expect(stats.topTags[0]?.tag).toBe('t');
  });

  it('list returns memories with type filter', async () => {
    await vault.save({ name: 'L1', type: 'feedback', content: 'f' });
    await vault.save({ name: 'L2', type: 'note', content: 'n' });

    const results = await vault.list({ type: 'feedback' });
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('L1');
  });

  it('list sorts by name', async () => {
    await vault.save({ name: 'Zebra', type: 'note', content: 'z' });
    await vault.save({ name: 'Apple', type: 'note', content: 'a' });

    const results = await vault.list({ sort: 'name' });
    expect(results[0].name).toBe('Apple');
    expect(results[1].name).toBe('Zebra');
  });
});
