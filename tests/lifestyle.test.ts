import test from "node:test";
import assert from "node:assert/strict";
import { scoreLifestyle } from "../lib/lifestyle.ts";

test("lifestyle questionnaire reports a transparent support score", () => {
  assert.equal(scoreLifestyle(Array(6).fill(0)).band, "needs_attention");
  assert.equal(scoreLifestyle(Array(6).fill(2)).band, "developing");
  assert.equal(scoreLifestyle(Array(6).fill(3)).band, "supportive");
});
