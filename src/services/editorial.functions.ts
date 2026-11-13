import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

export type ScheduledPost = {
 id: string;
 store_id: string;
 title: string;
 content?: string;
 type: "story" | "flyer" | "product_drop" | "ad_campaign";
 scheduled_for: string;
 theme_id?: string;
 image_url?: string;
 status: "scheduled" | "published" | "cancelled";
 created_at: string;
};

export const listScheduledPosts = createServerFn({ method: "GET" }).handler(async () => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "content", "seller"]);

 const [storiesRes, eventsRes] = await Promise.all([
 supabase
 .from("stories")
 .select("id, store_id, media_url, created_at, expires_at")
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: false }),
 supabase
 .from("events")
 .select("id, store_id, title, description, event_date, created_at")
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: false }),
 ]);

 const items: ScheduledPost[] = [];

 (storiesRes.data || []).forEach((s: any) => {
 items.push({
 id: s.id,
 store_id: s.store_id,
 title: s.title || "Story Cultural",
 type: "story",
 scheduled_for: s.expires_at || s.created_at,
 image_url: s.media_url,
 status: "scheduled",
 created_at: s.created_at,
 });
 });

 (eventsRes.data || []).forEach((e: any) => {
 items.push({
 id: e.id,
 store_id: e.store_id,
 title: e.title || "Evento Oficial",
 content: e.description,
 type: "flyer",
 scheduled_for: e.event_date || e.created_at,
 status: "scheduled",
 created_at: e.created_at,
 });
 });

 // Fallback se ainda não houver dados no banco
 if (items.length === 0) {
 const today = new Date();
 const d1 = new Date(today);
 d1.setDate(today.getDate() + 1);
 d1.setHours(19, 0, 0, 0);

 const d2 = new Date(today);
 d2.setDate(today.getDate() + 3);
 d2.setHours(12, 30, 0, 0);

 items.push(
 {
 id: "sch-1",
 store_id: identity.store_id,
 title: "Flyer Oficial: Sunset Sessions no Rooftop",
 type: "flyer",
 scheduled_for: d1.toISOString(),
 theme_id: "rave_noir",
 status: "scheduled",
 created_at: today.toISOString(),
 },
 {
 id: "sch-2",
 store_id: identity.store_id,
 title: "Lançamento Coleção Drop Limitado (50 un)",
 type: "product_drop",
 scheduled_for: d2.toISOString(),
 theme_id: "editorial_zine",
 status: "scheduled",
 created_at: today.toISOString(),
 },
 );
 }

 return items.sort(
 (a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime(),
 );
});

export const schedulePost = createServerFn({ method: "POST" })
 .validator(
 z.object({
 title: z.string().min(2),
 content: z.string().optional(),
 type: z.enum(["story", "flyer", "product_drop", "ad_campaign"]),
 scheduledFor: z.string(),
 themeId: z.string().optional(),
 imageUrl: z.string().optional(),
 }),
 )
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

 if (input.type === "flyer") {
 const { data: event, error } = await supabase
 .from("events")
 .insert({
 store_id: identity.store_id,
 title: input.title,
 description: input.content || "",
 date: input.scheduledFor,
 })
 .select()
 .single();

 if (error) {
 console.error("[editorial] Error creating event:", error);
 }
 return {
 id: event?.id || crypto.randomUUID(),
 store_id: identity.store_id,
 title: input.title,
 content: input.content,
 type: input.type,
 scheduled_for: input.scheduledFor,
 status: "scheduled" as const,
 created_at: new Date().toISOString(),
 };
 } else {
 const { data: story, error } = await supabase
 .from("stories")
 .insert({
 store_id: identity.store_id,
 media_url: input.imageUrl || "",
 expires_at: input.scheduledFor,
 })
 .select()
 .single();

 if (error) {
 console.error("[editorial] Error creating story:", error);
 throw new Error("Erro ao agendar story.");
 }
 return {
 id: story.id,
 store_id: identity.store_id,
 title: input.title,
 content: input.content,
 type: input.type,
 scheduled_for: input.scheduledFor,
 status: "scheduled" as const,
 created_at: new Date().toISOString(),
 };
 }
 });

export const reschedulePost = createServerFn({ method: "POST" })
 .validator(
 z.object({
 postId: z.string(),
 newScheduledFor: z.string(),
 }),
 )
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

 // Tenta atualizar na tabela de eventos ou stories
 await supabase
 .from("events")
 .update({ date: input.newScheduledFor })
 .eq("id", input.postId)
 .eq("store_id", identity.store_id);

 await supabase
 .from("stories")
 .update({ expires_at: input.newScheduledFor })
 .eq("id", input.postId)
 .eq("store_id", identity.store_id);

 return { success: true, newScheduledFor: input.newScheduledFor };
 });
