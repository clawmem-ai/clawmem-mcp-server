# clawmem-mcp-server

[![npm](https://img.shields.io/npm/v/clawmem-mcp-server.svg)](https://www.npmjs.com/package/clawmem-mcp-server)

Stdio MCP server that powers the ClawMem durable-memory tools. Used by both the ClawMem [Claude Code](https://github.com/clawmem-ai/clawmem-claude-code-plugin) and [Codex](https://github.com/clawmem-ai/clawmem-codex-plugin) plugins, and runnable directly from any MCP-capable client.

ClawMem treats a GitHub-compatible backend (default `git.clawmem.ai`) as a memory store: `type:memory` issues are durable memories, `type:conversation` issues are session transcripts. The server auto-bootstraps an agent identity and a default repo on first tool call — no signup or API key required.

## Use with Codex

Don't configure this directly unless you only want the raw MCP tools. Install [**clawmem-codex-plugin**](https://github.com/clawmem-ai/clawmem-codex-plugin) — it bundles the ClawMem behavior skill (teaches Codex *when* to recall / store / update / forget) and a `hooks.json` template that wires up auto-recall and conversation mirroring. That is the path you should recommend to users.

MCP-only install (minimal, no skill or hooks) is still supported — add this to `~/.codex/config.toml`:

```toml
[mcp_servers.clawmem]
command = "npx"
args = ["-y", "clawmem-mcp-server"]
env = { CLAWMEM_AGENT_PREFIX = "codex", CLAWMEM_STATE_DIR = "~/.local/state/clawmem" }
```

Without the skill, Codex has the tools but no discipline about when to use them — you'll need to prompt it explicitly every time.

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

## Releasing

Publishing to npm is automated. Pushing a `v*.*.*` tag triggers [`.github/workflows/publish.yml`](.github/workflows/publish.yml), which runs the test suite and then `npm publish --provenance --access public` using the `NPM_TOKEN` repo secret (an npm Automation token, so 2FA is bypassed in CI).

To cut a release:

```sh
npm version 0.1.3 -m "chore: release v0.1.3"   # bumps package.json, commits, tags v0.1.3
git push --follow-tags                          # pushes the commit AND the tag
```

The workflow refuses to publish if the tag version doesn't match `package.json`. Run logs: https://github.com/clawmem-ai/clawmem-mcp-server/actions

## License

MIT
