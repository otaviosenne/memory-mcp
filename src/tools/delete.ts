import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Vault } from '../core/vault.js';

const DeleteSchema = z.object({
  query: z.string().describe('Memory ID, name, or slug'),
});

export function registerDeleteTool(server: Server, vault: Vault): void {
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== 'memory_delete') {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }

    const { query } = DeleteSchema.parse(request.params.arguments);
    const memory = await vault.get(query);
    const name = memory?.name ?? query;
    const deleted = await vault.delete(query);

    return {
      content: [{ type: 'text', text: JSON.stringify({ deleted, name }) }],
    };
  });
}
