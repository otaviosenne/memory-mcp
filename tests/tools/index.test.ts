import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { Vault } from '../../src/core/vault.js';
import { registerTools } from '../../src/tools/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

function tmpVaultPath(): string {
  return path.join(os.tmpdir(), 'memory-mcp-test-' + Math.random().toString(36).slice(2));
}

type HandlerFn = (req: { params: unknown }) => Promise<unknown>;

function createMockServer() {
  const handlers = new Map<object, HandlerFn>();

  return {
    setRequestHandler(schema: object, handler: HandlerFn) {
      handlers.set(schema, handler);
    },
    async callSchema(schema: object, params: unknown) {
      const handler = handlers.get(schema);
      if (!handler) throw new Error(`No handler registered for schema`);
      return handler({ params });
    },
  };
}

describe('registerTools / tool router', () => {
  let vault: Vault;
  let vaultPath: string;
  let server: ReturnType<typeof createMockServer>;

  beforeEach(async () => {
    vaultPath = tmpVaultPath();
    vault = new Vault(vaultPath);
    await vault.initialize();
    server = createMockServer();
    registerTools(server as unknown as Server, vault, 4242);
  });

  afterEach(async () => {
    await fs.rm(vaultPath, { recursive: true, force: true });
  });

  async function callTool(name: string, args: unknown) {
    return server.callSchema(CallToolRequestSchema, { name, arguments: args }) as Promise<{
      content: Array<{ type: string; text: string }>;
      isError?: boolean;
    }>;
  }

  async function listTools() {
    return server.callSchema(ListToolsRequestSchema, {}) as Promise<{
      tools: Array<{ name: string }>;
    }>;
  }

  it('memory_save creates a memory via router', async () => {
    const result = await callTool('memory_save', {
      name: 'Router Test',
      type: 'note',
      content: 'hello from router',
    });

    const data = JSON.parse(result.content[0].text);
    expect(data.name).toBe('Router Test');
    expect(data.id).toBeTruthy();
    expect(data.slug).toBe('router-test');
  });

  it('memory_read returns memory content', async () => {
    const saved = await vault.save({ name: 'Read Target', type: 'user', content: 'body text' });

    const result = await callTool('memory_read', { query: saved.id });
    const data = JSON.parse(result.content[0].text);
    expect(data.name).toBe('Read Target');
    expect(data.content).toBe('body text');
  });

  it('memory_read returns error for unknown query', async () => {
    const result = await callTool('memory_read', { query: 'nonexistent' });
    expect(result.isError).toBe(true);
  });

  it('memory_search returns results with score and excerpt', async () => {
    await vault.save({ name: 'Searchable', type: 'note', content: 'unique phrase alpha' });

    const result = await callTool('memory_search', { query: 'unique phrase' });
    const data = JSON.parse(result.content[0].text);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty('score');
    expect(data[0]).toHaveProperty('excerpt');
  });

  it('memory_list returns memory summaries without content', async () => {
    await vault.save({ name: 'List Item', type: 'reference', content: 'full content here' });

    const result = await callTool('memory_list', {});
    const data = JSON.parse(result.content[0].text);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).not.toHaveProperty('content');
    expect(data[0]).toHaveProperty('slug');
  });

  it('memory_delete removes a memory', async () => {
    const saved = await vault.save({ name: 'Delete Me Router', type: 'note', content: 'bye' });

    const result = await callTool('memory_delete', { query: saved.id });
    const data = JSON.parse(result.content[0].text);
    expect(data.deleted).toBe(true);
    expect(data.name).toBe('Delete Me Router');
  });

  it('memory_graph_data returns graph structure', async () => {
    const result = await callTool('memory_graph_data', {});
    const data = JSON.parse(result.content[0].text);
    expect(data).toHaveProperty('nodes');
    expect(data).toHaveProperty('edges');
  });

  it('memory_stats returns stats structure', async () => {
    const result = await callTool('memory_stats', {});
    const data = JSON.parse(result.content[0].text);
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('byType');
    expect(data).toHaveProperty('topTags');
  });

  it('memory_open_graph returns url', async () => {
    const result = await callTool('memory_open_graph', {});
    const data = JSON.parse(result.content[0].text);
    expect(data.url).toBe('http://localhost:4242');
  });

  it('throws for unknown tool name', async () => {
    await expect(callTool('memory_unknown_tool', {})).rejects.toThrow('Unknown tool');
  });

  it('tools/list returns all tool definitions', async () => {
    const result = await listTools();
    const names = result.tools.map((t) => t.name);
    expect(names).toContain('memory_save');
    expect(names).toContain('memory_read');
    expect(names).toContain('memory_search');
    expect(names).toContain('memory_list');
    expect(names).toContain('memory_delete');
    expect(names).toContain('memory_graph_data');
    expect(names).toContain('memory_stats');
    expect(names).toContain('memory_open_graph');
  });
});
