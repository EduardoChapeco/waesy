import {
  Tag,
  Car,
  Home as HomeIcon,
  Tractor,
  Briefcase,
  Wrench,
  Building2,
  Key,
  RefreshCw,
  FileArchive,
  Utensils,
  Store as StoreIcon,
  Ticket,
} from "lucide-react";

export interface TravelLodging {
  id: string;
  name: string;
  type?: "hotel" | "pousada" | "resort" | "flat" | "hostel" | "outro";
  stars?: number;
  city?: string;
  state?: string;
  address?: string;
  description?: string;
  regime?: string;
  checkin_time?: string;
  checkout_time?: string;
  room_category?: string;
  amenities?: string[];
  photos?: string[];
  cover_photo_url?: string;
  booking_code?: string;
  website?: string;
  phone?: string;
}

import type { ClassifiedNicheType, NicheDefinition } from "@/types/classified-editor";
export type { ClassifiedNicheType, NicheDefinition };

export const NICHE_CARDS: NicheDefinition[] = [
  {
    id: "evento",
    canonicalCategory: "event",
    title: "Eventos & Shows",
    subtitle: "Festas, palestras, congressos e feiras",
    description:
      "Crie a página completa do seu evento com programação visual, palestrantes, lotes de ingressos, patrocinadores e enquetes.",
    icon: Ticket,
    badge: "Eventos & Ingressos",
    gradient: "from-purple-500/15 via-indigo-500/10 to-transparent",
  },
  {
    id: "negocio",
    canonicalCategory: "business",
    title: "Negócios",
    subtitle: "Empresas, pontos comerciais e investimentos",
    description:
      "Venda integral ou parcial de empresas ativas, repasse de ponto comercial, franquias e captação de sócios ou investimento.",
    icon: Briefcase,
    badge: "Negócios",
    gradient: "from-warning/15 via-warning/10 to-transparent",
  },
  {
    id: "desapego",
    canonicalCategory: "sale",
    title: "Desapego",
    subtitle: "Usados, eletrônicos e móveis",
    description:
      "Eletrônicos, celulares, computadores, instrumentos musicais, moda, móveis e itens com envio.",
    icon: Tag,
    badge: "Envio & Retirada",
    gradient: "from-emerald-500/10 via-teal-500/5 to-transparent",
  },
  {
    id: "veiculo",
    canonicalCategory: "vehicle",
    title: "Veículos",
    subtitle: "Carros, motos e utilitários",
    description: "Carros de passeio, motocicletas, caminhões, utilitários e veículos comerciais.",
    icon: Car,
    badge: "Veículos",
    gradient: "from-warning/10 via-orange-500/5 to-transparent",
  },
  {
    id: "imovel",
    canonicalCategory: "real_estate",
    title: "Imóveis",
    subtitle: "Casas, apartamentos e terrenos",
    description:
      "Casas, apartamentos, salas comerciais, galpões, terrenos e locação residencial ou comercial.",
    icon: HomeIcon,
    badge: "Imóveis",
    gradient: "from-blue-500/10 via-indigo-500/5 to-transparent",
  },
  {
    id: "servico",
    canonicalCategory: "service",
    title: "Serviços",
    subtitle: "Profissionais para pessoas e empresas (CNPJ)",
    description: "Trabalhos técnicos, consultorias, serviços domésticos, manutenção e freelancers.",
    icon: Wrench,
    badge: "Serviços",
    gradient: "from-purple-500/10 via-pink-500/5 to-transparent",
  },
  {
    id: "vaga",
    canonicalCategory: "job",
    title: "Vagas de Emprego",
    subtitle: "Oportunidades de trabalho e contratação",
    description:
      "Vagas de emprego, parcerias, estágios e oportunidades profissionais para a comunidade.",
    icon: Briefcase,
    badge: "Vagas",
    gradient: "from-rose-500/10 via-red-500/5 to-transparent",
  },
  {
    id: "digital",
    canonicalCategory: "sale",
    title: "Produtos Digitais",
    subtitle: "Downloads imediatos e infoprodutos",
    description:
      "Infoprodutos, arquivos para download imediato, templates, artes digitais e materiais educativos.",
    icon: FileArchive,
    badge: "Download Imediato",
    gradient: "from-indigo-500/10 via-purple-500/5 to-transparent",
  },
  {
    id: "hospedagem",
    canonicalCategory: "real_estate",
    title: "Hospedagem",
    subtitle: "Diárias em chalés, pousadas e sítios",
    description:
      "Aluguel por diária, chalés com hidro, cabanas na serra, casas de campo, pousadas e suítes com check-in.",
    icon: Key,
    badge: "Temporada",
    gradient: "from-warning/10 via-rose-500/5 to-transparent",
  },
  {
    id: "equipamento",
    canonicalCategory: "equipment",
    title: "Equipamentos",
    subtitle: "Locação de ferramentas e máquinas",
    description:
      "Locação de caixas de som, iluminação, tendas, mesas, ferramentas e equipamentos para festas e obras.",
    icon: Wrench,
    badge: "Locação",
    gradient: "from-blue-500/10 via-cyan-500/5 to-transparent",
  },
  {
    id: "assinatura",
    canonicalCategory: "service",
    title: "Assinaturas",
    subtitle: "Serviços e pagamentos recorrentes",
    description:
      "Serviços recorrentes, mensalidades, planos de assinatura e clubes com renovação periódica.",
    icon: RefreshCw,
    badge: "Recorrente",
    gradient: "from-cyan-500/15 via-blue-500/10 to-transparent",
  },
  {
    id: "doacao",
    canonicalCategory: "donation",
    title: "Doações",
    subtitle: "Itens gratuitos para a comunidade",
    description:
      "Doe móveis, roupas, livros, eletrônicos ou alimentos gratuitamente para a comunidade local.",
    icon: Tag,
    badge: "Gratuito R$ 0",
    gradient: "from-emerald-500/10 via-teal-500/5 to-transparent",
  },
  {
    id: "viagem",
    canonicalCategory: "travel",
    title: "Viagens",
    subtitle: "Pacotes e passeios turísticos",
    description:
      "Pacotes turísticos, resorts, passeios guiados e roteiros com fotos e programação completa.",
    icon: Key,
    badge: "Turismo",
    gradient: "from-warning/15 via-rose-500/10 to-purple-600/10",
  },
  {
    id: "gastronomia",
    canonicalCategory: "food",
    title: "Gastronomia",
    subtitle: "Pratos artesanais e delivery",
    description:
      "Lanches, pratos prontos, bebidas, sobremesas e serviços de alimentação em geral.",
    icon: Utensils,
    badge: "Cardápio",
    gradient: "from-red-500/15 via-orange-500/10 to-transparent",
  },
  {
    id: "farmacia",
    canonicalCategory: "sale",
    title: "Farmácia",
    subtitle: "Medicamentos e saúde",
    description: "Produtos de saúde, beleza, higiene pessoal e itens de farmácia.",
    icon: StoreIcon,
    badge: "Saúde",
    gradient: "from-teal-500/15 via-emerald-500/10 to-transparent",
  },
  {
    id: "agro",
    canonicalCategory: "sale",
    title: "Agronegócio",
    subtitle: "Tratores, implementos e maquinário",
    description:
      "Tratores agrícolas, colheitadeiras, implementos, maquinário pesado, insumos e produção rural.",
    icon: Tractor,
    badge: "Agro & Máquinas",
    gradient: "from-emerald-600/15 via-green-600/10 to-transparent",
  },
  {
    id: "mercado",
    canonicalCategory: "sale",
    title: "Mercado",
    subtitle: "Alimentos e conveniência",
    description: "Itens de mercado, mantimentos, carnes, pães, frutas e conveniência diária.",
    icon: Building2,
    badge: "Mercado",
    gradient: "from-warning/15 via-green-500/10 to-transparent",
  },
];

