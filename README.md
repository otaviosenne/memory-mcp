# memory-mcp

> Personal memory MCP server for Claude Code with an Obsidian-style interactive graph.

![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-lightgrey)
![Tests](https://img.shields.io/badge/Tests-96%25%20coverage-brightgreen)

Persistent, queryable memory across Claude Code sessions. Memories are plain Markdown files with YAML frontmatter. Wiki-links (`[[Memory Name]]`) create bidirectional connections visualized in a D3.js force-directed graph at `localhost:4242`.

---

## Screenshot

> _(graph UI screenshot here)_

---

## Features

- **8 MCP tools** — save, read, search, list, delete, graph data, stats, open graph
- **D3.js force-directed graph** — Obsidian-style visual graph of all memories and their connections
- **Wiki-links** — `[[Memory Name]]` in content auto-creates bidirectional links
- **Fuzzy search** — powered by Fuse.js, searches name, content, and tags
- **5 memory types** — each rendered as a distinct color in the graph
- **Plain Markdown storage** — memories are `.md` files with YAML frontmatter, readable without any tooling
- **Web UI at `localhost:4242`** — search, type filters, node click opens a sidebar with rendered Markdown
- **96% test coverage** — Vitest, isolated per module with temp vault directories

---

## Quick Start

```bash
git clone https://github.com/otaviosenne/memory-mcp
cd memory-mcp
npm install
npm run build
```

Add to Claude Code's `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "memory-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/memory-mcp/dist/index.js"],
      "env": {
        "MEMORY_VAULT_PATH": "~/.local/share/memory-mcp/vault",
        "MEMORY_WEB_PORT": "4242"
      }
    }
  }
}
```

Restart Claude Code. The MCP server starts automatically with the session.

---

## MCP Tools

| Tool | Description |
|------|-------------|
| `memory_save` | Create or update a memory by name |
| `memory_read` | Read a single memory by ID or name |
| `memory_search` | Fuzzy search across name, content, and tags |
| `memory_list` | List all memories, optionally filtered by type |
| `memory_delete` | Delete a memory by ID |
| `memory_graph_data` | Return all nodes and edges for graph rendering |
| `memory_stats` | Count memories by type, total links, vault size |
| `memory_open_graph` | Open the web UI in the default browser |

### Example: `memory_save`

Input:
```json
{
  "name": "Chrome Agent MCP",
  "type": "project",
  "content": "Browser automation MCP using Chrome DevTools Protocol. Built on [[memory-mcp]] for session context.",
  "tags": ["mcp", "typescript", "chrome"]
}
```

Output:
```json
{
  "id": "a1b2c3d4-...",
  "name": "Chrome Agent MCP",
  "type": "project",
  "links": ["<uuid-of-memory-mcp>"],
  "created": "2026-03-24T10:00:00.000Z"
}
```

### Example: `memory_search`

Input:
```json
{ "query": "typescript mcp" }
```

Output: array of matching memories, sorted by relevance score.

### Example: `memory_stats`

Output:
```json
{
  "total": 24,
  "byType": { "project": 10, "user": 5, "feedback": 4, "reference": 3, "note": 2 },
  "totalLinks": 38
}
```

---

## Memory Types

| Type | Graph Color | When to Use |
|------|------------|-------------|
| `user` | Green | Personal info, preferences, skills, background |
| `project` | Blue | Project decisions, tech stack, current status, constraints |
| `feedback` | Yellow | Corrections and confirmed patterns ("don't do X", "yes, exactly like this") |
| `reference` | Pink | External resources, accounts, tools, links |
| `note` | Gray | General context that doesn't fit other types |

---

## Wiki-links

Use `[[Memory Name]]` syntax anywhere in a memory's content to reference another memory by exact name.

```markdown
This project depends on [[memory-mcp]] for persistent context across sessions.
The architecture follows the patterns described in [[SOLID Design Principles]].
```

Links are resolved at save time. Both the source and target memory store the connection — the graph is always bidirectional. If the target memory does not exist yet, the link is stored as unresolved and re-evaluated when the target is created.

---

## Graph UI

Open `localhost:4242` while the MCP server is running (or call `memory_open_graph`).

- **Node size** scales with connection count — highly-linked memories appear larger
- **Node color** maps to memory type
- **Click a node** to open a sidebar with the full Markdown content, rendered
- **Search bar** filters nodes by name or tag in real time
- **Type toggles** show or hide entire memory types
- **Zoom and pan** are supported via D3 zoom behavior

The graph updates live — refresh the page to reflect new memories.

---

## Claude Code Skill: `/save-memories`

At the end of a session, run `/save-memories` to extract and persist meaningful context automatically.

The skill reviews the conversation and decides what is worth saving. It skips trivial fixes and ephemeral tasks — it only saves things that would be genuinely useful in a future session.

**`~/.claude/skills/save-memories/SKILL.md`:**

```markdown
---
name: save-memories
description: Analyze the current conversation and save meaningful memories to the personal memory vault. Use at the end of any session where something worth remembering was discussed — new projects, preferences revealed, corrections made, important context.
user-invocable: true
---

