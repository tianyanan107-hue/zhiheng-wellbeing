import { and, asc, eq } from "drizzle-orm";
import { ensureDatabase, getDb } from "../../../db";
import { assessmentResults } from "../../../db/schema";
import { scoreWho5 } from "../../../lib/who5";
import { scorePhq9 } from "../../../lib/phq9";
import { scoreGad7 } from "../../../lib/gad7";
import { scoreIsi } from "../../../lib/isi";
import { scorePss10 } from "../../../lib/pss10";
import { scoreLifestyle } from "../../../lib/lifestyle";

type Scale = "WHO-5" | "PHQ-9" | "GAD-7" | "ISI" | "PSS-10" | "LIFESTYLE";

function validScale(value: string): value is Scale {
  return ["WHO-5", "PHQ-9", "GAD-7", "ISI", "PSS-10", "LIFESTYLE"].includes(value);
}

function validAnonymousId(value: string) {
  return /^[a-zA-Z0-9_-]{12,80}$/.test(value);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const anonymousId = url.searchParams.get("anonymousId") ?? "";
    const scale = url.searchParams.get("scale") ?? "WHO-5";
    if (!validAnonymousId(anonymousId)) {
      return Response.json({ error: "匿名标识无效。" }, { status: 400 });
    }
    if (!validScale(scale)) return Response.json({ error: "量表类型无效。" }, { status: 400 });
    await ensureDatabase();
    const history = await getDb()
      .select({ id: assessmentResults.id, rawScore: assessmentResults.rawScore, normalizedScore: assessmentResults.normalizedScore, createdAt: assessmentResults.createdAt })
      .from(assessmentResults)
      .where(and(eq(assessmentResults.anonymousId, anonymousId), eq(assessmentResults.scale, scale)))
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
    const payload = (await request.json()) as { anonymousId?: string; scale?: string; answers?: number[] };
    const anonymousId = payload.anonymousId?.trim() ?? "";
    if (!validAnonymousId(anonymousId)) {
      return Response.json({ error: "匿名标识无效。" }, { status: 400 });
    }
    const scale = payload.scale ?? "WHO-5";
    if (!validScale(scale)) return Response.json({ error: "量表类型无效。" }, { status: 400 });
    const scorers = { "WHO-5": scoreWho5, "PHQ-9": scorePhq9, "GAD-7": scoreGad7, ISI: scoreIsi, "PSS-10": scorePss10, LIFESTYLE: scoreLifestyle } as const;
    const result = scorers[scale](payload.answers ?? []);
    await ensureDatabase();
    const [saved] = await getDb().insert(assessmentResults).values({
      anonymousId,
      scale,
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

export async function DELETE(request: Request) {
  const anonymousId = new URL(request.url).searchParams.get("anonymousId") ?? "";
  if (!validAnonymousId(anonymousId)) return Response.json({ error: "匿名标识无效。" }, { status: 400 });
  await ensureDatabase();
  await getDb().delete(assessmentResults).where(eq(assessmentResults.anonymousId, anonymousId));
  return Response.json({ deleted: true });
}
