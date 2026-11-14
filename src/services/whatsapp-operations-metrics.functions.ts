import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { STAFF_MEMBER_ROLES } from "@/lib/architecture/module-plan-governance";

export const WhatsAppOperationsMetricsSchema = z.object({ storeId: z.string().uuid().optional() });
export type WhatsAppOperationsMetricsDTO = {
  store_id: string;
  queue: { pending: number; processing: number; failed: number; dead_letter: number; accepted_24h: number; oldest_pending_seconds: number; retryable_failures_24h: number; p95_latency_ms_24h: number; throughput_24h: number };
  conversations: { open: number; unassigned: number; first_response_avg_seconds: number; first_response_p95_seconds: number };
  agents: Array<{ profile_id: string; open_threads: number; total_threads: number; avg_first_response_seconds: number | null; responded_threads: number }>;
  providers: Array<{ provider: string; attempts: number; accepted: number; failures: number; avg_duration_ms: number | null; p95_duration_ms: number | null }>;
  health: { worker_status: "starting" | "running" | "degraded" | "idle" | "failed" | "stale" | "unknown"; worker_last_seen_at: string | null; worker_last_run_at: string | null; worker_count: number; generated_at: string };
  generated_at: string;
};

export const AttendanceBusinessIntelligenceSchema = z.object({
  storeId: z.string().uuid().optional(),
  rangeDays: z.union([z.literal(7), z.literal(14), z.literal(30), z.literal(90)]).default(30),
  channelInstanceId: z.string().uuid().optional(),
  departmentSlug: z.string().max(80).optional(),
  agentProfileId: z.string().uuid().optional(),
});

export type AttendanceBusinessIntelligenceDTO = {
  storeId: string;
  rangeDays: 7 | 14 | 30 | 90;
  generatedAt: string;
  summary: {
    totalThreadsInPeriod: number;
    openThreads: number;
    unassignedThreads: number;
    awaitingFirstResponse: number;
    closedInPeriod: number;
    avgFirstResponseSeconds: number | null;
    p95FirstResponseSeconds: number | null;
    avgResolutionSeconds: number | null;
    firstContactResolutionRate: number | null;
    csatAvg: number | null;
    csatCount: number;
    workerStatus: WhatsAppOperationsMetricsDTO["health"]["worker_status"];
    outboxPending: number;
    outboxFailed: number;
    outboxDeadLetter: number;
  };
  dailySeries: Array<{
    date: string;
    opened: number;
    resolved: number;
  }>;
  channels: Array<{
    instanceId: string;
    displayName: string;
    phone: string | null;
    status: string;
    threadsCount: number;
    openCount: number;
  }>;
  departments: Array<{
    slug: string;
    name: string;
    totalCount: number;
    openCount: number;
    slaMinutes: number;
    slaBreachedCount: number;
    slaBreachedRate: number | null;
  }>;
  agents: Array<{
    profileId: string;
    fullName: string;
    avatarUrl: string | null;
    departmentName: string | null;
    presence: string;
    maxConcurrentChats: number;
    openThreads: number;
    resolvedThreads: number;
    avgFirstResponseSeconds: number | null;
  }>;
  filters: {
    availableChannels: Array<{ id: string; label: string; phone: string | null; status: string }>;
    availableDepartments: Array<{ slug: string; name: string }>;
    availableAgents: Array<{ id: string; fullName: string }>;
  };
};

function computePercentile(sortedAsc: number[], percentile: number): number | null {
  if (sortedAsc.length === 0) return null;
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, Math.ceil(sortedAsc.length * percentile) - 1));
  return sortedAsc[idx];
}

