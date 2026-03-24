import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export function getVaultPath(): string {
  const envPath = process.env.MEMORY_VAULT_PATH;
  if (envPath) return envPath.replace('~', os.homedir());
  return path.join(os.homedir(), '.local', 'share', 'memory-mcp', 'vault');
}

export class Storage {
  constructor(private vaultPath: string) {}

  async ensureVault(): Promise<void> {
    await fs.mkdir(this.vaultPath, { recursive: true });
  }

  async listFiles(): Promise<string[]> {
    await this.ensureVault();
    const entries = await fs.readdir(this.vaultPath);
    return entries
      .filter((entry) => entry.endsWith('.md'))
      .map((entry) => path.join(this.vaultPath, entry));
  }

  async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    await this.ensureVault();
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async deleteFile(filePath: string): Promise<void> {
    await fs.unlink(filePath);
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  slugToPath(slug: string): string {
    return path.join(this.vaultPath, `${slug}.md`);
  }
}
