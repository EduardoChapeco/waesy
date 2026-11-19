import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildBrazilPhoneVariants } from "@/lib/phone-match";
import {
  _getChatQuickActionsCatalog,
  _listWhatsAppThreadsForLeadPicker,
  _openOrCreateWhatsAppThreadForLead,
  _searchStoreCrmLeads,
  autoBindLeadToMatchingWhatsAppThreads,
} from "@/services/chat-quick-actions.functions";

function createCrmWhatsAppMockDb(seed?: {
  stores?: any[];
  leads?: any[];
  threads?: any[];
  instances?: any[];
  proposals?: any[];
  invoices?: any[];
  contracts?: any[];
  forms?: any[];
  products?: any[];
}) {
  const state = {
    stores: [...(seed?.stores || [])],
    leads: [...(seed?.leads || [])],
    threads: [...(seed?.threads || [])],
    instances: [...(seed?.instances || [])],
    proposals: [...(seed?.proposals || [])],
    invoices: [...(seed?.invoices || [])],
    contracts: [...(seed?.contracts || [])],
    forms: [...(seed?.forms || [])],
    products: [...(seed?.products || [])],
  };

  const makeBuilder = (table: string) => {
    const filters: Array<{ op: string; col?: string; val?: any; expr?: string }> = [];
    let pendingAction: "select" | "insert" | "update" = "select";
    let pendingPayload: any = null;
    let limitCount: number | null = null;

    const getTableRows = (): any[] => {
      if (table === "stores") return state.stores;
      if (table === "leads_crm") return state.leads;
      if (table === "chat_threads") return state.threads;
      if (table === "whatsapp_channel_instances") return state.instances;
      if (table === "travel_proposals") return state.proposals;
      if (table === "commercial_invoices") return state.invoices;
      if (table === "contracts") return state.contracts;
      if (table === "lead_forms") return state.forms;
      if (table === "products") return state.products;
      return [];
    };

    const matchesOrExpr = (row: any, expr: string) => {
      const parts = expr.split(",");
      return parts.some((p) => {
        const eqIdx = p.indexOf(".eq.");
        if (eqIdx > 0) {
          const col = p.slice(0, eqIdx);
          const val = p.slice(eqIdx + 4);
          return String(row[col] ?? "") === val;
        }
        const ilikeIdx = p.indexOf(".ilike.");
        if (ilikeIdx > 0) {
          const col = p.slice(0, ilikeIdx);
          const val = p.slice(ilikeIdx + 7).replace(/%/g, "").toLowerCase();
          return String(row[col] ?? "").toLowerCase().includes(val);
        }
        return false;
      });
    };

    const matches = (row: any) => {
      for (const f of filters) {
        if (f.op === "eq" && f.col && row[f.col] !== f.val) return false;
        if (f.op === "neq" && f.col && row[f.col] === f.val) return false;
        if (f.op === "is" && f.col) {
          if (f.val === null && row[f.col] !== null && row[f.col] !== undefined) return false;
        }
        if (f.op === "or" && f.expr && !matchesOrExpr(row, f.expr)) return false;
      }
      return true;
    };

    const execute = async () => {
      const rows = getTableRows();
      if (pendingAction === "insert") {
        const inserted = { id: pendingPayload.id || `mock-${table}-${rows.length + 1}`, ...pendingPayload };
        rows.push(inserted);
        return { data: inserted, error: null };
      }
      if (pendingAction === "update") {
        const updated: any[] = [];
        for (const r of rows) {
          if (matches(r)) {
            Object.assign(r, pendingPayload);
            updated.push(r);
          }
        }
        return { data: updated, error: null };
      }
      let out = rows.filter(matches);
      if (limitCount !== null) out = out.slice(0, limitCount);
      return { data: out, error: null };
    };

    const api: any = {
      select: () => api,
      insert: (payload: any) => {
        pendingAction = "insert";
        pendingPayload = payload;
        return api;
      },
      update: (payload: any) => {
        pendingAction = "update";
        pendingPayload = payload;
        return api;
      },
      eq: (col: string, val: any) => {
        filters.push({ op: "eq", col, val });
        return api;
      },
      neq: (col: string, val: any) => {
        filters.push({ op: "neq", col, val });
        return api;
      },
      is: (col: string, val: any) => {
        filters.push({ op: "is", col, val });
        return api;
      },
      or: (expr: string) => {
        filters.push({ op: "or", expr });
        return api;
      },
      order: () => api,
      limit: (n: number) => {
        limitCount = n;
        return api;
      },
      maybeSingle: async () => {
        const res = await execute();
        return { data: Array.isArray(res.data) ? res.data[0] || null : res.data || null, error: null };
      },
      single: async () => {
        const res = await execute();
        return { data: Array.isArray(res.data) ? res.data[0] || null : res.data || null, error: null };
      },
      then: (resolve: any, reject: any) => execute().then(resolve, reject),
    };
    return api;
  };

  return {
    state,
    db: { from: (table: string) => makeBuilder(table) } as any,
  };
}

