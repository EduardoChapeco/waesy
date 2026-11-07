import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CommunitySpacesView } from "./CommunitySpacesView";

describe("Community — CommunitySpacesView (Espaços de Comunidade & Publicações)", () => {
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
      <CommunitySpacesView
        community={community}
        threads={[
          {
            id: "t-1",
            authorName: "Lucas Alencar",
            authorUsername: "lucas",
            timeAgo: "há 2 horas",
            content: "Primeira discussão sobre tecnologia e inovação",
            likesCount: 12,
            repliesCount: 3,
          },
        ]}
        sessions={[
          {
            id: "s-1",
            title: "Meetup Tech",
            dateStr: "Quinta às 19h",
            location: "Auditório Central",
            priceCents: 0,
            rsvpsCount: 25,
          },
        ]}
        products={[
          {
            id: "p-1",
            title: "Adesivo Dev",
            priceCents: 1500,
            category: "Swag",
          },
        ]}
      />
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
