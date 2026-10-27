import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CommunitySpacesView } from "./CommunitySpacesView";

describe("Community — CommunitySpacesView (Wix Spaces & Threads Parity)", () => {
  it("renderiza o cabeçalho do espaço, bio íntegra e abas de conteúdo", () => {
    const community = {
      id: "comm-1",
      slug: "tech-smo",
      title: "Tecnologia & Inovação SMO",
      description: "Espaço aberto para desenvolvedores, designers e empreendedores da região oeste catarinense.",
      membersCount: 420,
      isMember: true,
    };

    const html = renderToStaticMarkup(
      <CommunitySpacesView community={community} />
    );

    expect(html).toContain("Tecnologia &amp; Inovação SMO");
    expect(html).toContain("/c/@tech-smo");
    expect(html).toContain("420 membros");
    expect(html).toContain("Participando");
    expect(html).toContain("Espaço aberto para desenvolvedores");
    expect(html).toContain("Discussões");
    expect(html).toContain("Sessões &amp; Encontros");
    expect(html).toContain("Loja do Criador");
    expect(html).toContain("Membros");
    expect(html).toContain("Lucas Alencar");
  });
});
