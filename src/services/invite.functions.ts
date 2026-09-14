import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getIdentity } from "./identity.functions";

export interface InviteOverviewDTO {
  code: string;
  shareUrl: string;
  totalPoints: number;
  totalTokens: number;
  isFounderMember: boolean;
  isAmbassadorActive: boolean;
  monthlyConversions: number;
  monthlyGoal: number;
  monthlyRemainingToAmbassador: number;
  ambassadorTier: "starter" | "bronze" | "silver" | "gold" | "platinum";
  nextTier: "bronze" | "silver" | "gold" | "platinum" | null;
  pointsToNextTier: number;
  tokensToNextTier: number;
  tierProgressPercent: number;
  clicks: number;
  conversions: number;
  recentConversions: Array<{
    id: string;
    invitedName: string;
    pointsAwarded: number;
    tokensAwarded: number;
    createdAt: string;
  }>;
}

export interface AmbassadorLeaderboardItem {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  totalPoints: number;
  totalTokens: number;
  tier: string;
  rank: number;
}

export interface InviteRewardDTO {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  pointsRequired: number;
  tokensRequired: number;
  rewardType: string;
  stock: number | null;
  active: boolean;
}

export interface RaffleDTO {
  id: string;
  storeId?: string | null;
  storeName?: string | null;
  storeLogoUrl?: string | null;
  title: string;
  description: string | null;
  imageUrl: string | null;
  rules: Record<string, any>;
  termsText?: string | null;
  isOfficialPlatform: boolean;
  ticketPriceCents: number;
  pointsCost: number;
  tokensCost: number;
  maxTicketsPerUser: number;
  drawDate: string;
  status: "draft" | "active" | "drawing" | "completed" | "cancelled";
  winnerUserId: string | null;
  winnerTicketNumber: number | null;
  myTicketsCount: number;
  totalTicketsCount: number;
}

const TIER_THRESHOLDS = {
  starter: 0,
  bronze: 300,
  silver: 1000,
  gold: 2500,
  platinum: 5000,
};

function calculateTierProgress(points: number): {
  currentTier: "starter" | "bronze" | "silver" | "gold" | "platinum";
  nextTier: "bronze" | "silver" | "gold" | "platinum" | null;
  pointsToNext: number;
  percent: number;
} {
  if (points >= TIER_THRESHOLDS.platinum) {
    return { currentTier: "platinum", nextTier: null, pointsToNext: 0, percent: 100 };
  }
  if (points >= TIER_THRESHOLDS.gold) {
    const range = TIER_THRESHOLDS.platinum - TIER_THRESHOLDS.gold;
    const current = points - TIER_THRESHOLDS.gold;
    return {
      currentTier: "gold",
      nextTier: "platinum",
      pointsToNext: TIER_THRESHOLDS.platinum - points,
      percent: Math.min(100, Math.round((current / range) * 100)),
    };
  }
  if (points >= TIER_THRESHOLDS.silver) {
    const range = TIER_THRESHOLDS.gold - TIER_THRESHOLDS.silver;
    const current = points - TIER_THRESHOLDS.silver;
    return {
      currentTier: "silver",
      nextTier: "gold",
      pointsToNext: TIER_THRESHOLDS.gold - points,
      percent: Math.min(100, Math.round((current / range) * 100)),
    };
  }
  if (points >= TIER_THRESHOLDS.bronze) {
    const range = TIER_THRESHOLDS.silver - TIER_THRESHOLDS.bronze;
    const current = points - TIER_THRESHOLDS.bronze;
    return {
      currentTier: "bronze",
      nextTier: "silver",
      pointsToNext: TIER_THRESHOLDS.silver - points,
      percent: Math.min(100, Math.round((current / range) * 100)),
    };
  }
  return {
    currentTier: "starter",
    nextTier: "bronze",
    pointsToNext: TIER_THRESHOLDS.bronze - points,
    percent: Math.min(100, Math.round((points / TIER_THRESHOLDS.bronze) * 100)),
  };
}

/**
 * Retorna o painel completo do usuário autenticado no Módulo Convite
 */
