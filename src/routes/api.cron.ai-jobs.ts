import { createFileRoute } from "@tanstack/react-router";
import { hasValidWorkerToken } from "@/lib/ai/worker-auth";
import { handleProcessAiMediaJobs } from "./api.ai.jobs.process";

export async function handleCronAiJobs(request: Request): Promise<Response> {
  if (!hasValidWorkerToken(request)) {
    return Response.json(
      { error: "Token de cron inválido ou ausente." },
      { status: 401 },
    );
  }
  return handleProcessAiMediaJobs(request);
}

export const Route = createFileRoute("/api/cron/ai-jobs")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => handleCronAiJobs(request),
      POST: async ({ request }: { request: Request }) => handleCronAiJobs(request),
    },
  },
} as never);
