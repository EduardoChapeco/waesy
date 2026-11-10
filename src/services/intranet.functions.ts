import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { logSystemError } from "@/lib/logger";

export interface IntranetChannelDTO {
  id: string;
  store_id: string;
  title: string;
  department: string;
  scope: "public" | "private" | "direct";
  creator_id?: string | null;
  creator_name?: string | null;
  created_at: string;
  updated_at: string;
  milestones?: IntranetMilestoneDTO[];
  messagesCount?: number;
}

export interface IntranetMessageDTO {
  id: string;
  channel_id: string;
  store_id: string;
  author_id?: string | null;
  author_name: string;
  author_role?: string | null;
  content: string;
  milestone_id?: string | null;
  artifact_type?: string | null;
  artifact_payload?: any;
  created_at: string;
}

export interface IntranetMilestoneDTO {
  id: string;
  channel_id: string;
  store_id: string;
  label: string;
  time_label?: string | null;
  done: boolean;
  detail?: string | null;
  created_at: string;
}

/**
 * Lista todos os canais da intranet da loja com seus marcos e membros
 */
export const listIntranetChannels = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().uuid().optional(), store_id: z.string().uuid().optional() }).optional())
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    const storeId = data?.storeId || data?.store_id || identity?.store_id || identity?.memberships?.[0]?.store_id;

    if (!storeId) return [];
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"], storeId);

    try {
      let { data: channels, error } = await supabase
        .from("intranet_channels")
        .select(`
          *,
          intranet_milestones (*),
          intranet_messages (*)
        `)
        .eq("store_id", storeId)
        .order("created_at", { ascending: true });

      if (error) {
        logSystemError({
          route: "intranet.functions.listIntranetChannels",
          tableName: "intranet_channels",
          error,
        });
        return [];
      }

      if (!channels || channels.length === 0) {
        return [];
      }

      return (channels || []).map((ch: any) => {
        const rawMilestones = Array.isArray(ch.intranet_milestones) ? ch.intranet_milestones : [];
        const rawMessages = Array.isArray(ch.intranet_messages) ? ch.intranet_messages : [];
        rawMessages.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        return {
          id: ch.id,
          store_id: ch.store_id,
          title: ch.title,
          department: ch.department,
          scope: ch.scope,
          creator: ch.creator_name || "Membro da Equipe",
          creator_id: ch.creator_id,
          creator_name: ch.creator_name,
          updatedAt: ch.updated_at ? new Date(ch.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Hoje",
          membersCount: 4,
          created_at: ch.created_at,
          updated_at: ch.updated_at,
          milestones: rawMilestones.map((m: any) => ({
            id: m.id,
            label: m.label,
            time: m.time_label || new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            done: Boolean(m.done),
            detail: m.detail || "",
          })),
          messages: rawMessages.map((msg: any) => ({
            id: msg.id,
            author: msg.author_name || "Membro da Equipe",
            role: msg.author_role || "Colaborador",
            time: new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            text: msg.content,
            payload: msg.artifact_payload,
          })),
        };
      }) as any[];
    } catch (err) {
      logSystemError({
        route: "intranet.functions.listIntranetChannels",
        error: err,
      });
      return [];
    }
  });

/**
 * Cria um novo canal interno na intranet
 */
export const createIntranetChannel = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
      store_id: z.string().uuid().optional(),
      title: z.string().min(2),
      department: z.string().default("Geral"),
      scope: z.enum(["public", "private", "direct"]).default("public"),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    const storeId = input.storeId || input.store_id || identity?.store_id || identity?.memberships?.[0]?.store_id;

    if (!storeId) throw new Error("Loja não identificada");
    assertStoreAccess(identity, ["owner", "admin", "manager"], storeId);

    const { data: channel, error } = await supabase
      .from("intranet_channels")
      .insert({
        store_id: storeId,
        title: input.title,
        department: input.department,
        scope: input.scope,
        creator_id: identity?.id,
        creator_name: (identity as any)?.full_name || (identity as any)?.fullName || "Membro da Equipe",
      })
      .select()
      .single();

    if (error) {
      logSystemError({
        route: "intranet.functions.createIntranetChannel",
        tableName: "intranet_channels",
        error,
      });
      throw new Error(`Erro ao criar canal: ${error.message}`);
    }

    return channel as IntranetChannelDTO;
  });

