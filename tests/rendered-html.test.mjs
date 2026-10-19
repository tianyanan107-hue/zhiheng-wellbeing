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
  assert.match(html, /测焦虑症状 GAD-7/);
  assert.match(html, /每日状态打卡/);
  assert.match(html, /状态仪表盘/);
  assert.match(html, /导出 JSON/);
  assert.match(html, /睡眠困扰 ISI/);
  assert.match(html, /感知压力/);
  assert.match(html, /生活习惯问卷/);
  assert.match(html, /运行智能体/);
  assert.match(html, /智能体如何工作/);
  assert.match(html, /匿名、可导出、可删除/);
  assert.match(html, /不提供疾病诊断/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|Starter Project/);
});
