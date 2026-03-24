import matter from 'gray-matter';
import path from 'path';
import type { Memory, MemoryType } from '../types/index.js';

export function parseMemory(raw: string, filePath: string): Memory {
  const parsed = matter(raw);
  const data = parsed.data as Record<string, unknown>;
  const slug = path.basename(filePath, '.md');

  return {
    id: String(data['id'] ?? ''),
    name: String(data['name'] ?? ''),
    type: (data['type'] as MemoryType) ?? 'note',
    tags: Array.isArray(data['tags']) ? (data['tags'] as string[]) : [],
    created: String(data['created'] ?? new Date().toISOString()),
    updated: String(data['updated'] ?? new Date().toISOString()),
    links: Array.isArray(data['links']) ? (data['links'] as string[]) : [],
    content: parsed.content.trim(),
    slug,
    filePath,
  };
}

export function serializeMemory(memory: Memory): string {
  const frontmatter: Record<string, unknown> = {
    id: memory.id,
    name: memory.name,
    type: memory.type,
    tags: memory.tags,
    created: memory.created,
    updated: memory.updated,
    links: memory.links,
  };

  return matter.stringify(memory.content, frontmatter);
}
