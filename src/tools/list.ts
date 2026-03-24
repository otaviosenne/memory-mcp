import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Vault } from '../core/vault.js';

const ListSchema = z.object({
  type: z.enum(['user', 'feedback', 'project', 'reference', 'note']).optional(),
  tags: z.array(z.string()).optional(),
  sort: z.enum(['created', 'updated', 'name', 'links']).optional(),
  limit: z.number().int().positive().optional(),
});

export function registerListTool(server: Server, vault: Vault): void {
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== 'memory_list') {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }

    const input = ListSchema.parse(request.params.arguments);
    const memories = await vault.list(input);

    const summaries = memories.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      tags: m.tags,
      links: m.links.length,
      created: m.created,
      updated: m.updated,
      slug: m.slug,
    }));

    return {
      content: [{ type: 'text', text: JSON.stringify(summaries) }],
    };
  });
}