/**
 * Lista as mensagens de um canal interno
 */
export const listIntranetMessages = createServerFn({ method: "GET" })
  .validator(z.object({ channelId: z.string().uuid() }))
  .handler(async ({ data: { channelId } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

    const { data: messages, error } = await supabase
      .from("intranet_messages")
      .select("*")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      logSystemError({
        route: "intranet.functions.listIntranetMessages",
        tableName: "intranet_messages",
        error,
      });
      return [];
    }

    return messages as IntranetMessageDTO[];
  });

/**
 * Envia uma mensagem colaborativa na intranet
 */
export const sendIntranetMessage = createServerFn({ method: "POST" })
  .validator(
    z.object({
      channelId: z.string().uuid(),
      content: z.string().min(1),
      authorRole: z.string().optional(),
      artifactType: z.string().optional(),
      artifactPayload: z.any().optional(),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

    // Busca o canal para herdar store_id
    const { data: channel } = await supabase
      .from("intranet_channels")
      .select("store_id")
      .eq("id", input.channelId)
      .single();

    if (!channel) throw new Error("Canal não encontrado");

    const { data: message, error } = await supabase
      .from("intranet_messages")
      .insert({
        channel_id: input.channelId,
        store_id: channel.store_id,
        author_id: identity?.id,
        author_name: (identity as any)?.full_name || (identity as any)?.fullName || "Colaborador",
        author_role: input.authorRole || identity?.role || "Equipe",
        content: input.content,
        artifact_type: input.artifactType || null,
        artifact_payload: input.artifactPayload || null,
      })
      .select()
      .single();

    if (error) {
      logSystemError({
        route: "intranet.functions.sendIntranetMessage",
        tableName: "intranet_messages",
        error,
      });
      throw new Error(`Erro ao enviar mensagem: ${error.message}`);
    }

    return message as IntranetMessageDTO;
  });

/**
 * Alterna status de um marco da Linha do Tempo Operacional
 */
export const toggleIntranetMilestone = createServerFn({ method: "POST" })
  .validator(
    z.object({
      milestoneId: z.string().uuid(),
      done: z.boolean(),
    })
  )
  .handler(async ({ data: { milestoneId, done } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

    const { data, error } = await supabase
      .from("intranet_milestones")
      .update({ done })
      .eq("id", milestoneId)
      .select()
      .single();

    if (error) {
      logSystemError({
        route: "intranet.functions.toggleIntranetMilestone",
        tableName: "intranet_milestones",
        error,
      });
      throw new Error("Erro ao atualizar marco.");
    }

    return data;
  });

export interface StoreIntranetSpreadsheetDTO {
  title: string;
  rowsCount: number;
  colsCount: number;
  headers: string[];
  colTypes: string[];
  rows: (string | number)[][];
}

/**
 * Agrega vendas e pedidos reais por categoria para a planilha colaborativa da intranet
 */
export const getStoreIntranetSalesSpreadsheet = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().uuid().optional() }).optional())
  .handler(async ({ data }): Promise<StoreIntranetSpreadsheetDTO> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    const storeId = data?.storeId || identity?.store_id;

    if (!storeId) {
      return {
        title: "Desempenho_Categorias_Regional.csv",
        rowsCount: 0,
        colsCount: 5,
        headers: ["Categoria", "Pedidos", "Receita (R$)", "Ticket Médio", "Participação (%)"],
        colTypes: ["abc", "123", "123", "123", "123"],
        rows: [],
      };
    }

    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

    try {
      const { data: orders, error } = await supabase
        .from("orders")
        .select(`
          id,
          total_cents,
          status,
          order_items (
            product_title,
            qty,
            total_cents
          )
        `)
        .eq("store_id", storeId)
        .in("status", ["paid", "delivered", "completed", "shipped"])
        .order("created_at", { ascending: false })
        .limit(300);

      if (error) {
        logSystemError({
          route: "intranet.functions.getStoreIntranetSalesSpreadsheet",
          tableName: "orders",
          error,
        });
        return {
          title: "Desempenho_Categorias_Regional.csv",
          rowsCount: 0,
          colsCount: 5,
          headers: ["Categoria", "Pedidos", "Receita (R$)", "Ticket Médio", "Participação (%)"],
          colTypes: ["abc", "123", "123", "123", "123"],
          rows: [],
        };
      }

      const categoryMap = new Map<string, { count: number; revenueCents: number }>();
      let totalRevenueCents = 0;

      (orders || []).forEach((ord: any) => {
        const items = Array.isArray(ord.order_items) ? ord.order_items : [];
        if (items.length === 0) {
          const cat = "Geral";
          const rev = ord.total_cents || 0;
          totalRevenueCents += rev;
          const current = categoryMap.get(cat) || { count: 0, revenueCents: 0 };
          categoryMap.set(cat, { count: current.count + 1, revenueCents: current.revenueCents + rev });
        } else {
          items.forEach((it: any) => {
            const rawTitle = it.product_title || "Diversos";
            const cat = rawTitle.includes(" - ") ? rawTitle.split(" - ")[0].trim() : rawTitle.slice(0, 24);
            const qty = Math.max(Number(it.qty) || 1, 1);
            const rev = Number(it.total_cents) || 0;
            totalRevenueCents += rev;
            const current = categoryMap.get(cat) || { count: 0, revenueCents: 0 };
            categoryMap.set(cat, { count: current.count + qty, revenueCents: current.revenueCents + rev });
          });
        }
      });

      if (categoryMap.size === 0) {
        return {
          title: "Desempenho_Categorias_Regional.csv",
          rowsCount: 0,
          colsCount: 5,
          headers: ["Categoria", "Pedidos", "Receita (R$)", "Ticket Médio", "Participação (%)"],
          colTypes: ["abc", "123", "123", "123", "123"],
          rows: [],
        };
      }

      const rows: (string | number)[][] = Array.from(categoryMap.entries())
        .sort((a, b) => b[1].revenueCents - a[1].revenueCents)
        .slice(0, 10)
        .map(([cat, stats]) => {
          const revReais = stats.revenueCents / 100;
          const ticketMedio = stats.count > 0 ? (revReais / stats.count).toFixed(2) : "0.00";
          const share = totalRevenueCents > 0
            ? `${((stats.revenueCents / totalRevenueCents) * 100).toFixed(1)}%`
            : "0.0%";
          return [cat, stats.count, Math.round(revReais), Number(ticketMedio), share];
        });

      return {
        title: "Desempenho_Categorias_Regional.csv",
        rowsCount: rows.length,
        colsCount: 5,
        headers: ["Categoria", "Pedidos", "Receita (R$)", "Ticket Médio", "Participação (%)"],
        colTypes: ["abc", "123", "123", "123", "123"],
        rows,
      };
    } catch (err) {
      logSystemError({
        route: "intranet.functions.getStoreIntranetSalesSpreadsheet",
        error: err,
      });
      return {
        title: "Desempenho_Categorias_Regional.csv",
        rowsCount: 0,
        colsCount: 5,
        headers: ["Categoria", "Pedidos", "Receita (R$)", "Ticket Médio", "Participação (%)"],
        colTypes: ["abc", "123", "123", "123", "123"],
        rows: [],
      };
    }
  });