# Save Memories

Analyze the current conversation and save relevant memories to the vault at `/home/senne/.local/share/memory-mcp/vault/`.

## Step 1 — Review the conversation

Read back through what was discussed. Ask: what here would be useful to know in a future conversation that isn't already obvious from the code?

## Step 2 — Decide what to save

Only save if it reveals:

| Type | Save when |
|------|-----------|
| `user` | Personal info, skills, preferences, opinions, background |
| `feedback` | Corrections ("not like that"), confirmed patterns ("yes, exactly") |
| `project` | Project decisions, stack, current status, key constraints |
| `reference` | External resources, accounts, tools, links, credentials context |
| `note` | Important context that doesn't fit other types |

**Skip:** trivial bug fixes, ephemeral tasks, things obvious from the code, duplicates.

## Step 3 — Save each memory

For each memory, run:

```bash
node -e "
import('/path/to/memory-mcp/dist/core/vault.js').then(async ({ Vault }) => {
  const vault = new Vault('/path/to/vault');
  await vault.initialize();
  const saved = await vault.save({
    name: 'MEMORY NAME',
    type: 'project',
    content: 'Content here. Use [[Other Memory Name]] to link related memories.',
    tags: ['tag1', 'tag2'],
  });
  console.log('Saved:', saved.name, '| links:', saved.links.length);
  process.exit(0);
});
" 2>/dev/null
```

Use `[[wiki-links]]` in content to connect related memories. The exact name must match an existing memory name.

## Step 4 — Report

After saving, briefly list what was saved and why. Keep it to one line per memory.
```

---

## Architecture

```
src/
├── index.ts              # MCP server entry point, tool registration
├── types/index.ts        # All TypeScript types and interfaces
├── core/
│   ├── storage.ts        # File I/O abstraction (read, write, delete, list)
│   ├── parser.ts         # Frontmatter parsing and serialization (gray-matter)
│   ├── linker.ts         # Wiki-link extraction and bidirectional resolution
│   └── vault.ts          # Orchestrator: CRUD, search, graph, stats
├── tools/                # 8 MCP tool handlers, one file per tool
└── web/
    ├── server.ts         # Express REST API serving graph data
    └── public/index.html # D3.js graph UI, single-file, no build step
```

Each module has one responsibility. The `Vault` class composes `Storage`, `Parser`, and `Linker` — it does not implement any of their logic directly.

---

## Tech Stack

| Package | Role |
|---------|------|
| `@modelcontextprotocol/sdk` | MCP server protocol |
| `d3` v7 | Force-directed graph in the browser |
| `express` | REST API for the web UI |
| `gray-matter` | YAML frontmatter parsing |
| `fuse.js` | Fuzzy search |
| `zod` | Tool input validation |
| `vitest` | Tests (96% coverage) |
| TypeScript strict mode | Type safety throughout |

---

## Code Patterns & SOLID

The codebase applies SOLID principles throughout:

**Single Responsibility** — each module does exactly one thing. `Storage` handles file I/O. `Parser` handles Markdown/frontmatter. `Linker` handles wiki-link extraction and resolution. `Vault` orchestrates them.

**Open/Closed** — new memory types can be added by extending the `MemoryType` union in `types/index.ts`. No core logic changes.

**Dependency Inversion** — `Vault` depends on the `Storage` and `Parser` interfaces, not their concrete implementations. This makes the core fully testable with mock implementations.

**Small files** — every file stays under 100 lines. No file mixes concerns.

No comments in the source — names are the documentation. No magic numbers — all constants are named. All code is in English.

---

## Testing

```bash
npm test               # run all tests
npm run test:coverage  # coverage report (target: 70%+, actual: 96%)
```

Tests live in `tests/`, mirroring `src/`:

```
tests/
├── core/
│   ├── storage.test.ts
│   ├── parser.test.ts
│   ├── linker.test.ts
│   └── vault.test.ts
└── tools/
    └── *.test.ts
```

Each test suite creates a temporary vault directory and tears it down after. No shared state between tests.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MEMORY_VAULT_PATH` | `~/.local/share/memory-mcp/vault` | Directory where memory `.md` files are stored |
| `MEMORY_WEB_PORT` | `4242` | Port for the graph web UI |

---

## Memory File Format

Each memory is stored as a `.md` file with YAML frontmatter:

```markdown
---
id: a1b2c3d4-e5f6-7890-abcd-ef1234567890
name: Chrome Agent MCP
type: project
tags:
  - mcp
  - typescript
  - chrome
created: 2026-03-24T10:00:00.000Z
updated: 2026-03-24T10:00:00.000Z
links:
  - b2c3d4e5-f6a7-8901-bcde-f12345678901
---

Browser automation MCP using Chrome DevTools Protocol.
Built on [[memory-mcp]] for persistent session context.
Supports screenshot, click, fill, scroll, and JS evaluation.
```

Files are human-readable and can be edited directly. The `links` array is managed automatically by the linker — manual edits to `links` are valid but wiki-links in content take precedence on next save.

---

## License

MIT
