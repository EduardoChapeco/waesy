import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb, mockStorageBucket } = vi.hoisted(() => {
  const storageBucket = {
    upload: vi.fn(async (filePath: string) => ({ data: { path: filePath }, error: null })),
    createBucket: vi.fn(async () => ({ data: null, error: null })),
    createSignedUrl: vi.fn(async (filePath: string) => ({
      data: { signedUrl: `https://signed.example.com/${filePath}` },
      error: null,
    })),
    remove: vi.fn(async () => ({ data: [], error: null })),
  };
  const db = {
    from: vi.fn(),
    rpc: vi.fn(),
    storage: {
      from: vi.fn(() => storageBucket),
      createBucket: vi.fn(async () => ({ data: null, error: null })),
    },
  };
  return { mockDb: db, mockStorageBucket: storageBucket };
});

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: (schema: any) => ({
      handler: (fn: any) => async (payload: any) => {
        const parsed = schema ? schema.parse(payload?.data) : payload?.data;
        return fn({ data: parsed });
      },
    }),
    handler: (fn: any) => fn,
  }),
}));

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => mockDb,
}));

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: vi.fn(async () => ({ id: "staff-1", store_id: "store-1", role: "owner" })),
  assertStoreAccess: vi.fn(),
}));

vi.mock("@/lib/rate-limiter", () => ({
  enforceRateLimit: vi.fn(),
}));

import {
  getPublicLeadByToken,
  submitPublicLeadForm,
  uploadPublicLeadDocument,
  deletePublicLeadDocument,
} from "@/services/crm.functions";

function makeChain(result: { data?: any; error?: any } = { data: null, error: null }) {
  const chain: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    ilike: vi.fn(() => chain),
    or: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(result).then(onFulfilled, onRejected);
    },
  };
  return chain;
}

