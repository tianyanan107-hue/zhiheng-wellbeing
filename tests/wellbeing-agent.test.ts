import test from "node:test";
import assert from "node:assert/strict";
import { runWellbeingAgent } from "../lib/wellbeing-agent.ts";

test("LangGraph agent completes all five guarded nodes", async () => {
  const result = await runWellbeingAgent({ assessmentCount: 3, dashboardDays: 7, checkinCount: 5, isi: 17, pss10: 29, averageSleep: 5.8, averageStress: 4.1 });
  assert.equal(result.trace.length, 5);
  assert.equal(result.passedGuardrail, true);
  assert.equal(result.report.actions.length, 3);
  assert.match(result.trace.at(-1) ?? "", /安全检查/);
});

test("LangGraph safety node marks follow-up thresholds", async () => {
  const routine = await runWellbeingAgent({ assessmentCount: 1, dashboardDays: 7, checkinCount: 0, phq9: 14 });
  const followUp = await runWellbeingAgent({ assessmentCount: 1, dashboardDays: 7, checkinCount: 0, phq9: 15 });
  assert.equal(routine.riskLevel, "routine");
  assert.equal(followUp.riskLevel, "follow_up");
  assert.equal(followUp.report.needsProfessionalSupport, true);
});
