export const PHQ9_ITEM_COUNT = 9;

export type Phq9Band = "minimal" | "mild" | "moderate" | "moderately_severe" | "severe";

export type Phq9Result = {
  rawScore: number;
  normalizedScore: number;
  band: Phq9Band;
  selfHarmRisk: boolean;
};

export function scorePhq9(answers: number[]): Phq9Result {
  if (answers.length !== PHQ9_ITEM_COUNT) {
    throw new Error("PHQ-9 必须完整回答 9 个问题。");
  }
  if (!answers.every((answer) => Number.isInteger(answer) && answer >= 0 && answer <= 3)) {
    throw new Error("每个答案必须是 0 到 3 之间的整数。");
  }

  const rawScore = answers.reduce((sum, answer) => sum + answer, 0);
  const band: Phq9Band = rawScore < 5 ? "minimal"
    : rawScore < 10 ? "mild"
    : rawScore < 15 ? "moderate"
    : rawScore < 20 ? "moderately_severe"
    : "severe";

  return {
    rawScore,
    normalizedScore: Math.round((rawScore / 27) * 100),
    band,
    selfHarmRisk: answers[8] > 0,
  };
}
