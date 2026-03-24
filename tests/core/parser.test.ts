import { describe, it, expect } from 'vitest';
import { parseMemory, serializeMemory } from '../../src/core/parser.js';
import type { Memory } from '../../src/types/index.js';

const FIXTURE_PATH = '/tmp/vault/test-memory.md';

describe('parseMemory', () => {
  it('parses valid frontmatter and content', () => {
    const raw = `---
id: abc-123
name: Test Memory
type: note
tags:
  - foo
  - bar
created: "2024-01-01T00:00:00.000Z"
updated: "2024-01-02T00:00:00.000Z"
links:
  - link-id-1
---
This is the content.
`;
    const memory = parseMemory(raw, FIXTURE_PATH);
    expect(memory.id).toBe('abc-123');
    expect(memory.name).toBe('Test Memory');
    expect(memory.type).toBe('note');
    expect(memory.tags).toEqual(['foo', 'bar']);
    expect(memory.links).toEqual(['link-id-1']);
    expect(memory.content).toBe('This is the content.');
    expect(memory.slug).toBe('test-memory');
    expect(memory.filePath).toBe(FIXTURE_PATH);
  });

  it('defaults tags and links to empty arrays when missing', () => {
    const raw = `---
id: xyz
name: Minimal
type: user
created: "2024-01-01T00:00:00.000Z"
updated: "2024-01-01T00:00:00.000Z"
---
Content here.
`;
    const memory = parseMemory(raw, FIXTURE_PATH);
    expect(memory.tags).toEqual([]);
    expect(memory.links).toEqual([]);
  });

  it('handles empty content body', () => {
    const raw = `---
id: empty
name: Empty Content
type: note
tags: []
created: "2024-01-01T00:00:00.000Z"
updated: "2024-01-01T00:00:00.000Z"
links: []
---
`;
    const memory = parseMemory(raw, FIXTURE_PATH);
    expect(memory.content).toBe('');
  });

  it('round-trips: serialize then parse produces same result', () => {
    const original: Memory = {
      id: 'round-trip-id',
      name: 'Round Trip',
      type: 'project',
      tags: ['a', 'b'],
      created: '2024-03-01T10:00:00.000Z',
      updated: '2024-03-02T10:00:00.000Z',
      links: ['other-id'],
      content: 'Hello **world**.',
      slug: 'round-trip',
      filePath: FIXTURE_PATH,
    };

    const serialized = serializeMemory(original);
    const parsed = parseMemory(serialized, FIXTURE_PATH);

    expect(parsed.id).toBe(original.id);
    expect(parsed.name).toBe(original.name);
    expect(parsed.type).toBe(original.type);
    expect(parsed.tags).toEqual(original.tags);
    expect(parsed.links).toEqual(original.links);
    expect(parsed.content).toBe(original.content);
    expect(parsed.created).toBe(original.created);
    expect(parsed.updated).toBe(original.updated);
  });
});
