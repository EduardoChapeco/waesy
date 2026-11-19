export type ThreadSlaStatus = "ok" | "at_risk" | "breached";

export interface ThreadSlaEvaluationInput {
  status?: string | null;
  lastCustomerMessageAt?: string | null;
  lastStaffReplyAt?: string | null;
  lastMessageAt?: string | null;
  isLastReplyStaff?: boolean | null;
  departmentSlaMinutes?: number | null;
  nowMs?: number;
}

export interface ThreadSlaEvaluation {
  waitingForReply: boolean;
  waitingMinutes: number;
  slaMinutes: number;
  slaStatus: ThreadSlaStatus;
  isForgottenToday: boolean;
}

function toValidMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const parsed = Date.parse(String(iso));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * Avalia estritamente se a conversa aguarda resposta humana do atendente,
 * calculando minutos em fila, risco/estouro de SLA do setor e sinalizador "Esquecidos hoje".
 */
export function computeThreadSlaStatus(input: ThreadSlaEvaluationInput): ThreadSlaEvaluation {
  const nowMs = typeof input.nowMs === "number" && Number.isFinite(input.nowMs) ? input.nowMs : Date.now();
  const slaMinutes =
    typeof input.departmentSlaMinutes === "number" &&
    Number.isFinite(input.departmentSlaMinutes) &&
    input.departmentSlaMinutes > 0
      ? Math.round(input.departmentSlaMinutes)
      : 15;

  const normalizedStatus = String(input.status || "open").toLowerCase();
  if (normalizedStatus === "closed" || normalizedStatus === "resolved" || normalizedStatus === "archived") {
    return {
      waitingForReply: false,
      waitingMinutes: 0,
      slaMinutes,
      slaStatus: "ok",
      isForgottenToday: false,
    };
  }

  let customerMs = toValidMs(input.lastCustomerMessageAt);
  let staffMs = toValidMs(input.lastStaffReplyAt);

  // Retrocompatibilidade para linhas legadas antes dos timestamps separados
  if (customerMs === 0 && staffMs === 0) {
    const lastMsgMs = toValidMs(input.lastMessageAt);
    if (lastMsgMs > 0) {
      if (input.isLastReplyStaff) staffMs = lastMsgMs;
      else customerMs = lastMsgMs;
    }
  }

  const waitingForReply = customerMs > 0 && (staffMs === 0 || customerMs > staffMs);
  const waitingMinutes = waitingForReply ? Math.max(0, Math.round((nowMs - customerMs) / 60_000)) : 0;

  let slaStatus: ThreadSlaStatus = "ok";
  if (waitingForReply) {
    if (waitingMinutes >= slaMinutes) {
      slaStatus = "breached";
    } else if (waitingMinutes >= Math.ceil(slaMinutes * 0.7)) {
      slaStatus = "at_risk";
    }
  }

  const isWithinLast24Hours = customerMs > 0 && nowMs - customerMs <= 24 * 3600_000;
  const isForgottenToday = Boolean(
    waitingForReply &&
      isWithinLast24Hours &&
      (slaStatus === "breached" || waitingMinutes >= Math.min(slaMinutes, 60)),
  );

  return {
    waitingForReply,
    waitingMinutes,
    slaMinutes,
    slaStatus,
    isForgottenToday,
  };
}

export interface SlaAlertThreadItem {
  id: string;
  guestName: string;
  phone: string | null;
  department: string;
  waitingMinutes: number;
  slaMinutes: number;
  slaStatus: ThreadSlaStatus;
  isForgottenToday: boolean;
}

export interface SlaAlertsSummary {
  waitingCount: number;
  atRiskCount: number;
  breachedCount: number;
  forgottenTodayCount: number;
  forgottenLeadsCount: number;
  forgottenThreads: SlaAlertThreadItem[];
}

export function computeSlaAlertsSummary(
  threads: Array<{
    id: string;
    customer?: { full_name?: string | null; phone?: string | null } | null;
    department?: string | null;
    waiting_for_reply?: boolean;
    waiting_minutes?: number;
    sla_minutes?: number;
    sla_status?: ThreadSlaStatus;
    is_forgotten_today?: boolean;
  }>,
  forgottenLeadsCount = 0,
): SlaAlertsSummary {
  let waitingCount = 0;
  let atRiskCount = 0;
  let breachedCount = 0;
  let forgottenTodayCount = 0;
  const forgottenThreads: SlaAlertThreadItem[] = [];

  for (const t of threads) {
    if (t.waiting_for_reply) waitingCount += 1;
    if (t.sla_status === "at_risk") atRiskCount += 1;
    if (t.sla_status === "breached") breachedCount += 1;
    if (t.is_forgotten_today) {
      forgottenTodayCount += 1;
      forgottenThreads.push({
        id: t.id,
        guestName: String(t.customer?.full_name || "Cliente"),
        phone: t.customer?.phone || null,
        department: String(t.department || "geral"),
        waitingMinutes: Number(t.waiting_minutes || 0),
        slaMinutes: Number(t.sla_minutes || 15),
        slaStatus: t.sla_status || "breached",
        isForgottenToday: true,
      });
    }
  }

  forgottenThreads.sort((a, b) => b.waitingMinutes - a.waitingMinutes);

  return {
    waitingCount,
    atRiskCount,
    breachedCount,
    forgottenTodayCount,
    forgottenLeadsCount,
    forgottenThreads: forgottenThreads.slice(0, 15),
  };
}
