import { describe, it, expect } from "vitest";
import {
  normalizeEventDomain,
  resolveEffectiveTicketLotState,
  resolveEffectivePollState,
  buildEventCalendarLinks,
  validateEventDomain,
} from "./event-domain";

describe("Canonical Event Domain Engine — Forensic Propagation, Lot Automation & E2E Golden Cases", () => {
  it("1. E2E Golden Case: IMPULSO 2026 normalizes all 16 domain subsystems without field loss", () => {
    const impulsoRaw = {
      id: "evt-impulso-2026",
      category: "event",
      title: "IMPULSO 2026: Inteligência Comercial, Liderança e Inovação no Extremo Oeste",
      content:
        "O maior encontro empresarial de São Miguel do Oeste reunindo líderes, empreendedores e especialistas em IA aplicada a vendas.",
      images: [
        "https://cdn.waesy.app/events/impulso-hero.jpg",
        "https://cdn.waesy.app/events/impulso-gallery-1.jpg",
        "https://cdn.waesy.app/events/impulso-gallery-2.jpg",
      ],
      location_lat: -26.7245,
      location_lng: -53.5182,
      store: {
        id: "store-acic",
        name: "ACIC São Miguel do Oeste",
        is_verified: true,
      },
      attributes: {
        niche: "evento",
        template_style: "editorial",
        display_mode: "tabs",
        timezone: "America/Sao_Paulo",
        event_date: "2026-11-17",
        end_date: "2026-11-18",
        gates_open_time: "18:30",
        start_time: "19:00",
        end_time: "22:30",
        age_rating: "Livre",
        modality: "in_person",
        venue_name: "Centro de Eventos ACIC",
        venue_address: "Rua Sete de Setembro, 2040, Centro",
        city: "São Miguel do Oeste",
        state: "SC",
        banner_image_url: "https://cdn.waesy.app/events/impulso-banner.jpg",
        story_url: "https://cdn.waesy.app/events/impulso-story.mp4",
        story_auto_open: false,
        video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        host_name: "ACIC São Miguel do Oeste",
        host_role: "Realização Oficial",
        host_entity_type: "ORGANIZATION",
        host_avatar_url: "https://cdn.waesy.app/logos/acic-rect.png",
        host_phone: "49999112233",
        organizers: [
          {
            id: "org-cdl",
            name: "CDL Jovem SMO",
            role: "CO_ORGANIZER",
            entity_type: "ORGANIZATION",
            avatar_url: "https://cdn.waesy.app/logos/cdl-jovem.png",
            is_verified: true,
          },
          {
            id: "org-sebrae",
            name: "Sebrae SC",
            role: "SUPPORTER",
            entity_type: "ORGANIZATION",
            avatar_url: "https://cdn.waesy.app/logos/sebrae.png",
          },
        ],
        ticket_tiers: [
          {
            id: "tier-assoc",
            name: "Ingresso Associado ACIC / CDL",
            category: "associado",
            price: 0,
            price_cents: 0,
            capacity: 150,
            sold_count: 40,
            description: "Exclusivo para associados ACIC e CDL com CNPJ ativo",
            status: "available",
          },
          {
            id: "tier-lot1",
            name: "Público Geral — 1º Lote",
            category: "publico_geral",
            price: 90,
            capacity: 100,
            sold_count: 100, // Exhausted! Should trigger automatic activation of 2º Lote
            status: "available",
          },
          {
            id: "tier-lot2",
            name: "Público Geral — 2º Lote",
            category: "publico_geral",
            price: 130,
            capacity: 120,
            sold_count: 15,
            status: "coming_soon",
            sales_start_at: "2026-11-01T00:00:00",
          },
        ],
        speakers: [
          {
            id: "spk-1",
            name: "Dra. Mariana Costa",
            role: "Diretora de Inteligência Artificial",
            company: "TechSul Labs",
            bio: "Especialista em arquitetura de dados e automação comercial com mais de 15 anos liderando transformações no varejo.",
            avatar_url: "https://cdn.waesy.app/speakers/mariana.jpg",
            social_url: "https://linkedin.com/in/marianacosta",
          },
          {
            id: "spk-2",
            name: "Roberto Almeida",
            role: "VP de Expansão",
            company: "Grupo Impulso",
            bio: "Autor e estrategista de canais B2B no Sul do Brasil.",
            avatar_url: "https://cdn.waesy.app/speakers/roberto.jpg",
            social_url: "https://instagram.com/robertoalmeida",
          },
        ],
        schedule: [
          {
            id: "sch-1",
            day_date: "2026-11-17",
            time: "18:30",
            end_time: "19:15",
            title: "Credenciamento & Welcome Coffee",
            stage: "Foyer Principal",
            type: "check_in",
          },
          {
            id: "sch-2",
            day_date: "2026-11-17",
            time: "19:30",
            end_time: "21:00",
            title: "Keynote: IA Generativa nas Vendas Regionais",
            stage: "Auditório Principal",
            speaker_name: "Dra. Mariana Costa",
            description: "Como estruturar funis comerciais assistidos por IA sem perder o relacionamento humano.",
            type: "talk",
          },
          {
            id: "sch-3",
            day_date: "2026-11-18",
            time: "19:00",
            end_time: "21:00",
            title: "Painel de Liderança & Escala",
            stage: "Auditório Principal",
            speaker_name: "Roberto Almeida",
            description: "Debate aberto com empresários locais.",
            type: "panel",
          },
        ],
        sponsors: [
          {
            id: "spn-1",
            name: "Sicoob São Miguel",
            tier: "master",
            logo_url: "https://cdn.waesy.app/sponsors/sicoob.png",
            website_url: "https://sicoob.com.br",
          },
          {
            id: "spn-2",
            name: "Unoesc",
            tier: "prata",
            logo_url: "https://cdn.waesy.app/sponsors/unoesc.png",
          },
          {
            id: "spn-3",
            name: "Cacispar",
            tier: "apoio",
            logo_url: "https://cdn.waesy.app/sponsors/cacispar.png",
          },
        ],
        surveys: [
          {
            id: "poll-1",
            question: "Qual o principal gargalo comercial da sua empresa para 2027?",
            options: ["Prospecção de novos clientes", "Retenção e Pós-venda", "Automação de Atendimento"],
            active: true,
          },
        ],
        access_points: [
          {
            id: "ap-1",
            label: "Portaria Principal & Credenciamento",
            type: "accreditation",
            address: "Rua Sete de Setembro, 2040",
            instructions: "Apresente o QR Code no totem de entrada.",
          },
          {
            id: "ap-2",
            label: "Estacionamento Conveniado P2",
            type: "parking",
            address: "Rua Duque de Caxias, 110",
            instructions: "Gratuito para inscritos até as 23h.",
          },
        ],
        policies: {
          refund_policy: "Cancelamento integral até 7 dias após a compra ou 48h antes do evento.",
          half_price_policy: "Meia-entrada garantida por lei para estudantes, idosos, PCD e professores.",
          accessibility_info: "Auditório 100% acessível com rampas, assentos reservados e intérprete de Libras.",
          parking_info: "Estacionamento próprio gratuito com 200 vagas.",
        },
      },
    };

    const vm = normalizeEventDomain(impulsoRaw, { nowIso: "2026-10-21T12:00:00-03:00" });

    // Multi-day & Date Tile
    expect(vm.is_multi_day).toBe(true);
    expect(vm.date_tile?.day).toBe("17");
    expect(vm.date_tile?.month_short).toBe("NOV");
    expect(vm.gates_open_time).toBe("18:30");
    expect(vm.start_time).toBe("19:00");
    expect(vm.end_time).toBe("22:30");

    // Media separation: Hero vs Exclusive Gallery
    expect(vm.hero_image_url).toBe("https://cdn.waesy.app/events/impulso-banner.jpg");
    expect(vm.gallery_images).toHaveLength(3);
    expect(vm.story_url).toBe("https://cdn.waesy.app/events/impulso-story.mp4");

    // Multiple Organizers & Honest Verification
    expect(vm.organizers).toHaveLength(3);
    expect(vm.primary_organizer.name).toBe("ACIC São Miguel do Oeste");
    expect(vm.primary_organizer.entity_type).toBe("ORGANIZATION");
    expect(vm.primary_organizer.is_verified).toBe(true);

    // Tickets & Automatic Lot Rollover
    expect(vm.ticket_tiers).toHaveLength(3);
    const assocTier = vm.ticket_tiers[0];
    expect(assocTier.is_free).toBe(true);
    expect(assocTier.price_display).toBe("GRÁTIS");
    expect(assocTier.eligibility_rule).toContain("Exclusivo para associados ACIC");
    expect(assocTier.is_purchasable).toBe(true);

    const lot1 = vm.ticket_tiers[1];
    expect(lot1.price_cents).toBe(9000);
    expect(lot1.lifecycle_state).toBe("SOLD_OUT");
    expect(lot1.is_purchasable).toBe(false);

    // Because Lot 1 sold out, Lot 2 automatically rolled over from coming_soon/scheduled to ACTIVE!
    const lot2 = vm.ticket_tiers[2];
    expect(lot2.price_cents).toBe(13000);
    expect(lot2.lifecycle_state).toBe("ACTIVE");
    expect(lot2.is_purchasable).toBe(true);

    // Multi-day schedule + Speaker Linking
    expect(vm.schedule_days).toHaveLength(2);
    const keynote = vm.schedule[1];
    expect(keynote.stage_or_room).toBe("Auditório Principal");
    expect(keynote.description).toContain("Como estruturar funis comerciais");
    expect(keynote.linked_speaker?.name).toBe("Dra. Mariana Costa");
    expect(keynote.linked_speaker?.photo_url).toBe("https://cdn.waesy.app/speakers/mariana.jpg");

    // Speakers full bio & bridged photo/social fields
    expect(vm.speakers[0].photo_url).toBe("https://cdn.waesy.app/speakers/mariana.jpg");
    expect(vm.speakers[0].social_link).toBe("https://linkedin.com/in/marianacosta");
    expect(vm.speakers[0].bio).toContain("mais de 15 anos");

    // Sponsors mapped tiers (master -> ouro)
    expect(vm.sponsors[0].tier).toBe("ouro");
    expect(vm.sponsors[0].logo_url).toBe("https://cdn.waesy.app/sponsors/sicoob.png");

    // Surveys with string[] options normalized to objects
    expect(vm.surveys).toHaveLength(1);
    expect(vm.surveys[0].options).toHaveLength(3);
    expect(vm.surveys[0].options[0].text).toBe("Prospecção de novos clientes");
    expect(vm.surveys[0].lifecycle_state).toBe("OPEN");

    // Location & Access Points
    expect(vm.primary_map_url).toContain("-26.7245,-53.5182");
    expect(vm.access_points).toHaveLength(2);

    // Dynamic Sections (All 9 sections active for IMPULSO 2026)
    expect(vm.available_sections.map((s) => s.id)).toEqual([
      "sobre",
      "ingressos",
      "programacao",
      "palestrantes",
      "midia",
      "enquetes",
      "local",
      "parceiros",
      "politicas",
    ]);

    const validation = validateEventDomain(vm);
    expect(validation.isValid).toBe(true);
    expect(validation.issues).toHaveLength(0);
  });

  it("2. Bridges legacy editor field mismatches (price vs price_cents, purchase_url vs external_url, stage vs stage_or_room, identical speaker_name/description)", () => {
    const legacyEditorPayload = {
      id: "legacy-evt-1",
      title: "Workshop de Gestão",
      content: "Conteúdo prático de gestão financeira.",
      attributes: {
        niche: "evento",
        event_date: "2026-12-05",
        ticket_tiers: [
          {
            id: "t1",
            name: "Ingresso Individual",
            price: 75.5,
            price_cents: 0, // Legacy bug where price_cents remained 0 while price was updated
            purchase_url: "https://sympla.com.br/workshop-123",
            status: "available",
          },
        ],
        schedule: [
          {
            id: "s1",
            time: "14:00",
            title: "Abertura",
            stage: "Sala 2",
            speaker_name: "Prof. Carlos Mendes",
            description: "Prof. Carlos Mendes", // Legacy bug where input overwrote both fields with same string
          },
        ],
      },
    };

    const vm = normalizeEventDomain(legacyEditorPayload);
    expect(vm.ticket_tiers[0].price_cents).toBe(7550);
    expect(vm.ticket_tiers[0].price_display).toContain("75,50");
    expect(vm.ticket_tiers[0].external_url).toBe("https://sympla.com.br/workshop-123");
    expect(vm.schedule[0].stage_or_room).toBe("Sala 2");
    expect(vm.schedule[0].speaker_name).toBe("Prof. Carlos Mendes");
    expect(vm.schedule[0].description).toBeUndefined();

    // Empty optional sections are omitted from available_sections (Rule B.33)
    const sectionIds = vm.available_sections.map((s) => s.id);
    expect(sectionIds).toContain("sobre");
    expect(sectionIds).toContain("ingressos");
    expect(sectionIds).toContain("programacao");
    expect(sectionIds).toContain("local");
    expect(sectionIds).not.toContain("palestrantes");
    expect(sectionIds).not.toContain("parceiros");
    expect(sectionIds).not.toContain("enquetes");
    expect(sectionIds).not.toContain("politicas");
  });

  it("3. Enforces Honest Verification (is_verified = false by default) and Calendar Export (.ics / Google / Outlook)", () => {
    const unverifiedRaw = {
      id: "evt-unverified",
      title: "Encontro de Colecionadores",
      content: "Exposição aberta ao público.",
      attributes: {
        niche: "evento",
        event_date: "2026-11-20",
        start_time: "10:00",
        end_time: "17:00",
        venue_name: "Praça Central",
        city: "Chapecó",
        state: "SC",
      },
    };

    const vm = normalizeEventDomain(unverifiedRaw);
    expect(vm.primary_organizer.is_verified).toBe(false);

    const cal = buildEventCalendarLinks(vm, "https://waesy.app/evento/evt-unverified");
    expect(cal.googleCalendarUrl).toContain("calendar.google.com/calendar/render");
    expect(cal.googleCalendarUrl).toContain("Encontro+de+Colecionadores");
    expect(cal.outlookCalendarUrl).toContain("outlook.live.com");
    expect(cal.icsContent).toContain("BEGIN:VCALENDAR");
    expect(cal.icsContent).toContain("DTSTART;TZID=America/Sao_Paulo:20261120T100000");
    expect(cal.icsContent).toContain("DTEND;TZID=America/Sao_Paulo:20261120T170000");
    expect(cal.icsContent).toContain("SUMMARY:Encontro de Colecionadores");
    expect(cal.icsFilename).toBe("encontro-de-colecionadores.ics");
  });

  it("4. Evaluates Lot and Poll Lifecycle State Machines deterministically across time windows", () => {
    // Future lot without previous exhaustion -> SCHEDULED
    const scheduled = resolveEffectiveTicketLotState(
      {
        status: "available",
        capacity: 100,
        sold_count: 0,
        sales_start_at: "2026-12-01T00:00:00",
        sales_end_at: "2026-12-15T23:59:59",
      },
      { nowIso: "2026-11-10T12:00:00", previousLotExhaustedOrEnded: false }
    );
    expect(scheduled.state).toBe("SCHEDULED");
    expect(scheduled.isPurchasable).toBe(false);

    // Expired lot -> ENDED
    const ended = resolveEffectiveTicketLotState(
      {
        status: "available",
        capacity: 100,
        sold_count: 20,
        sales_start_at: "2026-10-01T00:00:00",
        sales_end_at: "2026-10-15T23:59:59",
      },
      { nowIso: "2026-11-10T12:00:00" }
    );
    expect(ended.state).toBe("ENDED");
    expect(ended.isPurchasable).toBe(false);

    // Poll scheduled in future -> SCHEDULED
    const futurePoll = resolveEffectivePollState(
      { is_active: true, opens_at: "2026-12-01T00:00:00" },
      "2026-11-10T12:00:00"
    );
    expect(futurePoll.state).toBe("SCHEDULED");

    // Poll past closes_at -> CLOSED
    const closedPoll = resolveEffectivePollState(
      { is_active: true, closes_at: "2026-10-01T00:00:00" },
      "2026-11-10T12:00:00"
    );
    expect(closedPoll.state).toBe("CLOSED");
  });

  it("5. Long Content Stress Case: 10 speakers, 12 sponsors, 8 ticket types, 3 access points", () => {
    const stressRaw = {
      id: "evt-stress",
      title: "Congresso Sul-Brasileiro de Tecnologia, Agronegócio, Varejo e Inteligência Artificial 2026",
      content: "Descrição longa ".repeat(40),
      attributes: {
        niche: "evento",
        event_date: "2026-11-25",
        end_date: "2026-11-27",
        speakers: Array.from({ length: 10 }, (_, i) => ({
          id: `spk-${i}`,
          name: `Palestrante Especialista ${i + 1}`,
          role: `Diretor Executivo de Inovação ${i + 1}`,
          company: `Corporação Global ${i + 1}`,
          bio: `Biografia completa sem truncamento para o palestrante ${i + 1}. `.repeat(5),
          avatar_url: `https://cdn.waesy.app/spk-${i}.jpg`,
        })),
        sponsors: Array.from({ length: 12 }, (_, i) => ({
          id: `spn-${i}`,
          name: `Parceiro Institucional ${i + 1}`,
          tier: i < 3 ? "master" : i < 7 ? "ouro" : "apoio",
          logo_url: `https://cdn.waesy.app/logo-${i}.png`,
        })),
        ticket_tiers: Array.from({ length: 8 }, (_, i) => ({
          id: `tier-${i}`,
          name: `Lote ${i + 1} - Categoria ${i + 1}`,
          price: i === 0 ? 0 : i * 50,
          capacity: 100,
          sold_count: i === 1 ? 100 : 10,
        })),
        access_points: Array.from({ length: 3 }, (_, i) => ({
          id: `ap-${i}`,
          label: `Portão de Acesso ${i + 1}`,
          type: i === 0 ? "main_venue" : i === 1 ? "parking" : "vip_entrance",
          address: `Avenida Central, Portão ${i + 1}`,
        })),
      },
    };

    const vm = normalizeEventDomain(stressRaw);
    expect(vm.speakers).toHaveLength(10);
    expect(vm.sponsors).toHaveLength(12);
    expect(vm.ticket_tiers).toHaveLength(8);
    expect(vm.access_points).toHaveLength(3);
    expect(validateEventDomain(vm).isValid).toBe(true);
  });
});
