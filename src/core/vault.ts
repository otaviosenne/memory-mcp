import Fuse from 'fuse.js';
import type {
  Memory,
  MemoryType,
  GraphData,
  GraphNode,
  GraphEdge,
  VaultStats,
} from '../types/index.js';
import { Storage } from './storage.js';
import { parseMemory, serializeMemory } from './parser.js';
import { extractWikiLinks, slugify, resolveWikiLinksToIds } from './linker.js';

interface SaveInput {
  name: string;
  type: MemoryType;
  content: string;
  tags?: string[];
  explicitLinks?: string[];
}

interface SearchResult extends Memory {
  score: number;
}

interface ListFilters {
  type?: MemoryType;
  tags?: string[];
  sort?: 'created' | 'updated' | 'name' | 'links';
  limit?: number;
}

interface SearchFilters {
  type?: MemoryType;
  tags?: string[];
  limit?: number;
}

export class Vault {
  private storage: Storage;
  private memories: Map<string, Memory> = new Map();
  private nameIndex: Map<string, string> = new Map();
  private slugIndex: Map<string, string> = new Map();
  private fuseIndex: Fuse<Memory>;

  constructor(vaultPath: string) {
    this.storage = new Storage(vaultPath);
    this.fuseIndex = this.buildFuseIndex([]);
  }

  async initialize(): Promise<void> {
    await this.storage.ensureVault();
    const files = await this.storage.listFiles();

    for (const filePath of files) {
      try {
        const raw = await this.storage.readFile(filePath);
        const memory = parseMemory(raw, filePath);
        this.indexMemory(memory);
      } catch {
        // Skip malformed files
      }
    }

    this.rebuildFuseIndex();
  }

  async save(input: SaveInput): Promise<Memory> {
    const existingId = this.nameIndex.get(input.name.toLowerCase());
    const existing = existingId ? this.memories.get(existingId) : undefined;

    const now = new Date().toISOString();
    const id = existing?.id ?? crypto.randomUUID();
    const slug = existing?.slug ?? slugify(input.name);

    const wikiLinkNames = extractWikiLinks(input.content);
    const wikiLinkIds = resolveWikiLinksToIds(wikiLinkNames, this.nameIndex);

    const allLinks = Array.from(
      new Set([...(input.explicitLinks ?? []), ...wikiLinkIds])
    );

    const memory: Memory = {
      id,
      name: input.name,
      type: input.type,
      tags: input.tags ?? [],
      created: existing?.created ?? now,
      updated: now,
      links: allLinks,
      content: input.content,
      slug,
      filePath: this.storage.slugToPath(slug),
    };

    if (existing) {
      await this.removeBidirectionalLinks(existing.id, existing.links);
    }

    await this.persistMemory(memory);
    await this.addBidirectionalLinks(memory.id, allLinks);

    return memory;
  }

  async get(idOrNameOrSlug: string): Promise<Memory | undefined> {
    if (this.memories.has(idOrNameOrSlug)) {
      return this.memories.get(idOrNameOrSlug);
    }

    const byName = this.nameIndex.get(idOrNameOrSlug.toLowerCase());
    if (byName) return this.memories.get(byName);

    const bySlug = this.slugIndex.get(idOrNameOrSlug);
    if (bySlug) return this.memories.get(bySlug);

    return undefined;
  }

  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    if (!query.trim()) return [];

    let results = this.fuseIndex
      .search(query)
      .map(({ item, score }) => ({ ...item, score: 1 - (score ?? 1) }));

    if (filters?.type) {
      results = results.filter((r) => r.type === filters.type);
    }

    if (filters?.tags && filters.tags.length > 0) {
      results = results.filter((r) =>
        filters.tags!.some((tag) => r.tags.includes(tag))
      );
    }

