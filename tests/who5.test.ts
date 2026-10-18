import assert from "node:assert/strict";
import test from "node:test";
import { scoreWho5 } from "../lib/who5.ts";

test("WHO-5 converts a raw score to a percentage", () => {
  assert.deepEqual(scoreWho5([5, 4, 3, 2, 1]), {
    rawScore: 15,
    normalizedScore: 60,
    band: "positive",
  });
});

test("WHO-5 flags scores below 50 for further review", () => {
  assert.equal(scoreWho5([2, 2, 2, 2, 2]).band, "review");
});

test("WHO-5 rejects incomplete and out-of-range answers", () => {
  assert.throws(() => scoreWho5([5, 4]));
  assert.throws(() => scoreWho5([6, 4, 3, 2, 1]));
});
