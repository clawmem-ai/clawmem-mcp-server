const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const { upsertWikiPage } = require("../lib/github");

test("wiki writes use the extension API and preserve optimistic concurrency", async () => {
  let requestPath = "";
  let payload = null;
  const server = http.createServer((req, res) => {
    requestPath = req.url;
    let body = "";
    req.on("data", (chunk) => { body += String(chunk); });
    req.on("end", () => {
      payload = JSON.parse(body);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ slug: "projects/example", sha: "wiki-sha" }));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const { port } = server.address();
    const page = await upsertWikiPage(
      { baseUrl: `http://127.0.0.1:${port}/api/v3`, token: "secret" },
      "owner/memory",
      "projects/example",
      { body: "# Example\n\n- Source: #12", message: "Update context", sha: "previous-sha" }
    );
    assert.equal(requestPath, "/api/ext/v1/repos/owner/memory/wiki/pages/projects%2Fexample");
    assert.deepEqual(payload, {
      body: "# Example\n\n- Source: #12",
      message: "Update context",
      sha: "previous-sha"
    });
    assert.equal(page.sha, "wiki-sha");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