    if (filters?.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  async list(filters?: ListFilters): Promise<Memory[]> {
    let memories = Array.from(this.memories.values());

    if (filters?.type) {
      memories = memories.filter((m) => m.type === filters.type);
    }

    if (filters?.tags && filters.tags.length > 0) {
      memories = memories.filter((m) =>
        filters.tags!.some((tag) => m.tags.includes(tag))
      );
    }

    const sort = filters?.sort ?? 'updated';
    memories.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'created') return b.created.localeCompare(a.created);
      if (sort === 'links') return b.links.length - a.links.length;
      return b.updated.localeCompare(a.updated);
    });

    if (filters?.limit) {
      memories = memories.slice(0, filters.limit);
    }

    return memories;
  }

  async delete(idOrNameOrSlug: string): Promise<boolean> {
    const memory = await this.get(idOrNameOrSlug);
    if (!memory) return false;

    await this.removeBidirectionalLinks(memory.id, memory.links);

    this.memories.delete(memory.id);
    this.nameIndex.delete(memory.name.toLowerCase());
    this.slugIndex.delete(memory.slug);

    await this.storage.deleteFile(memory.filePath);
    this.rebuildFuseIndex();

    return true;
  }

  getGraphData(): GraphData {
    const nodes: GraphNode[] = [];
    const edgeMap = new Map<string, GraphEdge>();

    for (const memory of this.memories.values()) {
      nodes.push({
        id: memory.id,
        name: memory.name,
        type: memory.type,
        tags: memory.tags,
        linkCount: memory.links.length,
        created: memory.created,
      });
    }

    for (const memory of this.memories.values()) {
      for (const targetId of memory.links) {
        if (!this.memories.has(targetId)) continue;

        const forwardKey = `${memory.id}:${targetId}`;
        const reverseKey = `${targetId}:${memory.id}`;

        if (edgeMap.has(reverseKey)) {
          const existing = edgeMap.get(reverseKey)!;
          existing.bidirectional = true;
        } else if (!edgeMap.has(forwardKey)) {
          edgeMap.set(forwardKey, {
            source: memory.id,
            target: targetId,
            bidirectional: false,
          });
        }
      }
    }

    return { nodes, edges: Array.from(edgeMap.values()) };
  }

  getStats(): VaultStats {
    const memories = Array.from(this.memories.values());

    const byType = { user: 0, feedback: 0, project: 0, reference: 0, note: 0 };
    const tagCounts = new Map<string, number>();

    for (const memory of memories) {
      byType[memory.type]++;
      for (const tag of memory.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }

    const totalLinks = memories.reduce((sum, m) => sum + m.links.length, 0);

    const mostLinked = memories
      .map((m) => ({ id: m.id, name: m.name, count: m.links.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const recentlyUpdated = memories
      .sort((a, b) => b.updated.localeCompare(a.updated))
      .slice(0, 5)
      .map((m) => ({ id: m.id, name: m.name, updated: m.updated }));

    const topTags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total: memories.length,
      byType,
      totalLinks,
      mostLinked,
      recentlyUpdated,
      topTags,
    };
  }

  private indexMemory(memory: Memory): void {
    this.memories.set(memory.id, memory);
    this.nameIndex.set(memory.name.toLowerCase(), memory.id);
    this.slugIndex.set(memory.slug, memory.id);
  }

  private buildFuseIndex(list: Memory[]): Fuse<Memory> {
    return new Fuse(list, {
      keys: ['name', 'tags', 'content'],
      includeScore: true,
      threshold: 0.4,
      useExtendedSearch: true,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
  }

  private rebuildFuseIndex(): void {
    this.fuseIndex = this.buildFuseIndex(Array.from(this.memories.values()));
  }

  private async persistMemory(memory: Memory): Promise<void> {
    const serialized = serializeMemory(memory);
    await this.storage.writeFile(memory.filePath, serialized);
    this.indexMemory(memory);
    this.rebuildFuseIndex();
  }

  private async addBidirectionalLinks(sourceId: string, targetIds: string[]): Promise<void> {
    for (const targetId of targetIds) {
      const target = this.memories.get(targetId);
      if (!target || target.links.includes(sourceId)) continue;

      const updated: Memory = {
        ...target,
        links: [...target.links, sourceId],
        updated: new Date().toISOString(),
      };
      await this.persistMemory(updated);
    }
  }

  private async removeBidirectionalLinks(sourceId: string, targetIds: string[]): Promise<void> {
    for (const targetId of targetIds) {
      const target = this.memories.get(targetId);
      if (!target) continue;

      const updated: Memory = {
        ...target,
        links: target.links.filter((id) => id !== sourceId),
        updated: new Date().toISOString(),
      };
      await this.persistMemory(updated);
    }
  }
}
