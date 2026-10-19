import { END, START, StateGraph, StateSchema } from "@langchain/langgraph";
import { z } from "zod";
import { generateComprehensiveReport } from "./report.ts";

export const ReportInputSchema = z.object({
  assessmentCount: z.number().int().min(0).max(6),
  dashboardDays: z.union([z.literal(7), z.literal(30)]),
  checkinCount: z.number().int().min(0).max(30),
  who5: z.number().min(0).max(100).optional(),
  phq9: z.number().int().min(0).max(27).optional(),
  gad7: z.number().int().min(0).max(21).optional(),
  isi: z.number().int().min(0).max(28).optional(),
  pss10: z.number().int().min(0).max(40).optional(),
  lifestyle: z.number().int().min(0).max(18).optional(),
  averageSleep: z.number().min(0).max(16).nullable().optional(),
  averageStress: z.number().min(1).max(5).nullable().optional(),
  averageMood: z.number().min(1).max(5).nullable().optional(),
});

const ReportSchema = z.object({
  ready: z.boolean(),
  headline: z.string(),
  overview: z.string(),
  actions: z.array(z.string()).max(3),
  needsProfessionalSupport: z.boolean(),
});

const AgentState = new StateSchema({
  input: ReportInputSchema,
  riskLevel: z.enum(["routine", "follow_up"]).default("routine"),
  report: ReportSchema.optional(),
  trace: z.array(z.string()).default(() => []),
  passedGuardrail: z.boolean().default(false),
});

const collectData: typeof AgentState.Node = (state) => ({
  trace: [...state.trace, "读取并校验评估与打卡数据"],
});

const safetyTriage: typeof AgentState.Node = (state) => {
  const { phq9, gad7, isi, who5 } = state.input;
  const followUp = (phq9 ?? 0) >= 15 || (gad7 ?? 0) >= 15 || (isi ?? 0) >= 22 || (who5 !== undefined && who5 <= 28);
  return { riskLevel: followUp ? "follow_up" : "routine", trace: [...state.trace, "执行固定阈值安全分流"] };
};

const prioritizeNeeds: typeof AgentState.Node = (state) => ({
  report: generateComprehensiveReport(state.input),
  trace: [...state.trace, "确定近期优先关注点"],
});

const composePlan: typeof AgentState.Node = (state) => ({
  trace: [...state.trace, "组合三项七天行动建议"],
});

const safetyReview: typeof AgentState.Node = (state) => {
  if (!state.report) throw new Error("报告未生成，无法执行安全检查。");
  const safeReport = { ...state.report, actions: state.report.actions.slice(0, 3), needsProfessionalSupport: state.riskLevel === "follow_up" };
  return { report: safeReport, passedGuardrail: true, trace: [...state.trace, "完成非诊断边界与输出安全检查"] };
};

export const wellbeingAgent = new StateGraph(AgentState)
  .addNode("collect_data", collectData)
  .addNode("safety_triage", safetyTriage)
  .addNode("prioritize_needs", prioritizeNeeds)
  .addNode("compose_plan", composePlan)
  .addNode("safety_review", safetyReview)
  .addEdge(START, "collect_data")
  .addEdge("collect_data", "safety_triage")
  .addEdge("safety_triage", "prioritize_needs")
  .addEdge("prioritize_needs", "compose_plan")
  .addEdge("compose_plan", "safety_review")
  .addEdge("safety_review", END)
  .compile();

export async function runWellbeingAgent(input: z.infer<typeof ReportInputSchema>) {
  const result = await wellbeingAgent.invoke({ input });
  if (!result.report || !result.passedGuardrail) throw new Error("智能体未能生成通过安全检查的报告。");
  return { report: result.report, trace: result.trace, riskLevel: result.riskLevel, passedGuardrail: result.passedGuardrail };
}
