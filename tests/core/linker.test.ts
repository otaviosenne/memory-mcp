import { describe, it, expect } from 'vitest';
import {
  extractWikiLinks,
  slugify,
  resolveWikiLinksToIds,
} from '../../src/core/linker.js';

describe('extractWikiLinks', () => {
  it('finds [[Name]] patterns', () => {
    const links = extractWikiLinks('See [[Project Alpha]] for details.');
    expect(links).toEqual(['Project Alpha']);
  });

  it('returns empty array when no links', () => {
    expect(extractWikiLinks('No links here.')).toEqual([]);
  });

  it('handles multiple links in content', () => {
    const links = extractWikiLinks('[[Alpha]] and [[Beta]] and [[Gamma]].');
    expect(links).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('trims whitespace inside brackets', () => {
    const links = extractWikiLinks('[[ Spaced Name ]]');
    expect(links).toEqual(['Spaced Name']);
  });
});

describe('slugify', () => {
  it('converts spaces to hyphens', () => {
    expect(slugify('My Memory Name')).toBe('my-memory-name');
  });

  it('lowercases the string', () => {
    expect(slugify('UPPERCASE')).toBe('uppercase');
  });

  it('handles accented characters', () => {
    expect(slugify('café résumé')).toBe('cafe-resume');
  });

  it('removes special characters', () => {
    expect(slugify('hello! world@2024')).toBe('hello-world2024');
  });

  it('collapses multiple hyphens', () => {
    expect(slugify('foo  bar   baz')).toBe('foo-bar-baz');
  });
});

describe('resolveWikiLinksToIds', () => {
  const nameToId = new Map([
    ['project alpha', 'id-alpha'],
    ['beta memory', 'id-beta'],
  ]);

  it('resolves known names to IDs', () => {
    const ids = resolveWikiLinksToIds(['Project Alpha', 'Beta Memory'], nameToId);
    expect(ids).toEqual(['id-alpha', 'id-beta']);
  });

  it('skips unknown names', () => {
    const ids = resolveWikiLinksToIds(['Unknown Name'], nameToId);
    expect(ids).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(resolveWikiLinksToIds([], nameToId)).toEqual([]);
  });
});
