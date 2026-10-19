export type ReportInput = {
  assessmentCount: number;
  dashboardDays: 7 | 30;
  checkinCount: number;
  who5?: number;
  phq9?: number;
  gad7?: number;
  isi?: number;
  pss10?: number;
  lifestyle?: number;
  averageSleep?: number | null;
  averageStress?: number | null;
  averageMood?: number | null;
};

export function generateComprehensiveReport(input: ReportInput) {
  const focuses: string[] = [];
  const actions: string[] = [];
  if ((input.isi !== undefined && input.isi >= 15) || (input.averageSleep ?? 8) < 6) {
    focuses.push("睡眠恢复");
    actions.push("未来 7 天先固定起床时间，并在睡前 30 分钟减少屏幕和高强度信息输入。");
  }
  if ((input.pss10 !== undefined && input.pss10 >= 27) || (input.averageStress ?? 0) >= 4) {
    focuses.push("压力调节");
    actions.push("每天安排一次 10 分钟的低负担恢复活动，例如散步、拉伸或呼吸练习。");
  }
  if ((input.phq9 !== undefined && input.phq9 >= 10) || (input.who5 !== undefined && input.who5 < 50) || (input.averageMood ?? 5) <= 2) {
    focuses.push("情绪支持");
    actions.push("选择一位可信任的人，在本周主动联系一次，并具体说明你最近的状态和需要。");
  }
  if (input.gad7 !== undefined && input.gad7 >= 10) {
    focuses.push("焦虑管理");
    actions.push("把最担心的事情写成“可控制”和“暂时不可控制”两列，只为前一列安排一个最小行动。");
  }
  if (input.lifestyle !== undefined && input.lifestyle < 13) {
    focuses.push("日常节律");
    actions.push("从作息、运动、户外活动、规律饮食、社交和屏幕休息中，只挑一项连续实践 7 天。");
  }
  if (actions.length === 0) actions.push("继续保持当前节律，并完成至少 3 次每日打卡，以便观察变化而不是依赖单次结果。");
  if (actions.length < 3) actions.push("本周完成至少 3 次状态打卡，记录睡眠、压力与情绪是否同步变化。");
  if (actions.length < 3) actions.push("一周后用相同量表复查一次，只比较自己的变化，不与他人分数比较。");

  const ready = input.assessmentCount > 0 || input.checkinCount > 0;
  return {
    ready,
    headline: !ready ? "先完成一次评估或状态打卡" : focuses.length ? `近期优先关注：${[...new Set(focuses)].slice(0, 3).join("、")}` : "当前记录整体较平稳，继续观察变化",
    overview: ready ? `已汇总 ${input.assessmentCount} 类评估和最近 ${input.dashboardDays} 天的 ${input.checkinCount} 次状态记录。该报告只描述已记录的数据，不推断疾病或原因。` : "有数据后，系统会用固定、可检查的规则生成报告。",
    actions: actions.slice(0, 3),
    needsProfessionalSupport: (input.phq9 ?? 0) >= 15 || (input.gad7 ?? 0) >= 15 || (input.isi ?? 0) >= 22 || (input.who5 !== undefined && input.who5 <= 28),
  };
}
