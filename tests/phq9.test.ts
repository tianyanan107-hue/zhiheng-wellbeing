import assert from "node:assert/strict";
import test from "node:test";
import { scorePhq9 } from "../lib/phq9.ts";

test("PHQ-9 calculates severity bands", () => {
  assert.equal(scorePhq9([0, 0, 0, 0, 0, 0, 0, 0, 0]).band, "minimal");
  assert.equal(scorePhq9([1, 1, 1, 1, 1, 1, 1, 1, 1]).band, "mild");
  assert.equal(scorePhq9([2, 2, 2, 2, 2, 2, 2, 2, 2]).band, "moderately_severe");
  assert.equal(scorePhq9([3, 3, 3, 3, 3, 3, 3, 3, 3]).band, "severe");
});

test("PHQ-9 flags any non-zero response to item 9", () => {
  assert.equal(scorePhq9([0, 0, 0, 0, 0, 0, 0, 0, 1]).selfHarmRisk, true);
  assert.equal(scorePhq9([3, 3, 3, 3, 3, 3, 3, 3, 0]).selfHarmRisk, false);
});

test("PHQ-9 rejects incomplete and out-of-range answers", () => {
  assert.throws(() => scorePhq9([0, 1]));
  assert.throws(() => scorePhq9([0, 0, 0, 0, 0, 0, 0, 0, 4]));
});
