import { z } from 'zod';
import { exec } from 'child_process';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { Vault } from '../core/vault.js';

const EXCERPT_LENGTH = 200;

const SaveSchema = z.object({
  name: z.string(),
  type: z.enum(['user', 'feedback', 'project', 'reference', 'note']),
  content: z.string(),
  tags: z.array(z.string()).optional(),
  links: z.array(z.string()).optional(),
});

const QuerySchema = z.object({ query: z.string() });

const SearchSchema = z.object({
  query: z.string(),
  type: z.enum(['user', 'feedback', 'project', 'reference', 'note']).optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().positive().optional(),
});

const ListSchema = z.object({
  type: z.enum(['user', 'feedback', 'project', 'reference', 'note']).optional(),
  tags: z.array(z.string()).optional(),
  sort: z.enum(['created', 'updated', 'name', 'links']).optional(),
  limit: z.number().int().positive().optional(),
});

function textResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] };
}

export function registerTools(server: Server, vault: Vault, webPort = 4242): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'memory_save',
        description: 'Save or update a memory',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: { type: 'string', enum: ['user', 'feedback', 'project', 'reference', 'note'] },
            content: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            links: { type: 'array', items: { type: 'string' } },
          },
          required: ['name', 'type', 'content'],
        },
      },
      {
        name: 'memory_read',
        description: 'Read a memory by ID, name, or slug',
        inputSchema: {
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query'],
        },
      },
      {
        name: 'memory_search',
        description: 'Fuzzy search memories',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            type: { type: 'string', enum: ['user', 'feedback', 'project', 'reference', 'note'] },
            tags: { type: 'array', items: { type: 'string' } },
            limit: { type: 'number' },
          },
          required: ['query'],
        },
      },
      {
        name: 'memory_list',
        description: 'List memories with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['user', 'feedback', 'project', 'reference', 'note'] },
            tags: { type: 'array', items: { type: 'string' } },
            sort: { type: 'string', enum: ['created', 'updated', 'name', 'links'] },
            limit: { type: 'number' },
          },
        },
      },
      {
        name: 'memory_delete',
        description: 'Delete a memory by ID, name, or slug',
        inputSchema: {
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query'],
        },
      },
      {
        name: 'memory_graph_data',
        description: 'Get graph data (nodes and edges)',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'memory_stats',
        description: 'Get vault statistics',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'memory_open_graph',
        description: 'Open the graph UI in browser',
        inputSchema: { type: 'object', properties: {} },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'memory_save': {
        const input = SaveSchema.parse(args);
        const memory = await vault.save({
          name: input.name,
          type: input.type,
          content: input.content,
          tags: input.tags,
          explicitLinks: input.links,
        });
        return textResult({
          id: memory.id,
          name: memory.name,
          slug: memory.slug,
          type: memory.type,
          created: memory.created,
          updated: memory.updated,
          links: memory.links,
        });
      }

      case 'memory_read': {
        const { query } = QuerySchema.parse(args);
        const memory = await vault.get(query);
        if (!memory) {
          return { content: [{ type: 'text' as const, text: JSON.stringify({ error: `Not found: ${query}` }) }], isError: true };
        }
        return textResult(memory);
      }

      case 'memory_search': {
        const input = SearchSchema.parse(args);
        const results = await vault.search(input.query, {
          type: input.type,
          tags: input.tags,
          limit: input.limit,
        });
        return textResult(
          results.map((r) => ({
            id: r.id,
            name: r.name,
            type: r.type,
            tags: r.tags,
            score: r.score,
            excerpt: r.content.slice(0, EXCERPT_LENGTH),
          }))
        );
      }

      case 'memory_list': {
        const input = ListSchema.parse(args);
        const memories = await vault.list(input);
        return textResult(
          memories.map((m) => ({
            id: m.id,
            name: m.name,
            type: m.type,
            tags: m.tags,
            links: m.links.length,
            created: m.created,
            updated: m.updated,
            slug: m.slug,
          }))
        );
      }

      case 'memory_delete': {
        const { query } = QuerySchema.parse(args);
        const memory = await vault.get(query);
        const memName = memory?.name ?? query;
        const deleted = await vault.delete(query);
        return textResult({ deleted, name: memName });
      }

      case 'memory_graph_data':
        return textResult(vault.getGraphData());

      case 'memory_stats':
        return textResult(vault.getStats());

      case 'memory_open_graph': {
        const url = `http://localhost:${webPort}`;
        exec(`xdg-open ${url}`);
        return textResult({ url });
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });
}
