import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const TaskPriorityEnum = z.enum(["low", "medium", "high", "urgent"]);
export const TaskStatusEnum = z.enum(["todo", "in_progress", "review", "done", "archived"]);
export const TaskContextTypeEnum = z.enum([
 "general",
 "order",
 "lead",
 "group_tour",
 "table",
 "customer",
 "inventory",
 "lawsuit",
 "contract",
 "service",
 "vehicle",
 "real_estate",
]);

export const CreateTaskInputSchema = z.object({
 store_id: z.string().uuid(),
 title: z.string().min(1, "Título é obrigatório").max(200),
 description: z.string().optional(),
 priority: TaskPriorityEnum.default("medium"),
 status: TaskStatusEnum.default("todo"),
 due_date: z.string().optional().nullable(),
 assigned_to_profile_id: z.string().uuid().optional().nullable(),
 context_type: TaskContextTypeEnum.default("general"),
 context_id: z.string().optional().nullable(),
 context_label: z.string().optional().nullable(),
 tags: z.array(z.string()).default([]),
 is_my_day: z.boolean().default(false),
 estimated_minutes: z.number().int().default(0),
 recurrence: z.enum(["none", "daily", "weekly", "monthly", "weekdays"]).default("none"),
 custom_fields: z.record(z.any()).default({}),
 kanban_column_id: z.string().default("todo"),
 checklists: z.array(z.string()).optional(),
});

export const UpdateTaskStatusSchema = z.object({
 store_id: z.string().uuid(),
 task_id: z.string().uuid(),
 status: TaskStatusEnum,
});

export const ToggleMyDaySchema = z.object({
 store_id: z.string().uuid(),
 task_id: z.string().uuid(),
 is_my_day: z.boolean(),
});

export const UpdateTaskInputSchema = z.object({
 store_id: z.string().uuid(),
 task_id: z.string().uuid(),
 title: z.string().min(1).max(200).optional(),
 description: z.string().optional().nullable(),
 priority: TaskPriorityEnum.optional(),
 due_date: z.string().optional().nullable(),
 assigned_to_profile_id: z.string().uuid().optional().nullable(),
 context_type: TaskContextTypeEnum.optional(),
 context_id: z.string().optional().nullable(),
 context_label: z.string().optional().nullable(),
 tags: z.array(z.string()).optional(),
 is_my_day: z.boolean().optional(),
 timer_seconds: z.number().int().optional(),
 estimated_minutes: z.number().int().optional(),
 recurrence: z.enum(["none", "daily", "weekly", "monthly", "weekdays"]).optional(),
 custom_fields: z.record(z.any()).optional(),
 kanban_column_id: z.string().optional(),
});

export const ChecklistActionSchema = z.object({
 store_id: z.string().uuid(),
 task_id: z.string().uuid(),
 checklist_id: z.string().uuid().optional(),
 title: z.string().min(1).optional(),
 is_completed: z.boolean().optional(),
});

export const AddCommentSchema = z.object({
 store_id: z.string().uuid(),
 task_id: z.string().uuid(),
 comment_text: z.string().min(1, "Comentário não pode ser vazio"),
});

export const ListWorkspaceTasksSchema = z.object({
 store_id: z.string().uuid(),
 view: z.string().optional(),
 search: z.string().optional(),
 tag: z.string().optional(),
});