const STORE_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_STORE_ID = "22222222-2222-4222-8222-222222222222";
const LEAD_ID = "33333333-3333-4333-8333-333333333333";

const staffIdentity = {
  id: "99999999-9999-4999-8999-999999999999",
  role: "owner",
  store_id: STORE_ID,
  memberships: [{ store_id: STORE_ID, role: "owner" }],
};

describe("CRM Lead <-> WhatsApp Bidirecional & Painel de Acoes Rapidas 2.0", () => {
  it("gera variacoes normalizadas de telefone BR (com/sem +55 e 9o digito) e ignora @lid/@g.us", () => {
    const variants = buildBrazilPhoneVariants("(49) 99988-7766");
    expect(variants).toContain("+5549999887766");
    expect(variants).toContain("5549999887766");
    expect(variants).toContain("+554999887766");
    expect(variants).toContain("4999887766");

    expect(buildBrazilPhoneVariants("108250439667828@lid")).toEqual([]);
    expect(buildBrazilPhoneVariants("120363012345@g.us")).toEqual([]);
    expect(buildBrazilPhoneVariants("12345")).toEqual([]);
  });

  it("autoBindLeadToMatchingWhatsAppThreads vincula conversa existente (incluindo variacao sem 9o digito) respeitando tenant", async () => {
    const { db, state } = createCrmWhatsAppMockDb({
      threads: [
        {
          id: "th-br-match",
          store_id: STORE_ID,
          context_type: "whatsapp",
          primary_phone_e164: "+554999887766",
          entity_id: "+554999887766",
          lead_id: null,
          customer_id: null,
          metadata: {},
        },
        {
          id: "th-other-store",
          store_id: OTHER_STORE_ID,
          context_type: "whatsapp",
          primary_phone_e164: "+5549999887766",
          entity_id: "+5549999887766",
          lead_id: null,
          metadata: {},
        },
      ],
    });

    const res = await autoBindLeadToMatchingWhatsAppThreads(db, {
      storeId: STORE_ID,
      leadId: LEAD_ID,
      phone: "(49) 99988-7766",
      customerId: "cust-1",
    });

    expect(res.linkedThreadIds).toEqual(["th-br-match"]);
    expect(state.threads[0].lead_id).toBe(LEAD_ID);
    expect(state.threads[0].customer_id).toBe("cust-1");
    expect(state.threads[0].metadata.active_lead_id).toBe(LEAD_ID);
    expect(state.threads[1].lead_id).toBeNull();
  });

  it("openOrCreateWhatsAppThreadForLead cria nova thread quando lead tem telefone e permite vincular @lid explicita", async () => {
    const { db, state } = createCrmWhatsAppMockDb({
      leads: [
        {
          id: LEAD_ID,
          store_id: STORE_ID,
          full_name: "Maria Oliveira",
          title: "Pacote Serra Gaucha",
          phone: "(49) 99123-4567",
          email: "maria@example.com",
          customer_id: "cust-maria",
          status: "new",
        },
        {
          id: "44444444-4444-4444-8444-444444444444",
          store_id: STORE_ID,
          full_name: "Lead Sem Telefone",
          title: "Contato Meta @lid",
          phone: null,
          status: "new",
        },
      ],
      instances: [
        {
          id: "inst-1",
          store_id: STORE_ID,
          is_active: true,
          is_default: true,
          status: "connected",
        },
      ],
      threads: [
        {
          id: "th-lid-1",
          store_id: STORE_ID,
          context_type: "whatsapp",
          guest_name: "Ana @lid",
          primary_phone_e164: null,
          entity_id: "108250439667828@lid",
          lead_id: null,
          metadata: { whatsapp_jid: "108250439667828@lid" },
        },
      ],
    });

    // 1. Cria thread WhatsApp vinculada para Lead com telefone
    const createdRes = await _openOrCreateWhatsAppThreadForLead(
      { storeId: STORE_ID, leadId: LEAD_ID },
      { db, identity: staffIdentity },
    );
    expect(createdRes.created).toBe(true);
    expect(createdRes.thread.lead_id).toBe(LEAD_ID);
    expect(createdRes.thread.primary_phone_e164).toBe("+5549991234567");
    expect(createdRes.thread.channel_instance_id).toBe("inst-1");

    // 2. Falha explicitamente quando lead nao tem telefone nem conversa selecionada
    await expect(
      _openOrCreateWhatsAppThreadForLead(
        { storeId: STORE_ID, leadId: "44444444-4444-4444-8444-444444444444" },
        { db, identity: staffIdentity },
      ),
    ).rejects.toThrow(/telefone WhatsApp/i);

    // 3. Permite vincular manualmente uma thread @lid existente ao lead sem telefone
    const linkedLidRes = await _openOrCreateWhatsAppThreadForLead(
      {
        storeId: STORE_ID,
        leadId: "44444444-4444-4444-8444-444444444444",
        threadId: "th-lid-1",
      },
      { db, identity: staffIdentity },
    );
    expect(linkedLidRes.created).toBe(false);
    expect(linkedLidRes.threadId).toBe("th-lid-1");
    expect(state.threads.find((t) => t.id === "th-lid-1")?.lead_id).toBe(
      "44444444-4444-4444-8444-444444444444",
    );

    // 4. Busca universal de leads e conversas funciona e bloqueia outro tenant
    const searchedLeads = await _searchStoreCrmLeads(
      { storeId: STORE_ID, query: "Maria" },
      { db, identity: staffIdentity },
    );
    expect(searchedLeads).toHaveLength(1);

    const pickerThreads = await _listWhatsAppThreadsForLeadPicker(
      { storeId: STORE_ID, query: "Ana" },
      { db, identity: staffIdentity },
    );
    expect(pickerThreads.some((t: any) => t.id === "th-lid-1")).toBe(true);

    await expect(
      _searchStoreCrmLeads({ storeId: OTHER_STORE_ID }, { db, identity: staffIdentity }),
    ).rejects.toThrow();
  });

  it("getChatQuickActionsCatalog entrega propostas, faturas, contratos, formularios e produtos reais ordenados por leadId", async () => {
    const { db } = createCrmWhatsAppMockDb({
      stores: [
        {
          id: STORE_ID,
          name: "Agencia Excelencia",
          slug: "agencia-excelencia",
          address: "Av Brasil 1200",
          city: "Sao Miguel do Oeste",
          state: "SC",
          pix_key: "pix@agencia.com.br",
        },
      ],
      proposals: [
        {
          id: "prop-other",
          store_id: STORE_ID,
          title: "Cancun",
          public_token: "tok-other",
          pricing: { total_cents: 450000 },
          lead_id: null,
          status: "sent",
        },
        {
          id: "prop-lead",
          store_id: STORE_ID,
          title: "Gramado VIP",
          public_token: "tok-gramado",
          pricing: { total_cents: 290000 },
          lead_id: LEAD_ID,
          status: "sent",
        },
      ],
      invoices: [
        {
          id: "inv-1",
          store_id: STORE_ID,
          invoice_code: "FAT-101",
          document_type: "invoice",
          status: "pending",
          public_token: "inv-tok-1",
          total_cents: 290000,
          lead_id: LEAD_ID,
        },
      ],
      contracts: [
        {
          id: "ctr-1",
          store_id: STORE_ID,
          title: "Contrato Viagem Gramado",
          status: "signing",
          verification_code: "CTR-GRAMADO",
          lead_id: LEAD_ID,
        },
      ],
      forms: [
        {
          id: "frm-1",
          store_id: STORE_ID,
          title: "Ficha de Passageiros",
          slug: "ficha-passageiros",
          status: "active",
          niche_id: "tourism",
        },
      ],
      products: [
        {
          id: "prod-1",
          store_id: STORE_ID,
          title: "Seguro Viagem Europa",
          slug: "seguro-viagem-europa",
          price_cents: 19900,
          status: "published",
        },
      ],
    });

    const catalog = await _getChatQuickActionsCatalog(
      { storeId: STORE_ID, leadId: LEAD_ID },
      { db, identity: staffIdentity },
    );

    expect(catalog.store?.hasPixKey).toBe(true);
    expect(catalog.store?.addressLine).toContain("Av Brasil 1200");
    expect(catalog.proposals[0].id).toBe("prop-lead");
    expect(catalog.proposals[0].publicToken).toBe("tok-gramado");
    expect(catalog.contracts[0].publicToken).toBe("CTR-GRAMADO");
    expect(catalog.forms[0].slug).toBe("ficha-passageiros");
    expect(catalog.products[0].slug).toBe("seguro-viagem-europa");
  });

  it("elimina dados sinteticos do Painel de Acoes Rapidas e garante integracao E2E nas rotas CRM, Comercial e Chat", () => {
    const root = process.cwd();
    const quickModals = fs.readFileSync(
      path.join(root, "src/components/chat/ChatQuickComposerModals.tsx"),
      "utf8",
    );
    const crmRoute = fs.readFileSync(path.join(root, "src/routes/workspace.crm.tsx"), "utf8");
    const comercialRoute = fs.readFileSync(path.join(root, "src/routes/workspace.comercial.tsx"), "utf8");
    const dossier = fs.readFileSync(
      path.join(root, "src/components/tourism/crm/TourismPipeCardDossier.tsx"),
      "utf8",
    );
    const c360View = fs.readFileSync(
      path.join(root, "src/components/chat/c360/C360LeadAndCommerceView.tsx"),
      "utf8",
    );
    const c360Sidebar = fs.readFileSync(
      path.join(root, "src/components/chat/customer-360-sidebar.tsx"),
      "utf8",
    );
    const chatFunctions = fs.readFileSync(path.join(root, "src/services/chat.functions.ts"), "utf8");
    const migrationSql = fs.readFileSync(
      path.join(root, "supabase/migrations/20270527000000_lead_whatsapp_bidirectional_sync_and_rls.sql"),
      "utf8",
    );

    expect(quickModals).not.toContain("DEFAULT_SPREADSHEET_PRESETS");
    expect(quickModals).not.toContain("Kit Executivo Premium");
    expect(quickModals).toContain("getChatQuickActionsCatalog");
    expect(quickModals).toContain("leadId: leadId || null");
    expect(crmRoute).toContain("openOrCreateWhatsAppThreadForLead");
    expect(crmRoute).toContain("listWhatsAppThreadsForLeadPicker");
    expect(comercialRoute).toContain("openOrCreateWhatsAppThreadForLead");
    expect(dossier).toContain("Atender no Chat Waesy (Ao Vivo)");
    expect(c360View).toContain("searchStoreCrmLeads");
    expect(c360Sidebar).toContain("searchStoreCrmLeads");
    expect(chatFunctions).toContain("lead_id: normalizedLeadId");
    expect(migrationSql).toContain("sync_chat_thread_active_lead_metadata");
    expect(migrationSql).toContain("ALTER TABLE public.leads_crm REPLICA IDENTITY FULL");
  });
});
