const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const github = require("../lib/github");

function startMockServer(handler) {
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => { body += c; });
    req.on("end", () => {
      const reply = handler(req, body) || { status: 404, body: "{}" };
      res.writeHead(reply.status, { "Content-Type": "application/json" });
      res.end(reply.body || "");
    });
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

test("registerAgent falls back through legacy v3 before anonymous session", async () => {
  const calls = [];
  const server = await startMockServer((req) => {
    calls.push(req.url);
    if (req.url === "/api/ext/v1/agents" || req.url === "/api/v3/agents") {
      return { status: 404, body: "{}" };
    }
    if (req.url === "/api/v3/anonymous/session") {
      return {
        status: 201,
        body: JSON.stringify({
          login: "anon-xyz",
          token: "anon-token",
          owner_login: "anon-xyz",
          repo_name: "memory",
          repo_full_name: "anon-xyz/memory"
        })
      };
    }
    return { status: 404, body: "{}" };
  });
  try {
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;
    const route = await github.registerAgent({
      baseUrl,
      prefixLogin: "cc-proj",
      defaultRepoName: "memory"
    });
    assert.equal(route.token, "anon-token");
    assert.equal(route.defaultRepo, "anon-xyz/memory");
    assert.equal(route.bootstrapMethod, "/api/v3/anonymous/session");
    assert.deepEqual(calls, ["/api/ext/v1/agents", "/api/v3/agents", "/api/v3/anonymous/session"]);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("registerAgent uses the extension agent endpoint when available", async () => {
  const server = await startMockServer((req) => {
    if (req.url === "/api/ext/v1/agents") {
      return {
        status: 201,
        body: JSON.stringify({ login: "cc-proj-abc", token: "agent-token", repo_full_name: "cc-proj-abc/memory" })
      };
    }
    return { status: 404, body: "{}" };
  });
  try {
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;
    const route = await github.registerAgent({
      baseUrl,
      prefixLogin: "cc-proj",
      defaultRepoName: "memory"
    });
    assert.equal(route.token, "agent-token");
    assert.equal(route.defaultRepo, "cc-proj-abc/memory");
    assert.equal(route.baseUrl, `${baseUrl}/api/v3`);
    assert.equal(route.bootstrapMethod, "/api/ext/v1/agents");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("registerAgent propagates non-404/405/501 errors", async () => {
  const server = await startMockServer(() => ({ status: 500, body: "kapow" }));
  try {
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}/api/v3`;
    await assert.rejects(
      () => github.registerAgent({ baseUrl, prefixLogin: "cc-proj", defaultRepoName: "memory" }),
      /HTTP 500/
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
