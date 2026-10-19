import test from "node:test";
import assert from "node:assert/strict";
import { scoreIsi } from "../lib/isi.ts";

test("ISI calculates standard severity bands", () => {
  assert.equal(scoreIsi([0, 0, 0, 0, 0, 0, 0]).band, "none");
  assert.equal(scoreIsi([1, 1, 1, 1, 1, 1, 1]).band, "none");
  assert.equal(scoreIsi([2, 2, 2, 2, 2, 1, 1]).band, "subthreshold");
  assert.equal(scoreIsi([3, 3, 3, 3, 2, 2, 2]).band, "moderate");
  assert.equal(scoreIsi([4, 4, 4, 4, 4, 4, 4]).band, "severe");
});

test("ISI rejects invalid answers", () => {
  assert.throws(() => scoreIsi([0, 1]));
  assert.throws(() => scoreIsi([0, 0, 0, 0, 0, 0, 5]));
});