describe("M10 BFF — Public Lead Portal & Customer Documents E2E", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("carrega lead completo com datas normais, customer e documentos hidratados com signed URLs", async () => {
    const leadId = "b02cc135-d7c9-4fdd-9820-c62d18b326b7";
    const leadRow = {
      id: leadId,
      store_id: "store-1",
      customer_id: "cust-1",
      title: "Porto Seguro",
      full_name: "Estevan",
      document: "12345678909",
      rg: "998877",
      birth_date: "1994-05-10",
      phone: "49999990000",
      email: "estevan@example.com",
      destination: "Porto Seguro",
      travel_start: "2027-09-25",
      travel_end: "2027-09-29",
      pax_count: 2,
      pax_list: [{ id: "pax-acc-1", full_name: "Maria", relationship: "spouse" }],
      lgpd_accepted: true,
      custom_fields: {},
    };

    mockDb.from.mockImplementation((table: string) => {
      if (table === "leads_crm") return makeChain({ data: leadRow, error: null });
      if (table === "stores") {
        return makeChain({
          data: { name: "Excelência Tour", logo_url: null, phone: "4936220000", settings: {} },
          error: null,
        });
      }
      if (table === "customers_crm") {
        return makeChain({
          data: { id: "cust-1", full_name: "Estevan", address: "Rua A, 100", city: "SMO", state: "SC" },
          error: null,
        });
      }
      if (table === "customer_documents") {
        return makeChain({
          data: [
            {
              id: "doc-1",
              doc_type: "passport",
              title: "Passaporte",
              expires_at: "2032-08-15",
              file_url: "old-path",
              storage_bucket: "identity-vault",
              storage_path: "store-1/leads/lead-1/passport.pdf",
            },
          ],
          error: null,
        });
      }
      return makeChain({ data: null, error: null });
    });

    const res: any = await (getPublicLeadByToken as any)({ data: { token: leadId } });
    expect(res.id).toBe(leadId);
    expect(res.travel_start).toBe("2027-09-25");
    expect(res.travel_end).toBe("2027-09-29");
    expect(res.customer_documents).toHaveLength(1);
    expect(res.customer_documents[0].file_url).toBe(
      "https://signed.example.com/store-1/leads/lead-1/passport.pdf",
    );
  });

  it("persiste alterações de datas, dados do titular, acompanhantes e sincroniza customers_crm", async () => {
    const leadId = "b02cc135-d7c9-4fdd-9820-c62d18b326b7";
    const leadUpdates: any[] = [];
    const customerUpdates: any[] = [];
    const activityInserts: any[] = [];

    mockDb.from.mockImplementation((table: string) => {
      if (table === "leads_crm") {
        const chain = makeChain({
          data: {
            id: leadId,
            store_id: "store-1",
            customer_id: "cust-1",
            full_name: "Estevan",
            document: "12345678909",
            custom_fields: {
              traveler_dossiers: [{ id: "pax-primary", is_primary: true, visas: [{ country: "EUA" }] }],
            },
          },
          error: null,
        });
        chain.update = vi.fn((payload: any) => {
          leadUpdates.push(payload);
          return chain;
        });
        return chain;
      }
      if (table === "customers_crm") {
        const chain = makeChain({ data: { id: "cust-1" }, error: null });
        chain.update = vi.fn((payload: any) => {
          customerUpdates.push(payload);
          return chain;
        });
        return chain;
      }
      if (table === "lead_activities") {
        const chain = makeChain({ data: { id: "act-1" }, error: null });
        chain.insert = vi.fn((payload: any) => {
          activityInserts.push(payload);
          return chain;
        });
        return chain;
      }
      return makeChain();
    });

    const result: any = await (submitPublicLeadForm as any)({
      data: {
        token: leadId,
        fullName: "Estevan Silva",
        document: "123.456.789-09",
        birthDate: "1994-05-10",
        destination: "Porto Seguro",
        travelStart: "2027-09-25",
        travelEnd: "2027-09-29",
        paxList: [
          {
            full_name: "Maria Silva",
            birth_date: "1996-11-20",
            relationship: "spouse",
          },
        ],
        lgpdAccepted: true,
      },
    });

    expect(result.success).toBe(true);
    expect(result.travel_start).toBe("2027-09-25");
    expect(result.travel_end).toBe("2027-09-29");
    expect(result.pax_count).toBe(2);
    expect(leadUpdates[0].travel_start).toBe("2027-09-25");
    expect(leadUpdates[0].travel_end).toBe("2027-09-29");
    // Preserva vistos pré-existentes no dossiê do titular
    expect(leadUpdates[0].custom_fields.traveler_dossiers[0].visas).toEqual([{ country: "EUA" }]);
    expect(customerUpdates[0].full_name).toBe("Estevan Silva");
    expect(activityInserts[0].type).toBe("public_form_submitted");
  });

  it("rejeita submissão sem aceite LGPD ou com data de volta anterior à ida (prova negativa)", async () => {
    const leadId = "b02cc135-d7c9-4fdd-9820-c62d18b326b7";
    mockDb.from.mockImplementation(() =>
      makeChain({ data: { id: leadId, store_id: "store-1", custom_fields: {} }, error: null }),
    );

    await expect(
      (submitPublicLeadForm as any)({
        data: { token: leadId, paxList: [], lgpdAccepted: false },
      }),
    ).rejects.toThrow(/LGPD/i);

    await expect(
      (submitPublicLeadForm as any)({
        data: {
          token: leadId,
          travelStart: "2027-09-29",
          travelEnd: "2027-09-25",
          paxList: [],
          lgpdAccepted: true,
        },
      }),
    ).rejects.toThrow(/anterior/i);
  });

  it("realiza upload real em identity-vault, vincula customer_documents + customers_crm e permite exclusão autorizada", async () => {
    const leadId = "b02cc135-d7c9-4fdd-9820-c62d18b326b7";
    const docId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const insertedDocs: any[] = [];
    const base64Sample = Buffer.from("%PDF-1.4 sample passport").toString("base64");

    mockDb.from.mockImplementation((table: string) => {
      if (table === "leads_crm") {
        return makeChain({
          data: {
            id: leadId,
            store_id: "store-1",
            customer_id: "cust-1",
            full_name: "Estevan",
            attachments: [],
            custom_fields: { traveler_dossiers: [{ id: "pax-primary", is_primary: true, documents: [] }] },
          },
          error: null,
        });
      }
      if (table === "customers_crm") {
        return makeChain({ data: { id: "cust-1" }, error: null });
      }
      if (table === "customer_documents") {
        const chain = makeChain({
          data: {
            id: docId,
            store_id: "store-1",
            customer_id: "cust-1",
            lead_id: leadId,
            doc_type: "passport",
            title: "Passaporte — Estevan (BR123456)",
            doc_number: "BR123456",
            expires_at: "2032-08-15",
            storage_bucket: "identity-vault",
            storage_path: "store-1/leads/lead-1/pax-primary/pass.pdf",
          },
          error: null,
        });
        chain.insert = vi.fn((payload: any) => {
          insertedDocs.push(payload);
          return chain;
        });
        return chain;
      }
      return makeChain();
    });

    const uploaded: any = await (uploadPublicLeadDocument as any)({
      data: {
        token: leadId,
        fileName: "passaporte.pdf",
        fileType: "application/pdf",
        base64Data: base64Sample,
        docType: "passport",
        docNumber: "BR123456",
        expiresAt: "2032-08-15",
        travelerId: "pax-primary",
        travelerName: "Estevan",
      },
    });

    expect(uploaded.success).toBe(true);
    expect(uploaded.customerId).toBe("cust-1");
    expect(mockStorageBucket.upload).toHaveBeenCalledTimes(1);
    expect(insertedDocs[0].customer_id).toBe("cust-1");
    expect(insertedDocs[0].lead_id).toBe(leadId);
    expect(insertedDocs[0].doc_type).toBe("passport");
    expect(insertedDocs[0].storage_bucket).toBe("identity-vault");

    // Rejeita MIME não permitido no portal público (prova negativa)
    await expect(
      (uploadPublicLeadDocument as any)({
        data: {
          token: leadId,
          fileName: "malware.exe",
          fileType: "application/x-msdownload",
          base64Data: base64Sample,
          docType: "other",
        },
      }),
    ).rejects.toThrow(/Formato de arquivo não permitido/i);

    // Exclusão autorizada do mesmo lead funciona
    const delRes: any = await (deletePublicLeadDocument as any)({
      data: { token: leadId, documentId: docId },
    });
    expect(delRes.success).toBe(true);
    expect(mockStorageBucket.remove).toHaveBeenCalledTimes(1);
  });
});
