import { describe, it, expect, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { Storage } from '../../src/core/storage.js';

function tmpVaultPath(): string {
  return path.join(os.tmpdir(), 'memory-mcp-test-' + Math.random().toString(36).slice(2));
}

describe('Storage', () => {
  const createdPaths: string[] = [];

  afterEach(async () => {
    for (const p of createdPaths) {
      await fs.rm(p, { recursive: true, force: true });
    }
    createdPaths.length = 0;
  });

  it('ensureVault creates directory if not exists', async () => {
    const vaultPath = tmpVaultPath();
    createdPaths.push(vaultPath);
    const storage = new Storage(vaultPath);

    await storage.ensureVault();
    const stat = await fs.stat(vaultPath);
    expect(stat.isDirectory()).toBe(true);
  });

  it('slugToPath returns correct path', () => {
    const storage = new Storage('/vault');
    expect(storage.slugToPath('my-memory')).toBe('/vault/my-memory.md');
  });

  it('listFiles returns only .md files', async () => {
    const vaultPath = tmpVaultPath();
    createdPaths.push(vaultPath);
    const storage = new Storage(vaultPath);
    await storage.ensureVault();

    await fs.writeFile(path.join(vaultPath, 'a.md'), 'content a');
    await fs.writeFile(path.join(vaultPath, 'b.md'), 'content b');
    await fs.writeFile(path.join(vaultPath, 'ignore.txt'), 'ignored');

    const files = await storage.listFiles();
    expect(files).toHaveLength(2);
    expect(files.every(f => f.endsWith('.md'))).toBe(true);
  });

  it('writeFile then readFile round-trips correctly', async () => {
    const vaultPath = tmpVaultPath();
    createdPaths.push(vaultPath);
    const storage = new Storage(vaultPath);

    const filePath = path.join(vaultPath, 'test.md');
    const content = '# Hello\n\nWorld!';

    await storage.writeFile(filePath, content);
    const read = await storage.readFile(filePath);
    expect(read).toBe(content);
  });

  it('deleteFile removes the file', async () => {
    const vaultPath = tmpVaultPath();
    createdPaths.push(vaultPath);
    const storage = new Storage(vaultPath);

    const filePath = path.join(vaultPath, 'delete-me.md');
    await storage.writeFile(filePath, 'bye');
    await storage.deleteFile(filePath);

    const exists = await storage.fileExists(filePath);
    expect(exists).toBe(false);
  });

  it('fileExists returns true for existing file', async () => {
    const vaultPath = tmpVaultPath();
    createdPaths.push(vaultPath);
    const storage = new Storage(vaultPath);

    const filePath = path.join(vaultPath, 'present.md');
    await storage.writeFile(filePath, 'hello');
    expect(await storage.fileExists(filePath)).toBe(true);
  });

  it('fileExists returns false for missing file', async () => {
    const storage = new Storage('/nonexistent-vault-xyz');
    expect(await storage.fileExists('/nonexistent-vault-xyz/ghost.md')).toBe(false);
  });
});
