import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getServerIdentity, assertStoreAccess } from "@/lib/supabase";
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
  .validator(z.object({ storeId: z.string().uuid().optional() }).optional())
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    const storeId = data?.storeId || identity?.store_id;

    if (!storeId) return [];
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

    try {
      const { data: channels, error } = await supabase
        .from("intranet_channels")
        .select(`
          *,
          intranet_milestones (*)
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

      return (channels || []).map((ch: any) => ({
        id: ch.id,
        store_id: ch.store_id,
        title: ch.title,
        department: ch.department,
        scope: ch.scope,
        creator_id: ch.creator_id,
        creator_name: ch.creator_name,
        created_at: ch.created_at,
        updated_at: ch.updated_at,
        milestones: ch.intranet_milestones || [],
      })) as IntranetChannelDTO[];
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
      title: z.string().min(2),
      department: z.string().default("Geral"),
      scope: z.enum(["public", "private", "direct"]).default("public"),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    const storeId = input.storeId || identity?.store_id;

    if (!storeId) throw new Error("Loja não identificada");
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { data: channel, error } = await supabase
      .from("intranet_channels")
      .insert({
        store_id: storeId,
        title: input.title,
        department: input.department,
        scope: input.scope,
        creator_id: identity?.id,
        creator_name: identity?.full_name || "Membro da Equipe",
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
        author_name: identity?.full_name || "Colaborador",
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
