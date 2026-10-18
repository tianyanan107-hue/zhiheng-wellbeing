import { and, asc, eq } from "drizzle-orm";
import { ensureDatabase, getDb } from "../../../db";
import { assessmentResults } from "../../../db/schema";
import { scoreWho5 } from "../../../lib/who5";

function validAnonymousId(value: string) {
  return /^[a-zA-Z0-9_-]{12,80}$/.test(value);
}

export async function GET(request: Request) {
  try {
    const anonymousId = new URL(request.url).searchParams.get("anonymousId") ?? "";
    if (!validAnonymousId(anonymousId)) {
      return Response.json({ error: "匿名标识无效。" }, { status: 400 });
    }
    await ensureDatabase();
    const history = await getDb()
      .select({ id: assessmentResults.id, normalizedScore: assessmentResults.normalizedScore, createdAt: assessmentResults.createdAt })
      .from(assessmentResults)
      .where(and(eq(assessmentResults.anonymousId, anonymousId), eq(assessmentResults.scale, "WHO-5")))
      .orderBy(asc(assessmentResults.createdAt), asc(assessmentResults.id))
      .limit(12);
    return Response.json({ history });
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取历史记录失败。";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { anonymousId?: string; answers?: number[] };
    const anonymousId = payload.anonymousId?.trim() ?? "";
    if (!validAnonymousId(anonymousId)) {
      return Response.json({ error: "匿名标识无效。" }, { status: 400 });
    }
    const result = scoreWho5(payload.answers ?? []);
    await ensureDatabase();
    const [saved] = await getDb().insert(assessmentResults).values({
      anonymousId,
      scale: "WHO-5",
      rawScore: result.rawScore,
      normalizedScore: result.normalizedScore,
      answersJson: JSON.stringify(payload.answers),
    }).returning({ id: assessmentResults.id, createdAt: assessmentResults.createdAt });
    return Response.json({ result: { ...result, ...saved } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "提交评估失败。";
    return Response.json({ error: message }, { status: 400 });
  }
}
