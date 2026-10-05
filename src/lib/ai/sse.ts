export type AiSseEvent =
  | { type: "status"; phase: "planning" | "running" | "verifying"; message: string }
  | { type: "delta"; text: string; final: boolean }
  | { type: "done"; callId?: string; provider?: string; model?: string }
  | { type: "error"; code: string; message: string };

export function encodeAiSseEvent(event: AiSseEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export function createAiSseHeaders(): Headers {
  return new Headers({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
}
