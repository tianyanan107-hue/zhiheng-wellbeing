export const ISI_ITEM_COUNT = 7;

export type IsiResult = {
  rawScore: number;
  normalizedScore: number;
  band: "none" | "subthreshold" | "moderate" | "severe";
};

export function scoreIsi(answers: number[]): IsiResult {
  if (answers.length !== ISI_ITEM_COUNT) throw new Error("ISI 必须完整回答 7 个问题。");
  if (!answers.every((answer) => Number.isInteger(answer) && answer >= 0 && answer <= 4)) {
    throw new Error("每个答案必须是 0 到 4 之间的整数。");
  }
  const rawScore = answers.reduce((sum, answer) => sum + answer, 0);
  const band = rawScore < 8 ? "none" : rawScore < 15 ? "subthreshold" : rawScore < 22 ? "moderate" : "severe";
  return { rawScore, normalizedScore: Math.round((rawScore / 28) * 100), band };
}
