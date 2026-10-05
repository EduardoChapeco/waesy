import { createClient } from "@supabase/supabase-js";

const url = "https://jfuebqmltksyznovhlwa.supabase.co";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || (() => { throw new Error("SUPABASE_SERVICE_ROLE_KEY is required"); })();
const supabase = createClient(url, key);

const CANONICAL_MODULES = [
  {
    slug: "home-places",
    title: "Places (Lista Telefônica)",
    target_route: "/diretorio",
    template_type: "hero_module",
    module: "home",
    sort_order: 1,
  },
  {
    slug: "home-classificados",
    title: "Classificados",
    target_route: "/classificados",
    template_type: "hero_module",
    module: "home",
    sort_order: 2,
  },
  {
    slug: "home-feed",
    title: "Feed",
    target_route: "/feed",
    template_type: "hero_module",
    module: "home",
    sort_order: 3,
  },
  {
    slug: "home-noticias",
    title: "Notícias",
    target_route: "/noticias",
    template_type: "hero_module",
    module: "home",
    sort_order: 4,
  },
  {
    slug: "home-empregos",
    title: "Empregos",
    target_route: "/empregos",
    template_type: "hero_module",
    module: "home",
    sort_order: 5,
  },
  {
    slug: "home-eventos",
    title: "Eventos",
    target_route: "/eventos",
    template_type: "hero_module",
    module: "home",
    sort_order: 6,
  },
  {
    slug: "home-agenda",
    title: "Agenda",
    target_route: "/agenda",
    template_type: "hero_module",
    module: "home",
    sort_order: 7,
  },
  {
    slug: "home-afiliados",
    title: "Afiliados",
    target_route: "/afiliados",
    template_type: "hero_module",
    module: "home",
    sort_order: 8,
  },
];

async function run() {
  console.log("=== SINCRONIZANDO 8 MÓDULOS CANÔNICOS NO SUPABASE ===");

  for (const mod of CANONICAL_MODULES) {
    const { data: existing } = await supabase
      .from("hotpages")
      .select("id, slug, title, cover_image_url")
      .eq("slug", mod.slug)
      .maybeSingle();

    if (existing) {
      console.log(`Updating ${mod.slug} -> title: "${mod.title}"`);
      const updates = {
        title: mod.title,
        target_route: mod.target_route,
        template_type: mod.template_type,
        module: mod.module,
        sort_order: mod.sort_order,
        is_active: true,
      };
      // Se tiver imagem do Unsplash, limpa para null (regra de zero fallback)
      if (existing.cover_image_url && existing.cover_image_url.includes("unsplash.com")) {
        updates.cover_image_url = null;
      }
      await supabase.from("hotpages").update(updates).eq("id", existing.id);
    } else {
      console.log(`Inserting new canonical module: ${mod.slug} ("${mod.title}")`);
      await supabase.from("hotpages").insert({
        ...mod,
        cover_image_url: null,
        is_active: true,
        show_title: true,
        show_badge: false,
        show_overlay: true,
      });
    }
  }

  // Limpa qualquer Unsplash remanescente em todas as hotpages
  const { data: allHotpages } = await supabase.from("hotpages").select("id, cover_image_url");
  if (allHotpages) {
    for (const h of allHotpages) {
      if (h.cover_image_url && h.cover_image_url.includes("unsplash.com")) {
        console.log(`Limpando Unsplash fallback da hotpage ID ${h.id}`);
        await supabase.from("hotpages").update({ cover_image_url: null }).eq("id", h.id);
      }
    }
  }

  console.log("=== SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO ===");
}

run();
