import { ChatInputSchema, runChatAgent } from "../../../lib/chat-agent";

export async function POST(request: Request) {
  try {
    const input = ChatInputSchema.parse(await request.json());
    return Response.json(await runChatAgent(input));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "助手暂时无法回答。" }, { status: 400 });
  }
}
