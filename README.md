# clawmem-mcp-server

[![npm](https://img.shields.io/npm/v/clawmem-mcp-server.svg)](https://www.npmjs.com/package/clawmem-mcp-server)

Stdio MCP server that powers the ClawMem durable-memory tools. Used by both the ClawMem [Claude Code](https://github.com/clawmem-ai/clawmem-claude-code-plugin) and [Codex](https://github.com/clawmem-ai/clawmem-codex-plugin) plugins, and runnable directly from any MCP-capable client.

ClawMem treats a GitHub-compatible backend (default `git.clawmem.ai`) as a memory store: `type:memory` issues are durable memories, `type:conversation` issues are session transcripts. The server auto-bootstraps an agent identity and a default repo on first tool call — no signup or API key required.

## Use with Codex

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.clawmem]
command = "npx"
args = ["-y", "clawmem-mcp-server"]
env = { CLAWMEM_AGENT_PREFIX = "codex", CLAWMEM_STATE_DIR = "~/.local/state/clawmem" }
```

Restart Codex. For best results also drop the [recommended `AGENTS.md` snippet](https://github.com/clawmem-ai/clawmem-codex-plugin#recommended-install-one-toml-stanza) into your project.

## Use with Claude Code

Don't configure this directly — install [clawmem-claude-code-plugin](https://github.com/clawmem-ai/clawmem-claude-code-plugin) instead. It bundles hooks (auto-recall, conversation mirroring) that this raw MCP server alone can't provide.

## Use with any other MCP client

Any client that accepts stdio MCP servers can launch this one:

```json
{
  "mcpServers": {
    "clawmem": {
      "command": "npx",
      "args": ["-y", "clawmem-mcp-server"]
    }
  }
}
```

## Configuration (env vars)

All optional.

| Env var | Default | Purpose |
| --- | --- | --- |
| `CLAWMEM_BASE_URL` | `https://git.clawmem.ai/api/v3` | ClawMem API base. |
| `CLAWMEM_STATE_DIR` | `~/.local/state/clawmem` (or `.data-dev/` in-repo for local dev) | Where token + route state is persisted. `~` is expanded. |
| `CLAWMEM_AGENT_PREFIX` | `claude` | Prefix used when deriving the auto-provisioned agent login. Set to `codex` when running inside Codex. |
| `CLAWMEM_DEFAULT_REPO_NAME` | `memory` | Name of the auto-provisioned default repo. |
| `CLAWMEM_TOKEN` | — | Override the persisted token (useful for testing with a specific identity). |
| `CLAWMEM_MEMORY_RECALL_LIMIT` | `5` | Default recall page size (1–20). |

## Tools

~38 tools across three groups:

- **Memory**: `memory_recall`, `memory_store`, `memory_update`, `memory_forget`, `memory_list`, `memory_get`, `memory_repos`, `memory_repo_create`, `memory_repo_set_default`, `memory_labels`, `memory_console`.
- **Issue / repo CRUD**: thin wrappers over the GitHub-compatible API for agents that need richer access.
- **Collaboration (F1/F2/F3)**: invites, repo access inspection, team membership. All writes require `confirmed=true`.

Tool schemas are defined at the top of [`mcp/server.js`](mcp/server.js).

## Development

```sh
npm test                             # node --test test/*.test.js
node mcp/server.js                   # run the MCP server directly (stdio)
CLAWMEM_BASE_URL=http://127.0.0.1:4003/api/v3 node mcp/server.js
```

## License

MIT
