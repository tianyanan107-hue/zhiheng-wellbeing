import { ReportInputSchema, runWellbeingAgent } from "../../../lib/wellbeing-agent";

export async function POST(request: Request) {
  try {
    const input = ReportInputSchema.parse(await request.json());
    return Response.json(await runWellbeingAgent(input));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "综合报告生成失败。" }, { status: 400 });
  }
}
