import { END, START, StateGraph, StateSchema } from "@langchain/langgraph";
import { z } from "zod";
import { ReportInputSchema } from "./wellbeing-agent.ts";

export const ChatInputSchema = z.object({ question: z.string().trim().min(1).max(300), context: ReportInputSchema });

const ChatState = new StateSchema({
  question: z.string(),
  context: ReportInputSchema,
  category: z.enum(["general", "sleep", "stress", "mood", "habits", "privacy", "report", "diagnosis", "crisis"]).default("general"),
  evidence: z.array(z.string()).default(() => []),
  answer: z.string().default(""),
  trace: z.array(z.string()).default(() => []),
  passedGuardrail: z.boolean().default(false),
});

const classifyQuestion: typeof ChatState.Node = (state) => {
  const text = state.question.toLowerCase();
  const category = /自杀|不想活|伤害自己|结束生命|kill myself|suicide/.test(text) ? "crisis"
    : /是不是.*(抑郁|焦虑|失眠)|诊断|确诊|吃药|停药|换药|剂量/.test(text) ? "diagnosis"
      : /隐私|数据|保存在哪里|谁能看到|删除记录/.test(text) ? "privacy"
        : /报告|综合结果|执行轨迹|智能体/.test(text) ? "report"
          : /习惯|运动|饮食|户外|屏幕|作息/.test(text) ? "habits"
      : /睡|失眠|早醒|疲惫|困/.test(text) ? "sleep"
        : /压力|紧张|负担|焦虑/.test(text) ? "stress"
          : /情绪|低落|开心|难过|抑郁/.test(text) ? "mood" : "general";
  return { category, trace: [...state.trace, "识别提问意图与安全类别"] };
};

const gatherEvidence: typeof ChatState.Node = (state) => {
  const c = state.context;
  const evidence: string[] = [];
  if (state.category === "sleep" || state.category === "general") {
    if (c.isi !== undefined) evidence.push(`最近一次 ISI 为 ${c.isi}/28`);
    if (c.averageSleep != null) evidence.push(`最近 ${c.dashboardDays} 天平均睡眠 ${c.averageSleep.toFixed(1)} 小时`);
  }
  if (state.category === "stress" || state.category === "general") {
    if (c.pss10 !== undefined) evidence.push(`最近一次 PSS-10 为 ${c.pss10}/40`);
    if (c.averageStress != null) evidence.push(`每日记录中的平均压力为 ${c.averageStress.toFixed(1)}/5`);
  }
  if (state.category === "mood" || state.category === "general") {
    if (c.who5 !== undefined) evidence.push(`最近一次 WHO-5 为 ${c.who5}/100`);
    if (c.phq9 !== undefined) evidence.push(`最近一次 PHQ-9 为 ${c.phq9}/27`);
    if (c.averageMood != null) evidence.push(`每日记录中的平均情绪为 ${c.averageMood.toFixed(1)}/5`);
  }
  if (state.category === "habits" && c.lifestyle !== undefined) evidence.push(`最近一次生活习惯支持度为 ${c.lifestyle}/18`);
  if (state.category === "report") evidence.push(`当前报告汇总了 ${c.assessmentCount} 类评估和 ${c.checkinCount} 次近期打卡`);
  return { evidence: evidence.slice(0, 3), trace: [...state.trace, "从个人记录中提取回答依据"] };
};

const draftAnswer: typeof ChatState.Node = (state) => {
  const evidenceText = state.evidence.length ? `我能看到的依据是：${state.evidence.join("；")}。` : "目前相关记录还比较少。";
  let answer = "你可以先继续完成量表和每日打卡，我会优先比较你自己的变化，而不是与别人比较。";
  if (state.category === "crisis") answer = "我很重视你刚才表达的危险信号。请现在先不要独处，立即联系身边可信任的人陪伴你，并联系当地紧急服务或专业危机干预机构。如果你已经采取行动或无法保证自己的安全，请立刻拨打当地急救或报警电话。";
  if (state.category === "diagnosis") answer = "我不能判断你是否患有某种疾病，也不能提供开始、停止或调整药物的建议。量表只能用于筛查和观察变化；请把你的症状、持续时间和已有记录带给合格的医生或心理专业人员讨论。";
  if (state.category === "sleep") answer = `${evidenceText}这些记录说明睡眠值得继续关注，但不能据此确定原因。你可以先连续 7 天固定起床时间、记录睡眠与第二天精力；如果持续影响白天功能，建议咨询专业人员。`;
  if (state.category === "stress") answer = `${evidenceText}压力记录反映的是你的主观体验，不能单独说明疾病。可以先把任务分成“今天必须完成”和“可以推迟”，再安排一次 10 分钟的恢复活动，并继续记录变化。`;
  if (state.category === "mood") answer = `${evidenceText}这些分数帮助观察近期状态，但不能用于确诊。建议本周主动联系一位可信任的人，并维持基本作息；如果低落持续、加重或影响生活，请寻求专业支持。`;
  if (state.category === "habits") answer = `${evidenceText}生活习惯支持度不是医学量表。建议只选择一个最容易坚持的目标连续做 7 天，例如固定起床时间、饭后散步或每学习 50 分钟休息一次。`;
  if (state.category === "privacy") answer = "你的记录通过随机匿名标识保存，不要求姓名。你可以在仪表盘导出或删除该标识下的全部记录；当前本地安全模式不会把问答内容发送给外部大模型。公开演示时仍不要填写真实患者或研究参与者资料。";
  if (state.category === "report") answer = `${evidenceText}综合报告先进行固定阈值安全分流，再识别重点、组织三条建议并做边界检查。执行轨迹是为了让过程可解释；报告不能替代诊断。`;
  if (state.category === "general") answer = `${evidenceText}${answer}`;
  return { answer, trace: [...state.trace, "生成基于证据的非诊断性回答"] };
};

const reviewAnswer: typeof ChatState.Node = (state) => {
  const answer = state.answer.slice(0, 900);
  return { answer, passedGuardrail: true, trace: [...state.trace, "检查诊断、用药与危机边界"] };
};

const chatGraph = new StateGraph(ChatState)
  .addNode("classify_question", classifyQuestion)
  .addNode("gather_evidence", gatherEvidence)
  .addNode("draft_answer", draftAnswer)
  .addNode("review_answer", reviewAnswer)
  .addEdge(START, "classify_question")
  .addEdge("classify_question", "gather_evidence")
  .addEdge("gather_evidence", "draft_answer")
  .addEdge("draft_answer", "review_answer")
  .addEdge("review_answer", END)
  .compile();

export async function runChatAgent(input: z.infer<typeof ChatInputSchema>) {
  const result = await chatGraph.invoke({ question: input.question, context: input.context });
  if (!result.passedGuardrail) throw new Error("回答未通过安全检查。");
  return { answer: result.answer, evidence: result.evidence, category: result.category, trace: result.trace, mode: "local-rules" as const };
}
