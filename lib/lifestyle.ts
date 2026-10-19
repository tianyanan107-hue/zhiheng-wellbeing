export const LIFESTYLE_ITEM_COUNT = 6;

export type LifestyleResult = {
  rawScore: number;
  normalizedScore: number;
  band: "needs_attention" | "developing" | "supportive";
};

export function scoreLifestyle(answers: number[]): LifestyleResult {
  if (answers.length !== LIFESTYLE_ITEM_COUNT) throw new Error("生活习惯问卷必须完整回答 6 个问题。");
  if (!answers.every((answer) => Number.isInteger(answer) && answer >= 0 && answer <= 3)) {
    throw new Error("每个答案必须是 0 到 3 之间的整数。");
  }
  const rawScore = answers.reduce((sum, answer) => sum + answer, 0);
  const band = rawScore < 7 ? "needs_attention" : rawScore < 13 ? "developing" : "supportive";
  return { rawScore, normalizedScore: Math.round((rawScore / 18) * 100), band };
}
