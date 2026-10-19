import test from "node:test";
import assert from "node:assert/strict";
import { runChatAgent } from "../lib/chat-agent.ts";

const context = { assessmentCount: 4, dashboardDays: 7 as const, checkinCount: 5, isi: 17, pss10: 28, who5: 42, phq9: 11, averageSleep: 5.8, averageStress: 4.1, averageMood: 2.6 };

test("chat agent answers sleep questions with personal evidence", async () => {
  const result = await runChatAgent({ question: "我最近为什么总是睡不好？", context });
  assert.equal(result.category, "sleep");
  assert.match(result.answer, /ISI/);
  assert.equal(result.trace.length, 4);
});

test("chat agent blocks diagnosis and medication advice", async () => {
  const result = await runChatAgent({ question: "我是不是抑郁症，要不要自己吃药？", context });
  assert.equal(result.category, "diagnosis");
  assert.match(result.answer, /不能判断/);
  assert.match(result.answer, /药物/);
});

test("chat agent prioritizes crisis language", async () => {
  const result = await runChatAgent({ question: "我不想活了", context });
  assert.equal(result.category, "crisis");
  assert.match(result.answer, /不要独处/);
  assert.match(result.answer, /紧急服务/);
});

test("chat agent explains privacy without sending data to a model", async () => {
  const result = await runChatAgent({ question: "我的数据保存在哪里，谁能看到？", context });
  assert.equal(result.category, "privacy");
  assert.match(result.answer, /匿名标识/);
  assert.match(result.answer, /不会把问答内容发送给外部大模型/);
});

test("chat agent gives one bounded habit goal", async () => {
  const result = await runChatAgent({ question: "生活习惯应该怎么调整？", context: { ...context, lifestyle: 9 } });
  assert.equal(result.category, "habits");
  assert.match(result.answer, /一个最容易坚持的目标/);
});
