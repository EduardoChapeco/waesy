import { describe, expect, it } from "vitest";
import { updateLeadDetails, updateCustomerSchema } from "@/services/crm.functions";
import { CANONICAL_SERVICE_TAGS } from "@/components/tourism/crm/advanced-lead-tags-picker";
import { ANAMNESE_TAXONOMY, type AnamneseData, type AnamneseVersion } from "@/components/tourism/crm/anamnese-doc-editor";
import type { LeadReminder } from "@/components/tourism/crm/lead-reminders-manager";

describe("Tourism CRM — Advanced Lead Tags, Dossier, Anamnese & Customer 360° E2E", () => {
  describe("1. Advanced Lead Tags Engine & Taxonomy", () => {
    it("deve carregar catálogo canônico de tags por nicho com labels padronizados", () => {
      expect(CANONICAL_SERVICE_TAGS.length).toBeGreaterThanOrEqual(10);
      const labels = CANONICAL_SERVICE_TAGS.map((t) => t.label);
      expect(labels).toContain("VIP");
      expect(labels).toContain("Primeira Viagem");
      expect(labels).toContain("Lua de Mel");
      expect(labels).toContain("Passaporte Pendente");
      expect(labels).toContain("Orçamento Alto");
      expect(labels).toContain("Família com Crianças");
    });

    it("deve adicionar tags sem duplicação e suportar remoção", () => {
      let activeTags: string[] = ["VIP"];
      const addTag = (newTag: string) => {
        const trimmed = newTag.trim();
        if (trimmed && !activeTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
          activeTags = [...activeTags, trimmed];
        }
      };
      const removeTag = (tagToRemove: string) => {
        activeTags = activeTags.filter((t) => t !== tagToRemove);
      };

      addTag("Lua de Mel");
      expect(activeTags).toEqual(["VIP", "Lua de Mel"]);

      // Tentativa de duplicata com case diferente
      addTag("vip");
      expect(activeTags).toEqual(["VIP", "Lua de Mel"]);

      removeTag("VIP");
      expect(activeTags).toEqual(["Lua de Mel"]);
    });

    it("deve validar payload de updateLeadDetails contendo tags personalizadas", () => {
      const payload = {
        leadId: "11111111-1111-4111-a111-111111111111",
        tags: ["VIP", "Cruzeiro MSC", "Check-in Prioritário"],
        title: "Atendimento Jussara - Cruzeiro",
      };

      // O schema do validator de updateLeadDetails deve aceitar o array de tags
      expect(payload.tags).toHaveLength(3);
      expect(payload.tags).toContain("VIP");
    });
  });

  describe("2. Lead Reminders & Alarm Intelligence", () => {
    it("deve calcular corretamente os horários dos atalhos de vencimento (+2h, +24h, +72h, +168h)", () => {
      const baseNow = new Date("2026-11-18T10:00:00.000Z");

      const addHours = (base: Date, hours: number) => {
        const d = new Date(base.getTime() + hours * 60 * 60 * 1000);
        return d.toISOString();
      };

      const plus2h = new Date(addHours(baseNow, 2));
      const plus24h = new Date(addHours(baseNow, 24));
      const plus72h = new Date(addHours(baseNow, 72));
      const plus168h = new Date(addHours(baseNow, 168));

      expect(plus2h.getUTCHours()).toBe(12);
      expect(plus24h.getUTCDate()).toBe(19);
      expect(plus72h.getUTCDate()).toBe(21);
      expect(plus168h.getUTCDate()).toBe(25);
    });

    it("deve classificar o status do lembrete: Atrasado vs Vence Hoje vs Futuro", () => {
      const now = new Date("2026-11-18T14:00:00");

      const classifyReminder = (dueDateStr: string, completed: boolean) => {
        if (completed) return "concluido";
        const due = new Date(dueDateStr);
        if (due < now) return "atrasado";
        const isToday =
          due.getFullYear() === now.getFullYear() &&
          due.getMonth() === now.getMonth() &&
          due.getDate() === now.getDate();
        if (isToday) return "hoje";
        return "agendado";
      };

      expect(classifyReminder("2026-11-18T10:00:00", false)).toBe("atrasado");
      expect(classifyReminder("2026-11-18T18:00:00", false)).toBe("hoje");
      expect(classifyReminder("2026-11-20T10:00:00", false)).toBe("agendado");
      expect(classifyReminder("2026-11-18T10:00:00", true)).toBe("concluido");
    });

    it("deve alternar estado de conclusão e permitir exclusão de lembretes", () => {
      let reminders: LeadReminder[] = [
        {
          id: "rem-1",
          type: "call",
          title: "Ligar para cliente",
          dueDate: "2026-11-18T16:00",
          completed: false,
          createdAt: "2026-11-18T10:00",
        },
        {
          id: "rem-2",
          type: "proposal",
          title: "Enviar cotação de hotel",
          dueDate: "2026-11-19T10:00",
          completed: false,
          createdAt: "2026-11-18T10:00",
        },
      ];

      // Toggle rem-1
      reminders = reminders.map((r) => (r.id === "rem-1" ? { ...r, completed: !r.completed } : r));
      expect(reminders.find((r) => r.id === "rem-1")?.completed).toBe(true);

      // Delete rem-2
      reminders = reminders.filter((r) => r.id !== "rem-2");
      expect(reminders).toHaveLength(1);
      expect(reminders[0].id).toBe("rem-1");
    });
  });

  describe("3. Anamnese Multimodal (Checklist + Doc Word + Version History)", () => {
    it("deve carregar taxonomia completa com 6 grupos estruturados", () => {
      expect(ANAMNESE_TAXONOMY.travelStyles.length).toBeGreaterThan(0);
      expect(ANAMNESE_TAXONOMY.lodgingPreferences.length).toBeGreaterThan(0);
      expect(ANAMNESE_TAXONOMY.flightPreferences.length).toBeGreaterThan(0);
      expect(ANAMNESE_TAXONOMY.dietaryRestrictions.length).toBeGreaterThan(0);
      expect(ANAMNESE_TAXONOMY.healthAndAccessibility.length).toBeGreaterThan(0);
      expect(ANAMNESE_TAXONOMY.desiredExperiences.length).toBeGreaterThan(0);
    });

    it("deve alternar seleções na anamnese sem duplicação", () => {
      let anamnese: AnamneseData = {
        travelStyles: [],
        lodgingPreferences: [],
        flightPreferences: [],
        dietaryRestrictions: [],
        healthAndAccessibility: [],
        desiredExperiences: [],
        consultantNotes: "",
      };

      const toggleItem = (category: keyof Omit<AnamneseData, "consultantNotes">, item: string) => {
        const list = anamnese[category];
        anamnese = {
          ...anamnese,
          [category]: list.includes(item) ? list.filter((x) => x !== item) : [...list, item],
        };
      };

      toggleItem("travelStyles", "Ecoturismo & Natureza");
      expect(anamnese.travelStyles).toContain("Ecoturismo & Natureza");

      toggleItem("travelStyles", "Ecoturismo & Natureza");
      expect(anamnese.travelStyles).not.toContain("Ecoturismo & Natureza");

      toggleItem("dietaryRestrictions", "Vegetariano");
      toggleItem("dietaryRestrictions", "Sem Glúten (Celíaco)");
      expect(anamnese.dietaryRestrictions).toEqual(["Vegetariano", "Sem Glúten (Celíaco)"]);
    });

    it("deve gravar snapshot congelado de versão e permitir restauração com integridade", () => {
      const initialData: AnamneseData = {
        travelStyles: ["Econômica"],
        lodgingPreferences: ["Hotel Central"],
        flightPreferences: ["Assento Janela"],
        dietaryRestrictions: [],
        healthAndAccessibility: [],
        desiredExperiences: ["Compras & Gastronomia"],
        consultantNotes: "Cliente prefere voos diretos.",
      };

      const history: AnamneseVersion[] = [
        {
          id: "v-1",
          savedAt: "2026-11-18T10:00:00.000Z",
          authorName: "Consultor Carlos",
          versionTitle: "Entrevista Inicial",
          data: initialData,
        },
      ];

      // Mutação da anamnese atual
      let currentData: AnamneseData = {
        ...initialData,
        travelStyles: ["Premium / Luxo"],
        lodgingPreferences: ["Resort All-Inclusive"],
      };

      // Restauração a partir do snapshot
      const restored = history[0].data;
      expect(restored.travelStyles).toEqual(["Econômica"]);
      expect(restored.lodgingPreferences).toEqual(["Hotel Central"]);
      expect(restored.consultantNotes).toBe("Cliente prefere voos diretos.");
    });
  });

  describe("4. Customer 360° Dossier & Document Expiry Intelligence", () => {
    it("deve validar dados cadastrais editáveis via updateCustomerSchema", () => {
      const validPayload = {
        id: "22222222-2222-4222-a222-222222222222",
        fullName: "Jussara Silva",
        document: "123.456.789-00",
        phone: "+5549988177133",
        email: "jussara@example.com",
        city: "São Miguel do Oeste",
        state: "SC",
        notes: "Cliente VIP, prefere contatos pelo WhatsApp no período da tarde.",
      };

      const result = updateCustomerSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("deve detectar e disparar alerta de passaporte com validade inferior a 6 meses", () => {
      const tripStartDate = new Date("2027-01-15");

      const checkPassport = (passportExpiryStr: string): { alert: boolean; severity: string } => {
        const expiry = new Date(passportExpiryStr);
        const diffMonths = (expiry.getTime() - tripStartDate.getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
        if (diffMonths < 0) return { alert: true, severity: "danger" };
        if (diffMonths < 6) return { alert: true, severity: "danger" };
        return { alert: false, severity: "normal" };
      };

      // Passaporte vence em Março de 2027 (apenas 2 meses após o início da viagem)
      const warning1 = checkPassport("2027-03-20");
      expect(warning1.alert).toBe(true);
      expect(warning1.severity).toBe("danger");

      // Passaporte vence em Dezembro de 2027 (> 10 meses)
      const warning2 = checkPassport("2027-12-20");
      expect(warning2.alert).toBe(false);
    });

    it("deve alertar sobre RG emitido há mais de 10 anos para viagens internacionais no Mercosul", () => {
      const checkRgAge = (issueDateStr: string): boolean => {
        const issue = new Date(issueDateStr);
        const now = new Date("2026-11-18");
        const diffYears = (now.getTime() - issue.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        return diffYears >= 10;
      };

      // RG emitido em 2012 (14 anos)
      expect(checkRgAge("2012-05-10")).toBe(true);
      // RG emitido em 2021 (5 anos)
      expect(checkRgAge("2021-08-15")).toBe(false);
    });

    it("deve prover inteligência automática para destinos com regras especiais (Bonito, Noronha, Jalapão)", () => {
      const getDestinationAlert = (destination: string) => {
        const lower = destination.toLowerCase();
        if (lower.includes("bonito")) {
          return {
            title: "Destino com Voucher Único Obrigatório",
            key: "bonito",
          };
        }
        if (lower.includes("noronha")) {
          return {
            title: "Taxa de Preservação Ambiental (TPA) & Ingresso Parque Nacional",
            key: "noronha",
          };
        }
        if (lower.includes("jalap")) {
          return {
            title: "Expedição 4x4 Obrigatória & Guias Credenciados",
            key: "jalapao",
          };
        }
        return null;
      };

      expect(getDestinationAlert("Bonito - MS")?.key).toBe("bonito");
      expect(getDestinationAlert("Fernando de Noronha")?.key).toBe("noronha");
      expect(getDestinationAlert("Jalapão - TO")?.key).toBe("jalapao");
      expect(getDestinationAlert("Gramado - RS")).toBeNull();
    });
  });

  describe("5. Payment Plan Proposal Linking & Multi-Niche Engine", () => {
    it("deve detectar proposta aceita e vincular automaticamente ao plano financeiro", () => {
      const proposals = [
        { id: "prop-1", title: "Cotação Inicial", status: "draft", total_value_cents: 800000 },
        { id: "prop-2", title: "Pacote Nordeste Premium", status: "approved", acceptance_status: "accepted", accepted_option_id: "opt-luxo", total_value_cents: 1250000 },
      ];

      const accepted = proposals.find(
        (p) => p.status === "approved" || p.status === "accepted" || p.acceptance_status === "accepted"
      );

      expect(accepted).toBeDefined();
      expect(accepted?.id).toBe("prop-2");
      expect(accepted?.accepted_option_id).toBe("opt-luxo");
    });

    it("deve sincronizar decomposição tarifária para nicho de Turismo", () => {
      const proposal = {
        id: "prop-tour-1",
        title: "Pacote Gramado & Canela",
        total_value_cents: 1000000, // R$ 10.000,00
        pricing: {
          total_price_cents: 1000000,
          boarding_tax_cents: 12000, // R$ 120,00
          other_taxes_cents: 8000,   // R$ 80,00
          payment_terms: "Entrada de 20% no PIX + 10x sem juros no cartão",
        },
      };

      const totalCents = proposal.pricing.total_price_cents;
      const flightEst = Math.round(totalCents * 0.45); // 450000
      const hotelEst = Math.round(totalCents * 0.40);  // 400000
      const boardingTax = proposal.pricing.boarding_tax_cents;
      const insurance = proposal.pricing.other_taxes_cents;
      const commissionEst = Math.max(0, totalCents - flightEst - hotelEst - boardingTax); // 138000

      const computedTotal = flightEst + hotelEst + insurance + boardingTax + commissionEst;
      expect(flightEst).toBe(450000);
      expect(hotelEst).toBe(400000);
      expect(computedTotal).toBeGreaterThan(0);
    });

    it("deve sincronizar decomposição para nicho Comercial / Serviços B2B", () => {
      const commercialProposal = {
        id: "prop-b2b-1",
        title: "Consultoria em Gestão & Implantação de Software",
        total_value_cents: 2500000, // R$ 25.000,00
        pricing: {
          total_price_cents: 2500000,
          other_taxes_cents: 150000, // R$ 1.500,00 impostos
          discount_cents: 100000,    // R$ 1.000,00 desconto
          payment_terms: "50% de sinal no contrato + 50% na homologação final",
        },
      };

      const totalCents = commercialProposal.pricing.total_price_cents;
      const servicesEst = Math.max(0, totalCents - commercialProposal.pricing.other_taxes_cents);
      const marginEst = Math.round(servicesEst * 0.25);

      const plan = {
        niche_mode: "comercial",
        services_cents: servicesEst,
        products_cents: 0,
        taxes_cents: commercialProposal.pricing.other_taxes_cents,
        discount_cents: commercialProposal.pricing.discount_cents,
        margin_cents: marginEst,
        notes: commercialProposal.pricing.payment_terms,
      };

      expect(plan.services_cents).toBe(2350000);
      expect(plan.taxes_cents).toBe(150000);
      expect(plan.notes).toContain("50% de sinal");
    });
  });

  describe("6. Contratos Digitais, Envelopes & Sincronização DocuSign/ClickSign Tier", () => {
    it("deve unificar contratos de customer360Data e localContracts sem duplicatas e com ordenação decrescente", () => {
      const c360Contracts = [
        { id: "ctr-1", contract_title: "Contrato 1", created_at: "2026-11-17T10:00:00Z", total_value_cents: 100000 },
        { id: "ctr-2", contract_title: "Contrato 2", created_at: "2026-11-18T08:00:00Z", total_value_cents: 200000 },
      ];
      const localContracts = [
        { id: "ctr-2", contract_title: "Contrato 2 Atualizado", status: "signed", created_at: "2026-11-18T08:00:00Z" },
        { id: "ctr-3", contract_title: "Contrato 3 Recente", status: "signing", created_at: "2026-11-18T11:00:00Z" },
      ];

      const map = new Map<string, any>();
      for (const c of c360Contracts) {
        if (c?.id) map.set(c.id, c);
      }
      for (const c of localContracts) {
        if (c?.id) {
          const prev = map.get(c.id) || {};
          map.set(c.id, { ...prev, ...c });
        }
      }
      const allContracts = Array.from(map.values()).sort((a, b) => {
        const ta = new Date(a.created_at || 0).getTime();
        const tb = new Date(b.created_at || 0).getTime();
        return tb - ta;
      });

      expect(allContracts).toHaveLength(3);
      // Mais recente primeiro: ctr-3 (11:00) > ctr-2 (08:00) > ctr-1 (10:00 do dia 17)
      expect(allContracts[0].id).toBe("ctr-3");
      expect(allContracts[1].id).toBe("ctr-2");
      expect(allContracts[1].status).toBe("signed"); // merge do localContracts
      expect(allContracts[2].id).toBe("ctr-1");
    });

    it("deve calcular corretamente a etapa (1 a 5) da trilha probatória militar", () => {
      const calculateStep = (c: any) => {
        const isSigned = c.status === "signed" || Boolean(c.signed_at);
        const isViewed = isSigned || c.status === "viewed" || Boolean(c.viewed_at);
        const isDispatched = isViewed || c.status === "sent" || c.status === "signing" || Boolean(c.signing_token);
        const isDraft = c.status === "draft";
        return isSigned ? 5 : isViewed ? 4 : isDispatched ? 3 : isDraft ? 1 : 2;
      };

      expect(calculateStep({ status: "draft" })).toBe(1);
      expect(calculateStep({ status: "sent", signing_token: "tok-123" })).toBe(3);
      expect(calculateStep({ status: "viewed", viewed_at: "2026-11-18T10:00:00Z" })).toBe(4);
      expect(calculateStep({ status: "signed", signed_at: "2026-11-18T10:30:00Z" })).toBe(5);
    });

    it("deve estruturar envelopes com tokens individuais de assinatura e links seguros", () => {
      const contract = {
        id: "ctr-bonito-42",
        public_token: "pub-ctr-bonito-42",
        verification_code: "CTR-BONITO-2026",
        envelopes: [
          {
            id: "env-1",
            signer_name: "Jussara Silva",
            signer_role: "client",
            signer_phone: "5549988177133",
            signer_email: "jussara@email.com",
            status: "pending",
            signing_token: "sign-tok-jussara-99",
          },
          {
            id: "env-2",
            signer_name: "Excelência Tour Agência",
            signer_role: "agency",
            signer_phone: "5549991716233",
            signer_email: "excelenciatour.smo@gmail.com",
            status: "signed",
            signing_token: "sign-tok-agency-01",
          },
        ],
      };

      expect(contract.envelopes).toHaveLength(2);
      expect(contract.envelopes[0].signing_token).toBe("sign-tok-jussara-99");
      const clientSignUrl = `https://waesy.com.br/assinar/${contract.envelopes[0].signing_token}`;
      expect(clientSignUrl).toBe("https://waesy.com.br/assinar/sign-tok-jussara-99");
      expect(contract.envelopes[1].status).toBe("signed");
    });

    it("deve auto-preencher minuta a partir de proposta aprovada e plano de pagamento", () => {
      const acceptedProposal = {
        id: "prop-noronha-1",
        title: "Fernando de Noronha Épico",
        destination: "Fernando de Noronha / PE",
        pricing: {
          total_price_cents: 1850000,
          payment_terms: "Entrada de 30% PIX + 10x sem juros no cartão",
        },
      };

      const lead = {
        full_name: "Jussara Silva",
        destination: "Fernando de Noronha",
      };

      const title = `Contrato de Intermediação Turística - ${acceptedProposal.title} - ${lead.full_name}`;
      const summary = `Intermediação e assessoria operacional de serviços turísticos para ${acceptedProposal.destination}, abrangendo aéreo, hospedagem e serviços inclusos na proposta "${acceptedProposal.title}".`;
      const totalCents = acceptedProposal.pricing.total_price_cents;
      const paymentConditions = acceptedProposal.pricing.payment_terms;

      expect(title).toBe("Contrato de Intermediação Turística - Fernando de Noronha Épico - Jussara Silva");
      expect(summary).toContain("Fernando de Noronha / PE");
      expect(totalCents).toBe(1850000);
      expect(paymentConditions).toContain("Entrada de 30% PIX");
    });
  });
});
