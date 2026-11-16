import { describe, expect, it } from "vitest";
import {
  _inviteTeamMember,
  _listTeamMembers,
  _updateTeamMemberProfile,
} from "@/services/admin-team.functions";
import { isPartnerLawEligibleStore } from "@/lib/niches/niche-semantics";

const STORE_FOODMAN = "32233049-07c6-49bf-a053-989824fef385";
const STORE_BEAUTY = "44444444-4444-4444-8444-444444444444";
const STORE_OTHER = "55555555-5555-4555-8555-555555555555";

const OWNER_EDUARDO = "2ea9f0aa-8b04-4086-9e1d-e23105560302";
const USER_EXTERNAL = "66666666-6666-4666-8666-666666666666";

function createIsolationMockDb(options?: { totalAuthUsers?: number }) {
  const totalAuthUsers = options?.totalAuthUsers ?? 0;
  const authUsers: Array<{ id: string; email: string }> = [
    { id: OWNER_EDUARDO, email: "meuwider@gmail.com" },
    { id: USER_EXTERNAL, email: "external.user250@waesy.com.br" },
  ];

  for (let i = 0; i < totalAuthUsers; i += 1) {
    authUsers.unshift({
      id: `77777777-7777-4777-8777-${String(i).padStart(12, "0")}`,
      email: `filler.${i}@example.com`,
    });
  }

  const tables: Record<string, any[]> = {
    stores: [
      {
        id: STORE_FOODMAN,
        name: "Foodman",
        slug: "foodman",
        primary_niche_id: null,
        vertical_sku: null,
        is_platform_root: false,
        plan_tier: "enterprise",
        settings: { niche: "gastronomy", segment: "gastronomy", type: "gastronomy" },
      },
      {
        id: STORE_BEAUTY,
        name: "Studio Beleza Real",
        slug: "studio-beleza-real",
        primary_niche_id: "beauty_salon",
        vertical_sku: "waesy_salon_beauty",
        is_platform_root: false,
        plan_tier: "enterprise",
        settings: { niche: "beauty_salon", segment: "beauty_salon" },
      },
      {
        id: STORE_OTHER,
        name: "Agência Turismo Sul",
        slug: "agencia-turismo-sul",
        primary_niche_id: "tourism",
        vertical_sku: "waesy_travel",
        is_platform_root: false,
        plan_tier: "enterprise",
        settings: { niche: "tourism" },
      },
    ],
    profiles: [
      {
        id: OWNER_EDUARDO,
        full_name: "Eduardo Antônio Ramos",
        avatar_url: null,
        phone: "49999990000",
      },
      {
        id: USER_EXTERNAL,
        full_name: "Nome Original Outra Loja",
        avatar_url: null,
        phone: "49988881111",
      },
    ],
    workspace_members: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        store_id: STORE_FOODMAN,
        profile_id: OWNER_EDUARDO,
        role: "owner",
        contract_type: "partner_law",
        created_at: "2026-11-07T19:46:08Z",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        store_id: STORE_BEAUTY,
        profile_id: OWNER_EDUARDO,
        role: "owner",
        contract_type: "partner_law",
        created_at: "2026-11-07T19:46:08Z",
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        store_id: STORE_OTHER,
        profile_id: USER_EXTERNAL,
        role: "owner",
        contract_type: "clt",
        created_at: "2026-10-01T10:00:00Z",
      },
    ],
    chat_departments: [],
    whatsapp_channel_instances: [],
  };

  const from = (tableName: string) => {
    const filters: Array<(row: any) => boolean> = [];
    let action: "select" | "insert" | "update" | "upsert" = "select";
    let payload: any = null;
    let upsertOpts: any = null;
    let selectClause = "*";
    let wantSingle: "single" | "maybeSingle" | null = null;

    const enrich = (row: any) => {
      const cloned = { ...row };
      if (tableName === "workspace_members" && selectClause.includes("profiles(")) {
        cloned.profiles = tables.profiles.find((p) => p.id === row.profile_id) || null;
      }
      return cloned;
    };

    const run = () => {
      const list = tables[tableName] || (tables[tableName] = []);
      if (action === "update") {
        const matched = list.filter((r) => filters.every((f) => f(r)));
        matched.forEach((r) => Object.assign(r, payload));
        const res = matched.map(enrich);
        return { data: wantSingle ? res[0] ?? null : res, error: null };
      }
      if (action === "upsert") {
        const conflictCols = String(upsertOpts?.onConflict || "id")
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean);
        const existing = list.find((r) => conflictCols.every((c) => r[c] === payload[c]));
        if (existing) {
          Object.assign(existing, payload);
          const enriched = enrich(existing);
          return { data: wantSingle ? enriched : [enriched], error: null };
        }
        const created = { id: `99999999-9999-4999-8999-${String(list.length + 1).padStart(12, "0")}`, ...payload };
        list.push(created);
        return { data: wantSingle ? enrich(created) : [enrich(created)], error: null };
      }

      const matched = list.filter((r) => filters.every((f) => f(r))).map(enrich);
      if (wantSingle === "single") {
        return matched[0] ? { data: matched[0], error: null } : { data: null, error: { message: "Not found" } };
      }
      if (wantSingle === "maybeSingle") {
        return { data: matched[0] ?? null, error: null };
      }
      return { data: matched, error: null };
    };

    const builder: any = {
      select: (cols?: string) => {
        if (cols) selectClause = cols;
        return builder;
      },
      update: (data: any) => {
        action = "update";
        payload = data;
        return builder;
      },
      upsert: (data: any, opts?: any) => {
        action = "upsert";
        payload = data;
        upsertOpts = opts;
        return builder;
      },
      eq: (col: string, val: any) => {
        filters.push((r) => r[col] === val);
        return builder;
      },
      neq: (col: string, val: any) => {
        filters.push((r) => r[col] !== val);
        return builder;
      },
      in: (col: string, vals: any[]) => {
        filters.push((r) => Array.isArray(vals) && vals.includes(r[col]));
        return builder;
      },
      order: () => builder,
      single: () => {
        wantSingle = "single";
        return Promise.resolve(run());
      },
      maybeSingle: () => {
        wantSingle = "maybeSingle";
        return Promise.resolve(run());
      },
      then: (resolve: any, reject?: any) => Promise.resolve(run()).then(resolve, reject),
    };
    return builder;
  };

  return {
    tables,
    from,
    auth: {
      admin: {
        createUser: async ({ email }: { email: string }) => {
          const exists = authUsers.some((u) => u.email.toLowerCase() === email.toLowerCase());
          if (exists) {
            return { data: { user: null }, error: { message: "User already registered" } };
          }
          const created = { id: "88888888-8888-4888-8888-888888888888", email };
          authUsers.push(created);
          return { data: { user: created }, error: null };
        },
        listUsers: async (opts?: { page?: number; perPage?: number }) => {
          const page = opts?.page ?? 1;
          const perPage = opts?.perPage ?? 50;
          const start = (page - 1) * perPage;
          return { data: { users: authUsers.slice(start, start + perPage) }, error: null };
        },
        getUserById: async (id: string) => {
          const found = authUsers.find((u) => u.id === id) || null;
          return { data: { user: found }, error: null };
        },
      },
    },
  };
}

