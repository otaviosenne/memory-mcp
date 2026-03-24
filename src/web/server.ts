import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Vault } from '../core/vault.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function startWebServer(vault: Vault, port: number): void {
  const app = express();

  app.use(express.json());

  app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.get('/api/graph', (_req, res) => {
    res.json(vault.getGraphData());
  });

  app.get('/api/stats', (_req, res) => {
    res.json(vault.getStats());
  });

  app.get('/api/memories/:id', async (req, res) => {
    const memory = await vault.get(req.params['id'] ?? '');
    if (!memory) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json(memory);
  });

  app.get('/api/search', async (req, res) => {
    const q = String(req.query['q'] ?? '');
    const results = await vault.search(q);
    res.json(results);
  });

  app.listen(port, () => {
    process.stderr.write(`[memory-mcp] Graph UI: http://localhost:${port}\n`);
  });
}
