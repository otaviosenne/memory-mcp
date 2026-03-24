import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Vault } from '../core/vault.js';

const ReadSchema = z.object({
  query: z.string().describe('Memory ID, name, or slug'),
});

export function registerReadTool(server: Server, vault: Vault): void {
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== 'memory_read') {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }

    const { query } = ReadSchema.parse(request.params.arguments);
    const memory = await vault.get(query);

    if (!memory) {
      return {
        content: [
          { type: 'text', text: JSON.stringify({ error: `Memory not found: ${query}` }) },
        ],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(memory) }],
    };
  });
}