export const GetTaskDetailsSchema = z.object({
 store_id: z.string().uuid(),
 task_id: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Server Functions
// ---------------------------------------------------------------------------

export const listWorkspaceTasks = createServerFn({ method: "GET" })
 .validator(ListWorkspaceTasksSchema)
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 const db = getServerClient();
 let query = db
 .from("workspace_tasks")
 .select(`
 id, store_id, task_code, title, description, priority, status, due_date, completed_at,
 context_type, context_id, context_label, tags, is_my_day, sort_order, created_at, updated_at,
 assigned_to_profile_id, timer_seconds, timer_started_at, is_timer_running, estimated_minutes,
 recurrence, custom_fields, kanban_column_id,
 workspace_task_checklists ( id, title, is_completed, sort_order ),
 workspace_task_comments ( id )
 `)
 .eq("store_id", data.store_id)
 .neq("status", "archived")
 .order("sort_order", { ascending: true })
 .order("created_at", { ascending: false });

 if (data.view === "my-day") {
 query = query.eq("is_my_day", true);
 }

 if (data.search && data.search.trim()) {
 query = query.ilike("title", `%${data.search.trim()}%`);
 }

 if (data.tag && data.tag.trim()) {
 query = query.contains("tags", [data.tag.trim()]);
 }

 const { data: tasks, error } = await query;
 if (error) throw error;
 const rawTasks = (tasks || []) as any[];

 const profileIds = Array.from(
   new Set(
     rawTasks
       .flatMap((t) => [
         t.assigned_to_profile_id,
         t.context_id,
         (t.custom_fields as any)?.customer_id,
       ])
       .filter((id): id is string => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
   )
 );

 const profileMap = new Map<string, { full_name?: string; avatar_url?: string }>();
 if (profileIds.length > 0) {
   const { data: profiles } = await db
     .from("profiles")
     .select("id, full_name, avatar_url")
     .in("id", profileIds);
   for (const p of profiles || []) {
     profileMap.set(p.id, p);
   }
 }

 return rawTasks.map((t) => {
   const cf = ((t.custom_fields || {}) as Record<string, any>);
   const custProf = (cf.customer_id && profileMap.get(cf.customer_id)) || (t.context_id && profileMap.get(t.context_id));
   const assigneeProf = t.assigned_to_profile_id ? profileMap.get(t.assigned_to_profile_id) : undefined;
   return {
     ...t,
     assigned_to_name: assigneeProf?.full_name || cf.assigned_to_name || null,
     custom_fields: {
       ...cf,
       customer_name: cf.customer_name || custProf?.full_name || null,
       customer_avatar_url: cf.customer_avatar_url || custProf?.avatar_url || null,
       assigned_to_avatar_url: assigneeProf?.avatar_url || null,
     },
   };
 });
 });

export const getTaskDetails = createServerFn({ method: "GET" })
 .validator(GetTaskDetailsSchema)
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 const db = getServerClient();
 const { data: task, error } = await db
 .from("workspace_tasks")
 .select(`
 *,
 workspace_task_checklists ( id, title, is_completed, sort_order, created_at ),
 workspace_task_comments ( id, comment_text, created_at, author_profile_id )
 `)
 .eq("id", data.task_id)
 .eq("store_id", data.store_id)
 .single();

 if (error) throw error;
 return task;
 });

export const createWorkspaceTask = createServerFn({ method: "POST" })
 .validator(CreateTaskInputSchema)
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 const db = getServerClient();
 const taskCode = `TSK-${Math.floor(1000 + Math.random() * 9000)}`;

 const { data: created, error } = await db
 .from("workspace_tasks")
 .insert({
 store_id: data.store_id,
 task_code: taskCode,
 created_by_profile_id: identity.id,
 assigned_to_profile_id: data.assigned_to_profile_id || null,
 title: data.title,
 description: data.description || null,
 priority: data.priority,
 status: data.status,
 due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
 context_type: data.context_type,
 context_id: data.context_id || null,
 context_label: data.context_label || null,
 tags: data.tags,
 is_my_day: data.is_my_day,
 estimated_minutes: data.estimated_minutes ?? 0,
 recurrence: data.recurrence ?? "none",
 custom_fields: data.custom_fields ?? {},
 kanban_column_id: data.kanban_column_id ?? (data.status || "todo"),
 })
 .select()
 .single();

 if (error) throw error;

 // Inserir checklists se houver
 if (data.checklists && data.checklists.length > 0) {
 const items = data.checklists
 .filter((c) => c.trim().length > 0)
 .map((title, idx) => ({
 task_id: created.id,
 title: title.trim(),
 sort_order: idx,
 }));

 if (items.length > 0) {
 await db.from("workspace_task_checklists").insert(items);
 }
 }

 return created;
 });

export const updateTaskStatus = createServerFn({ method: "POST" })
 .validator(UpdateTaskStatusSchema)
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 const db = getServerClient();
 const completed_at = data.status === "done" ? new Date().toISOString() : null;

 const { data: updated, error } = await db
 .from("workspace_tasks")
 .update({
 status: data.status,
 kanban_column_id: data.status,
 completed_at,
 updated_at: new Date().toISOString(),
 })
 .eq("id", data.task_id)
 .eq("store_id", data.store_id)
 .select()
 .single();

 if (error) throw error;
 return updated;
 });

export const toggleTaskMyDay = createServerFn({ method: "POST" })
 .validator(ToggleMyDaySchema)
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 const db = getServerClient();
 const { data: updated, error } = await db
 .from("workspace_tasks")
 .update({
 is_my_day: data.is_my_day,
 updated_at: new Date().toISOString(),
 })
 .eq("id", data.task_id)
 .eq("store_id", data.store_id)
 .select()
 .single();

 if (error) throw error;
 return updated;
 });

