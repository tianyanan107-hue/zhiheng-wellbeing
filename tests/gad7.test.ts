import assert from "node:assert/strict";
import test from "node:test";
import { scoreGad7 } from "../lib/gad7.ts";

test("GAD-7 calculates standard severity bands", () => {
  assert.equal(scoreGad7([0, 0, 0, 0, 0, 0, 0]).band, "minimal");
  assert.equal(scoreGad7([1, 1, 1, 1, 1, 1, 1]).band, "mild");
  assert.equal(scoreGad7([2, 2, 2, 2, 2, 2, 2]).band, "moderate");
  assert.equal(scoreGad7([3, 3, 3, 3, 3, 3, 3]).band, "severe");
});

test("GAD-7 rejects invalid answers", () => {
  assert.throws(() => scoreGad7([0, 1]));
  assert.throws(() => scoreGad7([0, 0, 0, 0, 0, 0, 4]));
});
