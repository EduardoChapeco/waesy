import { createClient } from "@supabase/supabase-js";

const url = "https://jfuebqmltksyznovhlwa.supabase.co";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || (() => { throw new Error("SUPABASE_SERVICE_ROLE_KEY is required"); })();
const supabase = createClient(url, key);

async function sync() {
  const CANONICAL_HERO_MODULES = [
    {
      slug: "home-classificados",
      title: "Classificados & Autos",
      cover_image_url: "https://jfuebqmltksyznovhlwa.supabase.co/storage/v1/object/public/cms-media/hotpages/1787956801658_v8vksf1.png",
      target_route: "/classificados",
      template_type: "hero_module",
      module: "home",
      sort_order: 1,
      show_title: false,
      show_badge: false,
      show_overlay: false,
    },
    {
      slug: "home-mercado",
      title: "Supermercado & Feira",
      cover_image_url: "https://jfuebqmltksyznovhlwa.supabase.co/storage/v1/object/public/cms-media/hotpages/1787957172516_oxs3sj2.png",
      target_route: "/mercado",
      template_type: "hero_module",
      module: "home",
      sort_order: 2,
      show_title: false,
      show_badge: false,
      show_overlay: false,
    },
    {
      slug: "home-gastronomia",
      title: "Gastronomia & Delivery",
      cover_image_url: "https://jfuebqmltksyznovhlwa.supabase.co/storage/v1/object/public/cms-media/hotpages/1787957093840_yh0bzc0.png",
      target_route: "/gastronomia",
      template_type: "hero_module",
      module: "home",
      sort_order: 3,
      show_title: false,
      show_badge: false,
      show_overlay: false,
    },
    {
      slug: "home-empregos",
      title: "Vagas & Carreiras",
      cover_image_url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1000&q=80",
      target_route: "/empregos",
      template_type: "hero_module",
      module: "home",
      sort_order: 4,
      show_title: false,
      show_badge: false,
      show_overlay: false,
    },
    {
      slug: "home-agenda",
      title: "Agenda & Eventos Culturais",
      cover_image_url: "https://jfuebqmltksyznovhlwa.supabase.co/storage/v1/object/public/cms-media/hotpages/1787956875311_120j9pf.png",
      target_route: "/agenda",
      template_type: "hero_module",
      module: "home",
      sort_order: 5,
      show_title: false,
      show_badge: false,
      show_overlay: false,
    },
    {
      slug: "home-turismo",
      title: "Turismo & Hospedagem",
      cover_image_url: "https://jfuebqmltksyznovhlwa.supabase.co/storage/v1/object/public/cms-media/hotpages/1787956861307_o0c6jtw.png",
      target_route: "/turismo",
      template_type: "hero_module",
      module: "home",
      sort_order: 6,
      show_title: false,
      show_badge: false,
      show_overlay: false,
    },
    {
      slug: "home-noticias",
      title: "Notícias & Jornalismo",
      cover_image_url: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1000&q=80",
      target_route: "/noticias",
      template_type: "hero_module",
      module: "home",
      sort_order: 7,
      show_title: false,
      show_badge: false,
      show_overlay: false,
    },
    {
      slug: "home-mobilidade",
      title: "Mobilidade & MotoLink",
      cover_image_url: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1000&q=80",
      target_route: "/mobilidade",
      template_type: "hero_module",
      module: "home",
      sort_order: 8,
      show_title: false,
      show_badge: false,
      show_overlay: false,
    }
  ];

  const CANONICAL_SUBCATEGORY_CHIPS = [
    { slug: "chip-farmacia", title: "Farmácia", target_route: "/farmacia", template_type: "category_hub", module: "home", icon_name: "Heartbeat", sort_order: 1, show_title: true },
    { slug: "chip-bebidas", title: "Bebidas & Adega", target_route: "/bebidas", template_type: "category_hub", module: "home", icon_name: "Coffee", sort_order: 2, show_title: true },
    { slug: "chip-acougue", title: "Açougue & Carnes", target_route: "/acougue", template_type: "category_hub", module: "home", icon_name: "Flame", sort_order: 3, show_title: true },
    { slug: "chip-eletronicos", title: "Eletrônicos & Tech", target_route: "/eletronicos", template_type: "category_hub", module: "home", icon_name: "Storefront", sort_order: 4, show_title: true },
    { slug: "chip-moda", title: "Roupas & Moda", target_route: "/moda", template_type: "category_hub", module: "home", icon_name: "TShirt", sort_order: 5, show_title: true },
    { slug: "chip-casa", title: "Casa & Decoração", target_route: "/casa", template_type: "category_hub", module: "home", icon_name: "Storefront", sort_order: 6, show_title: true },
    { slug: "chip-pet", title: "Pet Shop & Veterinária", target_route: "/pet", template_type: "category_hub", module: "home", icon_name: "Heartbeat", sort_order: 7, show_title: true },
    { slug: "chip-beleza", title: "Beleza & Estética", target_route: "/beleza", template_type: "category_hub", module: "home", icon_name: "Scissors", sort_order: 8, show_title: true },
    { slug: "chip-construcao", title: "Construção & Reforma", target_route: "/construcao", template_type: "category_hub", module: "home", icon_name: "Storefront", sort_order: 9, show_title: true },
    { slug: "chip-servicos", title: "Serviços & Profissionais", target_route: "/servicos", template_type: "category_hub", module: "home", icon_name: "Briefcase", sort_order: 10, show_title: true },
    { slug: "chip-imoveis", title: "Imóveis & Locação", target_route: "/imoveis", template_type: "category_hub", module: "home", icon_name: "House", sort_order: 11, show_title: true },
    { slug: "chip-doacoes", title: "Doações & Solidariedade", target_route: "/doacoes", template_type: "category_hub", module: "home", icon_name: "Heartbeat", sort_order: 12, show_title: true },
    { slug: "chip-diretorio", title: "Diretório Comercial", target_route: "/diretorio", template_type: "category_hub", module: "home", icon_name: "Compass", sort_order: 13, show_title: true }
  ];

  const CANONICAL_EDITORIAL_HOTPAGES = [
    {
      slug: "ofertas-relampago",
      title: "Ofertas Relâmpago",
      badge_label: "OFERTAS",
      hero_stat_badge: "ATÉ 60% OFF",
      cover_image_url: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1000&q=80",
      target_route: "/ofertas",
      template_type: "editorial_card",
      module: "home",
      sort_order: 1,
      show_title: true,
      show_badge: true,
      show_overlay: true
    },
    {
      slug: "almoco-executivo",
      title: "Almoço Rápido & Pratos Executivos",
      badge_label: "SABOR",
      hero_stat_badge: "DELIVERY",
      cover_image_url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&q=80",
      target_route: "/gastronomia",
      template_type: "editorial_card",
      module: "home",
      sort_order: 2,
      show_title: true,
      show_badge: true,
      show_overlay: true
    },
    {
      slug: "supermercado-express",
      title: "Supermercado em 15 Minutos",
      badge_label: "ESSENCIAL",
      hero_stat_badge: "EXPRESS",
      cover_image_url: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1000&q=80",
      target_route: "/mercado",
      template_type: "editorial_card",
      module: "home",
      sort_order: 3,
      show_title: true,
      show_badge: true,
      show_overlay: true
    }
  ];

  const ALL = [...CANONICAL_HERO_MODULES, ...CANONICAL_SUBCATEGORY_CHIPS, ...CANONICAL_EDITORIAL_HOTPAGES];
  for (const item of ALL) {
    const { data: existing } = await supabase.from("hotpages").select("id, cover_image_url").eq("slug", item.slug).maybeSingle();
    if (!existing) {
      await supabase.from("hotpages").insert({ ...item, is_active: true });
      console.log("Inserted:", item.slug);
    } else {
      await supabase.from("hotpages").update({
        template_type: item.template_type,
        target_route: item.target_route,
        show_title: item.show_title,
        show_badge: item.show_badge,
        show_overlay: item.show_overlay,
        sort_order: item.sort_order
      }).eq("id", existing.id);
      console.log("Updated:", item.slug);
    }
  }
  console.log("SYNC COMPLETE!");
}
sync();
