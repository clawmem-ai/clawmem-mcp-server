# clawmem-mcp-server

Stdio MCP server that powers the ClawMem durable-memory tools. Shared by:

- [clawmem-claude-code-plugin](https://github.com/clawmem-ai/clawmem-claude-code-plugin)
- [clawmem-codex-plugin](https://github.com/clawmem-ai/clawmem-codex-plugin)

ClawMem treats a GitHub-compatible backend (default `git.clawmem.ai`) as a memory store: `type:memory` issues are durable memories, `type:conversation` issues are session transcripts. This server exposes the memory / issue / collaboration tools over MCP stdio.

## Install

No install step for end users — the plugin bundles reference this repo via `npx`:

```json
{
  "mcpServers": {
    "clawmem": {
      "command": "npx",
      "args": ["-y", "github:clawmem-ai/clawmem-mcp-server"]
    }
  }
}
```

`npx` fetches and caches the repo on first launch. Subsequent runs are local.

## Configuration (env vars)

All optional — the server auto-bootstraps an agent identity and default repo on first tool call.

| Env var | Default | Purpose |
| --- | --- | --- |
| `CLAWMEM_BASE_URL` | `https://git.clawmem.ai/api/v3` | ClawMem API base. |
| `CLAWMEM_STATE_DIR` | `~/.local/state/clawmem` (or `.data-dev/` for local dev) | Where token + route state is persisted. `~` is expanded. |
| `CLAWMEM_AGENT_PREFIX` | `claude` | Prefix used when deriving the auto-provisioned agent login. Set to `codex` from the Codex bundle. |
| `CLAWMEM_DEFAULT_REPO_NAME` | `memory` | Name of the auto-provisioned default repo. |
| `CLAWMEM_TOKEN` | — | Override the persisted token (useful for testing with a specific identity). |
| `CLAWMEM_MEMORY_RECALL_LIMIT` | `5` | Default recall page size (1–20). |

## Tools

The server exposes ~38 tools across three groups:

- **Memory**: `memory_recall`, `memory_store`, `memory_update`, `memory_forget`, `memory_list`, `memory_repos`, `memory_console`.
- **Issue / repo CRUD**: thin wrappers over the GitHub-compatible API for agents that need richer access.
- **Collaboration (F1/F2/F3)**: invites, repo access inspection, team membership. All writes require `confirmed=true`.

Tool schemas are defined at the top of [`mcp/server.js`](mcp/server.js).

## Development

```sh
npm test                             # node --test test/*.test.js
node mcp/server.js                   # run the MCP server directly (stdio)
CLAWMEM_BASE_URL=http://127.0.0.1:4003/api/v3 node mcp/server.js
```

## Relationship to the plugin repos

The shared runtime lives here (`mcp/` + `lib/`). Each plugin repo contributes only its surface-specific pieces:

- `clawmem-claude-code-plugin` → hooks, Claude Code skill, marketplace manifest.
- `clawmem-codex-plugin` → `.codex-plugin/` manifest, Codex skill, marketplace manifest.

Both plugin repos invoke this server over stdio via `npx`.