export const DESAPEGO_TAXONOMY = [
  { id: "smartphones", label: "Smartphones e Celulares", desc: "iPhones, Samsung Galaxy, Xiaomi e marcas" },
  { id: "computadores", label: "Notebooks e Computadores", desc: "Notebooks Dell, Apple Mac, PCs gamer e tablets" },
  { id: "moveis", label: "Móveis e Decoração", desc: "Sofás, mesas, armários, camas e decoração" },
  { id: "eletrodomesticos", label: "Eletrodomésticos e Cozinha", desc: "Geladeiras, fogões, micro-ondas e lavadoras" },
  { id: "moda_brecho", label: "Roupas e Moda", desc: "Jaquetas, vestidos, camisas e calças" },
  { id: "tenis_calcados", label: "Tênis e Calçados", desc: "Sneakers, tênis esportivos e calçados sociais" },
  { id: "joias_relogios", label: "Joias e Relógios", desc: "Relógios automáticos, anéis e correntes" },
  { id: "eletronicos", label: "Eletrônicos e Som", desc: "TVs, caixas JBL, fones e áudio" },
  { id: "games_consoles", label: "Games e Consoles", desc: "PS5, Xbox, Nintendo Switch e jogos" },
  { id: "instrumentos", label: "Instrumentos Musicais", desc: "Guitarras, violões, teclados e pedais" },
  { id: "esportes_fitness", label: "Esportes e Ciclismo", desc: "Bicicletas, esteiras e artigos esportivos" },
  { id: "bebes_criancas", label: "Bebês e Crianças", desc: "Carrinhos, berços, roupas e brinquedos" },
  { id: "ferramentas", label: "Ferramentas e Garagem", desc: "Furadeiras, serras e oficina" },
  { id: "outros", label: "Outros Desapegos", desc: "Livros, colecionáveis e itens variados" },
];

export const CANONICAL_LODGING_AMENITIES = [
  "Piscina",
  "Wi-Fi Grátis",
  "Café da Manhã Incluso",
  "Estacionamento",
  "Restaurante",
  "Frente Mar / Praia",
  "Academia",
  "Ar-Condicionado",
  "Spa / Sauna",
  "Pet Friendly",
] as const;
