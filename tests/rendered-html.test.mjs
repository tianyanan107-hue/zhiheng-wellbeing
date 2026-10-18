import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Zhiheng product page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /知衡/);
  assert.match(html, /认知与心理健康随访/);
  assert.match(html, /测幸福感 WHO-5/);
  assert.match(html, /测抑郁症状 PHQ-9/);
  assert.match(html, /不提供疾病诊断/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|Starter Project/);
});