export const updateWorkspaceTask = createServerFn({ method: "POST" })
 .validator(UpdateTaskInputSchema)
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 const db = getServerClient();
 const updatePayload: Record<string, any> = {
 updated_at: new Date().toISOString(),
 };

 if (data.title !== undefined) updatePayload.title = data.title;
 if (data.description !== undefined) updatePayload.description = data.description;
 if (data.priority !== undefined) updatePayload.priority = data.priority;
 if (data.due_date !== undefined) {
 updatePayload.due_date = data.due_date ? new Date(data.due_date).toISOString() : null;
 }
 if (data.assigned_to_profile_id !== undefined) {
 updatePayload.assigned_to_profile_id = data.assigned_to_profile_id;
 }
 if (data.context_type !== undefined) updatePayload.context_type = data.context_type;
 if (data.context_id !== undefined) updatePayload.context_id = data.context_id;
 if (data.context_label !== undefined) updatePayload.context_label = data.context_label;
 if (data.tags !== undefined) updatePayload.tags = data.tags;
 if (data.is_my_day !== undefined) updatePayload.is_my_day = data.is_my_day;
 if (data.timer_seconds !== undefined) updatePayload.timer_seconds = data.timer_seconds;
 if (data.estimated_minutes !== undefined) updatePayload.estimated_minutes = data.estimated_minutes;
 if (data.recurrence !== undefined) updatePayload.recurrence = data.recurrence;
 if (data.custom_fields !== undefined) updatePayload.custom_fields = data.custom_fields;
 if (data.kanban_column_id !== undefined) updatePayload.kanban_column_id = data.kanban_column_id;

 const { data: updated, error } = await db
 .from("workspace_tasks")
 .update(updatePayload)
 .eq("id", data.task_id)
 .eq("store_id", data.store_id)
 .select()
 .single();

 if (error) throw error;
 return updated;
 });

export const deleteWorkspaceTask = createServerFn({ method: "POST" })
 .validator(GetTaskDetailsSchema)
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 const db = getServerClient();
 const { error } = await db
 .from("workspace_tasks")
 .delete()
 .eq("id", data.task_id)
 .eq("store_id", data.store_id);

 if (error) throw error;
 return { success: true };
 });

export const toggleChecklistItem = createServerFn({ method: "POST" })
 .validator(ChecklistActionSchema)
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 if (!data.checklist_id || data.is_completed === undefined) {
 throw new Error("Parâmetros inválidos para checklist");
 }

 const db = getServerClient();
 const { data: updated, error } = await db
 .from("workspace_task_checklists")
 .update({ is_completed: data.is_completed })
 .eq("id", data.checklist_id)
 .eq("task_id", data.task_id)
 .select()
 .single();

 if (error) throw error;
 return updated;
 });

export const addChecklistItem = createServerFn({ method: "POST" })
 .validator(ChecklistActionSchema)
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 if (!data.title) {
 throw new Error("Título do checklist é obrigatório");
 }

 const db = getServerClient();
 const { data: created, error } = await db
 .from("workspace_task_checklists")
 .insert({
 task_id: data.task_id,
 title: data.title.trim(),
 })
 .select()
 .single();

 if (error) throw error;
 return created;
 });

export const addTaskComment = createServerFn({ method: "POST" })
 .validator(AddCommentSchema)
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 const db = getServerClient();
 const { data: created, error } = await db
 .from("workspace_task_comments")
 .insert({
 task_id: data.task_id,
 author_profile_id: identity.id,
 comment_text: data.comment_text.trim(),
 })
 .select()
 .single();

 if (error) throw error;
 return created;
 });

export const getDailyTaskDigest = createServerFn({ method: "GET" })
 .validator(z.object({ store_id: z.string().uuid() }))
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 const db = getServerClient();
 const now = new Date();
 const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
 const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

 const { data: tasks, error } = await db
 .from("workspace_tasks")
 .select("id, status, priority, due_date, is_my_day, completed_at")
 .eq("store_id", data.store_id)
 .neq("status", "archived");

 if (error) throw error;

 const all = tasks || [];
 const myDayCount = all.filter((t) => t.is_my_day && t.status !== "done").length;
 const pendingCount = all.filter((t) => t.status !== "done").length;
 const completedTodayCount = all.filter(
 (t) => t.status === "done" && t.completed_at && t.completed_at >= startOfToday,
 ).length;
 const urgentCount = all.filter(
 (t) => (t.priority === "urgent" || t.priority === "high") && t.status !== "done",
 ).length;
 const overdueCount = all.filter(
 (t) => t.status !== "done" && t.due_date && t.due_date < startOfToday,
 ).length;

 return {
 myDayCount,
 pendingCount,
 completedTodayCount,
 urgentCount,
 overdueCount,
 totalCount: all.length,
 };
 });