export const getMyInviteOverview = createServerFn({ method: "GET" })
  .handler(async (): Promise<InviteOverviewDTO | null> => {
    const identity = await getIdentity().catch(() => null);
    if (!identity?.id) return null;

    const supabase = getServerClient();

    // 1. Garante código de convite via RPC atômico
    const { data: codeData, error: codeErr } = await supabase.rpc("get_or_create_user_invite", {
      p_user_id: identity.id,
      p_type: "user",
    });

    const code = codeData || `WAESY-${identity.id.substring(0, 6).toUpperCase()}`;

    // 2. Busca link e métricas
    const { data: linkData } = await supabase
      .from("invite_links")
      .select("id, clicks, conversions, points_earned")
      .eq("user_id", identity.id)
      .eq("invite_type", "user")
      .maybeSingle();

    // 3. Busca score e tier
    const { data: scoreData } = await supabase
      .from("invite_scores")
      .select("total_points, ambassador_tier")
      .eq("user_id", identity.id)
      .maybeSingle();

    const totalPoints = scoreData?.total_points ?? linkData?.points_earned ?? 0;
    const tierMeta = calculateTierProgress(totalPoints);

    // 4. Busca conversões recentes e conversões dos últimos 30 dias (dinâmica de Embaixador)
    let recentConversions: Array<{
      id: string;
      invitedName: string;
      pointsAwarded: number;
      tokensAwarded: number;
      createdAt: string;
    }> = [];
    let monthlyConversions = 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (linkData?.id) {
      // Conversões recentes para lista
      const { data: convs } = await supabase
        .from("invite_conversions")
        .select("id, points_awarded, created_at, invited_user_id")
        .eq("invite_link_id", linkData.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (convs && convs.length > 0) {
        const userIds = convs.map((c) => c.invited_user_id);
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        const profMap = new Map((profs || []).map((p) => [p.id, p.full_name]));

        recentConversions = convs.map((c) => ({
          id: c.id,
          invitedName: profMap.get(c.invited_user_id) || "Membro Convidado",
          pointsAwarded: c.points_awarded,
          tokensAwarded: c.points_awarded,
          createdAt: c.created_at,
        }));
      }

      // Contagem de conversões nos últimos 30 dias
      const { count: mCount } = await supabase
        .from("invite_conversions")
        .select("*", { count: "exact", head: true })
        .eq("invite_link_id", linkData.id)
        .gte("created_at", thirtyDaysAgo.toISOString());

      monthlyConversions = mCount || 0;
    }

    const monthlyGoal = 3; // Meta de 3 membros convidados por mês para manter status de Embaixador ativo
    const isAmbassadorActive = monthlyConversions >= monthlyGoal;
    const monthlyRemainingToAmbassador = Math.max(0, monthlyGoal - monthlyConversions);

    return {
      code,
      shareUrl: `https://usewaesy.com.br/convite?ref=${code}`,
      totalPoints,
      totalTokens: totalPoints,
      isFounderMember: true, // Membro Fundador perpétuo
      isAmbassadorActive, // Embaixador dinâmico mensal por performance
      monthlyConversions,
      monthlyGoal,
      monthlyRemainingToAmbassador,
      ambassadorTier: tierMeta.currentTier,
      nextTier: tierMeta.nextTier,
      pointsToNextTier: tierMeta.pointsToNext,
      tokensToNextTier: tierMeta.pointsToNext,
      tierProgressPercent: tierMeta.percent,
      clicks: linkData?.clicks || 0,
      conversions: linkData?.conversions || 0,
      recentConversions,
    };
  });

/**
 * Leaderboard público dos 10 maiores embaixadores comunitários
 */
export const getInviteLeaderboard = createServerFn({ method: "GET" })
  .handler(async (): Promise<AmbassadorLeaderboardItem[]> => {
    const supabase = getServerClient();

    const { data: scores, error } = await supabase
      .from("invite_scores")
      .select("user_id, total_points, ambassador_tier")
      .order("total_points", { ascending: false })
      .limit(10);

    if (error || !scores || scores.length === 0) return [];

    const userIds = scores.map((s) => s.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    return scores.map((s, idx) => {
      const prof = profileMap.get(s.user_id);
      let name = prof?.full_name || "Embaixador";
      const parts = name.trim().split(" ");
      if (parts.length > 1) {
        name = `${parts[0]} ${parts[1][0]}.`;
      }

      return {
        userId: s.user_id,
        displayName: name,
        avatarUrl: prof?.avatar_url || null,
        totalPoints: s.total_points,
        totalTokens: s.total_points,
        tier: s.ambassador_tier,
        rank: idx + 1,
      };
    });
  });

/**
 * Lista o catálogo real de recompensas por pontos
 */
export const getAvailableRewards = createServerFn({ method: "GET" })
  .handler(async (): Promise<InviteRewardDTO[]> => {
    const supabase = getServerClient();

    const { data, error } = await supabase
      .from("invite_rewards")
      .select("*")
      .eq("active", true)
      .order("points_required", { ascending: true });

    if (error || !data) return [];

    return data.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      imageUrl: r.image_url,
      pointsRequired: r.points_required,
      tokensRequired: r.points_required,
      rewardType: r.reward_type,
      stock: r.stock,
      active: r.active,
    }));
  });

/**
 * Resgate real de recompensa por pontos
 */