export async function _getAttendanceBusinessIntelligence(
  input?: z.input<typeof AttendanceBusinessIntelligenceSchema>,
  deps?: { db?: any; identity?: any; now?: () => Date },
): Promise<AttendanceBusinessIntelligenceDTO> {
  const parsed = AttendanceBusinessIntelligenceSchema.parse(input || {});
  const db = deps?.db ?? getServerClient();
  const identity = deps?.identity ?? (await getServerIdentity());
  const targetStoreId = parsed.storeId || identity.store_id;

  if (targetStoreId !== identity.store_id) {
    assertStoreAccess(identity, ["owner", "admin", "manager", "master", "platform_admin"], targetStoreId);
  } else {
    assertStoreAccess(identity, [...STAFF_MEMBER_ROLES], targetStoreId);
  }

  const nowDate = deps?.now ? deps.now() : new Date();
  const nowMs = nowDate.getTime();
  const rangeMs = parsed.rangeDays * 24 * 60 * 60 * 1000;
  const sinceMs = nowMs - rangeMs;

  const [threadsRes, instancesRes, departmentsRes, membersRes, transfersRes, rpcRes] = await Promise.all([
    db
      .from("chat_threads")
      .select(
        "id, status, assigned_to_profile_id, department, channel_instance_id, created_at, first_response_at, closed_at, satisfaction_rating",
      )
      .eq("store_id", targetStoreId)
      .order("created_at", { ascending: false })
      .limit(3000),
    db
      .from("whatsapp_channel_instances")
      .select("id, display_name, display_phone_number, status, is_active, is_default")
      .eq("store_id", targetStoreId)
      .order("is_default", { ascending: false }),
    db
      .from("chat_departments")
      .select("id, name, slug, sla_minutes")
      .eq("store_id", targetStoreId)
      .order("created_at", { ascending: true }),
    db
      .from("workspace_members")
      .select(
        "profile_id, role, department_id, default_department_slug, attendance_presence, max_concurrent_chats, is_attendance_agent, profiles(id, full_name, avatar_url)",
      )
      .eq("store_id", targetStoreId)
      .in("role", [...STAFF_MEMBER_ROLES]),
    db
      .from("chat_thread_transfers")
      .select("thread_id, created_at")
      .eq("store_id", targetStoreId)
      .gte("created_at", new Date(sinceMs).toISOString()),
    Promise.resolve(
      typeof db.rpc === "function"
        ? db.rpc("get_whatsapp_operations_metrics", { p_store_id: targetStoreId })
        : { data: null, error: null },
    ).catch(() => ({ data: null, error: null })),
  ]);

  if (threadsRes?.error) {
    throw new Error(`Falha ao consultar conversas de BI: ${threadsRes.error.message}`);
  }

  const allThreads: any[] = threadsRes?.data || [];
  const allInstances: any[] = instancesRes?.data || [];
  const allDepartments: any[] = departmentsRes?.data || [];
  const allMembers: any[] = membersRes?.data || [];
  const transferredThreadIds = new Set<string>(
    (transfersRes?.data || []).map((t: any) => t.thread_id).filter(Boolean),
  );
  const rpcMetrics = (rpcRes?.data && typeof rpcRes.data === "object"
    ? rpcRes.data
    : null) as WhatsAppOperationsMetricsDTO | null;

  const filteredThreads = allThreads.filter((t) => {
    if (parsed.channelInstanceId && t.channel_instance_id !== parsed.channelInstanceId) return false;
    if (parsed.departmentSlug && (t.department || "triagem") !== parsed.departmentSlug) return false;
    if (parsed.agentProfileId && t.assigned_to_profile_id !== parsed.agentProfileId) return false;
    return true;
  });

  const threadsCreatedInPeriod = filteredThreads.filter((t) => {
    const createdMs = t.created_at ? new Date(t.created_at).getTime() : 0;
    return Number.isFinite(createdMs) && createdMs >= sinceMs;
  });

  const closedInPeriodThreads = filteredThreads.filter((t) => {
    if (t.closed_at) {
      const closedMs = new Date(t.closed_at).getTime();
      return Number.isFinite(closedMs) && closedMs >= sinceMs;
    }
    return t.status === "closed" && t.created_at && new Date(t.created_at).getTime() >= sinceMs;
  });

  const openThreadsList = filteredThreads.filter((t) => t.status === "open");
  const unassignedThreads = openThreadsList.filter((t) => !t.assigned_to_profile_id).length;
  const awaitingFirstResponse = openThreadsList.filter((t) => !t.first_response_at).length;

  const firstResponseDurations: number[] = [];
  for (const t of threadsCreatedInPeriod) {
    if (t.first_response_at && t.created_at) {
      const diffSec = Math.round(
        (new Date(t.first_response_at).getTime() - new Date(t.created_at).getTime()) / 1000,
      );
      if (Number.isFinite(diffSec) && diffSec >= 0) firstResponseDurations.push(diffSec);
    }
  }
  firstResponseDurations.sort((a, b) => a - b);

  const avgFirstResponseSeconds =
    firstResponseDurations.length > 0
      ? Math.round(
          firstResponseDurations.reduce((acc, val) => acc + val, 0) / firstResponseDurations.length,
        )
      : null;
  const p95FirstResponseSeconds = computePercentile(firstResponseDurations, 0.95);

  const resolutionDurations: number[] = [];
  for (const t of closedInPeriodThreads) {
    if (t.closed_at && t.created_at) {
      const diffSec = Math.round(
        (new Date(t.closed_at).getTime() - new Date(t.created_at).getTime()) / 1000,
      );
      if (Number.isFinite(diffSec) && diffSec >= 0) resolutionDurations.push(diffSec);
    }
  }
  const avgResolutionSeconds =
    resolutionDurations.length > 0
      ? Math.round(resolutionDurations.reduce((acc, val) => acc + val, 0) / resolutionDurations.length)
      : null;

  const firstContactResolutionRate =
    closedInPeriodThreads.length > 0
      ? Math.round(
          (closedInPeriodThreads.filter((t) => !transferredThreadIds.has(t.id)).length /
            closedInPeriodThreads.length) *
            1000,
        ) / 10
      : null;

  const csatValues = threadsCreatedInPeriod
    .map((t) => Number(t.satisfaction_rating))
    .filter((v) => Number.isFinite(v) && v > 0);
  const csatAvg =
    csatValues.length > 0
      ? Math.round((csatValues.reduce((acc, v) => acc + v, 0) / csatValues.length) * 100) / 100
      : null;

  // Daily series (ordered oldest -> newest)
  const dayMap = new Map<string, { opened: number; resolved: number }>();
  for (let offset = parsed.rangeDays - 1; offset >= 0; offset--) {
    const d = new Date(nowMs - offset * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, { opened: 0, resolved: 0 });
  }
  for (const t of threadsCreatedInPeriod) {
    const key = typeof t.created_at === "string" ? t.created_at.slice(0, 10) : "";
    const bucket = dayMap.get(key);
    if (bucket) bucket.opened += 1;
  }
  for (const t of closedInPeriodThreads) {
    const rawDate = t.closed_at || t.created_at;
    const key = typeof rawDate === "string" ? rawDate.slice(0, 10) : "";
    const bucket = dayMap.get(key);
    if (bucket) bucket.resolved += 1;
  }
  const dailySeries = Array.from(dayMap.entries()).map(([date, counts]) => ({
    date,
    opened: counts.opened,
    resolved: counts.resolved,
  }));

  // Channels breakdown
  const channels = allInstances.map((inst) => {
    const matched = threadsCreatedInPeriod.filter((t) => t.channel_instance_id === inst.id);
    const openCount = filteredThreads.filter(
      (t) => t.channel_instance_id === inst.id && t.status === "open",
    ).length;
    return {
      instanceId: inst.id,
      displayName: inst.display_name || inst.display_phone_number || "Canal WhatsApp",
      phone: inst.display_phone_number || null,
      status: inst.status || "disconnected",
      threadsCount: matched.length,
      openCount,
    };
  });

  // Departments breakdown
  const deptById = new Map<string, any>(allDepartments.map((d) => [d.id, d]));
  const deptMetaBySlug = new Map<string, { slug: string; name: string; slaMinutes: number }>();
  for (const d of allDepartments) {
    deptMetaBySlug.set(d.slug, {
      slug: d.slug,
      name: d.name,
      slaMinutes: Number(d.sla_minutes || 15),
    });
  }
  for (const t of threadsCreatedInPeriod) {
    const slug = t.department || "triagem";
    if (!deptMetaBySlug.has(slug)) {
      deptMetaBySlug.set(slug, {
        slug,
        name: slug === "triagem" ? "Triagem Geral" : slug,
        slaMinutes: 15,
      });
    }
  }
  const departments = Array.from(deptMetaBySlug.values()).map((meta) => {
    const periodMatches = threadsCreatedInPeriod.filter(
      (t) => (t.department || "triagem") === meta.slug,
    );
    const openCount = filteredThreads.filter(
      (t) => (t.department || "triagem") === meta.slug && t.status === "open",
    ).length;
    const slaMs = meta.slaMinutes * 60 * 1000;
    const breachedCount = periodMatches.filter((t) => {
      if (!t.created_at) return false;
      const createdMs = new Date(t.created_at).getTime();
      if (t.first_response_at) {
        return new Date(t.first_response_at).getTime() - createdMs > slaMs;
      }
      return t.status === "open" && nowMs - createdMs > slaMs;
    }).length;
    return {
      slug: meta.slug,
      name: meta.name,
      totalCount: periodMatches.length,
      openCount,
      slaMinutes: meta.slaMinutes,
      slaBreachedCount: breachedCount,
      slaBreachedRate:
        periodMatches.length > 0
          ? Math.round((breachedCount / periodMatches.length) * 1000) / 10
          : null,
    };
  });

  // Real agents ranking
  const agents = allMembers
    .map((m) => {
      const profileId = m.profile_id;
      const fullName = m.profiles?.full_name?.trim() || "Colaborador sem nome";
      const avatarUrl = m.profiles?.avatar_url || null;
      const deptObj = m.department_id
        ? deptById.get(m.department_id)
        : m.default_department_slug
          ? deptMetaBySlug.get(m.default_department_slug)
          : null;
      const openThreads = filteredThreads.filter(
        (t) => t.assigned_to_profile_id === profileId && t.status === "open",
      ).length;
      const resolvedThreads = closedInPeriodThreads.filter(
        (t) => t.assigned_to_profile_id === profileId,
      ).length;
      const agentRespSec: number[] = [];
      for (const t of threadsCreatedInPeriod) {
        if (t.assigned_to_profile_id === profileId && t.first_response_at && t.created_at) {
          const diff = Math.round(
            (new Date(t.first_response_at).getTime() - new Date(t.created_at).getTime()) / 1000,
          );
          if (Number.isFinite(diff) && diff >= 0) agentRespSec.push(diff);
        }
      }
      const avgResp =
        agentRespSec.length > 0
          ? Math.round(agentRespSec.reduce((a, b) => a + b, 0) / agentRespSec.length)
          : null;

      return {
        profileId,
        fullName,
        avatarUrl,
        departmentName: deptObj?.name || null,
        presence: m.attendance_presence || "online",
        maxConcurrentChats: Number(m.max_concurrent_chats || 10),
        openThreads,
        resolvedThreads,
        avgFirstResponseSeconds: avgResp,
      };
    })
    .sort((a, b) => b.resolvedThreads + b.openThreads - (a.resolvedThreads + a.openThreads));

  return {
    storeId: targetStoreId,
    rangeDays: parsed.rangeDays,
    generatedAt: nowDate.toISOString(),
    summary: {
      totalThreadsInPeriod: threadsCreatedInPeriod.length,
      openThreads: openThreadsList.length,
      unassignedThreads,
      awaitingFirstResponse,
      closedInPeriod: closedInPeriodThreads.length,
      avgFirstResponseSeconds,
      p95FirstResponseSeconds,
      avgResolutionSeconds,
      firstContactResolutionRate,
      csatAvg,
      csatCount: csatValues.length,
      workerStatus: rpcMetrics?.health?.worker_status || "unknown",
      outboxPending: Number(rpcMetrics?.queue?.pending || 0),
      outboxFailed: Number(rpcMetrics?.queue?.failed || 0),
      outboxDeadLetter: Number(rpcMetrics?.queue?.dead_letter || 0),
    },
    dailySeries,
    channels,
    departments,
    agents,
    filters: {
      availableChannels: allInstances.map((i) => ({
        id: i.id,
        label: i.display_name || i.display_phone_number || "WhatsApp",
        phone: i.display_phone_number || null,
        status: i.status || "disconnected",
      })),
      availableDepartments: allDepartments.map((d) => ({
        slug: d.slug,
        name: d.name,
      })),
      availableAgents: allMembers.map((m) => ({
        id: m.profile_id,
        fullName: m.profiles?.full_name?.trim() || "Colaborador",
      })),
    },
  };
}

export const getWhatsAppOperationsMetrics = createServerFn({ method: "GET" })
  .validator(WhatsAppOperationsMetricsSchema.optional())
  .handler(async ({ data }): Promise<WhatsAppOperationsMetricsDTO | null> => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const storeId = data?.storeId || identity.store_id;
    if (storeId !== identity.store_id && !["owner", "admin", "manager", "master", "platform_admin"].includes(identity.role)) {
      throw new Error("Acesso negado ao tenant solicitado.");
    }
    const { data: metrics, error } = await getServerClient().rpc("get_whatsapp_operations_metrics", { p_store_id: storeId });
    if (error) throw new Error(`Falha ao consultar métricas WhatsApp: ${error.message}`);
    if (!metrics || typeof metrics !== "object") throw new Error("RPC de métricas retornou payload inválido.");
    return metrics as WhatsAppOperationsMetricsDTO;
  });

export const getAttendanceBusinessIntelligence = createServerFn({ method: "GET" })
  .validator(AttendanceBusinessIntelligenceSchema.optional())
  .handler(async ({ data }): Promise<AttendanceBusinessIntelligenceDTO> => {
    return await _getAttendanceBusinessIntelligence(data);
  });
