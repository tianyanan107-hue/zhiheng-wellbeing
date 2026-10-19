import test from "node:test";
import assert from "node:assert/strict";
import { scorePss10 } from "../lib/pss10.ts";

test("PSS-10 reverse-scores positive items", () => {
  assert.equal(scorePss10([0, 0, 0, 4, 4, 0, 4, 4, 0, 0]).rawScore, 0);
  assert.equal(scorePss10([4, 4, 4, 0, 0, 4, 0, 0, 4, 4]).rawScore, 40);
});

test("PSS-10 calculates interpretation bands", () => {
  assert.equal(scorePss10([0, 0, 0, 4, 4, 0, 4, 4, 0, 0]).band, "low");
  assert.equal(scorePss10(Array(10).fill(2)).band, "moderate");
});
