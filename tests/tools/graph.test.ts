import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { Vault } from '../../src/core/vault.js';

function tmpVaultPath(): string {
  return path.join(os.tmpdir(), 'memory-mcp-test-' + Math.random().toString(36).slice(2));
}

describe('memory_graph_data tool handler', () => {
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

  it('returns empty graph when vault is empty', () => {
    const graph = vault.getGraphData();
    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
  });

  it('returns correct node count', async () => {
    await vault.save({ name: 'Node One', type: 'note', content: 'body' });
    await vault.save({ name: 'Node Two', type: 'user', content: 'body' });

    const graph = vault.getGraphData();
    expect(graph.nodes).toHaveLength(2);
  });

  it('edges are not duplicated for bidirectional links', async () => {
    await vault.save({ name: 'A', type: 'note', content: 'Links to [[B]]' });
    await vault.save({ name: 'B', type: 'note', content: 'Links to [[A]]' });
    await vault.save({ name: 'A', type: 'note', content: 'Links to [[B]]' });

    const graph = vault.getGraphData();
    const edgeIds = graph.edges.map(e => [e.source, e.target].sort().join(':'));
    const uniqueEdges = new Set(edgeIds);
    expect(uniqueEdges.size).toBe(edgeIds.length);
  });

  it('marks bidirectional edges correctly', async () => {
    const a = await vault.save({ name: 'P', type: 'note', content: 'Links to [[Q]]' });
    const b = await vault.save({ name: 'Q', type: 'note', content: 'Links to [[P]]' });
    await vault.save({ name: 'P', type: 'note', content: 'Links to [[Q]]' });
    await vault.save({ name: 'Q', type: 'note', content: 'Links to [[P]]' });

    const graph = vault.getGraphData();
    const edge = graph.edges.find(
      e => (e.source === a.id || e.target === a.id) &&
           (e.source === b.id || e.target === b.id)
    );
    expect(edge).toBeDefined();
    expect(edge?.bidirectional).toBe(true);
  });

  it('nodes include correct type and linkCount', async () => {
    await vault.save({ name: 'TypeTest', type: 'feedback', content: 'body' });

    const graph = vault.getGraphData();
    const node = graph.nodes.find(n => n.name === 'TypeTest');
    expect(node?.type).toBe('feedback');
    expect(typeof node?.linkCount).toBe('number');
  });
});
