import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HostingDomainConnectModal, HostingDomainConnectContent } from "./HostingDomainConnectModal";

describe("HostingDomainConnectModal — Modal de Domínios & Hospedagem", () => {
  it("renderiza o modal fechado sem produzir HTML no portal", () => {
    const html = renderToStaticMarkup(
      <HostingDomainConnectModal
        isOpen={false}
        onClose={() => {}}
        storeSlug="minha-loja"
        storeName="Loja Modelo"
      />
    );
    expect(html).toBe("");
  });

  it("renderiza o conteúdo de subdomínio e hospedagem corretamente", () => {
    const html = renderToStaticMarkup(
      <HostingDomainConnectContent
        storeSlug="padaria-central"
        storeName="Padaria Central"
      />
    );

    expect(html).toContain("Domínios &amp; Hospedagem");
    expect(html).toContain("padaria-central.waesy.com.br");
    expect(html).toContain("Link Grátis");
    expect(html).toContain("Domínio Próprio");
    expect(html).toContain("E-mails");
  });
});
