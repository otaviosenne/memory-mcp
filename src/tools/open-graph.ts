import { exec } from 'child_process';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

export function registerOpenGraphTool(server: Server, port: number): void {
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== 'memory_open_graph') {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }

    const url = `http://localhost:${port}`;
    exec(`xdg-open ${url}`);

    return {
      content: [{ type: 'text', text: JSON.stringify({ url }) }],
    };
  });
}
