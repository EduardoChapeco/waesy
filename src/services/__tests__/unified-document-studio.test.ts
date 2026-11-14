import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  DOCUMENT_STUDIO_ARCHETYPE_META,
  DOCUMENT_STUDIO_TEMPLATES,
  buildCommercialDocumentDataAdapter,
  compileStudioDocumentMarkdown,
  interpolateDocumentMergeTags,
  resolveTenantDocumentIdentity,
  type DocumentStudioFormState,
} from "@/lib/documents/document-studio-catalog";
import {
  buildStandaloneHtmlDocument,
  buildWordCompatibleDocHtml,
  markdownToBasicHtml,
} from "@/lib/documents/document-export";
import { ADVANCED_CONTRACT_TEMPLATES } from "@/lib/data/advanced-contract-templates";

function readWorkspaceFile(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

function buildSampleFormState(): DocumentStudioFormState {
  return {
    title: "Dossiê Executivo — Porto Seguro",
    subtitle: "Pacote Aéreo + Resort All Inclusive",
    protocolCode: "ATT-2026-089",
    issueDate: "14/11/2026",
    validUntilDate: "21/11/2026",
    clientName: "Estevan Oliveira",
    clientDocument: "123.456.789-00",
    clientEmail: "estevan@exemplo.com.br",
    clientPhone: "49 99959-2998",
    clientAddress: "Av. Brasil, 500 — Centro",
    clientCompany: "",
    destination: "Porto Seguro — BA",
    startDate: "2027-09-25",
    endDate: "2027-09-30",
    adultsCount: 2,
    childrenCount: 1,
    totalCents: 950000,
    entryCents: 190000,
    installmentsCount: 10,
    paymentMethod: "PIX + Cartão",
    paymentConditions: "Entrada de 20% + saldo em 10x sem juros",
    flightSummary: "XAP -> BPS (Ida e Volta c/ bagagem 23kg)",
    hotelSummary: "Resort Costa do Sol — Suíte Família",
    includedItemsText: "- Aéreo ida e volta\n- 5 diárias All Inclusive\n- Traslado privativo",
    excludedItemsText: "- Passeios opcionais não listados",
    itineraryNotes: "Embarque matinal com recepção exclusiva no aeroporto de Porto Seguro.",
    healthAllergies: "Alergia a frutos do mar",
    healthMedications: "Nenhum de uso contínuo",
    dietaryRestrictions: "Sem restrições adicionais",
    accessibilityNeeds: "Assento prioritário corredor",
    emergencyContactName: "Marina Oliveira",
    emergencyContactPhone: "49 99911-2233",
    passengers: [
      {
        name: "Estevan Oliveira",
        document: "123.456.789-00",
        birthDate: "12/04/1988",
        role: "Titular",
      },
      {
        name: "Marina Oliveira",
        document: "987.654.321-11",
        birthDate: "03/08/1990",
        role: "Acompanhante",
      },
    ],
    financialRows: [
      {
        label: "Entrada / Sinal (20%)",
        dueDate: "15/11/2026",
        amountCents: 190000,
        status: "Previsto",
      },
      {
        label: "Saldo Parcelado",
        dueDate: "15/12/2026",
        amountCents: 760000,
        status: "Agendado",
      },
    ],
    checklists: [
      {
        title: "Documentação & Seguro",
        completedCount: 4,
        totalCount: 5,
      },
    ],
    extraCustomFields: [{ label: "Observação VIP", value: "Quarto silencioso andar superior" }],
    markdownBody: "## Resumo Inicial\nSolicitação em análise.",
    contractTemplateId: ADVANCED_CONTRACT_TEMPLATES[0]?.id || "template-prestacao-servicos",
    contractVariables: {
      foro_cidade: "São Miguel do Oeste - SC",
    },
  };
}

describe("Studio Unificado de Documentos & Builders Contextuais", () => {
  it("cobre os 5 arquétipos contextuais e incorpora todos os contratos avançados no catálogo", () => {
    const archetypes = DOCUMENT_STUDIO_ARCHETYPE_META.map((a) => a.id);
    expect(archetypes).toEqual([
      "dossier_form_doc",
      "proposal_quote",
      "contract_legal",
      "voucher_boarding",
      "presentation_deck",
    ]);

    for (const contractTpl of ADVANCED_CONTRACT_TEMPLATES) {
      const matched = DOCUMENT_STUDIO_TEMPLATES.find(
        (t) => t.id === `contract_${contractTpl.id}` && t.archetype === "contract_legal",
      );
      expect(matched).toBeDefined();
      expect(matched?.title).toBe(contractTpl.title);
    }
  });

  it("hidrata a identidade real do locatário e erradica fallbacks hardcoded genéricos", () => {
    const emptyTenant = resolveTenantDocumentIdentity();
    expect(emptyTenant.companyName).toBe("Organização Emissora");
    expect(emptyTenant.companyName).not.toContain("Waesy");
    expect(emptyTenant.companyName).not.toContain("Excelência Tour");
    expect(emptyTenant.companyName).not.toContain("Minha Empresa");

    const customTenant = resolveTenantDocumentIdentity({
      agency: {
        name: "Agência Horizonte Sul",
        slug: "horizonte-sul",
        logo_url: "https://cdn.example.com/logo.png",
        brand_color: "#0F4C81",
      },
      companyProfile: {
        company_name: "Horizonte Sul Turismo LTDA",
        cnpj: "12.345.678/0001-99",
        cadastur: "42.099881.10.0001-0",
        city: "Chapecó",
        state: "SC",
        phone: "(49) 3322-1000",
        email: "atendimento@horizontesul.com.br",
      },
      storeSettings: {
        pix_key: "12345678000199",
      },
    });

    expect(customTenant.companyName).toBe("Horizonte Sul Turismo LTDA");
    expect(customTenant.documentNumber).toBe("12.345.678/0001-99");
    expect(customTenant.registryCode).toBe("42.099881.10.0001-0");
    expect(customTenant.cityState).toBe("Chapecó / SC");
    expect(customTenant.pixKey).toBe("12345678000199");
    expect(customTenant.slug).toBe("horizonte-sul");
  });

  it("interpola marcadores dinâmicos e compila fichas, contratos e adaptador comercial com precisão", () => {
    const tenant = resolveTenantDocumentIdentity({
      companyProfile: {
        company_name: "Agência Atlas",
        cnpj: "99.888.777/0001-66",
        city: "Florianópolis",
        state: "SC",
      },
      storeSettings: {
        pix_key: "pix@atlas.com.br",
      },
    });
    const form = buildSampleFormState();

    const merged = interpolateDocumentMergeTags(
      "Emissor {{empresa_emissora}} ({{cnpj_emissora}}) para {{nome_cliente}} — {{destino}} ({{valor_total}}) | Saúde: {{saude_pcd}}",
      form,
      tenant,
    );
    expect(merged).toContain("Agência Atlas");
    expect(merged).toContain("99.888.777/0001-66");
    expect(merged).toContain("Estevan Oliveira");
    expect(merged).toContain("Porto Seguro — BA");
    expect(merged).toContain("Alergia a frutos do mar");

    const anamneseMd = compileStudioDocumentMarkdown("anamnese_embarque", form, tenant);
    expect(anamneseMd).toContain("Agência Atlas");
    expect(anamneseMd).toContain("Alergia a frutos do mar");
    expect(anamneseMd).toContain("Marina Oliveira");

    const contractTpl = ADVANCED_CONTRACT_TEMPLATES[0];
    const contractMd = compileStudioDocumentMarkdown(`contract_${contractTpl.id}`, form, tenant);
    expect(contractMd).toContain("Estevan Oliveira");
    expect(contractMd.length).toBeGreaterThan(100);

    const commercialData = buildCommercialDocumentDataAdapter(form, tenant);
    expect(commercialData.issuer.companyName).toBe("Agência Atlas");
    expect(commercialData.issuer.pixKey).toBe("pix@atlas.com.br");
    expect(commercialData.client.name).toBe("Estevan Oliveira");
    expect(commercialData.totalCents).toBe(950000);
    expect(commercialData.items.length).toBe(2);
  });

  it("converte Markdown para HTML escapando XSS e gera exportações HTML autônoma e Word (.doc) A4/Paisagem", () => {
    const md = [
      "# Proposta Oficial",
      "",
      "Texto com <script>alert(1)</script> e **destaque**.",
      "",
      "| Item | Valor |",
      "| :--- | ---: |",
      "| Pacote Porto Seguro | R$ 9.500,00 |",
      "",
      "- Incluso traslado",
    ].join("\n");

    const htmlBody = markdownToBasicHtml(md);
    expect(htmlBody).not.toContain("<script>");
    expect(htmlBody).toContain("&lt;script&gt;");
    expect(htmlBody).toContain("<strong>destaque</strong>");
    expect(htmlBody).toContain('<table class="doc-table">');
    expect(htmlBody).toContain("<td>Pacote Porto Seguro</td>");

    const standaloneHtml = buildStandaloneHtmlDocument({
      title: "Orçamento 01",
      agencyName: "Agência Horizonte",
      agencyDocument: "12.345.678/0001-99",
      markdownContent: md,
      pageFormat: "a4-portrait",
    });
    expect(standaloneHtml).toContain("<!DOCTYPE html>");
    expect(standaloneHtml).toContain("Agência Horizonte");
    expect(standaloneHtml).toContain("A4 portrait");

    const portraitWord = buildWordCompatibleDocHtml({
      title: "Contrato 01",
      agencyName: "Agência Horizonte",
      markdownContent: md,
      pageFormat: "a4-portrait",
    });
    expect(portraitWord).toContain("urn:schemas-microsoft-com:office:word");
    expect(portraitWord).toContain("size: 21.0cm 29.7cm;");

    const landscapeWord = buildWordCompatibleDocHtml({
      title: "Apresentação Deck",
      agencyName: "Agência Horizonte",
      markdownContent: md,
      pageFormat: "presentation-169",
    });
    expect(landscapeWord).toContain("size: 29.7cm 21.0cm;");
  });

  it("garante integração estrutural sem hardcodes ou modais apertados em todos os Builders e Rotas", () => {
    const dossierSrc = readWorkspaceFile("src/components/tourism/crm/TourismPipeCardDossier.tsx");
    expect(dossierSrc).toContain("<UniversalDocumentStudio");
    expect(dossierSrc).toContain("customerId: resolvedCustomerId");
    expect(dossierSrc).not.toContain("const PDF_TEMPLATES");
    expect(dossierSrc).not.toContain("Waesy Travel Suite");
    expect(dossierSrc).not.toContain("Waesy Agência de Viagens");

    const budgetSrc = readWorkspaceFile("src/components/documents/CommercialBudgetPadSheet.tsx");
    expect(budgetSrc).toContain("sm:max-w-none");
    expect(budgetSrc).toContain("<StudioFrame");
    expect(budgetSrc).toContain("<ProposalEditorialAgency");
    expect(budgetSrc).toContain("<DocumentExportMenu");
    expect(budgetSrc).toContain("resolveTenantDocumentIdentity");
    expect(budgetSrc).not.toContain("Minha Empresa Parceira");

    const contractEditorSrc = readWorkspaceFile("src/components/office/contract-editor-sheet.tsx");
    expect(contractEditorSrc).toContain("<StudioFrame");
    expect(contractEditorSrc).toContain("<DocumentExportMenu");
    expect(contractEditorSrc).toContain("<ContractVariablePicker");
    expect(contractEditorSrc).toContain("<ContractClauseLibrary");
    expect(contractEditorSrc).toContain("<ContractSignPad");
    expect(contractEditorSrc).toContain("ADVANCED_CONTRACT_TEMPLATES");
    expect(contractEditorSrc).toContain("resolveTenantDocumentIdentity");
    expect(contractEditorSrc).not.toContain("Minha Loja Waesy");
    expect(contractEditorSrc).not.toContain("Waesy Office Suite");

    const contractRouteSrc = readWorkspaceFile("src/routes/workspace.contratos.index.tsx");
    expect(contractRouteSrc).not.toContain("bg-card border border-border rounded-lg w-full max-w-4xl max-h-screen overflow-y-auto p-6");

    const presentationSrc = readWorkspaceFile("src/components/tourism/boarding/PreBoardingPresentationStudio.tsx");
    expect(presentationSrc).toContain("<DocumentExportMenu");
    expect(presentationSrc).not.toContain("Sala VIP Excelência Tour");

    const voucherStudioSrc = readWorkspaceFile("src/components/tourism/vouchers/VoucherStudio.tsx");
    expect(voucherStudioSrc).toContain("<DocumentExportMenu");

    const proposalRouteSrc = readWorkspaceFile("src/routes/workspace.turismo.propostas.$id.tsx");
    expect(proposalRouteSrc).toContain("<DocumentExportMenu");

    const voucherStorySrc = readWorkspaceFile("src/components/tourism/vouchers/templates/template-voucher-story.tsx");
    expect(voucherStorySrc).not.toContain("Waesy Travel Suite");

    const voucherA4Src = readWorkspaceFile("src/components/tourism/vouchers/templates/template-voucher-a4.tsx");
    expect(voucherA4Src).not.toContain("Agência Waesy Turismo");
  });
});
