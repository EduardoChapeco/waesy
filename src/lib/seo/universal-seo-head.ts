/**
 * UNIVERSAL SEO & GEO HEAD BUILDER — WAESY PLATFORM
 *
 * Gera cabeçalhos canônicos, OpenGraph, Twitter Cards, Metatags Georreferenciadas (GEO),
 * Metatags de Agentes de IA / WebMCP e JSON-LD Schema.org estruturado em @graph para
 * 100% das páginas públicas do ecossistema Waesy.
 */

export const WAESY_CANONICAL_ORIGIN = "https://waesy.com.br";
export const WAESY_DEFAULT_GEO_REGION = "BR-SC";
export const WAESY_DEFAULT_CITY = "São Miguel do Oeste";
export const WAESY_DEFAULT_OG_IMAGE = `${WAESY_CANONICAL_ORIGIN}/pwa-512x512.png`;

export interface GeoLocationParams {
  region?: string;
  placename?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

export interface UniversalSeoHeadOptions {
  title: string;
  description: string;
  path: string; // Ex: "/noticias/minha-materia" ou "/empregos/123"
  ogImage?: string | null;
  ogType?: "website" | "article" | "profile" | "product";
  keywords?: string[];
  geo?: GeoLocationParams;
  noindex?: boolean;
  webmcpType?: string;
  jsonLd?: Record<string, any> | Array<Record<string, any>> | null;
}

export function buildUniversalHead(options: UniversalSeoHeadOptions) {
  const {
    title,
    description,
    path,
    ogImage = WAESY_DEFAULT_OG_IMAGE,
    ogType = "website",
    keywords = [],
    geo,
    noindex = false,
    webmcpType,
    jsonLd,
  } = options;

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const canonicalUrl = `${WAESY_CANONICAL_ORIGIN}${cleanPath}`;
  const resolvedImage = ogImage || WAESY_DEFAULT_OG_IMAGE;
  const region = geo?.region || WAESY_DEFAULT_GEO_REGION;
  const placename = geo?.placename || WAESY_DEFAULT_CITY;

  const metaList: Array<Record<string, string>> = [
    { title },
    { name: "description", content: description },
    { property: "og:site_name", content: "Waesy Local Marketplace" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: ogType },
    { property: "og:url", content: canonicalUrl },
    { property: "og:image", content: resolvedImage },
    { property: "og:locale", content: "pt_BR" },
    { name: "twitter:card", content: ogImage ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: resolvedImage },
    // GEO Tags
    { name: "geo.region", content: region },
    { name: "geo.placename", content: placename },
    // WebMCP & Agent Tags
    { name: "webmcp-endpoint", content: `${WAESY_CANONICAL_ORIGIN}/api/webmcp.json` },
    { name: "openapi-spec", content: `${WAESY_CANONICAL_ORIGIN}/api/openapi.json` },
    { name: "mcp-server", content: `${WAESY_CANONICAL_ORIGIN}/api/mcp/v1/tools/call` },
  ];

  if (webmcpType) {
    metaList.push({ name: "webmcp-type", content: webmcpType });
  }

  if (keywords.length > 0) {
    metaList.push({ name: "keywords", content: keywords.join(", ") });
  }

  if (geo?.latitude && geo?.longitude) {
    const pos = `${geo.latitude};${geo.longitude}`;
    metaList.push({ name: "geo.position", content: pos });
    metaList.push({ name: "ICBM", content: `${geo.latitude}, ${geo.longitude}` });
  }

  if (noindex) {
    metaList.push({ name: "robots", content: "noindex, nofollow" });
  }

  const links: Array<Record<string, string>> = [
    { rel: "canonical", href: canonicalUrl },
    { rel: "alternate", type: "text/markdown", href: canonicalUrl },
  ];

  const scripts: Array<{ type: string; children: string }> = [];

  if (jsonLd) {
    scripts.push({
      type: "application/ld+json",
      children: JSON.stringify(jsonLd),
    });
  }

  return {
    meta: metaList,
    links,
    scripts,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILDERS ESPECÍFICOS PARA ENTIDADES DO WAESY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construtor para Vagas de Emprego (Google Jobs / JobPosting)
 */
export function buildJobSeoHead(job: any) {
  if (!job) {
    return buildUniversalHead({
      title: "Vaga de Emprego | Oportunidades Waesy",
      description: "Confira as vagas de emprego disponíveis na sua região pelo Waesy.",
      path: "/empregos",
    });
  }

  const title = `${job.title} — ${job.company_name || "Empresa Confidencial"} | Vagas Waesy`;
  const description = (job.description || "").replace(/<[^>]+>/g, "").slice(0, 160) ||
    `Vaga de ${job.title} em ${job.location || "São Miguel do Oeste"}. Confira os requisitos e envie seu currículo.`;
  const path = `/empregos/${job.id}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: (job.description || description).replace(/<[^>]+>/g, ""),
    datePosted: job.created_at || new Date().toISOString(),
    validThrough: job.valid_through || undefined,
    employmentType: job.contract_type === "PJ" ? "CONTRACTOR" : job.contract_type === "Estágio" ? "INTERN" : "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: job.company_name || "Waesy Recrutamento",
      sameAs: job.company_url || undefined,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.city || "São Miguel do Oeste",
        addressRegion: job.state || "SC",
        addressCountry: "BR",
      },
    },
    baseSalary: job.salary_min_cents
      ? {
          "@type": "MonetaryAmount",
          currency: "BRL",
          value: {
            "@type": "QuantitativeValue",
            value: job.salary_min_cents / 100,
            unitText: "MONTH",
          },
        }
      : undefined,
  };

  return buildUniversalHead({
    title,
    description,
    path,
    ogType: "website",
    webmcpType: "job_posting",
    geo: {
      placename: job.location || job.city || WAESY_DEFAULT_CITY,
      region: job.state ? `BR-${job.state}` : WAESY_DEFAULT_GEO_REGION,
    },
    jsonLd,
  });
}

/**
 * Construtor para Turismo & Experiências (TouristTrip / Product)
 */
export function buildTourismSeoHead(experience: any) {
  if (!experience) {
    return buildUniversalHead({
      title: "Turismo e Viagens | Waesy",
      description: "Descubra passeios, hospedagens e roteiros turísticos autênticos no Waesy.",
      path: "/turismo",
    });
  }

  const title = `${experience.title} — Turismo & Viagens | Waesy`;
  const description = (experience.description || "").slice(0, 160) ||
    "Descubra experiências turísticas, pacotes de viagens e passeios autênticos com reservas seguras.";
  const path = `/turismo/${experience.id}`;
  const coverUrl = experience.cover_url || experience.images?.[0] || null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: experience.title,
    description,
    image: coverUrl ? [coverUrl] : undefined,
    touristType: ["Family", "Adventure", "Couples", "Cultural"],
    offers: experience.price_cents
      ? {
          "@type": "Offer",
          price: (experience.price_cents / 100).toFixed(2),
          priceCurrency: "BRL",
          availability: "https://schema.org/InStock",
        }
      : undefined,
    provider: {
      "@type": "Organization",
      name: experience.agency_name || "Excelência Tour & Waesy",
    },
  };

  return buildUniversalHead({
    title,
    description,
    path,
    ogImage: coverUrl,
    ogType: "product",
    webmcpType: "tourism_experience",
    geo: {
      placename: experience.destination_city || WAESY_DEFAULT_CITY,
      region: WAESY_DEFAULT_GEO_REGION,
    },
    jsonLd,
  });
}

/**
 * Construtor para Serviços Agendáveis (Service / Offer)
 */
export function buildBookingServiceSeoHead(service: any) {
  if (!service) {
    return buildUniversalHead({
      title: "Agendamento de Serviços Online | Waesy",
      description: "Agende horários online com profissionais qualificados da sua região.",
      path: "/agendar",
    });
  }

  const title = `${service.title} — Agendamento Online | Waesy`;
  const description = (service.description || "").slice(0, 160) ||
    `Agende um horário para ${service.title} com rapidez e confirmação instantânea no Waesy.`;
  const path = `/agendar/${service.id}`;
  const priceCents = Number(service.price_cents || 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description,
    provider: {
      "@type": "LocalBusiness",
      name: service.store_name || "Profissional Credenciado",
    },
    offers: priceCents > 0
      ? {
          "@type": "Offer",
          price: (priceCents / 100).toFixed(2),
          priceCurrency: "BRL",
          availability: "https://schema.org/InStock",
        }
      : undefined,
  };

  return buildUniversalHead({
    title,
    description,
    path,
    ogType: "website",
    webmcpType: "booking_service",
    jsonLd,
  });
}

/**
 * Construtor para Landing Pages e Formulários Rápidos (/f/$slug)
 */
export function buildLeadFormSeoHead(form: any) {
  if (!form) {
    return buildUniversalHead({
      title: "Formulário de Atendimento | Waesy",
      description: "Canal oficial de atendimento e formulário de contato Waesy.",
      path: "/f",
    });
  }

  const storeName = form.store?.name || "Atendimento Oficial";
  const title = `${form.headline || form.title || "Formulário de Atendimento"} — ${storeName} | Waesy`;
  const description = form.subheadline || form.description ||
    `Preencha o formulário para atendimento imediato e personalizado com ${storeName}.`;
  const path = `/f/${form.slug}`;
  const cover = form.cover_image_url || form.store?.logo_url || null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    publisher: {
      "@type": "LocalBusiness",
      name: storeName,
      logo: form.store?.logo_url || undefined,
    },
  };

  return buildUniversalHead({
    title,
    description,
    path,
    ogImage: cover,
    ogType: "website",
    webmcpType: "lead_landing_page",
    jsonLd,
  });
}

/**
 * Construtor para Biolinks de Criadores e Empresas (/bio/$slug)
 */
export function buildBiolinkSeoHead(bio: any) {
  if (!bio) {
    return buildUniversalHead({
      title: "Biolink Oficial | Waesy",
      description: "Hub de links e canais oficiais no Waesy.",
      path: "/bio",
    });
  }

  const title = `${bio.title} — Links & Contatos Oficiais | Waesy`;
  const description = bio.description ||
    `Acesse todos os links, canais de atendimento, WhatsApp e novidades de ${bio.title}.`;
  const path = `/bio/${bio.slug}`;
  const avatar = bio.avatar_url || bio.cover_image || null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: bio.title,
    description,
    image: avatar || undefined,
    mainEntity: {
      "@type": "Person",
      name: bio.title,
      description,
      image: avatar || undefined,
    },
  };

  return buildUniversalHead({
    title,
    description,
    path,
    ogImage: avatar,
    ogType: "profile",
    webmcpType: "biolink_profile",
    jsonLd,
  });
}

/**
 * Construtor para Comunidades de Bairro e Grupos (/c/$slug)
 */
export function buildCommunitySeoHead(community: any) {
  if (!community) {
    return buildUniversalHead({
      title: "Comunidades e Grupos de Discussão | Waesy",
      description: "Participe de comunidades locais, grupos de moradores e conversas na sua cidade.",
      path: "/comunidades",
    });
  }

  const title = `${community.title} — Comunidade | Waesy`;
  const description = community.description ||
    `Participe da comunidade "${community.title}" no Waesy. Debata assuntos locais, anúncios e novidades.`;
  const path = `/c/${community.slug}`;
  const cover = community.banner_url || community.avatar_url || null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: community.title,
    description,
    image: cover ? [cover] : undefined,
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/FollowAction",
      userInteractionCount: community.members_count || 1,
    },
  };

  return buildUniversalHead({
    title,
    description,
    path,
    ogImage: cover,
    ogType: "website",
    webmcpType: "community_forum",
    jsonLd,
  });
}

/**
 * Construtor para Sorteios e Concursos (/concurso/$id)
 */
export function buildRaffleSeoHead(raffle: any) {
  if (!raffle) {
    return buildUniversalHead({
      title: "Sorteios e Prêmios | Comunidade Waesy",
      description: "Participe de sorteios promovidos pelas melhores empresas da região.",
      path: "/concursos",
    });
  }

  const title = `${raffle.title} — Sorteio ${raffle.storeName ? `da ${raffle.storeName}` : ""} | Waesy`;
  const description = (raffle.description || "").slice(0, 160) ||
    `Concorra a prêmios no sorteio "${raffle.title}". Emissão de cupons e regulamento oficial no Waesy.`;
  const path = `/concurso/${raffle.id}`;
  const cover = raffle.imageUrl || null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: raffle.title,
    description,
    image: cover ? [cover] : undefined,
    startDate: raffle.drawDate || new Date().toISOString(),
    eventStatus: raffle.status === "completed" ? "https://schema.org/EventCompleted" : "https://schema.org/EventScheduled",
    organizer: {
      "@type": "Organization",
      name: raffle.storeName || "Waesy Concursos",
    },
  };

  return buildUniversalHead({
    title,
    description,
    path,
    ogImage: cover,
    ogType: "website",
    webmcpType: "raffle_contest",
    jsonLd,
  });
}
