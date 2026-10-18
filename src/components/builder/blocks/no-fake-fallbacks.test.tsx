import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContactFormDirect } from "./ContactFormDirect";
import { FaqCleanAccordion } from "./FaqCleanAccordion";
import { InteractiveQuoteCalculator } from "./InteractiveQuoteCalculator";
import { PricingTablesClean } from "./PricingTablesClean";
import { TestimonialsSocialProof } from "./TestimonialsSocialProof";

describe("empty builder blocks do not fabricate business content", () => {
  it("renders an honest empty FAQ instead of payment/legal claims", () => {
    const html = renderToStaticMarkup(<FaqCleanAccordion id="faq" data={{ title: "Perguntas", items: [] }} />);
    expect(html).toContain("Nenhuma pergunta foi configurada");
    expect(html).not.toContain("12x");
    expect(html).not.toContain("validade jurídica");
  });

  it("renders an honest empty social-proof state without invented people or verification", () => {
    const html = renderToStaticMarkup(<TestimonialsSocialProof id="proof" data={{ title: "Depoimentos", testimonials: [] }} />);
    expect(html).toContain("Nenhum depoimento foi adicionado");
    expect(html).not.toContain("Carolina Mendes");
    expect(html).not.toContain("verified");
  });

  it("does not invent a blanket annual discount or expose an incomplete annual toggle", () => {
    const html = renderToStaticMarkup(<PricingTablesClean id="pricing" data={{
      title: "Planos",
      subtitle: "",
      tiers: [{
        id: "starter",
        name: "Inicial",
        priceMonthlyCents: 10000,
        description: "Plano de exemplo",
        features: ["Suporte"],
        ctaLabel: "Contratar",
        isPopular: false,
      }],
    }} />);
    expect(html).not.toContain("20% OFF");
    expect(html).not.toContain("Faturamento Anual");
    expect(html).toContain("/mês");
    expect(html).toContain("disabled=\"\"");
    expect(html).not.toContain("/workspace/financeiro/faturas");
  });

  it("does not claim lead delivery or enable submit without a valid WhatsApp destination", () => {
    const html = renderToStaticMarkup(<ContactFormDirect id="contact" data={{
      title: "Contato",
      submitButtonText: "Enviar mensagem",
      whatsappNumber: "",
      showPhoneField: true,
      showMessageField: true,
      successMessage: "Mensagem recebida!",
    }} />);
    expect(html).toContain("Destino de WhatsApp não configurado");
    expect(html).toContain("disabled=\"\"");
    expect(html).not.toContain("Mensagem Recebida!");
  });

  it("does not enable quote submission without valid WhatsApp destination or onLeadSubmit handler", () => {
    const html = renderToStaticMarkup(<InteractiveQuoteCalculator id="calc" data={{
      title: "Simule e Solicite sua Cotação",
      basePriceCents: 15000,
      unitPriceCents: 4500,
      minUnits: 1,
      maxUnits: 20,
      defaultUnits: 2,
      unitLabel: "Pessoa",
      unitPluralLabel: "Pessoas",
      options: [],
      whatsappNumber: "",
      submitButtonText: "Solicitar Proposta Oficial",
      successMessage: "Enviado!",
      disclaimer: "Estimativa",
    }} />);
    expect(html).toContain("Destino de WhatsApp não configurado");
    expect(html).toContain("disabled=\"\"");
    expect(html).toContain("Simulador em Tempo Real");
  });
});
