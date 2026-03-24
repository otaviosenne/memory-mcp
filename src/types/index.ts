export type MemoryType = 'user' | 'feedback' | 'project' | 'reference' | 'note';

export interface MemoryFrontmatter {
  id: string;
  name: string;
  type: MemoryType;
  tags: string[];
  created: string;
  updated: string;
  links: string[];
}

export interface Memory extends MemoryFrontmatter {
  content: string;
  slug: string;
  filePath: string;
}

export interface GraphNode {
  id: string;
  name: string;
  type: MemoryType;
  tags: string[];
  linkCount: number;
  created: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  bidirectional: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface VaultStats {
  total: number;
  byType: Record<MemoryType, number>;
  totalLinks: number;
  mostLinked: Array<{ id: string; name: string; count: number }>;
  recentlyUpdated: Array<{ id: string; name: string; updated: string }>;
  topTags: Array<{ tag: string; count: number }>;
}