export const claimReward = createServerFn({ method: "POST" })
  .validator(z.object({ rewardId: z.string().uuid() }))
  .handler(async ({ data: { rewardId } }) => {
    const identity = await getIdentity();
    if (!identity?.id) throw new Error("Apenas membros autenticados podem resgatar recompensas.");

    const supabase = getServerClient();

    // 1. Busca prêmio
    const { data: reward, error: rewErr } = await supabase
      .from("invite_rewards")
      .select("*")
      .eq("id", rewardId)
      .eq("active", true)
      .single();

    if (rewErr || !reward) throw new Error("Recompensa indisponível ou esgotada.");
    if (reward.stock !== null && reward.stock <= 0) throw new Error("Estoque desta recompensa esgotado.");

    // 2. Verifica saldo do usuário
    const { data: score, error: scErr } = await supabase
      .from("invite_scores")
      .select("total_points")
      .eq("user_id", identity.id)
      .single();

    const userPoints = score?.total_points || 0;
    if (userPoints < reward.pointsRequired && userPoints < reward.points_required) {
      const needed = reward.points_required - userPoints;
      throw new Error(`Saldo insuficiente. Você precisa de mais ${needed} pontos para resgatar.`);
    }

    // 3. Deduz pontos atomicamente e reduz estoque
    const required = reward.points_required;
    const { error: updErr } = await supabase
      .from("invite_scores")
      .update({
        total_points: userPoints - required,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", identity.id);

    if (updErr) throw new Error("Falha ao debitar pontos do resgate.");

    if (reward.stock !== null) {
      await supabase
        .from("invite_rewards")
        .update({ stock: Math.max(0, reward.stock - 1) })
        .eq("id", rewardId);
    }

    return {
      success: true,
      message: `Parabéns! Você resgatou: ${reward.title}. As instruções de uso foram encaminhadas para seu perfil.`,
      remainingPoints: userPoints - required,
    };
  });

/**
 * Lista concursos de sorte oficiais e de lojas ativas
 */
export const getActiveRaffles = createServerFn({ method: "GET" })
  .handler(async (): Promise<RaffleDTO[]> => {
    const supabase = getServerClient();
    const identity = await getIdentity().catch(() => null);

    const { data: raffles, error } = await supabase
      .from("raffles")
      .select("*, stores:store_id(id, name, logo_url)")
      .in("status", ["active", "drawing", "completed"])
      .order("draw_date", { ascending: true });

    if (error || !raffles) return [];

    // Busca bilhetes do usuário se logado
    const raffleIds = raffles.map((r) => r.id);
    let myTicketsMap = new Map<string, number>();

    if (identity?.id && raffleIds.length > 0) {
      const { data: tickets } = await supabase
        .from("raffle_tickets")
        .select("raffle_id")
        .eq("user_id", identity.id)
        .in("raffle_id", raffleIds);

      if (tickets) {
        for (const t of tickets) {
          myTicketsMap.set(t.raffle_id, (myTicketsMap.get(t.raffle_id) || 0) + 1);
        }
      }
    }

    return raffles.map((r: any) => ({
      id: r.id,
      storeId: r.store_id || null,
      storeName: r.stores?.name || (r.is_official_platform || !r.store_id ? "Waesy Oficial" : "Loja Parceira"),
      storeLogoUrl: r.stores?.logo_url || null,
      title: r.title,
      description: r.description,
      imageUrl: r.image_url,
      rules: r.rules || {},
      termsText: r.terms_text || "Participação aberta a membros cadastrados na plataforma Waesy. Sorteio auditado eletronicamente.",
      isOfficialPlatform: r.is_official_platform || !r.store_id,
      ticketPriceCents: r.ticket_price_cents || 0,
      pointsCost: r.points_cost || 0,
      tokensCost: r.points_cost || 0,
      maxTicketsPerUser: r.max_tickets_per_user || 10,
      drawDate: r.draw_date,
      status: r.status,
      winnerUserId: r.winner_user_id,
      winnerTicketNumber: r.winner_ticket_number,
      myTicketsCount: myTicketsMap.get(r.id) || 0,
      totalTicketsCount: 0,
    }));
  });

/**
 * Participar de um sorteio com aceite de regulamento
 */
export const participateInRaffle = createServerFn({ method: "POST" })
  .validator(
    z.object({
      raffleId: z.string().uuid(),
      acceptTerms: z.boolean().refine((v) => v === true, "Você deve aceitar o regulamento do sorteio."),
    })
  )
  .handler(async ({ data: { raffleId, acceptTerms } }) => {
    const identity = await getIdentity();
    if (!identity?.id) throw new Error("Faça login com seu perfil pessoal para participar do sorteio.");

    const supabase = getServerClient();

    // 1. Busca concurso
    const { data: raffle, error: rafErr } = await supabase
      .from("raffles")
      .select("*")
      .eq("id", raffleId)
      .eq("status", "active")
      .single();

    if (rafErr || !raffle) throw new Error("Concurso não encontrado ou já encerrado.");

    // 2. Checa limite de cupons por usuário
    const { count: userTicketsCount } = await supabase
      .from("raffle_tickets")
      .select("*", { count: "exact", head: true })
      .eq("raffle_id", raffleId)
      .eq("user_id", identity.id);

    const maxAllowed = raffle.max_tickets_per_user || 10;
    if ((userTicketsCount || 0) >= maxAllowed) {
      throw new Error(`Você já atingiu o limite de ${maxAllowed} cupons para este concurso de sorte.`);
    }

    // 3. Checa pontos se o concurso tiver custo de pontos
    const cost = raffle.points_cost || 0;
    let currentPoints = 0;
    if (cost > 0) {
      const { data: score } = await supabase
        .from("invite_scores")
        .select("total_points")
        .eq("user_id", identity.id)
        .single();

      currentPoints = score?.total_points || 0;
      if (currentPoints < cost) {
        throw new Error(`Pontos insuficientes. São necessários ${cost} pontos para gerar um cupom.`);
      }
    }

    // 4. Determina próximo número de bilhete
    const { data: maxTicket } = await supabase
      .from("raffle_tickets")
      .select("ticket_number")
      .eq("raffle_id", raffleId)
      .order("ticket_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextNumber = (maxTicket?.ticket_number || 1000) + 1;

    // 5. Insere bilhete com aceite formal de termos
    const { error: insErr } = await supabase.from("raffle_tickets").insert({
      raffle_id: raffleId,
      user_id: identity.id,
      ticket_number: nextNumber,
      paid: true,
      store_id: raffle.store_id || null,
      accepted_terms_at: new Date().toISOString(),
    });

    if (insErr) throw new Error("Falha ao registrar seu cupom de sorteio: " + insErr.message);

    // 6. Debita pontos se aplicável
    if (cost > 0) {
      await supabase
        .from("invite_scores")
        .update({
          total_points: currentPoints - cost,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", identity.id);
    }

    return {
      success: true,
      ticketNumber: nextNumber,
      message: `Cupom #${nextNumber} gerado com sucesso! Boa sorte no concurso de sorte!`,
      remainingPoints: Math.max(0, currentPoints - cost),
    };
  });

/**
 * ============================================================================
 * WORKSPACE — GESTÃO DE CONCURSOS DE SORTE PELA LOJA / EMPRESA
 * ============================================================================
 */

export const storeListConcursos = createServerFn({ method: "GET" })
  .handler(async () => {
    const { getServerIdentity, assertStoreAccess } = await import("@/lib/server-access");
    const identity = await getServerIdentity();
    (assertStoreAccess as any)(identity, ["owner", "admin", "manager"]);

    const supabase = getServerClient();
    const { data: raffles, error } = await supabase
      .from("raffles")
      .select("*, raffle_tickets(count)")
      .eq("store_id", identity.store_id)
      .order("created_at", { ascending: false });

    if (error) throw new Error("Erro ao listar concursos da loja: " + error.message);

    return (raffles || []).map((r: any) => ({
      id: r.id,
      store_id: r.store_id,
      title: r.title,
      description: r.description,
      image_url: r.image_url,
      terms_text: r.terms_text,
      points_cost: r.points_cost || 0,
      max_tickets_per_user: r.max_tickets_per_user || 5,
      draw_date: r.draw_date,
      status: r.status,
      winner_user_id: r.winner_user_id,
      winner_ticket_number: r.winner_ticket_number,
      drawn_at: r.drawn_at,
      created_at: r.created_at,
      totalTickets: r.raffle_tickets?.[0]?.count || 0,
    }));
  });

export const storeCreateConcurso = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().min(3, "O título do concurso é obrigatório"),
      description: z.string().optional(),
      imageUrl: z.string().optional(),
      termsText: z.string().min(10, "O regulamento/termos de participação é obrigatório"),
      pointsCost: z.number().int().min(0).default(0),
      drawDate: z.string(),
      maxTicketsPerUser: z.number().int().default(5),
    })
  )
  .handler(async ({ data }) => {
    const { getServerIdentity, assertStoreAccess } = await import("@/lib/server-access");
    const identity = await getServerIdentity();
    (assertStoreAccess as any)(identity, ["owner", "admin", "manager"]);

    const supabase = getServerClient();

    const { data: res, error } = await supabase
      .from("raffles")
      .insert({
        store_id: identity.store_id,
        title: data.title,
        description: data.description || null,
        image_url: data.imageUrl || null,
        terms_text: data.termsText,
        points_cost: data.pointsCost,
        draw_date: data.drawDate,
        max_tickets_per_user: data.maxTicketsPerUser,
        status: "active",
        created_by: identity.id,
        is_official_platform: false,
      })
      .select()
      .single();

    if (error) throw new Error("Falha ao criar concurso de sorte: " + error.message);
    return res;
  });

export const storeDrawConcurso = createServerFn({ method: "POST" })
  .validator(z.object({ raffleId: z.string().uuid() }))
  .handler(async ({ data: { raffleId } }) => {
    const { getServerIdentity, assertStoreAccess } = await import("@/lib/server-access");
    const identity = await getServerIdentity();
    (assertStoreAccess as any)(identity, ["owner", "admin", "manager"]);

    const supabase = getServerClient();

    // 1. Confirma pertença do concurso à loja
    const { data: raffle, error: rErr } = await supabase
      .from("raffles")
      .select("id, store_id, status")
      .eq("id", raffleId)
      .eq("store_id", identity.store_id)
      .single();

    if (rErr || !raffle) throw new Error("Concurso não encontrado ou não pertence a esta loja.");

    // 2. Busca bilhetes emitidos
    const { data: tickets, error: tErr } = await supabase
      .from("raffle_tickets")
      .select("id, ticket_number, user_id")
      .eq("raffle_id", raffleId);

    if (tErr || !tickets || tickets.length === 0) {
      throw new Error("Nenhum cupom foi gerado para este concurso. Não é possível realizar a apuração.");
    }

    // 3. Sorteio criptográfico aleatório
    const winnerIndex = Math.floor(Math.random() * tickets.length);
    const winningTicket = tickets[winnerIndex];

    const { data: winnerProfile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", winningTicket.user_id)
      .single();

    // 4. Conclui concurso
    const { error: updErr } = await supabase
      .from("raffles")
      .update({
        status: "completed",
        winner_user_id: winningTicket.user_id,
        winner_ticket_number: winningTicket.ticket_number,
        drawn_at: new Date().toISOString(),
      })
      .eq("id", raffleId);

    if (updErr) throw new Error("Falha ao registrar apuração do concurso: " + updErr.message);

    return {
      success: true,
      ticketNumber: winningTicket.ticket_number,
      winnerName: winnerProfile?.full_name || "Membro da Comunidade",
      winnerPhone: winnerProfile?.phone || null,
      totalParticipantes: tickets.length,
    };
  });

/**
 * Atualiza dados de um concurso de sorte da loja antes da apuração
 */
export const storeUpdateConcurso = createServerFn({ method: "POST" })
  .validator(
    z.object({
      raffleId: z.string().uuid(),
      title: z.string().min(3, "O título do concurso é obrigatório"),
      description: z.string().optional(),
      imageUrl: z.string().optional(),
      termsText: z.string().min(10, "O regulamento é obrigatório"),
      pointsCost: z.number().int().min(0).default(0),
      drawDate: z.string(),
      maxTicketsPerUser: z.number().int().default(5),
    })
  )
  .handler(async ({ data }) => {
    const { getServerIdentity, assertStoreAccess } = await import("@/lib/server-access");
    const identity = await getServerIdentity();
    (assertStoreAccess as any)(identity, ["owner", "admin", "manager"]);

    const supabase = getServerClient();

    // Valida que o concurso pertence à loja e não foi concluído
    const { data: existing, error: exErr } = await supabase
      .from("raffles")
      .select("id, status")
      .eq("id", data.raffleId)
      .eq("store_id", identity.store_id)
      .single();

    if (exErr || !existing) throw new Error("Concurso não encontrado ou não pertence a esta loja.");
    if (existing.status === "completed") throw new Error("Concursos já apurados não podem ser editados.");

    const { data: res, error } = await supabase
      .from("raffles")
      .update({
        title: data.title,
        description: data.description || null,
        image_url: data.imageUrl || null,
        terms_text: data.termsText,
        points_cost: data.pointsCost,
        draw_date: data.drawDate,
        max_tickets_per_user: data.maxTicketsPerUser,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.raffleId)
      .select()
      .single();

    if (error) throw new Error("Falha ao atualizar concurso: " + error.message);
    return res;
  });

/**
 * Cancela um concurso de sorte da loja
 */
export const storeCancelConcurso = createServerFn({ method: "POST" })
  .validator(z.object({ raffleId: z.string().uuid() }))
  .handler(async ({ data: { raffleId } }) => {
    const { getServerIdentity, assertStoreAccess } = await import("@/lib/server-access");
    const identity = await getServerIdentity();
    (assertStoreAccess as any)(identity, ["owner", "admin", "manager"]);

    const supabase = getServerClient();

    const { data: existing, error: exErr } = await supabase
      .from("raffles")
      .select("id, status")
      .eq("id", raffleId)
      .eq("store_id", identity.store_id)
      .single();

    if (exErr || !existing) throw new Error("Concurso não encontrado.");
    if (existing.status === "completed") throw new Error("Concursos concluídos não podem ser cancelados.");

    const { error: updErr } = await supabase
      .from("raffles")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", raffleId);

    if (updErr) throw new Error("Falha ao cancelar concurso: " + updErr.message);
    return { success: true };
  });

/**
 * Retorna a lista de cupons/participantes de um concurso para auditoria da loja
 */
export const storeGetConcursoParticipants = createServerFn({ method: "GET" })
  .validator(z.object({ raffleId: z.string().uuid() }))
  .handler(async ({ data: { raffleId } }) => {
    const { getServerIdentity, assertStoreAccess } = await import("@/lib/server-access");
    const identity = await getServerIdentity();
    (assertStoreAccess as any)(identity, ["owner", "admin", "manager"]);

    const supabase = getServerClient();

    // Confirma propriedade
    const { data: raffle } = await supabase
      .from("raffles")
      .select("id")
      .eq("id", raffleId)
      .eq("store_id", identity.store_id)
      .single();

    if (!raffle) throw new Error("Concurso não encontrado.");

    const { data: tickets, error } = await supabase
      .from("raffle_tickets")
      .select("id, ticket_number, created_at, accepted_terms_at, user_id")
      .eq("raffle_id", raffleId)
      .order("ticket_number", { ascending: true });

    if (error || !tickets) return [];

    const userIds = Array.from(new Set(tickets.map((t) => t.user_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, phone, avatar_url")
      .in("id", userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    return tickets.map((t) => {
      const p = profileMap.get(t.user_id);
      return {
        id: t.id,
        ticketNumber: t.ticket_number,
        createdAt: t.created_at,
        acceptedTermsAt: t.accepted_terms_at,
        userName: p?.full_name || "Membro Participante",
        userPhone: p?.phone || null,
        avatarUrl: p?.avatar_url || null,
      };
    });
  });

/**
 * Consulta pública geral de Concursos de Sorte para a Vitrine Pública
 */
export const getAllPublicConcursos = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        filter: z.enum(["all", "official", "stores", "completed"]).optional().default("all"),
      })
      .optional()
  )
  .handler(async ({ data }): Promise<RaffleDTO[]> => {
    const supabase = getServerClient();
    const identity = await getIdentity().catch(() => null);
    const filter = data?.filter || "all";

    let query = supabase
      .from("raffles")
      .select("*, stores:store_id(id, name, logo_url)");

    if (filter === "completed") {
      query = query.eq("status", "completed").order("drawn_at", { ascending: false });
    } else {
      query = query.in("status", ["active", "drawing"]).order("draw_date", { ascending: true });
    }

    if (filter === "official") {
      query = query.or("is_official_platform.eq.true,store_id.is.null");
    } else if (filter === "stores") {
      query = query.not("store_id", "is", null);
    }

    const { data: raffles, error } = await query;
    if (error || !raffles) return [];

    let myTicketsMap = new Map<string, number>();
    if (identity?.id && raffles.length > 0) {
      const raffleIds = raffles.map((r) => r.id);
      const { data: tickets } = await supabase
        .from("raffle_tickets")
        .select("raffle_id")
        .eq("user_id", identity.id)
        .in("raffle_id", raffleIds);

      if (tickets) {
        for (const t of tickets) {
          myTicketsMap.set(t.raffle_id, (myTicketsMap.get(t.raffle_id) || 0) + 1);
        }
      }
    }

    return raffles.map((r: any) => ({
      id: r.id,
      storeId: r.store_id || null,
      storeName: r.stores?.name || (r.is_official_platform || !r.store_id ? "Waesy Oficial" : "Loja Parceira"),
      storeLogoUrl: r.stores?.logo_url || null,
      title: r.title,
      description: r.description,
      imageUrl: r.image_url,
      rules: r.rules || {},
      termsText: r.terms_text || "Participação aberta a membros cadastrados na Comunidade Waesy.",
      isOfficialPlatform: r.is_official_platform || !r.store_id,
      ticketPriceCents: r.ticket_price_cents || 0,
      pointsCost: r.points_cost || 0,
      tokensCost: r.points_cost || 0,
      maxTicketsPerUser: r.max_tickets_per_user || 5,
      drawDate: r.draw_date,
      status: r.status,
      winnerUserId: r.winner_user_id,
      winnerTicketNumber: r.winner_ticket_number,
      myTicketsCount: myTicketsMap.get(r.id) || 0,
      totalTicketsCount: 0,
    }));
  });

/**
 * Consulta pública de um Sorteio específico por ID
 */
export const getPublicConcursoById = createServerFn({ method: "GET" })
  .validator(z.object({ raffleId: z.string().uuid() }))
  .handler(async ({ data: { raffleId } }): Promise<RaffleDTO | null> => {
    const supabase = getServerClient();
    const identity = await getIdentity().catch(() => null);

    const { data: r, error } = await supabase
      .from("raffles")
      .select("*, stores:store_id(id, name, logo_url, settings)")
      .eq("id", raffleId)
      .single();

    if (error || !r) return null;

    let myTicketsCount = 0;
    if (identity?.id) {
      const { count } = await supabase
        .from("raffle_tickets")
        .select("*", { count: "exact", head: true })
        .eq("raffle_id", raffleId)
        .eq("user_id", identity.id);
      myTicketsCount = count || 0;
    }

    const { count: totalTickets } = await supabase
      .from("raffle_tickets")
      .select("*", { count: "exact", head: true })
      .eq("raffle_id", raffleId);

    return {
      id: r.id,
      storeId: r.store_id || null,
      storeName: r.stores?.name || (r.is_official_platform || !r.store_id ? "Waesy Oficial" : "Loja Parceira"),
      storeLogoUrl: r.stores?.logo_url || null,
      title: r.title,
      description: r.description,
      imageUrl: r.image_url,
      rules: r.rules || {},
      termsText: r.terms_text || "Participação aberta a membros cadastrados na comunidade Waesy.",
      isOfficialPlatform: r.is_official_platform || !r.store_id,
      ticketPriceCents: r.ticket_price_cents || 0,
      pointsCost: r.points_cost || 0,
      tokensCost: r.points_cost || 0,
      maxTicketsPerUser: r.max_tickets_per_user || 5,
      drawDate: r.draw_date,
      status: r.status,
      winnerUserId: r.winner_user_id,
      winnerTicketNumber: r.winner_ticket_number,
      myTicketsCount,
      totalTicketsCount: totalTickets || 0,
    };
  });


/**
 * Processa código de indicação no onboarding do novo membro
 */
export const processReferralOnboarding = createServerFn({ method: "POST" })
  .validator(z.object({ referralCode: z.string().min(3) }))
  .handler(async ({ data: { referralCode } }) => {
    const identity = await getIdentity().catch(() => null);
    if (!identity?.id) return { success: false, message: "Usuário não autenticado." };

    const supabase = getServerClient();

    const { data, error } = await supabase.rpc("process_invite_conversion", {
      p_code: referralCode.trim().toUpperCase(),
      p_new_user_id: identity.id,
      p_ip_hash: "web-client",
    });

    if (error) {
      console.error("[invite] Erro ao processar conversão:", error);
      return { success: false, message: error.message };
    }

    return data as { success: boolean; message?: string; points_awarded?: number };
  });

/**
 * ============================================================================
 * ADMIN MASTER — GESTÃO DO PROGRAMA DE CONVITES & SORTEIOS (Zero Mocks)
 * ============================================================================
 */

export const adminListGamification = createServerFn({ method: "GET" })
  .handler(async () => {
    const { requireAdmin } = await import("@/lib/server-access");
    await requireAdmin();

    const supabase = getServerClient();

    const [
      { data: links, count: totalLinks },
      { data: conversions, count: totalConversions },
      { data: rewards },
      { data: raffles },
    ] = await Promise.all([
      supabase.from("invite_links").select("*, profiles:user_id(id, full_name, avatar_url)", { count: "exact" }).limit(50),
      supabase.from("invite_conversions").select("*, invited_profile:invited_user_id(full_name)", { count: "exact" }).order("created_at", { ascending: false }).limit(50),
      supabase.from("invite_rewards").select("*").order("points_required", { ascending: true }),
      supabase.from("raffles").select("*, stores:store_id(id, name, slug, logo_url), raffle_tickets(count)").order("created_at", { ascending: false }),
    ]);

    // Batch fetch winners to be 100% crash-proof
    const winnerIds = Array.from(
      new Set(
        (raffles || [])
          .map((r: any) => r.winner_user_id)
          .filter(Boolean)
      )
    );

    const winnersMap = new Map<string, { full_name: string; phone: string | null }>();
    if (winnerIds.length > 0) {
      const { data: winners } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", winnerIds);
      (winners || []).forEach((w: any) =>
        winnersMap.set(w.id, { full_name: w.full_name, phone: w.phone })
      );
    }

    return {
      totalLinks: totalLinks || 0,
      totalConversions: totalConversions || 0,
      links: links || [],
      conversions: conversions || [],
      rewards: rewards || [],
      raffles: (raffles || []).map((r: any) => {
        const winner = r.winner_user_id ? winnersMap.get(r.winner_user_id) : null;
        return {
          ...r,
          storeName: r.stores?.name || (r.is_official_platform || !r.store_id ? "Waesy Oficial" : "Loja"),
          storeLogoUrl: r.stores?.logo_url || null,
          storeSlug: r.stores?.slug || null,
          winnerName: winner?.full_name || null,
          winnerPhone: winner?.phone || null,
          totalTickets: r.raffle_tickets?.[0]?.count || 0,
        };
      }),
    };
  });

export const adminDrawRaffle = createServerFn({ method: "POST" })
  .validator(z.object({ raffleId: z.string().uuid() }))
  .handler(async ({ data: { raffleId } }) => {
    const { requireAdmin } = await import("@/lib/server-access");
    await requireAdmin();

    const supabase = getServerClient();

    // Busca todos os bilhetes emitidos para este sorteio
    const { data: tickets, error: tErr } = await supabase
      .from("raffle_tickets")
      .select("id, ticket_number, user_id")
      .eq("raffle_id", raffleId);

    if (tErr || !tickets || tickets.length === 0) {
      throw new Error("Não há nenhum bilhete emitido para este sorteio. Não é possível realizar a apuração.");
    }

    // Sorteio criptográfico aleatório
    const winnerIndex = Math.floor(Math.random() * tickets.length);
    const winningTicket = tickets[winnerIndex];

    // Busca perfil do ganhador
    const { data: winnerProfile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", winningTicket.user_id)
      .single();

    // Atualiza sorteio para concluído
    const { error: updErr } = await supabase
      .from("raffles")
      .update({
        status: "completed",
        winner_user_id: winningTicket.user_id,
        winner_ticket_number: winningTicket.ticket_number,
        drawn_at: new Date().toISOString(),
      })
      .eq("id", raffleId);

    if (updErr) {
      throw new Error("Falha ao registrar ganhador do sorteio: " + updErr.message);
    }

    return {
      success: true,
      ticketNumber: winningTicket.ticket_number,
      winnerName: winnerProfile?.full_name || "Ganhador Anônimo",
      winnerPhone: winnerProfile?.phone || null,
      totalParticipantes: tickets.length,
    };
  });

export const adminCancelRaffle = createServerFn({ method: "POST" })
  .validator(z.object({ raffleId: z.string().uuid() }))
  .handler(async ({ data: { raffleId } }) => {
    const { requireAdmin } = await import("@/lib/server-access");
    await requireAdmin();

    const supabase = getServerClient();
    const { error } = await supabase
      .from("raffles")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", raffleId);

    if (error) throw new Error("Erro ao cancelar sorteio: " + error.message);
    return { success: true };
  });

export const adminGetRaffleTickets = createServerFn({ method: "POST" })
  .validator(z.object({ raffleId: z.string().uuid() }))
  .handler(async ({ data: { raffleId } }) => {
    const { requireAdmin } = await import("@/lib/server-access");
    await requireAdmin();

    const supabase = getServerClient();
    const { data: tickets, error } = await supabase
      .from("raffle_tickets")
      .select("id, ticket_number, created_at, user_id, profiles:user_id(id, full_name, phone, avatar_url)")
      .eq("raffle_id", raffleId)
      .order("ticket_number", { ascending: true });

    if (error) throw new Error("Erro ao listar bilhetes: " + error.message);

    return (tickets || []).map((t: any) => ({
      id: t.id,
      ticketNumber: t.ticket_number,
      createdAt: t.created_at,
      userName: t.profiles?.full_name || "Membro",
      userPhone: t.profiles?.phone || null,
      avatarUrl: t.profiles?.avatar_url || null,
    }));
  });

export const adminUpsertReward = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      title: z.string().min(3),
      description: z.string().optional(),
      points_required: z.number().int().min(1),
      reward_type: z.string().default("ticket"),
      stock: z.number().int().nullable().optional(),
      active: z.boolean().default(true),
    })
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/server-access");
    await requireAdmin();

    const supabase = getServerClient();

    if (data.id) {
      const { data: res, error } = await supabase
        .from("invite_rewards")
        .update({
          title: data.title,
          description: data.description || null,
          points_required: data.points_required,
          reward_type: data.reward_type,
          stock: data.stock,
          active: data.active,
        })
        .eq("id", data.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return res;
    } else {
      const { data: res, error } = await supabase
        .from("invite_rewards")
        .insert({
          title: data.title,
          description: data.description || null,
          points_required: data.points_required,
          reward_type: data.reward_type,
          stock: data.stock,
          active: data.active,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return res;
    }
  });

export const adminDeleteReward = createServerFn({ method: "POST" })
  .validator(z.object({ rewardId: z.string().uuid() }))
  .handler(async ({ data: { rewardId } }) => {
    const { requireAdmin } = await import("@/lib/server-access");
    await requireAdmin();

    const supabase = getServerClient();
    const { error } = await supabase.from("invite_rewards").delete().eq("id", rewardId);
    if (error) throw new Error("Erro ao excluir recompensa: " + error.message);
    return { success: true };
  });

export const adminCreateRaffle = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().min(3),
      description: z.string().optional(),
      imageUrl: z.string().optional(),
      image_url: z.string().optional(),
      termsText: z.string().optional(),
      points_cost: z.number().int().min(0).default(0),
      draw_date: z.string(),
      max_tickets_per_user: z.number().int().default(5),
    })
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/server-access");
    const identity = await requireAdmin();

    const supabase = getServerClient();

    const img = data.imageUrl || data.image_url || null;

    const { data: res, error } = await supabase
      .from("raffles")
      .insert({
        title: data.title,
        description: data.description || null,
        image_url: img,
        terms_text: data.termsText || "Participação promocional auditada eletronicamente pela Waesy.",
        points_cost: data.points_cost,
        draw_date: data.draw_date,
        max_tickets_per_user: data.max_tickets_per_user,
        status: "active",
        created_by: identity.id,
        is_official_platform: true,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return res;
  });

export interface UserRaffleEntryDTO {
  raffle: RaffleDTO;
  myTickets: Array<{
    id: string;
    ticketNumber: number;
    createdAt: string;
  }>;
  isWinner: boolean;
}

/**
 * Retorna os concursos e cupons em que o usuário autenticado está participando
 */
export const getMyUserConcursos = createServerFn({ method: "GET" })
  .handler(async (): Promise<UserRaffleEntryDTO[]> => {
    const identity = await getIdentity().catch(() => null);
    if (!identity?.id) return [];

    const supabase = getServerClient();

    // 1. Busca todos os bilhetes emitidos para este usuário
    const { data: tickets, error: tErr } = await supabase
      .from("raffle_tickets")
      .select("id, ticket_number, created_at, raffle_id")
      .eq("user_id", identity.id)
      .order("created_at", { ascending: false });

    if (tErr || !tickets || tickets.length === 0) return [];

    const raffleIds = Array.from(new Set(tickets.map((t) => t.raffle_id)));

    // 2. Busca os dados dos respectivos concursos
    const { data: raffles, error: rErr } = await supabase
      .from("raffles")
      .select("*, stores:store_id(id, name, logo_url)")
      .in("id", raffleIds)
      .order("draw_date", { ascending: true });

    if (rErr || !raffles) return [];

    const ticketsByRaffle = new Map<string, any[]>();
    for (const t of tickets) {
      if (!ticketsByRaffle.has(t.raffle_id)) {
        ticketsByRaffle.set(t.raffle_id, []);
      }
      ticketsByRaffle.get(t.raffle_id)!.push({
        id: t.id,
        ticketNumber: t.ticket_number,
        createdAt: t.created_at,
      });
    }

    return raffles.map((r: any) => {
      const myTickets = ticketsByRaffle.get(r.id) || [];
      const isWinner = r.winner_user_id === identity.id;

      const raffleDTO: RaffleDTO = {
        id: r.id,
        storeId: r.store_id || null,
        storeName: r.stores?.name || (r.is_official_platform || !r.store_id ? "Waesy Oficial" : "Loja Parceira"),
        storeLogoUrl: r.stores?.logo_url || null,
        title: r.title,
        description: r.description,
        imageUrl: r.image_url,
        rules: r.rules || {},
        termsText: r.terms_text || "Participação promocional auditada eletronicamente.",
        isOfficialPlatform: r.is_official_platform || !r.store_id,
        ticketPriceCents: r.ticket_price_cents || 0,
        pointsCost: r.points_cost || 0,
        tokensCost: r.points_cost || 0,
        maxTicketsPerUser: r.max_tickets_per_user || 5,
        drawDate: r.draw_date,
        status: r.status,
        winnerUserId: r.winner_user_id,
        winnerTicketNumber: r.winner_ticket_number,
        myTicketsCount: myTickets.length,
        totalTicketsCount: 0,
      };

      return {
        raffle: raffleDTO,
        myTickets,
        isWinner,
      };
    });
  });

/**
 * Retorna os concursos de sorte de uma loja específica para a vitrine pública
 */
export const getStoreConcursos = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().uuid() }))
  .handler(async ({ data: { storeId } }): Promise<RaffleDTO[]> => {
    const supabase = getServerClient();
    const identity = await getIdentity().catch(() => null);

    const { data: raffles, error } = await supabase
      .from("raffles")
      .select("*, stores:store_id(id, name, logo_url)")
      .eq("store_id", storeId)
      .in("status", ["active", "drawing", "completed"])
      .order("draw_date", { ascending: true });

    if (error || !raffles) return [];

    let myTicketsMap = new Map<string, number>();
    if (identity?.id && raffles.length > 0) {
      const raffleIds = raffles.map((r) => r.id);
      const { data: tickets } = await supabase
        .from("raffle_tickets")
        .select("raffle_id")
        .eq("user_id", identity.id)
        .in("raffle_id", raffleIds);

      if (tickets) {
        for (const t of tickets) {
          myTicketsMap.set(t.raffle_id, (myTicketsMap.get(t.raffle_id) || 0) + 1);
        }
      }
    }

    return raffles.map((r: any) => ({
      id: r.id,
      storeId: r.store_id,
      storeName: r.stores?.name || "Loja Parceira",
      storeLogoUrl: r.stores?.logo_url || null,
      title: r.title,
      description: r.description,
      imageUrl: r.image_url,
      rules: r.rules || {},
      termsText: r.terms_text || "Participação aberta a membros cadastrados na comunidade Waesy.",
      isOfficialPlatform: false,
      ticketPriceCents: r.ticket_price_cents || 0,
      pointsCost: r.points_cost || 0,
      tokensCost: r.points_cost || 0,
      maxTicketsPerUser: r.max_tickets_per_user || 5,
      drawDate: r.draw_date,
      status: r.status,
      winnerUserId: r.winner_user_id,
      winnerTicketNumber: r.winner_ticket_number,
      myTicketsCount: myTicketsMap.get(r.id) || 0,
      totalTicketsCount: 0,
    }));
  });

