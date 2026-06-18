const test = require("node:test");
const assert = require("node:assert/strict");

const {
  deriveConsoleBaseUrl,
  normalizeApiBaseUrl,
  resolveBaseUrl,
  resolveConsoleBaseUrl,
  resolveMemoryAutoRecallPlannerVariantLimit,
  resolveMemoryAutoRecallStrategy
} = require("../lib/config");

test("normalizeApiBaseUrl defaults to the hosted ClawMem API", () => {
  assert.equal(normalizeApiBaseUrl(""), "https://git.clawmem.ai/api/v3");
});

test("normalizeApiBaseUrl appends /api/v3 when missing", () => {
  assert.equal(normalizeApiBaseUrl("http://127.0.0.1:4003"), "http://127.0.0.1:4003/api/v3");
});

test("normalizeApiBaseUrl preserves existing /api/v3 suffix", () => {
  assert.equal(normalizeApiBaseUrl("http://127.0.0.1:4003/api/v3"), "http://127.0.0.1:4003/api/v3");
});

test("deriveConsoleBaseUrl maps git.<host> to console.<host>", () => {
  assert.equal(deriveConsoleBaseUrl("https://git.clawmem.ai/api/v3"), "https://console.clawmem.ai");
  assert.equal(deriveConsoleBaseUrl("https://git.staging.clawmem.ai/api/v3"), "https://console.staging.clawmem.ai");
});

test("deriveConsoleBaseUrl falls back to localhost:5173 for loopback", () => {
  assert.equal(deriveConsoleBaseUrl("http://127.0.0.1:4003/api/v3"), "http://localhost:5173");
  assert.equal(deriveConsoleBaseUrl("http://localhost:4003/api/v3"), "http://localhost:5173");
});

test("resolveConsoleBaseUrl honors CLAWMEM_CONSOLE_BASE_URL override", () => {
  const prev = process.env.CLAWMEM_CONSOLE_BASE_URL;
  process.env.CLAWMEM_CONSOLE_BASE_URL = "https://c.example.com/";
  try {
    assert.equal(resolveConsoleBaseUrl(), "https://c.example.com");
  } finally {
    if (prev === undefined) delete process.env.CLAWMEM_CONSOLE_BASE_URL;
    else process.env.CLAWMEM_CONSOLE_BASE_URL = prev;
  }
});

test("resolveBaseUrl accepts CLAWMEM_GIT_BASE_URL and normalizes it", () => {
  const previousBase = process.env.CLAWMEM_BASE_URL;
  const previous = process.env.CLAWMEM_GIT_BASE_URL;
  delete process.env.CLAWMEM_BASE_URL;
  process.env.CLAWMEM_GIT_BASE_URL = "https://git.clawmem.ai";

  try {
    assert.equal(resolveBaseUrl(), "https://git.clawmem.ai/api/v3");
  } finally {
    if (previousBase === undefined) {
      delete process.env.CLAWMEM_BASE_URL;
    } else {
      process.env.CLAWMEM_BASE_URL = previousBase;
    }
    if (previous === undefined) {
      delete process.env.CLAWMEM_GIT_BASE_URL;
    } else {
      process.env.CLAWMEM_GIT_BASE_URL = previous;
    }
  }
});

test("resolveMemoryAutoRecallStrategy defaults to query-planner and accepts overrides", () => {
  const previousStrategy = process.env.CLAWMEM_MEMORY_AUTO_RECALL_STRATEGY;
  const previousOption = process.env.CLAUDE_PLUGIN_OPTION_memoryAutoRecallStrategy;
  try {
    delete process.env.CLAWMEM_MEMORY_AUTO_RECALL_STRATEGY;
    delete process.env.CLAUDE_PLUGIN_OPTION_memoryAutoRecallStrategy;
    assert.equal(resolveMemoryAutoRecallStrategy(), "query-planner");
    process.env.CLAWMEM_MEMORY_AUTO_RECALL_STRATEGY = "literal-repair";
    assert.equal(resolveMemoryAutoRecallStrategy(), "literal-repair");
    process.env.CLAWMEM_MEMORY_AUTO_RECALL_STRATEGY = "bogus";
    assert.equal(resolveMemoryAutoRecallStrategy(), "query-planner");
  } finally {
    if (previousStrategy === undefined) delete process.env.CLAWMEM_MEMORY_AUTO_RECALL_STRATEGY;
    else process.env.CLAWMEM_MEMORY_AUTO_RECALL_STRATEGY = previousStrategy;
    if (previousOption === undefined) delete process.env.CLAUDE_PLUGIN_OPTION_memoryAutoRecallStrategy;
    else process.env.CLAUDE_PLUGIN_OPTION_memoryAutoRecallStrategy = previousOption;
  }
});

test("resolveMemoryAutoRecallPlannerVariantLimit clamps overrides", () => {
  const previous = process.env.CLAWMEM_MEMORY_AUTO_RECALL_PLANNER_VARIANT_LIMIT;
  try {
    process.env.CLAWMEM_MEMORY_AUTO_RECALL_PLANNER_VARIANT_LIMIT = "99";
    assert.equal(resolveMemoryAutoRecallPlannerVariantLimit(), 6);
    process.env.CLAWMEM_MEMORY_AUTO_RECALL_PLANNER_VARIANT_LIMIT = "0";
    assert.equal(resolveMemoryAutoRecallPlannerVariantLimit(), 1);
  } finally {
    if (previous === undefined) delete process.env.CLAWMEM_MEMORY_AUTO_RECALL_PLANNER_VARIANT_LIMIT;
    else process.env.CLAWMEM_MEMORY_AUTO_RECALL_PLANNER_VARIANT_LIMIT = previous;
  }
});