describe("Isolamento multi-tenant e elegibilidade contratual da equipe", () => {
  it("classifica corretamente apenas nichos de Beleza/Barbearia/Estética para Salão Parceiro", () => {
    expect(isPartnerLawEligibleStore({ settings: { niche: "gastronomy" } })).toBe(false);
    expect(isPartnerLawEligibleStore({ primary_niche_id: "tourism" })).toBe(false);
    expect(isPartnerLawEligibleStore({ settings: { segment: "retail" } })).toBe(false);
    expect(isPartnerLawEligibleStore({ primary_niche_id: "beauty_salon" })).toBe(true);
    expect(isPartnerLawEligibleStore({ primary_niche_id: "barbershop" })).toBe(true);
    expect(isPartnerLawEligibleStore({ primary_niche_id: "aesthetics_clinic" })).toBe(true);
  });

  it("lista estritamente membros da loja ativa, normaliza contract_type para clt fora de Beleza e resolve e-mail via getUserById", async () => {
    const db = createIsolationMockDb();
    const foodmanIdentity = {
      id: OWNER_EDUARDO,
      store_id: STORE_FOODMAN,
      role: "owner",
      memberships: [{ store_id: STORE_FOODMAN, role: "owner" }],
    };

    const foodmanMembers = await _listTeamMembers({ db, identity: foodmanIdentity });
    expect(foodmanMembers).toHaveLength(1);
    expect(foodmanMembers[0].id).toBe(OWNER_EDUARDO);
    expect(foodmanMembers[0].email).toBe("meuwider@gmail.com");
    expect(foodmanMembers[0].contract_type).toBe("clt");

    const beautyIdentity = {
      id: OWNER_EDUARDO,
      store_id: STORE_BEAUTY,
      role: "owner",
      memberships: [{ store_id: STORE_BEAUTY, role: "owner" }],
    };
    const beautyMembers = await _listTeamMembers({ db, identity: beautyIdentity });
    expect(beautyMembers).toHaveLength(1);
    expect(beautyMembers[0].contract_type).toBe("partner_law");
  });

  it("localiza usuário existente além do limite de 50 usuários, evita sobrescrever perfil global de outra loja e bloqueia partner_law em Delivery", async () => {
    const db = createIsolationMockDb({ totalAuthUsers: 220 });
    const foodmanIdentity = {
      id: OWNER_EDUARDO,
      store_id: STORE_FOODMAN,
      role: "owner",
      memberships: [{ store_id: STORE_FOODMAN, role: "owner" }],
    };

    const invited = await _inviteTeamMember(
      {
        email: "external.user250@waesy.com.br",
        fullName: "Tentativa Sobrescrita Global",
        phone: "11000000000",
        role: "seller",
        contractType: "partner_law",
      },
      { db, identity: foodmanIdentity },
    );

    expect(invited.profileId).toBe(USER_EXTERNAL);
    expect(invited.member.contract_type).toBe("clt");

    const externalProfileAfterInvite = db.tables.profiles.find((p) => p.id === USER_EXTERNAL)!;
    expect(externalProfileAfterInvite.full_name).toBe("Nome Original Outra Loja");
    expect(externalProfileAfterInvite.phone).toBe("49988881111");

    await _updateTeamMemberProfile(
      {
        profileId: USER_EXTERNAL,
        fullName: "Sobrescrita via Edição",
        phone: "11999999999",
        role: "manager",
        contractType: "partner_law",
      },
      { db, identity: foodmanIdentity },
    );

    const externalProfileAfterUpdate = db.tables.profiles.find((p) => p.id === USER_EXTERNAL)!;
    expect(externalProfileAfterUpdate.full_name).toBe("Nome Original Outra Loja");
    expect(externalProfileAfterUpdate.phone).toBe("49988881111");

    const foodmanMembership = db.tables.workspace_members.find(
      (m) => m.store_id === STORE_FOODMAN && m.profile_id === USER_EXTERNAL,
    )!;
    expect(foodmanMembership.role).toBe("manager");
    expect(foodmanMembership.contract_type).toBe("clt");
  });
});
