export const PSS10_ITEM_COUNT = 10;

export type Pss10Result = {
  rawScore: number;
  normalizedScore: number;
  band: "low" | "moderate" | "high";
};

export function scorePss10(answers: number[]): Pss10Result {
  if (answers.length !== PSS10_ITEM_COUNT) throw new Error("PSS-10 必须完整回答 10 个问题。");
  if (!answers.every((answer) => Number.isInteger(answer) && answer >= 0 && answer <= 4)) {
    throw new Error("每个答案必须是 0 到 4 之间的整数。");
  }
  const reverseItems = new Set([3, 4, 6, 7]);
  const rawScore = answers.reduce((sum, answer, index) => sum + (reverseItems.has(index) ? 4 - answer : answer), 0);
  const band = rawScore <= 13 ? "low" : rawScore <= 26 ? "moderate" : "high";
  return { rawScore, normalizedScore: Math.round((rawScore / 40) * 100), band };
}
