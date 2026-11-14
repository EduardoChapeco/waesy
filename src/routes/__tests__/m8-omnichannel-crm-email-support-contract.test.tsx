import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...rest }: any) =>
    React.createElement("a", { href: typeof to === "string" ? to : "#", ...rest }, children),
  useRouter: () => ({ invalidate: vi.fn(), navigate: vi.fn() }),
  useNavigate: () => vi.fn(),
  createFileRoute: (_path: string) => (config: any) => ({ ...config, options: config }),
}));

vi.mock("@/services/chat.functions", () => ({
  updateThreadTags: vi.fn(),
  listStoreTagCatalog: vi.fn(),
  upsertStoreTagCatalogItem: vi.fn(),
  deleteStoreTagCatalogItem: vi.fn(),
  upsertStoreTagGroup: vi.fn(),
  deleteStoreTagGroup: vi.fn(),
  toggleCustomerOnboardingStep: vi.fn(),
  createLinkedCustomerTask: vi.fn(),
}));

import {
  buildEntityTraceHash,
  buildCompositeTraceHash,
  CustomerIdentityTagPill,
  ONBOARDING_CS_STEPS,
  SAC_FUNCTION_ROLES,
} from "@/lib/entity-trace-hash";
import {
  CANONICAL_TAGS,
  DEFAULT_TAG_GROUPS_FALLBACK,
  resolveTagPillClass,
} from "@/components/chat/ThreadTagsPicker";
import { CustomerSuccessOnboardingSheet } from "@/components/support/CustomerSuccessOnboardingSheet";

const M8_ROUTES = [
  "src/routes/workspace.atendimento.index.tsx",
  "src/routes/workspace.atendimento.chat.tsx",
  "src/routes/workspace.crm.tsx",
  "src/routes/workspace.tarefas.tsx",
  "src/routes/workspace.suporte.tsx",
  "src/routes/workspace.turismo.viagens.index.tsx",
  "src/routes/workspace.configuracoes.integracoes.tsx",
];

