const WIKI_LINK_PATTERN = /\[\[([^\]]+)\]\]/g;

export function extractWikiLinks(content: string): string[] {
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = WIKI_LINK_PATTERN.exec(content)) !== null) {
    const name = match[1];
    if (name) matches.push(name.trim());
  }

  WIKI_LINK_PATTERN.lastIndex = 0;
  return matches;
}

export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function resolveWikiLinksToIds(
  names: string[],
  nameToId: Map<string, string>
): string[] {
  return names
    .map((name) => nameToId.get(name.toLowerCase()))
    .filter((id): id is string => id !== undefined);
}