// ---------------------------------------------------------------------------
// Timer Control Functions
// ---------------------------------------------------------------------------

export const startTaskTimer = createServerFn({ method: "POST" })
 .validator(z.object({ store_id: z.string().uuid(), task_id: z.string().uuid() }))
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 const db = getServerClient();
 const { data: updated, error } = await db
 .from("workspace_tasks")
 .update({
 is_timer_running: true,
 timer_started_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 })
 .eq("id", data.task_id)
 .eq("store_id", data.store_id)
 .select()
 .single();

 if (error) throw error;
 return updated;
 });

export const stopTaskTimer = createServerFn({ method: "POST" })
 .validator(z.object({ store_id: z.string().uuid(), task_id: z.string().uuid() }))
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 const db = getServerClient();
 const { data: current, error: fErr } = await db
 .from("workspace_tasks")
 .select("timer_seconds, timer_started_at, is_timer_running")
 .eq("id", data.task_id)
 .eq("store_id", data.store_id)
 .single();

 if (fErr || !current) throw new Error("Tarefa não encontrada.");

 let additionalSeconds = 0;
 if (current.is_timer_running && current.timer_started_at) {
 const diffMs = Date.now() - new Date(current.timer_started_at).getTime();
 additionalSeconds = Math.max(0, Math.floor(diffMs / 1000));
 }

 const totalSeconds = (current.timer_seconds || 0) + additionalSeconds;

 const { data: updated, error } = await db
 .from("workspace_tasks")
 .update({
 timer_seconds: totalSeconds,
 is_timer_running: false,
 timer_started_at: null,
 updated_at: new Date().toISOString(),
 })
 .eq("id", data.task_id)
 .eq("store_id", data.store_id)
 .select()
 .single();

 if (error) throw error;
 return updated;
 });

export const resetTaskTimer = createServerFn({ method: "POST" })
 .validator(z.object({ store_id: z.string().uuid(), task_id: z.string().uuid() }))
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 const db = getServerClient();
 const { data: updated, error } = await db
 .from("workspace_tasks")
 .update({
 timer_seconds: 0,
 is_timer_running: false,
 timer_started_at: null,
 updated_at: new Date().toISOString(),
 })
 .eq("id", data.task_id)
 .eq("store_id", data.store_id)
 .select()
 .single();

 if (error) throw error;
 return updated;
 });

// ---------------------------------------------------------------------------
// Kanban Column Management
// ---------------------------------------------------------------------------

export const listTaskColumns = createServerFn({ method: "GET" })
 .validator(z.object({ store_id: z.string().uuid() }))
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 const db = getServerClient();
 const { data: columns, error } = await db
 .from("workspace_task_columns")
 .select("*")
 .eq("store_id", data.store_id)
 .order("sort_order", { ascending: true });

 if (error) throw error;

 if (!columns || columns.length === 0) {
 return [
 { id: "col-todo", store_id: data.store_id, column_key: "todo", name: "A Fazer", color: "#64748b", sort_order: 0, limit_wip: 0, is_done_column: false },
 { id: "col-in_progress", store_id: data.store_id, column_key: "in_progress", name: "Em Andamento", color: "#3b82f6", sort_order: 1, limit_wip: 0, is_done_column: false },
 { id: "col-review", store_id: data.store_id, column_key: "review", name: "Revisão / Bloqueado", color: "#f59e0b", sort_order: 2, limit_wip: 0, is_done_column: false },
 { id: "col-done", store_id: data.store_id, column_key: "done", name: "Concluído", color: "#10b981", sort_order: 3, limit_wip: 0, is_done_column: true },
 ];
 }
 return columns;
 });

export const saveTaskColumns = createServerFn({ method: "POST" })
 .validator(
 z.object({
 store_id: z.string().uuid(),
 columns: z.array(
 z.object({
 name: z.string().min(1),
 column_key: z.string().min(1),
 color: z.string().default("#6366f1"),
 sort_order: z.number().default(0),
 limit_wip: z.number().default(0),
 is_done_column: z.boolean().default(false),
 })
 ),
 })
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 const db = getServerClient();
 for (const col of data.columns) {
 await db.from("workspace_task_columns").upsert(
 {
 store_id: data.store_id,
 name: col.name,
 column_key: col.column_key,
 color: col.color,
 sort_order: col.sort_order,
 limit_wip: col.limit_wip,
 is_done_column: col.is_done_column,
 updated_at: new Date().toISOString(),
 },
 { onConflict: "store_id, column_key" }
 );
 }
 return { success: true };
 });