describe("M8 Contract — Omnichannel Chat, CRM, Tag Folders, Contextual Email & CS Onboarding Sheet", () => {
  it("enforces zero silent .catch(() => []/null), loadError + ErrorState, and C.22 typography across all 7 M8 routes", () => {
    for (const relPath of M8_ROUTES) {
      const src = fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
      expect(src, `${relPath} must not contain .catch(() => [])`).not.toContain(".catch(() => [])");
      expect(src, `${relPath} must not contain .catch(() => null)`).not.toContain(".catch(() => null)");
      expect(src, `${relPath} must propagate loadError`).toContain("loadError");
      expect(src, `${relPath} must render ErrorState`).toContain("ErrorState");
      expect(src, `${relPath} must support router.invalidate()`).toContain("router.invalidate()");
      expect(src, `${relPath} must not use font-black`).not.toContain("font-black");
      expect(src, `${relPath} must not use font-extrabold`).not.toContain("font-extrabold");
    }
  });

  it("computes deterministic entity trace hashes (#CLI, #TRP, #PED, #SAC, #TSK, #PNR) and renders CustomerIdentityTagPill with avatar and initial fallback", () => {
    const cliHash = buildEntityTraceHash("customer", "cust-9988-abcd");
    const trpHash = buildEntityTraceHash("trip", "TRP-2026");
    const composite = buildCompositeTraceHash({
      customerId: "cust-9988-abcd",
      entityType: "trip",
      entityIdOrCode: "TRP-2026",
      pnrLocator: "latam9x",
    });

    expect(cliHash).toMatch(/^#CLI-[A-Z0-9]{4}$/);
    expect(trpHash).toBe("#TRP-2026");
    expect(composite).toContain(cliHash);
    expect(composite).toContain("#TRP-2026");
    expect(composite).toContain("#PNR-LATAM9X");

    const htmlWithAvatar = renderToStaticMarkup(
      <CustomerIdentityTagPill
        name="Evellyn Grossi"
        avatarUrl="https://cdn.waesy.app/avatars/evellyn.jpg"
        traceHash={cliHash}
        subtitle="PNR LATAM9X"
        roleLabel="Customer Success"
      />,
    );
    expect(htmlWithAvatar).toContain("Evellyn Grossi");
    expect(htmlWithAvatar).toContain("https://cdn.waesy.app/avatars/evellyn.jpg");
    expect(htmlWithAvatar).toContain(cliHash);
    expect(htmlWithAvatar).toContain("Customer Success");

    const htmlWithInitial = renderToStaticMarkup(
      <CustomerIdentityTagPill name="Mariza Centenaro" avatarUrl={null} traceHash="#CLI-4F2A" />,
    );
    expect(htmlWithInitial).toContain(">M<");
    expect(htmlWithInitial).toContain("Mariza Centenaro");
    expect(htmlWithInitial).toContain("#CLI-4F2A");
  });

  it("provides structured Tag Groups/Folders and semantic color resolution in ThreadTagsPicker", () => {
    expect(DEFAULT_TAG_GROUPS_FALLBACK.map((g) => g.id)).toEqual([
      "funil",
      "financeiro",
      "viagens",
      "suporte",
    ]);
    expect(CANONICAL_TAGS.length).toBeGreaterThanOrEqual(10);
    expect(resolveTagPillClass("VIP")).toContain("purple");
    expect(resolveTagPillClass("Voo / PNR Emitido")).toContain("emerald");
    expect(resolveTagPillClass("Aguardando PIX")).toContain("warning");
  });

  it("verifies 360° Lead/Contact Sidebar, Compact Squircle Chat Controls, and Corporate Email Hub contracts", () => {
    const sidebarSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/chat/customer-360-sidebar.tsx"),
      "utf8",
    );
    expect(sidebarSrc).not.toContain("font-extrabold");
    expect(sidebarSrc).not.toContain("font-black");
    // 1. Photo sync & fallback
    expect(sidebarSrc).toContain("handleSyncWhatsAppProfile");
    expect(sidebarSrc).toContain("onError={() => setAvatarImgFailed(true)}");
    // 2. Tags & internal notes
    expect(sidebarSrc).toContain("<ThreadTagsPicker");
    expect(sidebarSrc).toContain("handleSaveInternalNotes");
    // 3. AI Specialist & Attendance Mode (IA Copilot / Fila / Humano)
    expect(sidebarSrc).toContain("AI_AGENT_SPECIALISTS");
    expect(sidebarSrc).toContain("IA Copilot");
    // 4. Tourism PNR / Operator Package / Flight status
    expect(sidebarSrc).toContain("handleSaveTravelDossier");
    expect(sidebarSrc).toContain("Consultar Operadora por E-mail");
    // 5. PIX / Boleto / Pedido / Card em Imagem
    expect(sidebarSrc).toContain("Gerar Fatura PIX");
    expect(sidebarSrc).toContain("Emitir Boleto");
    expect(sidebarSrc).toContain("Card em Imagem");
    // 6. Contextual Email linked to client/thread/PNR/ticket
    expect(sidebarSrc).toContain("handleDispatchLinkedEmail");
    expect(sidebarSrc).toContain("E-mails Vinculados");
    // 7. Onboarding CS 7 steps & Synchronized Tasks/Tickets
    expect(sidebarSrc).toContain("ONBOARDING_CS_STEPS");
    expect(sidebarSrc).toContain("handleCreateLinkedTask");
    expect(sidebarSrc).toContain("handleCreateDemandTicket");

    const integracoesSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/routes/workspace.configuracoes.integracoes.tsx"),
      "utf8",
    );
    expect(integracoesSrc).toContain("getCorporateEmailHostingOverview");
    expect(integracoesSrc).toContain("createCorporateEmailMailbox");
    expect(integracoesSrc).toContain("assignCorporateEmailMailbox");
    expect(integracoesSrc).toContain("cloudwebly_cpanel");
  });

  it("renders CustomerSuccessOnboardingSheet with all 7 CS stages, PNR locator, and traceable hashes", () => {
    expect(ONBOARDING_CS_STEPS).toHaveLength(7);
    expect(SAC_FUNCTION_ROLES.length).toBeGreaterThanOrEqual(6);

    const html = renderToStaticMarkup(
      <CustomerSuccessOnboardingSheet
        storeId="store-1"
        onRefresh={vi.fn()}
        rows={[
          {
            id: "row-trip-1",
            entity_type: "trip",
            entity_id: "trip-101",
            entity_code: "TRP-101",
            entity_trace_hash: "#TRP-0101",
            title: "Gramado & Canela Natal Luz",
            subtitle: "Operadora CVC",
            pnr_locator: "G3X99K",
            operator_package_id: "PKG-8821",
            customer_id: "cust-1",
            customer_name: "Alina Souza",
            customer_phone: "+5549999112233",
            customer_avatar_url: "https://cdn.waesy.app/avatars/alina.jpg",
            customer_trace_hash: "#CLI-7A2B",
            thread_id: "thread-1",
            trip_id: "trip-101",
            status_label: "Confirmada",
            total_cents: 450000,
            departure_date: "2026-12-10",
            steps: {
              docs_received: true,
              contract_signed: true,
              payment_verified: true,
              issuance_completed: false,
              vouchers_sent: false,
              onboarding_ready: false,
              cs_completed: false,
            },
            completed_steps_count: 3,
            progress_percent: 43,
            open_tickets_count: 1,
            pending_tasks_count: 2,
          },
        ]}
      />,
    );

    expect(html).toContain("Gramado &amp; Canela Natal Luz");
    expect(html).toContain("Alina Souza");
    expect(html).toContain("#CLI-7A2B");
    expect(html).toContain("#TRP-0101");
    expect(html).toContain("G3X99K");
    expect(html).toContain("43%");
    for (const step of ONBOARDING_CS_STEPS) {
      expect(html).toContain(step.shortLabel);
    }
  });
});
