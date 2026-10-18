export const WHO5_ITEM_COUNT = 5;

export type Who5Result = {
  rawScore: number;
  normalizedScore: number;
  band: "positive" | "review";
};

export function scoreWho5(answers: number[]): Who5Result {
  if (answers.length !== WHO5_ITEM_COUNT) {
    throw new Error("WHO-5 必须完整回答 5 个问题。");
  }
  if (!answers.every((answer) => Number.isInteger(answer) && answer >= 0 && answer <= 5)) {
    throw new Error("每个答案必须是 0 到 5 之间的整数。");
  }
  const rawScore = answers.reduce((sum, answer) => sum + answer, 0);
  const normalizedScore = rawScore * 4;
  return { rawScore, normalizedScore, band: normalizedScore < 50 ? "review" : "positive" };
}
