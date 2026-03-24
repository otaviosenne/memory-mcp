import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Vault } from '../core/vault.js';

const SaveSchema = z.object({
  name: z.string().describe('Memory name - used as title and identifier'),
  type: z
    .enum(['user', 'feedback', 'project', 'reference', 'note'])
    .describe('Category of memory'),
  content: z
    .string()
    .describe('Memory content in markdown. Use [[Name]] to link to other memories'),
  tags: z.array(z.string()).optional(),
  links: z
    .array(z.string())
    .optional()
    .describe('IDs of memories to explicitly link'),
});

export function registerSaveTool(server: Server, vault: Vault): void {
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== 'memory_save') {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }

    const input = SaveSchema.parse(request.params.arguments);
    const memory = await vault.save({
      name: input.name,
      type: input.type,
      content: input.content,
      tags: input.tags,
      explicitLinks: input.links,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            id: memory.id,
            name: memory.name,
            slug: memory.slug,
            type: memory.type,
            created: memory.created,
            updated: memory.updated,
            links: memory.links,
          }),
        },
      ],
    };
  });
}
