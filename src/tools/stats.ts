import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Vault } from '../core/vault.js';

export function registerStatsTool(server: Server, vault: Vault): void {
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== 'memory_stats') {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }

    const stats = vault.getStats();
    return {
      content: [{ type: 'text', text: JSON.stringify(stats) }],
    };
  });
}
