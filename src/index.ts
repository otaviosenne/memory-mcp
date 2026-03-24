import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Vault } from './core/vault.js';
import { getVaultPath } from './core/storage.js';
import { registerTools } from './tools/index.js';
import { startWebServer } from './web/server.js';

async function main() {
  const vaultPath = getVaultPath();
  const vault = new Vault(vaultPath);
  await vault.initialize();

  const webPort = parseInt(process.env['MEMORY_WEB_PORT'] ?? '4242', 10);
  startWebServer(vault, webPort);

  const server = new Server(
    { name: 'memory-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  registerTools(server, vault, webPort);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
