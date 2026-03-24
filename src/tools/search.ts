import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Vault } from '../core/vault.js';

const SearchSchema = z.object({
  query: z.string(),
  type: z.enum(['user', 'feedback', 'project', 'reference', 'note']).optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().positive().optional(),
});

const EXCERPT_LENGTH = 200;

export function registerSearchTool(server: Server, vault: Vault): void {
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== 'memory_search') {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }

    const input = SearchSchema.parse(request.params.arguments);
    const results = await vault.search(input.query, {
      type: input.type,
      tags: input.tags,
      limit: input.limit,
    });

    const formatted = results.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      tags: r.tags,
      score: r.score,
      excerpt: r.content.slice(0, EXCERPT_LENGTH),
    }));

    return {
      content: [{ type: 'text', text: JSON.stringify(formatted) }],
    };
  });
}
