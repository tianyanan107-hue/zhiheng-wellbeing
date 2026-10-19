import { asc, eq } from "drizzle-orm";
import { ensureDatabase, getDb } from "../../../db";
import { dailyCheckins } from "../../../db/schema";

function validAnonymousId(value: string) {
  return /^[a-zA-Z0-9_-]{12,80}$/.test(value);
}

export async function GET(request: Request) {
  try {
    const anonymousId = new URL(request.url).searchParams.get("anonymousId") ?? "";
    if (!validAnonymousId(anonymousId)) return Response.json({ error: "匿名标识无效。" }, { status: 400 });
    await ensureDatabase();
    const checkins = await getDb().select().from(dailyCheckins)
      .where(eq(dailyCheckins.anonymousId, anonymousId))
      .orderBy(asc(dailyCheckins.createdAt), asc(dailyCheckins.id)).limit(30);
    return Response.json({ checkins });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取打卡失败。" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    const anonymousId = typeof payload.anonymousId === "string" ? payload.anonymousId.trim() : "";
    if (!validAnonymousId(anonymousId)) return Response.json({ error: "匿名标识无效。" }, { status: 400 });
    const values = [payload.mood, payload.sleepQuality, payload.stress, payload.energy];
    if (!values.every((value) => Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5)) {
      return Response.json({ error: "状态评分必须是 1 到 5。" }, { status: 400 });
    }
    if (!Number.isInteger(payload.sleepHours) || Number(payload.sleepHours) < 0 || Number(payload.sleepHours) > 16) {
      return Response.json({ error: "睡眠时长应为 0 到 16 小时。" }, { status: 400 });
    }
    const note = typeof payload.note === "string" ? payload.note.trim().slice(0, 200) : "";
    await ensureDatabase();
    const [saved] = await getDb().insert(dailyCheckins).values({
      anonymousId,
      mood: Number(payload.mood), sleepHours: Number(payload.sleepHours),
      sleepQuality: Number(payload.sleepQuality), stress: Number(payload.stress), energy: Number(payload.energy),
      exercised: payload.exercised === true, note,
    }).returning();
    return Response.json({ checkin: saved }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "保存打卡失败。" }, { status: 400 });
  }
}
