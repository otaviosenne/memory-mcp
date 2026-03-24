import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Vault } from '../core/vault.js';

export function registerGraphTool(server: Server, vault: Vault): void {
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== 'memory_graph_data') {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }

    const graphData = vault.getGraphData();
    return {
      content: [{ type: 'text', text: JSON.stringify(graphData) }],
    };
  });
}
