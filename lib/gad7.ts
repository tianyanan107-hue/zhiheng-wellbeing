export const GAD7_ITEM_COUNT = 7;

export type Gad7Result = {
  rawScore: number;
  normalizedScore: number;
  band: "minimal" | "mild" | "moderate" | "severe";
};

export function scoreGad7(answers: number[]): Gad7Result {
  if (answers.length !== GAD7_ITEM_COUNT) throw new Error("GAD-7 必须完整回答 7 个问题。");
  if (!answers.every((answer) => Number.isInteger(answer) && answer >= 0 && answer <= 3)) {
    throw new Error("每个答案必须是 0 到 3 之间的整数。");
  }
  const rawScore = answers.reduce((sum, answer) => sum + answer, 0);
  const band = rawScore < 5 ? "minimal" : rawScore < 10 ? "mild" : rawScore < 15 ? "moderate" : "severe";
  return { rawScore, normalizedScore: Math.round((rawScore / 21) * 100), band };
}
