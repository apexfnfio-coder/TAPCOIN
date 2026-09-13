import { subscribe } from "@/lib/hub";

/** SSE stream — topics: leaderboard, competitions, config (comma-separated). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const topics = (url.searchParams.get("topics") || "leaderboard,competitions,config")
    .split(",")
    .map((t) => t.trim())
    .filter((t) => ["leaderboard", "competitions", "config"].includes(t));

  const encoder = new TextEncoder();
  let unsubs: (() => void)[] = [];
  let heartbeat: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      const send = (topic: string) => (payload: string) => {
        try {
          controller.enqueue(encoder.encode(`event: ${topic}\ndata: ${payload}\n\n`));
        } catch {
          /* closed */
        }
      };
      unsubs = topics.map((t) => subscribe(t, send(t)));
      controller.enqueue(encoder.encode(`: connected\n\n`));
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          /* closed */
        }
      }, 25_000);
    },
    cancel() {
      clearInterval(heartbeat);
      unsubs.forEach((u) => u());
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
