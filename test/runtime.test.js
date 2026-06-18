const test = require("node:test");
const assert = require("node:assert/strict");

const github = require("../lib/github");
const { formatRecallContext, recallWithContext } = require("../lib/runtime");

function memoryIssue(number, title, detail, labels = []) {
  return {
    number,
    title,
    state: "open",
    labels: ["type:memory", ...labels],
    body: [
      "## Memory",
      "",
      detail,
      "",
      "## Relations",
      "",
      "- Source: #1"
    ].join("\n")
  };
}

async function withPatchedGithub(patches, fn) {
  const original = {};
  for (const [key, value] of Object.entries(patches)) {
    original[key] = github[key];
    github[key] = value;
  }
  try {
    return await fn();
  } finally {
    for (const [key, value] of Object.entries(original)) github[key] = value;
  }
}

test("recallWithContext uses wiki issue refs as ranking hints", async () => {
  const fetchedIssues = [];
  const repo = "tester/memory";
  const route = { baseUrl: "https://api.example/api/v3", token: "secret" };

  await withPatchedGithub({
    searchIssues: async () => [
      memoryIssue(10, "Generic plugin note", "Generic plugin memory."),
      memoryIssue(99, "Codex plugin wiki recall", "Codex plugin recall should include wiki context maps.", ["kind:skill"])
    ],
    searchWikiPages: async () => [
      { slug: "codex-plugin-context", title: "Codex Plugin Context", snippet: "Codex plugin skill #99" }
    ],
    getWikiPage: async () => ({
      slug: "codex-plugin-context",
      title: "Codex Plugin Context",
      body: [
        "# Codex Plugin Context",
        "",
        "Codex plugin skill recall is anchored by #99.",
        "Visible non-memory references like #77 should not become memories.",
        "",
        "```",
        "ignored fenced reference #66",
        "```"
      ].join("\n")
    }),
    getIssue: async (_route, _repo, issueNumber) => {
      fetchedIssues.push(issueNumber);
      if (issueNumber === 99) {
        return memoryIssue(99, "Codex plugin wiki recall", "Codex plugin recall should include wiki context maps.", ["kind:skill"]);
      }
      if (issueNumber === 77) {
        return { number: 77, title: "Conversation", state: "open", labels: ["type:conversation"], body: "not a memory" };
      }
      throw new Error(`unexpected issue ${issueNumber}`);
    }
  }, async () => {
    const bundle = await recallWithContext(route, repo, "codex plugin skill", 1);
    assert.equal(bundle.memories.length, 1);
    assert.equal(bundle.memories[0].memoryId, "99");
    assert.deepEqual(bundle.memories[0].wikiAnchors, ["codex-plugin-context"]);
    assert.equal(bundle.wikiContexts.length, 1);
    assert.deepEqual(bundle.wikiContexts[0].issueRefs, ["#99", "#77"]);
    assert.ok(!bundle.wikiContexts[0].excerpt.includes("#66"));
    assert.deepEqual(fetchedIssues, [99, 77]);

    const formatted = formatRecallContext(bundle, repo);
    assert.match(formatted, /<clawmem-wiki-contexts>/);
    assert.match(formatted, /Wiki anchors: codex-plugin-context/);
    assert.doesNotMatch(formatted, /#66/);
  });
});

test("recallWithContext falls back to memory-only recall when wiki search fails", async () => {
  const repo = "tester/memory";
  const route = { baseUrl: "https://api.example/api/v3", token: "secret" };

  await withPatchedGithub({
    searchIssues: async () => [
      memoryIssue(12, "Memory only", "Memory-only recall remains available.")
    ],
    searchWikiPages: async () => {
      throw new Error("wiki unavailable");
    }
  }, async () => {
    const bundle = await recallWithContext(route, repo, "memory only", 3);
    assert.equal(bundle.memories.length, 1);
    assert.equal(bundle.memories[0].memoryId, "12");
    assert.deepEqual(bundle.wikiContexts, []);
  });
});

test("recallWithContext query-planner admits focused lexical matches", async () => {
  const searchCalls = [];
  const repo = "tester/memory";
  const route = { baseUrl: "https://api.example/api/v3", token: "secret" };

  await withPatchedGithub({
    searchIssues: async (_route, query, params) => {
      searchCalls.push({ query, params });
      if (!params.debug) return [];
      return [
        {
          ...memoryIssue(55, "Alice Sweden visit", "Alice visited Sweden in May 2026.", ["kind:fact"]),
          debug: { search_path: "hybrid", lexical_rank: 1 }
        }
      ];
    },
    searchWikiPages: async () => []
  }, async () => {
    const bundle = await recallWithContext(route, repo, "When did Alice first visit Sweden?", 1, {
      recallStrategy: "query-planner",
      plannerVariantLimit: 3
    });
    assert.equal(bundle.memories.length, 1);
    assert.equal(bundle.memories[0].memoryId, "55");
    assert.equal(bundle.memories[0].kind, "fact");
    assert.equal(searchCalls.length, 3);
    assert.equal(searchCalls[0].params.debug, false);
    assert.equal(searchCalls[1].params.debug, true);
  });
});
