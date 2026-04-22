const test = require("node:test");
const assert = require("node:assert/strict");

const {
  conversationBody,
  createOrgInvitation,
  extractLabelNames,
  isManagedLabel,
  issueDetail,
  parseConversationBody
} = require("../lib/github");

test("issueDetail reads YAML block detail", () => {
  const body = "type: memory\ndetail: |-\n  prefers jq in shell e2e\n  and curl for simple API checks\n";
  assert.equal(issueDetail({ body }), "prefers jq in shell e2e\nand curl for simple API checks");
});

test("isManagedLabel recognizes managed prefixes and exacts", () => {
  assert.equal(isManagedLabel("type:memory"), true);
  assert.equal(isManagedLabel("status:active"), true);
  assert.equal(isManagedLabel("status:closed"), true);
  assert.equal(isManagedLabel("memory-status:stale"), true);
  assert.equal(isManagedLabel("kind:preference"), true);
  assert.equal(isManagedLabel("session:abc123"), true);
  assert.equal(isManagedLabel("date:2026-04-20"), true);
  assert.equal(isManagedLabel("topic:deploy"), true);
  assert.equal(isManagedLabel("agent:claude"), false);
  assert.equal(isManagedLabel("agent-type:general-purpose"), false);
  assert.equal(isManagedLabel("source:claude-code"), false);
  assert.equal(isManagedLabel("priority:high"), false);
  assert.equal(isManagedLabel(""), false);
});

test("extractLabelNames handles string and object entries", () => {
  assert.deepEqual(extractLabelNames(["type:memory", { name: "status:active" }, null, { name: "" }]), [
    "type:memory",
    "status:active"
  ]);
  assert.deepEqual(extractLabelNames(undefined), []);
});

test("createOrgInvitation translates friendly roles to backend values", async () => {
  const captured = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    captured.push({ url: String(url), body: init && init.body ? JSON.parse(init.body) : null });
    return new Response(JSON.stringify({ id: 1 }), { status: 201, headers: { "Content-Type": "application/json" } });
  };
  try {
    const route = { baseUrl: "https://api.example/api/v3", token: "t" };
    await createOrgInvitation(route, "acme", { inviteeLogin: "zequan", role: "member" });
    await createOrgInvitation(route, "acme", { inviteeLogin: "carol", role: "owner" });
    await createOrgInvitation(route, "acme", { inviteeLogin: "dan" }); // default
    await createOrgInvitation(route, "acme", { inviteeLogin: "eve", role: "direct_member" }); // pass-through
    await createOrgInvitation(route, "acme", { inviteeLogin: "frank", role: "billing_manager" }); // pass-through
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(captured[0].body.role, "direct_member");
  assert.equal(captured[1].body.role, "admin");
  assert.equal(captured[2].body.role, "direct_member");
  assert.equal(captured[3].body.role, "direct_member");
  assert.equal(captured[4].body.role, "billing_manager");
  // All hit the invitations endpoint
  for (const c of captured) {
    assert.match(c.url, /\/orgs\/acme\/invitations$/);
  }
});

test("conversationBody + parseConversationBody round-trip", () => {
  const body = conversationBody({
    sessionId: "abcd-1234",
    openedAt: "2026-04-20T10:00:00Z",
    title: "Claude Session abcd1234",
    date: "2026-04-20",
    lastActivity: "2026-04-20T11:00:00Z",
    summary: "line one\nline two"
  });
  const parsed = parseConversationBody(body);
  assert.equal(parsed.type, "conversation");
  assert.equal(parsed.session_id, "abcd-1234");
  assert.equal(parsed.status, "active");
  assert.equal(parsed.opened_at, "2026-04-20T10:00:00Z");
  assert.equal(parsed.title, "Claude Session abcd1234");
  assert.equal(parsed.date, "2026-04-20");
  assert.equal(parsed.last_activity, "2026-04-20T11:00:00Z");
  assert.equal(parsed.summary, "line one\nline two");
});
