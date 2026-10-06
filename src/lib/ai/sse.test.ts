import { describe, expect, it } from "vitest";
import { createAiSseHeaders, encodeAiSseEvent } from "./sse";

describe("AI SSE protocol", () => {
  it("encodes typed events with EventSource framing", () => {
    const encoded = encodeAiSseEvent({ type: "delta", text: "Olá\nMundo", final: true });
    expect(encoded).toBe(`event: delta\ndata: {"type":"delta","text":"Olá\\nMundo","final":true}\n\n`);
  });

  it("disables buffering for incremental delivery", () => {
    const headers = createAiSseHeaders();
    expect(headers.get("content-type")).toContain("text/event-stream");
    expect(headers.get("x-accel-buffering")).toBe("no");
    expect(headers.get("cache-control")).toContain("no-cache");
  });
});
