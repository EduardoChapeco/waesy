import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";

const { createSmartModuleMock } = vi.hoisted(() => ({
  createSmartModuleMock: (overrides: Record<string, any> = {}) =>
    new Proxy(overrides, {
      get(target, prop) {
        if (prop === "__esModule") return true;
        if (prop === "default") return overrides.default ?? target;
        if (prop === "then" || typeof prop === "symbol") return undefined;
        if (prop in target) return target[prop as any];
        return ({ children, ...props }: any) =>
          React.createElement("span", { "data-icon": String(prop), ...props }, children);
      },
      has(target, prop) {
        if (prop === "__esModule" || prop === "default" || prop in target) return true;
        return typeof prop === "string";
      },
    }),
}));

const mockLoaderData: Record<string, any> = {};

vi.mock("lucide-react", () => createSmartModuleMock());
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (routePath: string) => (options: Record<string, unknown>) => ({
    ...options,
    options,
    useLoaderData: () => mockLoaderData[routePath],
    useSearch: () => ({}),
    useParams: () => ({ leadId: "b02cc135-d7c9-4fdd-9820-c62d18b326b7" }),
  }),
  useRouter: () => ({ invalidate: vi.fn(), history: { back: vi.fn() } }),
  Link: ({ children, ...props }: any) => React.createElement("a", props, children),
}));
vi.mock("@/services/crm.functions", () => ({
  getPublicLeadByToken: vi.fn(),
  submitPublicLeadForm: vi.fn(),
  uploadPublicLeadDocument: vi.fn(),
  deletePublicLeadDocument: vi.fn(),
  createCustomerDocument: vi.fn(),
  deleteCustomerDocument: vi.fn(),
}));
vi.mock("@/components/ui/file-attachment-upload", () => ({
  FileAttachmentUpload: () => React.createElement("div", { "data-testid": "file-attachment-upload" }),
}));

import {
  calculateAgeFromDateOnly,
  formatDate,
  formatDateOnlyBr,
  normalizeDateOnlyInput,
  parseDateOnlyParts,
} from "@/lib/datetime";
import { Route as LeadPortalRoute } from "@/routes/m.lead.$leadId";

