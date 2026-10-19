import test from "node:test";
import assert from "node:assert/strict";
import { generateComprehensiveReport } from "../lib/report.ts";

test("report stays unavailable without recorded data", () => {
  assert.equal(generateComprehensiveReport({ assessmentCount: 0, checkinCount: 0, dashboardDays: 7 }).ready, false);
});

test("report prioritizes sleep and stress with three bounded actions", () => {
  const report = generateComprehensiveReport({ assessmentCount: 2, checkinCount: 5, dashboardDays: 7, isi: 16, pss10: 29, averageSleep: 5.5, averageStress: 4.2 });
  assert.match(report.headline, /睡眠恢复/);
  assert.match(report.headline, /压力调节/);
  assert.equal(report.actions.length, 3);
});

test("report escalates only at configured professional-support thresholds", () => {
  assert.equal(generateComprehensiveReport({ assessmentCount: 1, checkinCount: 0, dashboardDays: 7, phq9: 14 }).needsProfessionalSupport, false);
  assert.equal(generateComprehensiveReport({ assessmentCount: 1, checkinCount: 0, dashboardDays: 7, phq9: 15 }).needsProfessionalSupport, true);
});
