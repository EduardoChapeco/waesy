import {
  Tag,
  Home,
  Car as CarIcon,
  Laptop as LaptopIcon,
  Wrench as WrenchIcon,
  Plane,
  Utensils,
  Gift,
  Briefcase,
  FileText,
} from "lucide-react";
import type { FilterChipOption } from "@/components/commerce/discovery-control-bar";

export const CLASSIFIEDS_HOTPAGES = [
  {
    id: "hp-class-1",
    title: "Imóveis",
    slug: "real_estate",
    cover_image_url: "",
    badge_label: "Imóveis",
    show_title: false,
    show_overlay: false,
  },
  {
    id: "hp-class-2",
    title: "Hospedagem",
    slug: "real_estate_temporada",
    cover_image_url: "",
    badge_label: "Diária e Temporada",
    show_title: false,
    show_overlay: false,
  },
  {
    id: "hp-class-3",
    title: "Veículos",
    slug: "vehicle",
    cover_image_url: "",
    badge_label: "Veículos",
    show_title: false,
    show_overlay: false,
  },
  {
    id: "hp-class-4",
    title: "Desapego",
    slug: "sale",
    cover_image_url: "",
    badge_label: "Usados",
    show_title: false,
    show_overlay: false,
  },
];

export const CLASSIFIED_CHIPS: FilterChipOption[] = [
  { id: "todos", label: "Todos", icon: Tag },
  { id: "real_estate", label: "Imóveis", icon: Home },
  { id: "vehicle", label: "Veículos", icon: CarIcon },
  { id: "business", label: "Negócios", icon: Briefcase },
  { id: "travel", label: "Viagens", icon: Plane },
  { id: "food", label: "Gastronomia", icon: Utensils },
  { id: "sale", label: "Desapego", icon: LaptopIcon },
  { id: "digital", label: "Digitais", icon: FileText },
  { id: "service", label: "Serviços", icon: WrenchIcon },
  { id: "donation", label: "Doações", icon: Gift },
];

export const REAL_ESTATE_DEAL_TYPES = [
  { id: "todos", label: "Todos Imóveis" },
  { id: "aluguel", label: "Aluguel Mensal" },
  { id: "venda", label: "Comprar / Venda" },
  { id: "temporada", label: "Hospedagem e Temporada" },
];

export const REAL_ESTATE_FACETS = [
  { id: "furnished", label: "Mobiliado" },
  { id: "garage", label: "Garagem / Vaga" },
  { id: "pool", label: "Piscina" },
  { id: "air_conditioning", label: "Ar Condicionado" },
];

export const VEHICLE_GEARBOX_OPTIONS = [
  { id: "todos", label: "Todos Câmbios" },
  { id: "automatic", label: "Automático" },
  { id: "manual", label: "Manual" },
];

export const VEHICLE_FUEL_OPTIONS = [
  { id: "todos", label: "Todos Combustíveis" },
  { id: "flex", label: "Flex" },
  { id: "gasolina", label: "Gasolina" },
  { id: "eletrico", label: "Elétrico / Híbrido" },
  { id: "diesel", label: "Diesel" },
];

export const DESAPEGO_SUB_OPTIONS = [
  { id: "todos", label: "Todos Desapegos" },
  { id: "smartphones", label: "Smartphones" },
  { id: "computadores", label: "Notebooks e PCs" },
  { id: "moveis", label: "Móveis" },
  { id: "eletrodomesticos", label: "Eletrodomésticos" },
  { id: "games", label: "Games" },
  { id: "moda_brecho", label: "Roupas e Calçados" },
];

export const SERVICE_MODALITY_OPTIONS = [
  { id: "todos", label: "Todas Modalidades" },
  { id: "presencial", label: "Presencial" },
  { id: "domicilio", label: "A Domicílio" },
  { id: "remoto", label: "Online / Remoto" },
];

export const JOB_REGIME_OPTIONS = [
  { id: "todos", label: "Todos Regimes" },
  { id: "CLT", label: "CLT" },
  { id: "PJ", label: "PJ / Freelancer" },
  { id: "Estágio", label: "Estágio" },
  { id: "remoto", label: "Home Office" },
];

export const BUSINESS_REVENUE_OPTIONS = [
  { id: "todos", label: "Qualquer Faturamento" },
  { id: "under_50k", label: "Até R$ 50k/mês" },
  { id: "50k_150k", label: "R$ 50k - R$ 150k" },
  { id: "150k_500k", label: "R$ 150k - R$ 500k" },
  { id: "over_500k", label: "R$ 500k+/mês" },
];

export const BUSINESS_POINT_OPTIONS = [
  { id: "todos", label: "Todos os Pontos" },
  { id: "rua", label: "Loja de Rua" },
  { id: "shopping", label: "Shopping / Galeria" },
  { id: "gastronomico", label: "Ponto Gastronômico" },
  { id: "galpao", label: "Galpão / Indústria" },
  { id: "quiosque", label: "Quiosque" },
  { id: "sala", label: "Sala Comercial" },
];

export const FOOD_SUBNICHE_OPTIONS = [
  { id: "todos", label: "Toda Gastronomia" },
  { id: "pizzaria", label: "Pizzaria" },
  { id: "hamburgueria", label: "Hamburgueria" },
  { id: "confeitaria", label: "Doces e Bolos" },
  { id: "marmitaria", label: "Marmitaria" },
  { id: "cafe", label: "Cafeteria" },
  { id: "padaria", label: "Panificação" },
  { id: "artesanal", label: "Queijos e Vinhos" },
];

export const BUSINESS_GOAL_OPTIONS = [
  { id: "todos", label: "Todos os Negócios" },
  { id: "venda", label: "Empresas à Venda" },
  { id: "ponto", label: "Pontos Comerciais" },
  { id: "investimento", label: "Investimento e Sócios" },
];

export const SERVICE_AUDIENCE_OPTIONS = [
  { id: "todos", label: "Todos os Serviços" },
  { id: "pessoa", label: "Para Você (Pessoas)" },
  { id: "empresa", label: "Para Empresas (CNPJ)" },
];

export const SERVICE_SUBNICHE_OPTIONS = [
  { id: "todos", label: "Todas Áreas" },
  { id: "oab", label: "Jurídico" },
  { id: "crea", label: "Engenharia" },
  { id: "crm", label: "Saúde" },
  { id: "crc", label: "Contabilidade" },
  { id: "tech", label: "Tecnologia" },
];