describe("M10 — Timezone Date-Only Safety, Portal /m/lead/$leadId & Document Upload E2E", () => {
  it("preserva datas civis YYYY-MM-DD sem deslocamento de -1 dia em fusos negativos (BRT -03:00)", () => {
    expect(formatDateOnlyBr("2027-09-25")).toBe("25/09/2027");
    expect(formatDateOnlyBr("2027-09-29")).toBe("29/09/2027");
    expect(formatDate("2027-09-25")).toBe("25/09/2027");

    const shortStart = formatDateOnlyBr("2027-09-25", { shortMonth: true });
    expect(shortStart).toContain("25");
    expect(shortStart).not.toContain("24");

    expect(normalizeDateOnlyInput("2027-09-25T00:00:00.000Z")).toBe("2027-09-25");
    expect(normalizeDateOnlyInput("25/09/2027")).toBe("2027-09-25");
    expect(parseDateOnlyParts("2027-09-25")).toEqual({
      year: 2027,
      month: 9,
      day: 25,
      iso: "2027-09-25",
    });

    expect(calculateAgeFromDateOnly("2000-09-25", new Date("2027-09-25T15:00:00Z"))).toBe(27);
    expect(calculateAgeFromDateOnly("2000-09-25", new Date("2027-09-24T15:00:00Z"))).toBe(26);
  });

  it("renderiza /m/lead/$leadId com datas editáveis corretas (25/09/2027 a 29/09/2027), upload de documentos e barra fixa sem sobreposição", () => {
    mockLoaderData["/m/lead/$leadId"] = {
      loadError: null,
      leadData: {
        id: "b02cc135-d7c9-4fdd-9820-c62d18b326b7",
        store_id: "store-1",
        customer_id: "cust-1",
        store_name: "Excelência Tour São Miguel do Oeste",
        store_logo: null,
        store_whatsapp: "5549999999999",
        full_name: "Estevan",
        document: "12345678909",
        rg: "5544332",
        birth_date: "1994-05-10",
        phone: "49999990000",
        email: "estevan@example.com",
        destination: "Porto Seguro",
        departure_city: "São Miguel do Oeste",
        travel_start: "2027-09-25",
        travel_end: "2027-09-29",
        interest_period: "",
        pax_count: 1,
        pax_list: [],
        lgpd_accepted: false,
        health_notes: "",
        pcd: false,
        reduced_mobility: false,
        autism: false,
        customer_documents: [
          {
            id: "doc-1",
            doc_type: "passport",
            title: "Passaporte — Estevan",
            doc_number: "BR123456",
            expires_at: "2032-08-15",
            file_url: "https://signed.example.com/passport.pdf",
            traveler_id: "pax-primary",
            traveler_name: "Estevan",
            expiryStatus: "valid",
          },
        ],
      },
    };

    const Comp = (LeadPortalRoute as any).component;
    const html = renderToStaticMarkup(React.createElement(Comp));

    expect(html).toContain("Excelência Tour São Miguel do Oeste");
    expect(html).toContain("Olá, Estevan!");
    expect(html).toContain("Porto Seguro");
    expect(html).toContain("25/09/2027 a 29/09/2027");
    expect(html).not.toContain("24/09/2027");
    expect(html).toContain('id="lead-travel-start"');
    expect(html).toContain('value="2027-09-25"');
    expect(html).toContain('id="lead-travel-end"');
    expect(html).toContain('value="2027-09-29"');
    expect(html).toContain("Documentos Digitalizados");
    expect(html).toContain("Passaporte — Estevan");
    expect(html).toContain("Validade: 15/08/2032");
    expect(html).toContain("pb-36 pb-safe");
    expect(html).toContain("fixed inset-x-0 bottom-0 z-30");
    expect(html).toContain("Enviar Preferências à Agência");
  });

  it("renderiza ErrorState recuperável quando o loader do portal /m/lead retorna falha", () => {
    mockLoaderData["/m/lead/$leadId"] = {
      leadData: null,
      loadError: "Formulário de viagem não encontrado ou expirado.",
    };

    const Comp = (LeadPortalRoute as any).component;
    const html = renderToStaticMarkup(React.createElement(Comp));

    expect(html).toContain("Formulário Indisponível");
    expect(html).toContain("Formulário de viagem não encontrado ou expirado.");
  });

  it("elimina URL.createObjectURL, window.confirm, document_number inválido, sobrecarga de RPC e drift de datas nos arquivos-alvo", () => {
    const portalSrc = fs.readFileSync(path.resolve(process.cwd(), "src/routes/m.lead.$leadId.tsx"), "utf8");
    const leadCardSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/tourism/crm/LeadCard.tsx"),
      "utf8",
    );
    const docsPanelSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/crm/DocumentsPanel.tsx"),
      "utf8",
    );
    const dossierSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/tourism/crm/TourismPipeCardDossier.tsx"),
      "utf8",
    );
    const lifecycleSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/services/travel-lifecycle.functions.ts"),
      "utf8",
    );
    const migrationSrc = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "supabase/migrations/20270418000000_public_lead_intake_and_customer_documents_e2e.sql",
      ),
      "utf8",
    );

    expect(portalSrc).not.toContain("toLocaleDateString");
    expect(portalSrc).not.toContain("font-black");
    expect(portalSrc).not.toContain("sticky bottom-4");
    expect(leadCardSrc).not.toContain("toLocaleDateString");
    expect(docsPanelSrc).not.toContain("confirm(");
    expect(docsPanelSrc).not.toContain('T00:00:00');
    expect(dossierSrc).not.toContain("URL.createObjectURL");
    expect(lifecycleSrc).not.toContain("document_number");

    expect(migrationSrc).toContain("DROP FUNCTION IF EXISTS public.submit_public_lead_passengers(uuid, jsonb, boolean, text);");
    expect(migrationSrc).toContain("public.is_store_staff(store_id)");
    expect(migrationSrc).toContain("ADD COLUMN IF NOT EXISTS doc_type text");
    expect(migrationSrc).toContain("ADD COLUMN IF NOT EXISTS expires_at date");
  });
});
