import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Flame,
  Heart,
  Image as ImageIcon,
  Layers,
  MapPin,
  MessageCircle,
  Newspaper,
  Plus,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import { PrometheeWireframeDomeLogo } from "@/components/builder/blocks/PrometheeNewsPortalBlock";

export interface ValeNewsArticle {
  id: string;
  title: string;
  lead: string;
  body: string[];
  bulletSummary: string[];
  quote: string;
  category: string;
  city: string;
  publishedAgo: string;
  readingTime: string;
  author: string;
  role: string;
  isBreaking: boolean;
  isMinedApproved: boolean;
  sourceOrigin: string;
  likesCount: number;
  commentsCount: number;
  coverTone: "slate" | "emerald" | "amber" | "indigo" | "rose" | "cyan";
  coverImageUrl?: string;
}

export interface CarouselThemeConfig {
  id: "promethee_light" | "editorial_dark" | "breaking_crimson" | "vale_navy";
  name: string;
  bgHex: string;
  cardHex: string;
  textHex: string;
  mutedHex: string;
  accentHex: string;
  accentTextHex: string;
  previewBgClass: string;
  previewCardClass: string;
  previewTextClass: string;
  previewMutedClass: string;
  previewBadgeClass: string;
}

const CAROUSEL_THEMES: CarouselThemeConfig[] = [
  {
    id: "promethee_light",
    name: "Prométhée Light (Minimal)",
    bgHex: String.fromCharCode(35) + "F8FAFC",
    cardHex: String.fromCharCode(35) + "FFFFFF",
    textHex: String.fromCharCode(35) + "0F172A",
    mutedHex: String.fromCharCode(35) + "475569",
    accentHex: String.fromCharCode(35) + "0F172A",
    accentTextHex: String.fromCharCode(35) + "FFFFFF",
    previewBgClass: "bg-slate-50 text-slate-900 border-slate-200",
    previewCardClass: "bg-white border-slate-200",
    previewTextClass: "text-slate-900",
    previewMutedClass: "text-slate-600",
    previewBadgeClass: "bg-slate-900 text-white",
  },
  {
    id: "editorial_dark",
    name: "Noir Editorial (Alto Contraste)",
    bgHex: String.fromCharCode(35) + "09090B",
    cardHex: String.fromCharCode(35) + "18181B",
    textHex: String.fromCharCode(35) + "FAFAFA",
    mutedHex: String.fromCharCode(35) + "A1A1AA",
    accentHex: String.fromCharCode(35) + "FAFAFA",
    accentTextHex: String.fromCharCode(35) + "09090B",
    previewBgClass: "bg-zinc-950 text-zinc-50 border-zinc-800",
    previewCardClass: "bg-zinc-900 border-zinc-800",
    previewTextClass: "text-zinc-50",
    previewMutedClass: "text-zinc-400",
    previewBadgeClass: "bg-zinc-100 text-zinc-950",
  },
  {
    id: "breaking_crimson",
    name: "Plantão Urgente (Breaking)",
    bgHex: String.fromCharCode(35) + "450A0A",
    cardHex: String.fromCharCode(35) + "7F1D1D",
    textHex: String.fromCharCode(35) + "FEF2F2",
    mutedHex: String.fromCharCode(35) + "FECACA",
    accentHex: String.fromCharCode(35) + "EF4444",
    accentTextHex: String.fromCharCode(35) + "FFFFFF",
    previewBgClass: "bg-red-950 text-red-50 border-red-900",
    previewCardClass: "bg-red-900/80 border-red-800",
    previewTextClass: "text-white",
    previewMutedClass: "text-red-200",
    previewBadgeClass: "bg-red-500 text-white",
  },
  {
    id: "vale_navy",
    name: "Institucional Vale (Azul)",
    bgHex: String.fromCharCode(35) + "0C192C",
    cardHex: String.fromCharCode(35) + "172A46",
    textHex: String.fromCharCode(35) + "F1F5F9",
    mutedHex: String.fromCharCode(35) + "94A3B8",
    accentHex: String.fromCharCode(35) + "38BDF8",
    accentTextHex: String.fromCharCode(35) + "0C192C",
    previewBgClass: "bg-slate-900 text-slate-50 border-slate-800",
    previewCardClass: "bg-slate-800 border-slate-700",
    previewTextClass: "text-slate-50",
    previewMutedClass: "text-slate-300",
    previewBadgeClass: "bg-sky-400 text-slate-950",
  },
];

const VALE_CITIES = [
  "Notícias do Vale",
  "São José dos Campos",
  "Taubaté",
  "Jacareí",
  "Pindamonhangaba",
  "Guaratinguetá",
  "Caçapava",
  "Lorena",
  "Caraguatatuba",
  "Ubatuba",
  "São Sebastião",
  "Campos do Jordão",
];

const PROMETHEE_TABS = [
  "Para você",
  "Urgente",
  "Polícia & Segurança",
  "Economia & Indústria",
  "Tecnologia & Aviação",
  "Esportes",
  "Cultura & Serra",
  "Salvos",
];

const INITIAL_ARTICLES: ValeNewsArticle[] = [
  {
    id: "vale-1",
    title: "Polo Aeroespacial de São José dos Campos confirma novo complexo de engenharia e 650 vagas técnicas",
    lead: "Expansão no Parque Tecnológico integra fornecedores de aviação elétrica e sistemas autônomos, impulsionando contratações em todo o eixo da Via Dutra.",
    body: [
      "O Parque Tecnológico de São José dos Campos oficializou nesta manhã a abertura do novo núcleo produtivo voltado à aviação de zero emissão e sistemas embarcados de missão crítica. O investimento privado soma R$ 240 milhões na primeira fase de implantação.",
      "De acordo com a coordenação industrial do complexo, 38 empresas fornecedoras instaladas entre São José dos Campos, Jacareí e Caçapava já assinaram protocolos de fornecimento direto de componentes compostos e softwares de navegação.",
      "As inscrições para engenheiros de sistemas, técnicos em mecatrônica e especialistas em estruturas aeronáuticas serão abertas em parceria com instituições de ensino técnico e superior do Vale do Paraíba.",
    ],
    bulletSummary: [
      "Investimento privado confirmado de R$ 240 milhões no Parque Tecnológico.",
      "650 novas vagas diretas para engenheiros, técnicos e operadores especializados.",
      "Integração produtiva com 38 fornecedores de São José, Jacareí e Caçapava.",
    ],
    quote: "O Vale do Paraíba consolida sua posição como a capital nacional de engenharia avançada e mobilidade aérea sustentável.",
    category: "Tecnologia & Aviação",
    city: "São José dos Campos",
    publishedAgo: "15min",
    readingTime: "4 min",
    author: "Redação Vale Agora",
    role: "Squad IA + Curadoria Econômica",
    isBreaking: true,
    isMinedApproved: true,
    sourceOrigin: "Catálogo Aprovado · Minerador Industrial SJC",
    likesCount: 84,
    commentsCount: 23,
    coverTone: "indigo",
  },
  {
    id: "vale-2",
    title: "Operação integrada na Via Dutra e Tamoios reduz em 34% ocorrências graves no trecho regional",
    lead: "Monitoramento por leitura óptica de placas e resposta conjunta entre COI municipal e concessionárias aceleram liberação de pistas entre Jacareí e Taubaté.",
    body: [
      "O balanço trimestral divulgado pelas forças de segurança viária aponta queda de 34% nos acidentes com interdição prolongada no trecho do Vale do Paraíba da Rodovia Presidente Dutra e nos acessos à Rodovia dos Tamoios.",
      "A conexão em tempo real entre os Centros de Operações Integradas (COI) das prefeituras e as centrais das concessionárias permitiu o acionamento preventivo de viaturas e painéis de mensagem variável antes da formação de retenções críticas.",
      "Novos radares meteorológicos instalados na Serra do Mar também passaram a emitir alertas antecipados para motoristas que descem em direção a Caraguatatuba e São Sebastião.",
    ],
    bulletSummary: [
      "Queda de 34% em interdições críticas no eixo Jacareí–Taubaté.",
      "Integração óptica em tempo real entre COI municipal e rodovias.",
      "Alertas meteorológicos preventivos na descida da Serra da Tamoios.",
    ],
    quote: "A inteligência de dados aplicada ao tráfego regional devolveu previsibilidade ao transporte de cargas e passageiros no Vale.",
    category: "Polícia & Segurança",
    city: "Taubaté",
    publishedAgo: "32min",
    readingTime: "3 min",
    author: "Plantão Viário",
    role: "Curadoria Segurança & Mobilidade",
    isBreaking: true,
    isMinedApproved: true,
    sourceOrigin: "Catálogo Aprovado · Minerador Defesa Civil & Rodovias",
    likesCount: 52,
    commentsCount: 16,
    coverTone: "rose",
  },
  {
    id: "vale-3",
    title: "Pindamonhangaba e Guaratinguetá ampliam corredor logístico com novo terminal intermodal",
    lead: "Estrutura conectada à malha ferroviária reduz custo de frete para indústrias metalúrgicas e agroindustriais do Médio Vale.",
    body: [
      "Empresas exportadoras instaladas em Pindamonhangaba, Moreira César e Guaratinguetá passarão a contar com um pátio intermodal alfandegado para consolidação de cargas com destino aos portos de São Sebastião e Santos.",
      "Estudos econômicos da federação industrial indicam redução média de 18% no custo logístico por tonelada movimentada, além de diminuir o fluxo de caminhões pesados dentro dos perímetros urbanos.",
      "O terminal iniciará operação assistida no próximo trimestre, gerando oportunidades para operadores logísticos e transportadoras locais.",
    ],
    bulletSummary: [
      "Redução estimada de 18% no custo logístico para indústrias do Médio Vale.",
      "Conexão direta com a malha ferroviária e Porto de São Sebastião.",
      "Desafogamento do tráfego pesado nas avenidas marginais urbanas.",
    ],
    quote: "Competitividade logística é o fator decisivo para atrair novas plantas industriais para Pindamonhangaba e Guaratinguetá.",
    category: "Economia & Indústria",
    city: "Pindamonhangaba",
    publishedAgo: "1h",
    readingTime: "5 min",
    author: "Caderno de Negócios",
    role: "Squad IA + Editoria Regional",
    isBreaking: false,
    isMinedApproved: true,
    sourceOrigin: "Catálogo Aprovado · Minerador Econômico do Vale",
    likesCount: 41,
    commentsCount: 9,
    coverTone: "emerald",
  },
  {
    id: "vale-4",
    title: "Circuito da Mantiqueira e Litoral Norte projeta ocupação histórica em Campos do Jordão e Caraguatatuba",
    lead: "Programação cultural integrada, gastronomia regional e eventos esportivos atraem visitantes da capital e movimentam comércio local.",
    body: [
      "A rede hoteleira e gastronômica de Campos do Jordão, Santo Antônio do Pinhal, Caraguatatuba e Ubatuba registrou aumento expressivo nas reservas antecipadas para os festivais de meia estação.",
      "O diferencial deste ano é a curadoria de roteiros que conectam produtores de azeite, queijos artesanais e cafés especiais da Serra da Mantiqueira com festivais náuticos e gastronômicos do Litoral Norte.",
      "Associações comerciais estimam injeção direta superior a R$ 110 milhões no comércio e setor de serviços das cidades participantes.",
    ],
    bulletSummary: [
      "Roteiro integrado une Serra da Mantiqueira e Litoral Norte.",
      "Impacto econômico estimado em R$ 110 milhões no comércio e turismo.",
      "Valorização de produtores locais, gastronomia e hotelaria regional.",
    ],
    quote: "O turismo integrado entre serra e mar transforma o Vale em um destino completo durante as quatro estações do ano.",
    category: "Cultura & Serra",
    city: "Campos do Jordão",
    publishedAgo: "2h",
    readingTime: "4 min",
    author: "Editoria Cultura & Turismo",
    role: "Curadoria Regional Vale",
    isBreaking: false,
    isMinedApproved: true,
    sourceOrigin: "Catálogo Aprovado · Minerador Turismo & Eventos",
    likesCount: 96,
    commentsCount: 28,
    coverTone: "amber",
  },
  {
    id: "vale-5",
    title: "São José Basketball e equipes de base do Vale avançam em torneio estadual com ginásios lotados",
    lead: "Projetos esportivos em São José dos Campos, Jacareí (Rugby) e Taubaté reforçam formação de atletas e engajamento comunitário.",
    body: [
      "O final de semana esportivo no Vale do Paraíba foi marcado por vitórias decisivas no basquete, no rugby de Jacareí e no vôlei e handebol em Taubaté, levando milhares de torcedores aos ginásios municipais.",
      "Além do alto rendimento profissional, as secretarias de esportes destacaram a ampliação das escolinhas gratuitas no contraturno escolar, atendendo mais de 14 mil jovens na região.",
    ],
    bulletSummary: [
      "Vitórias em sequência das equipes de São José, Jacareí e Taubaté.",
      "Média de público recorde nos ginásios e arenas da região.",
      "Mais de 14 mil jovens atendidos nas categorias de base do Vale.",
    ],
    quote: "O esporte regional une identidade comunitária, formação cidadã e visibilidade nacional para as nossas cidades.",
    category: "Esportes",
    city: "Jacareí",
    publishedAgo: "3h",
    readingTime: "3 min",
    author: "Esporte Vale",
    role: "Redação Esportiva",
    isBreaking: false,
    isMinedApproved: true,
    sourceOrigin: "Catálogo Aprovado · Minerador Esportes Vale",
    likesCount: 67,
    commentsCount: 15,
    coverTone: "cyan",
  },
];

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 6,
): number {
  const words = text.split(/\s+/);
  let line = "";
  let currentY = y;
  let linesCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      linesCount++;
      if (linesCount >= maxLines) {
        ctx.fillText(line.trim() + "...", x, currentY);
        return currentY + lineHeight;
      }
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line.trim()) {
    ctx.fillText(line.trim(), x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export interface ValeNewsPortalProps {
  initialArticles?: any[];
}

export function ValeNewsPortal({ initialArticles = [] }: ValeNewsPortalProps) {
  const [articles, setArticles] = useState<ValeNewsArticle[]>(() => {
    const mappedFromDb: ValeNewsArticle[] = (initialArticles || [])
      .filter((item: any) => item && (item.title || item.headline))
      .map((item: any, idx: number) => ({
        id: String(item.id || `db-${idx}`),
        title: String(item.title || item.headline),
        lead: String(item.summary || item.subtitle || item.lead || ""),
        body: String(item.content || item.body || item.summary || "")
          .split(/\n+/)
          .filter(Boolean),
        bulletSummary: [
          "Notícia processada pelo minerador local e aprovada pela curadoria da empresa.",
          `Cobertura verificada para ${item.city || "Vale do Paraíba"}.`,
        ],
        quote: String(item.summary || item.title || ""),
        category: String(item.category || "Para você"),
        city: String(item.city || "São José dos Campos"),
        publishedAgo: "Recente",
        readingTime: `${item.reading_time_minutes || 4} min`,
        author: String(item.author_name || "Redação Vale Agora"),
        role: "Catálogo Aprovado · Portal",
        isBreaking: Boolean(item.is_breaking || idx < 2),
        isMinedApproved: true,
        sourceOrigin: "Catálogo Aprovado · Portal",
        likesCount: 24 + idx * 7,
        commentsCount: 6 + idx * 2,
        coverTone: "indigo",
        coverImageUrl: item.cover_image_url || item.image_url || undefined,
      }));
    return [...mappedFromDb, ...INITIAL_ARTICLES];
  });
  const [selectedCity, setSelectedCity] = useState<string>("Notícias do Vale");
  const [selectedTab, setSelectedTab] = useState<string>("Para você");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Interações do Portal
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});
  const [commentsByArticle, setCommentsByArticle] = useState<
    Record<string, Array<{ id: string; author: string; text: string; ago: string }>>
  >({
    "vale-1": [
      {
        id: "c1",
        author: "Ricardo M. · São José dos Campos",
        text: "Excelente notícia para os engenheiros e técnicos formados aqui na região!",
        ago: "há 8 min",
      },
    ],
  });
  const [newCommentText, setNewCommentText] = useState<string>("");

  // Modais e Vistas Ativas
  const [readingArticle, setReadingArticle] = useState<ValeNewsArticle | null>(null);
  const [isProposalOpen, setIsProposalOpen] = useState<boolean>(false);
  const [isStudioOpen, setIsStudioOpen] = useState<boolean>(false);
  const [isCitizenPublishOpen, setIsCitizenPublishOpen] = useState<boolean>(false);

  // Estado do Estúdio de Carrossel Viral (PNG Real)
  const [studioArticleId, setStudioArticleId] = useState<string>(INITIAL_ARTICLES[0].id);
  const [studioThemeId, setStudioThemeId] = useState<CarouselThemeConfig["id"]>("promethee_light");
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [customHeadline, setCustomHeadline] = useState<string>("");
  const [customLead, setCustomLead] = useState<string>("");
  const [customCta, setCustomCta] = useState<string>(
    "O que você acha desse movimento na região? Comente abaixo e envie para quem mora no Vale!",
  );
  const [customCoverDataUrl, setCustomCoverDataUrl] = useState<string>("");
  const [isExportingPng, setIsExportingPng] = useState<boolean>(false);

  // Estado do Publicador Cidadão (+ Estilo Threads)
  const [citizenForm, setCitizenForm] = useState({
    title: "",
    lead: "",
    city: "São José dos Campos",
    category: "Urgente",
    author: "",
    imageUrl: "",
  });

  const studioArticle = useMemo(
    () => articles.find((a) => a.id === studioArticleId) || articles[0],
    [articles, studioArticleId],
  );

  const studioTheme = useMemo(
    () => CAROUSEL_THEMES.find((t) => t.id === studioThemeId) || CAROUSEL_THEMES[0],
    [studioThemeId],
  );

  const effectiveHeadline = customHeadline.trim() || studioArticle.title;
  const effectiveLead = customLead.trim() || studioArticle.lead;
  const effectiveCoverUrl = customCoverDataUrl || studioArticle.coverImageUrl || "";

  // Filtros dinâmicos de notícias (Cidade + Aba + Busca)
  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      const matchesCity =
        selectedCity === "Notícias do Vale" ||
        art.city.toLowerCase() === selectedCity.toLowerCase();

      const matchesTab =
        selectedTab === "Para você" ||
        (selectedTab === "Urgente" && art.isBreaking) ||
        (selectedTab === "Salvos" && savedMap[art.id]) ||
        art.category.toLowerCase().includes(selectedTab.toLowerCase());

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        art.title.toLowerCase().includes(q) ||
        art.lead.toLowerCase().includes(q) ||
        art.city.toLowerCase().includes(q) ||
        art.category.toLowerCase().includes(q);

      return matchesCity && matchesTab && matchesSearch;
    });
  }, [articles, savedMap, searchQuery, selectedCity, selectedTab]);

  const breakingArticles = useMemo(
    () =>
      articles.filter(
        (a) =>
          a.isBreaking &&
          (selectedCity === "Notícias do Vale" || a.city === selectedCity),
      ),
    [articles, selectedCity],
  );

  // Abrir Estúdio de Posts já preenchido com uma notícia específica
  const openStudioWithArticle = (article: ValeNewsArticle) => {
    setStudioArticleId(article.id);
    setCustomHeadline(article.title);
    setCustomLead(article.lead);
    setCustomCoverDataUrl(article.coverImageUrl || "");
    setActiveSlideIndex(0);
    setIsStudioOpen(true);
  };

  // Upload de Imagem Customizada para o Carrossel PNG
  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCustomCoverDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Renderizador Determinístico HTML5 <canvas> (1080x1350 Instagram 4:5) -> Download PNG Real!
  const renderSlideToPngDataUrl = async (slideIdx: number): Promise<string> => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // 1. Fundo do Tema
    ctx.fillStyle = studioTheme.bgHex;
    ctx.fillRect(0, 0, 1080, 1350);

    // 2. Cabeçalho Editorial Prométhée (Masthead + Cidade + Número do Slide)
    ctx.fillStyle = studioTheme.cardHex;
    drawRoundedRect(ctx, 64, 56, 952, 96, 28);
    ctx.fill();

    ctx.fillStyle = studioTheme.textHex;
    ctx.font = "900 32px Inter, system-ui, sans-serif";
    ctx.fillText("Vale Agora · Prométhée", 104, 115);

    // Pílula de Cidade e Slide no topo direito
    ctx.fillStyle = studioTheme.accentHex;
    drawRoundedRect(ctx, 730, 76, 260, 56, 28);
    ctx.fill();
    ctx.fillStyle = studioTheme.accentTextHex;
    ctx.font = "700 22px Inter, system-ui, sans-serif";
    ctx.fillText(`SLIDE 0${slideIdx + 1} / 04`, 785, 112);

    // 3. Conteúdo específico de cada etapa da Metodologia Viral (4 Slides)
    if (slideIdx === 0) {
      // SLIDE 1: CAPA CHAMATIVA (HOOK VIRAL + SQUIRCLE PROMÉTHÉE)
      ctx.fillStyle = studioTheme.cardHex;
      drawRoundedRect(ctx, 64, 184, 952, 980, 44);
      ctx.fill();

      // Área visual superior dentro do card squircle
      ctx.save();
      drawRoundedRect(ctx, 100, 220, 880, 440, 32);
      ctx.clip();

      ctx.fillStyle = studioTheme.accentHex;
      ctx.fillRect(100, 220, 880, 440);

      // Se houver imagem carregada, desenha no canvas
      if (effectiveCoverUrl) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = effectiveCoverUrl;
          });
          if (img.width > 0) {
            ctx.drawImage(img, 100, 220, 880, 440);
          }
        } catch {
          // Mantém fundo sólido se imagem externa bloquear CORS
        }
      }

      // Pílula flutuante Prométhée dentro da imagem (canto inferior esquerdo)
      ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
      drawRoundedRect(ctx, 132, 576, 360, 56, 28);
      ctx.fill();
      ctx.fillStyle = String.fromCharCode(35) + "FFFFFF";
      ctx.font = "700 24px Inter, system-ui, sans-serif";
      ctx.fillText(`${studioArticle.category} · ${studioArticle.city}`, 160, 612);
      ctx.restore();

      // Kicker Urgente
      ctx.fillStyle = studioTheme.mutedHex;
      ctx.font = "800 24px Inter, system-ui, sans-serif";
      ctx.fillText(
        `CAPA CHAMATIVA (HOOK) · ${studioArticle.readingTime.toUpperCase()} DE LEITURA`,
        104,
        724,
      );

      // Manchete Principal com Quebra Automática
      ctx.fillStyle = studioTheme.textHex;
      ctx.font = "900 46px Inter, system-ui, sans-serif";
      const nextY = wrapCanvasText(ctx, effectiveHeadline, 104, 792, 872, 58, 5);

      // Subtítulo / Gancho de Arraste
      ctx.fillStyle = studioTheme.mutedHex;
      ctx.font = "500 28px Inter, system-ui, sans-serif";
      wrapCanvasText(
        ctx,
        "Deslize para o lado para entender os fatos apurados pela nossa redação →",
        104,
        Math.max(nextY + 24, 1060),
        872,
        40,
        2,
      );
    } else if (slideIdx === 1) {
      // SLIDE 2: DESTRINCHAR DA NOTÍCIA (FATOS & APURAÇÃO)
      ctx.fillStyle = studioTheme.cardHex;
      drawRoundedRect(ctx, 64, 184, 952, 980, 44);
      ctx.fill();

      ctx.fillStyle = studioTheme.accentHex;
      drawRoundedRect(ctx, 104, 232, 420, 54, 27);
      ctx.fill();
      ctx.fillStyle = studioTheme.accentTextHex;
      ctx.font = "800 22px Inter, system-ui, sans-serif";
      ctx.fillText("DESTRINCHANDO A NOTÍCIA", 136, 267);

      ctx.fillStyle = studioTheme.textHex;
      ctx.font = "800 38px Inter, system-ui, sans-serif";
      const afterTitleY = wrapCanvasText(
        ctx,
        "O que realmente aconteceu e os pontos centrais:",
        104,
        352,
        872,
        48,
        2,
      );

      ctx.fillStyle = studioTheme.mutedHex;
      ctx.font = "500 30px Inter, system-ui, sans-serif";
      let bulletY = wrapCanvasText(ctx, effectiveLead, 104, afterTitleY + 24, 872, 44, 4);

      const bullets =
        studioArticle.bulletSummary.length > 0
          ? studioArticle.bulletSummary
          : [
              "Apuração verificada pela curadoria regional da redação.",
              "Impacto direto para moradores e empresas de " + studioArticle.city + ".",
              "Acompanhamento em tempo real pelo portal.",
            ];

      bulletY += 36;
      bullets.forEach((b, i) => {
        ctx.fillStyle = studioTheme.textHex;
        ctx.font = "800 28px Inter, system-ui, sans-serif";
        ctx.fillText(`0${i + 1}.`, 104, bulletY);
        ctx.font = "600 28px Inter, system-ui, sans-serif";
        bulletY = wrapCanvasText(ctx, b, 164, bulletY, 810, 40, 3) + 22;
      });
    } else if (slideIdx === 2) {
      // SLIDE 3: IMPACTO REGIONAL & CITAÇÃO EM DESTAQUE
      ctx.fillStyle = studioTheme.cardHex;
      drawRoundedRect(ctx, 64, 184, 952, 980, 44);
      ctx.fill();

      ctx.fillStyle = studioTheme.accentHex;
      drawRoundedRect(ctx, 104, 232, 440, 54, 27);
      ctx.fill();
      ctx.fillStyle = studioTheme.accentTextHex;
      ctx.font = "800 22px Inter, system-ui, sans-serif";
      ctx.fillText(`IMPACTO EM ${studioArticle.city.toUpperCase()}`, 136, 267);

      ctx.fillStyle = studioTheme.textHex;
      ctx.font = "900 44px Inter, system-ui, sans-serif";
      const qY = wrapCanvasText(
        ctx,
        `"${studioArticle.quote}"`,
        104,
        380,
        872,
        60,
        5,
      );

      ctx.fillStyle = studioTheme.mutedHex;
      ctx.font = "600 30px Inter, system-ui, sans-serif";
      wrapCanvasText(
        ctx,
        studioArticle.body[1] || studioArticle.body[0] || effectiveLead,
        104,
        qY + 48,
        872,
        44,
        6,
      );
    } else {
      // SLIDE 4: CALL TO ACTION VIRAL (ENGAJAMENTO & COMPARTILHAMENTO)
      ctx.fillStyle = studioTheme.cardHex;
      drawRoundedRect(ctx, 64, 184, 952, 980, 44);
      ctx.fill();

      ctx.fillStyle = studioTheme.accentHex;
      drawRoundedRect(ctx, 104, 240, 420, 58, 29);
      ctx.fill();
      ctx.fillStyle = studioTheme.accentTextHex;
      ctx.font = "800 24px Inter, system-ui, sans-serif";
      ctx.fillText("PARTICIPE DO DEBATE", 148, 278);

      ctx.fillStyle = studioTheme.textHex;
      ctx.font = "900 48px Inter, system-ui, sans-serif";
      const ctaY = wrapCanvasText(ctx, customCta, 104, 390, 872, 62, 5);

      ctx.fillStyle = studioTheme.mutedHex;
      ctx.font = "600 30px Inter, system-ui, sans-serif";
      wrapCanvasText(
        ctx,
        "1. Deixe sua opinião nos comentários\n2. Compartilhe nos seus Stories\n3. Salve este post para consultar depois\n4. Leia a matéria completa no portal Vale Agora News",
        104,
        ctaY + 60,
        872,
        52,
        6,
      );
    }

    // 4. Rodapé de Assinatura Jornalística
    ctx.fillStyle = studioTheme.mutedHex;
    ctx.font = "700 24px Inter, system-ui, sans-serif";
    ctx.fillText(
      `VALE AGORA NEWS · ${studioArticle.city.toUpperCase()} · CURADORIA REGIONAL`,
      68,
      1248,
    );

    return canvas.toDataURL("image/png");
  };

  const handleDownloadSingleSlidePng = async (slideIdx: number) => {
    setIsExportingPng(true);
    try {
      const dataUrl = await renderSlideToPngDataUrl(slideIdx);
      if (!dataUrl) return;
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `vale-agora-carrossel-slide-${slideIdx + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleDownloadAllSlidesPng = async () => {
    setIsExportingPng(true);
    try {
      for (let i = 0; i < 4; i++) {
        const dataUrl = await renderSlideToPngDataUrl(i);
        if (dataUrl) {
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = `vale-agora-carrossel-slide-${i + 1}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      }
    } finally {
      setIsExportingPng(false);
    }
  };

  // Publicar Notícia / Relato da Comunidade (+ Estilo Threads)
  const handleCitizenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!citizenForm.title.trim() || !citizenForm.lead.trim()) return;

    const created: ValeNewsArticle = {
      id: `citizen-${Date.now()}`,
      title: citizenForm.title.trim(),
      lead: citizenForm.lead.trim(),
      body: [
        citizenForm.lead.trim(),
        "Relato enviado diretamente pelo canal de jornalismo participativo do portal Vale Agora News e integrado ao feed da comunidade.",
      ],
      bulletSummary: [
        `Ocorrência registrada em ${citizenForm.city}.`,
        `Classificada na editoria ${citizenForm.category}.`,
      ],
      quote: citizenForm.title.trim(),
      category: citizenForm.category,
      city: citizenForm.city,
      publishedAgo: "Agora",
      readingTime: "2 min",
      author: citizenForm.author.trim() || "Colaborador do Vale",
      role: "Comunidade · Feed Participativo",
      isBreaking: true,
      isMinedApproved: true,
      sourceOrigin: "Canal Cidadão Aprovado",
      likesCount: 1,
      commentsCount: 0,
      coverTone: "slate",
      coverImageUrl: citizenForm.imageUrl.trim() || undefined,
    };

    setArticles((prev) => [created, ...prev]);
    setCitizenForm({
      title: "",
      lead: "",
      city: "São José dos Campos",
      category: "Urgente",
      author: "",
      imageUrl: "",
    });
    setIsCitizenPublishOpen(false);
  };

  // Adicionar Comentário na Leitura do Artigo
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!readingArticle || !newCommentText.trim()) return;
    const item = {
      id: `cm-${Date.now()}`,
      author: `Leitor · ${selectedCity === "Notícias do Vale" ? readingArticle.city : selectedCity}`,
      text: newCommentText.trim(),
      ago: "Agora",
    };
    setCommentsByArticle((prev) => ({
      ...prev,
      [readingArticle.id]: [...(prev[readingArticle.id] || []), item],
    }));
    setNewCommentText("");
  };

  return (
    /*
     * IMPORTANTE: O __root.tsx aplica `viewport-lock` (`height: 100dvh; overflow: hidden`) no <body>.
     * Por isso, esta rota standalone possui seu próprio container `h-dvh w-full overflow-y-auto native-scroll`
     * com tema `.light` limpo e minimalista, garantindo rolagem nativa fluida no Mobile e no Desktop!
     */
    <div className="light h-dvh w-full overflow-y-auto overflow-x-hidden native-scroll bg-background text-foreground font-sans selection:bg-foreground selection:text-background">
      {/* ── BARRA SUPERIOR EDITORIAL + BOTÕES DE PROPOSTA & ESTÚDIO DE CARROSSEL PNG ── */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Linha 1: Logo Domo Prométhée + Filtro de Cidade + Masthead Central + Ações (Buscar, Criar Posts PNG, Proposta) */}
          <div className="flex items-center justify-between gap-2 py-3">
            {/* Esquerda: Domo Wireframe Prométhée + Seletor de Cidade */}
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => {
                  setReadingArticle(null);
                  setSelectedCategoryAndReset("Para você");
                }}
                className="size-11 min-h-11 rounded-2xl border border-border/80 bg-muted/30 hover:bg-muted/60 flex items-center justify-center text-foreground shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Início Vale Agora News"
                title="Início Vale Agora News"
              >
                <PrometheeWireframeDomeLogo className="size-7 text-foreground" />
              </button>

              {/* Seletor de Cidade no Topo */}
              <div className="hidden md:flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/30 px-3.5 h-11">
                <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                <select
                  aria-label="Escolher cidade do Vale"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="bg-transparent text-xs font-bold text-foreground outline-none cursor-pointer pr-1"
                >
                  {VALE_CITIES.map((city) => (
                    <option key={city} value={city} className="bg-background text-foreground">
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Centro: Masthead Estilo Prométhée */}
            <div className="text-center min-w-0">
              <button
                type="button"
                onClick={() => setReadingArticle(null)}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl px-2 py-1"
              >
                <span className="block text-xl sm:text-3xl font-black tracking-tight text-foreground leading-none">
                  Vale Agora
                </span>
                <span className="hidden sm:block text-xs font-medium text-muted-foreground mt-0.5">
                  Prométhée Editorial · Jornalismo Regional Verificado
                </span>
              </button>
            </div>

            {/* Direita: Botão Buscar + Gerador de Posts/Carrossel PNG + Botão Proposta + Notificações */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsSearchOpen((prev) => !prev)}
                className="size-11 min-h-11 rounded-full border border-border/80 bg-muted/25 hover:bg-muted/60 flex items-center justify-center text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Buscar notícias"
                title="Buscar notícias"
              >
                <Search className="size-4" />
              </button>

              <button
                type="button"
                onClick={() => openStudioWithArticle(readingArticle || articles[0])}
                className="h-11 min-h-11 px-3 sm:px-4 rounded-full border border-border bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-bold flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Abrir Estúdio de Posts e Carrosséis Virais com Download PNG"
              >
                <Layers className="size-4 shrink-0" />
                <span className="hidden sm:inline">Criar Posts (PNG)</span>
                <span className="sm:hidden">Posts</span>
              </button>

              <button
                type="button"
                onClick={() => setIsProposalOpen(true)}
                className="h-11 min-h-11 px-3.5 sm:px-4 rounded-full bg-foreground text-background hover:bg-foreground/90 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Ver Proposta Comercial do Portal"
              >
                <FileText className="size-4 shrink-0" />
                <span>Proposta</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setReadingArticle(null);
                  setSelectedTab("Urgente");
                }}
                className="hidden sm:flex size-11 min-h-11 rounded-full border border-border/80 bg-muted/25 hover:bg-muted/60 items-center justify-center text-foreground relative transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Plantão Urgente"
                title="Plantão Urgente"
              >
                <Bell className="size-4" />
                <span className="size-2 rounded-full bg-destructive absolute top-2.5 right-2.5" />
              </button>
            </div>
          </div>

          {/* Seletor Horizontal de Cidades no Mobile */}
          <div className="flex md:hidden items-center gap-1.5 overflow-x-auto no-scrollbar pb-2">
            {VALE_CITIES.map((city) => {
              const isSelected = selectedCity === city;
              return (
                <button
                  key={city}
                  type="button"
                  onClick={() => setSelectedCity(city)}
                  className={`h-11 min-h-11 px-3 rounded-full text-xs font-semibold shrink-0 flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isSelected
                      ? "bg-foreground text-background"
                      : "bg-muted/40 text-muted-foreground border border-border/60"
                  }`}
                >
                  <MapPin className="size-3" />
                  <span>{city}</span>
                </button>
              );
            })}
          </div>

          {/* Barra de Busca Dinâmica (Adapta Seções Conforme Pesquisa) */}
          {isSearchOpen && (
            <div className="pb-3 space-y-2">
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/30 px-3.5 h-11">
                <Search className="size-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar por cidade, Urgente, Criminal, Tecnologia, Embraer, Dutra..."
                  className="w-full bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="size-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Limpar pesquisa"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Pílulas de Adaptação Rápida de Seção */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-xs font-semibold text-muted-foreground shrink-0 mr-1">
                  Temas em alta:
                </span>
                {["Urgente", "Polícia", "Tecnologia", "Dutra", "Aeroespacial", "Turismo"].map(
                  (topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => setSearchQuery(topic)}
                      className="h-8 px-3 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold shrink-0 hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {topic}
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

          {/* Linha 2: Menu Tabs Superior Prométhée (+ Publicar + Abas Editoriais Horizontais) */}
          <nav
            aria-label="Navegação de Editorias Prométhée"
            className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar border-t border-border/50 pt-1"
          >
            {/* Botão + Estilo Threads / Prométhée para Publicação no Feed */}
            <button
              type="button"
              onClick={() => setIsCitizenPublishOpen(true)}
              className="h-11 min-h-11 px-3.5 rounded-full border border-border bg-muted/40 hover:bg-muted text-foreground text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Publicar notícia ou relato da comunidade no feed"
            >
              <Plus className="size-4" />
              <span>Publicar</span>
            </button>

            {PROMETHEE_TABS.map((tab) => {
              const active = selectedTab === tab && !readingArticle;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setReadingArticle(null);
                    setSelectedTab(tab);
                  }}
                  className={`h-11 min-h-11 px-3.5 text-xs sm:text-sm font-semibold shrink-0 relative flex items-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active
                      ? "text-foreground font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{tab}</span>
                  {active && (
                    <span className="absolute bottom-0 inset-x-2 h-0.5 bg-foreground rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ── CONTEÚDO PRINCIPAL DO PORTAL (LEITOR DE ARTIGO OU FEED COMPLETO) ── */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 pb-32">
        {readingArticle ? (
          /* ── VISTA DE PÁGINA DE NOTÍCIA LIMPA & MINIMALISTA (COM TEMPO DE LEITURA, CURADORIA E ADS) ── */
          <article className="mx-auto max-w-4xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
              <button
                type="button"
                onClick={() => setReadingArticle(null)}
                className="h-11 min-h-11 px-4 rounded-full border border-border bg-muted/30 hover:bg-muted text-xs font-bold text-foreground flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowLeft className="size-4" />
                <span>Voltar ao Feed de Notícias</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openStudioWithArticle(readingArticle)}
                  className="h-11 min-h-11 px-4 rounded-full bg-foreground text-background text-xs font-bold flex items-center gap-2 hover:bg-foreground/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Layers className="size-4" />
                  <span>Transformar em Carrossel PNG</span>
                </button>
              </div>
            </div>

            {/* Metadados Editoriais + Tempo de Leitura + Curadoria */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-3 py-1 rounded-full bg-foreground text-background font-bold">
                  {readingArticle.category}
                </span>
                <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground font-semibold flex items-center gap-1">
                  <MapPin className="size-3" />
                  {readingArticle.city}
                </span>
                <span className="px-3 py-1 rounded-full border border-border text-muted-foreground font-medium flex items-center gap-1">
                  <Clock className="size-3" />
                  {readingArticle.readingTime} de leitura
                </span>
                <span className="px-3 py-1 rounded-full border border-border bg-muted/30 text-foreground font-semibold flex items-center gap-1">
                  <ShieldCheck className="size-3.5" />
                  {readingArticle.sourceOrigin}
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground leading-tight">
                {readingArticle.title}
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                {readingArticle.lead}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs text-muted-foreground">
                <div>
                  <strong className="text-foreground">{readingArticle.author}</strong> ·{" "}
                  {readingArticle.role} · Publicado há {readingArticle.publishedAgo}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSavedMap((p) => ({
                        ...p,
                        [readingArticle.id]: !p[readingArticle.id],
                      }))
                    }
                    className="h-11 min-h-11 px-3 rounded-xl border border-border hover:bg-muted text-foreground font-semibold flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Bookmark className="size-4" />
                    <span>{savedMap[readingArticle.id] ? "Salvo" : "Salvar"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Capa Visual Prométhée */}
            <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-border bg-muted/40">
              {readingArticle.coverImageUrl ? (
                <img
                  src={readingArticle.coverImageUrl}
                  alt={readingArticle.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full p-6 sm:p-10 flex flex-col justify-between bg-secondary/60 text-foreground">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      VALE AGORA NEWS · REPORTAGEM ESPECIAL
                    </span>
                    <PrometheeWireframeDomeLogo className="size-10 text-foreground" />
                  </div>
                  <blockquote className="text-lg sm:text-2xl font-bold tracking-tight max-w-2xl leading-snug">
                    “{readingArticle.quote}”
                  </blockquote>
                  <div className="h-8" />
                </div>
              )}

              <div className="absolute bottom-4 left-4">
                <span className="rounded-full border border-white/40 bg-black/65 backdrop-blur-md px-4 py-1.5 text-xs font-semibold text-white">
                  {readingArticle.category} · {readingArticle.city}
                </span>
              </div>
              <div className="absolute bottom-4 right-4">
                <span className="rounded-full bg-black/65 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-white flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  <span>{readingArticle.readingTime}</span>
                </span>
              </div>
            </div>

            {/* Resumo Executivo ("Para entender a notícia") */}
            <div className="rounded-3xl border border-border bg-muted/25 p-5 sm:p-6 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                <Sparkles className="size-4" />
                <span>Síntese da Curadoria Regional</span>
              </div>
              <ul className="space-y-2 text-sm text-foreground/90">
                {readingArticle.bulletSummary.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="font-bold text-foreground">0{i + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Corpo da Reportagem + Card ADS In-Article */}
            <div className="space-y-5 text-base text-foreground/90 leading-relaxed">
              {readingArticle.body.map((paragraph, index) => (
                <React.Fragment key={index}>
                  <p>{paragraph}</p>
                  {index === 0 && (
                    <div className="my-6 rounded-2xl border border-dashed border-border bg-muted/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded bg-foreground text-background text-xs font-black uppercase">
                            ADS
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground">
                            Espaço Publicitário In-Article · Monetização do Portal
                          </span>
                        </div>
                        <p className="text-sm font-bold text-foreground">
                          Destaque sua empresa ou serviço local exatamente durante a leitura das reportagens.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsProposalOpen(true)}
                        className="h-11 min-h-11 px-4 rounded-xl border border-border bg-background hover:bg-muted text-xs font-bold text-foreground shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Ver Formatos ADS
                      </button>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Seção de Comentários da Matéria */}
            <section className="rounded-3xl border border-border bg-muted/20 p-5 sm:p-6 space-y-4">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <MessageCircle className="size-4" />
                <span>
                  Comentários da Comunidade (
                  {(commentsByArticle[readingArticle.id] || []).length +
                    readingArticle.commentsCount}
                  )
                </span>
              </h3>

              <form onSubmit={handleAddComment} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Participe da conversa com respeito editorial..."
                  className="flex-1 h-11 px-4 rounded-xl border border-border bg-background text-sm text-foreground outline-none"
                />
                <button
                  type="submit"
                  className="h-11 min-h-11 px-5 rounded-xl bg-foreground text-background text-xs font-bold shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Publicar Comentário
                </button>
              </form>

              <div className="space-y-2 pt-2">
                {(commentsByArticle[readingArticle.id] || []).map((c) => (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-border/60 bg-background p-3.5 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <strong className="text-foreground">{c.author}</strong>
                      <span>{c.ago}</span>
                    </div>
                    <p className="text-sm text-foreground/90">{c.text}</p>
                  </div>
                ))}
              </div>
            </section>
          </article>
        ) : (
          /* ── VISTA PADRÃO DO PORTAL (CARROSSEL HORIZONTAL BREAKING NEWS + FEED PROMÉTHÉE + ADS) ── */
          <div className="space-y-8">
            {/* Banner Superior ADS Demonstrativo (Discreto e Minimalista) */}
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="px-2.5 py-1 rounded-md bg-foreground text-background text-xs font-black uppercase tracking-wider shrink-0">
                  ADS
                </span>
                <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                  <strong>Banner Leaderboard Regional (728x90 / Mobile):</strong> Espaço configurável para patrocinadores locais por cidade.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openStudioWithArticle(articles[0])}
                  className="h-11 min-h-11 px-3.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Testar Gerador de Posts
                </button>
                <button
                  type="button"
                  onClick={() => setIsProposalOpen(true)}
                  className="h-11 min-h-11 px-3.5 rounded-xl bg-secondary text-secondary-foreground text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Ver Proposta Comercial
                </button>
              </div>
            </div>

            {/* ── SEÇÃO 1: SCROLL HORIZONTAL / CARROSSEL DE BREAKING NEWS ── */}
            {breakingArticles.length > 0 && (
              <section aria-label="Plantão e Destaques Horizontais" className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded-md bg-foreground text-background text-xs font-black tracking-wider uppercase flex items-center gap-1">
                      <Flame className="size-3.5" />
                      <span>BREAKING NEWS</span>
                    </span>
                    <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                       Giro Rápido pelo Vale ({selectedCity})
                    </h2>
                  </div>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Arraste horizontalmente →
                  </span>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory no-scrollbar">
                  {breakingArticles.map((art) => (
                    <article
                      key={`rail-${art.id}`}
                      className="min-w-72 sm:min-w-80 max-w-sm shrink-0 snap-start rounded-3xl border border-border/80 bg-muted/25 p-5 flex flex-col justify-between gap-4 hover:border-foreground/40 transition-colors"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground font-bold flex items-center gap-1">
                            <MapPin className="size-3" />
                            {art.city}
                          </span>
                          <span className="text-muted-foreground font-medium flex items-center gap-1">
                            <Clock className="size-3" />
                            {art.readingTime}
                          </span>
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug">
                          {art.title}
                        </h3>

                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {art.lead}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border/60">
                        <button
                          type="button"
                          onClick={() => setReadingArticle(art)}
                          className="h-11 min-h-11 px-2 text-xs font-bold text-foreground underline underline-offset-4 hover:text-primary flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                        >
                          Ler mais
                        </button>
                        <button
                          type="button"
                          onClick={() => openStudioWithArticle(art)}
                          className="h-11 min-h-11 px-3 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Layers className="size-3.5" />
                          <span>Gerar Post PNG</span>
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* ── SEÇÃO 2: GRID PRINCIPAL BIDIRECIONAL (FEED VERTICAL PROMÉTHÉE + COLUNA EDITORIAL & ADS) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Coluna Esquerda / Principal (8 colunas no Desktop, 100% no Mobile): Cards Prométhée */}
              <div className="lg:col-span-8 space-y-6">
                <div className="flex items-center justify-between border-b border-border/70 pb-3">
                  <div>
                    <h2 className="text-lg sm:text-xl font-black tracking-tight text-foreground">
                      {selectedTab} · {selectedCity}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Alimentado exclusivamente pelo catálogo de notícias aprovadas pela curadoria da empresa
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {filteredArticles.length} matérias
                  </span>
                </div>

                {filteredArticles.length === 0 ? (
                  <div className="rounded-3xl border border-border bg-muted/20 p-10 text-center space-y-3">
                    <Newspaper className="size-8 text-muted-foreground mx-auto" />
                    <h3 className="text-base font-bold text-foreground">
                      Nenhuma notícia encontrada para este filtro
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      Experimente alternar para &ldquo;Notícias do Vale&rdquo; ou limpar o termo de pesquisa.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCity("Notícias do Vale");
                        setSelectedTab("Para você");
                        setSearchQuery("");
                      }}
                      className="h-11 min-h-11 px-5 rounded-full bg-foreground text-background text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Restaurar Feed Completo
                    </button>
                  </div>
                ) : (
                  filteredArticles.map((article, index) => {
                    const isLiked = Boolean(likedMap[article.id]);
                    const isSaved = Boolean(savedMap[article.id]);
                    const totalLikes = article.likesCount + (isLiked ? 1 : 0);
                    const totalComments =
                      article.commentsCount + (commentsByArticle[article.id]?.length || 0);

                    return (
                      <React.Fragment key={article.id}>
                        {/* CARD SQUIRCLE FIEL AO DESIGN PROMÉTHÉE */}
                        <article className="rounded-3xl border border-border/80 bg-muted/30 p-4 sm:p-6 transition-colors hover:border-foreground/30">
                          {/* Container de Mídia Arredondado com Pílulas Translúcidas Internas */}
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setReadingArticle(article)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setReadingArticle(article);
                              }
                            }}
                            className="relative aspect-video w-full overflow-hidden rounded-2xl bg-secondary mb-4 border border-border/60 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {article.coverImageUrl ? (
                              <img
                                src={article.coverImageUrl}
                                alt={article.title}
                                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="h-full w-full p-5 sm:p-7 flex flex-col justify-between bg-muted/70 text-foreground">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="px-3 py-1 rounded-full bg-background/90 text-foreground text-xs font-bold border border-border/60">
                                    {article.sourceOrigin}
                                  </span>
                                  <PrometheeWireframeDomeLogo className="size-8 text-foreground/80" />
                                </div>

                                <p className="text-base sm:text-xl font-bold tracking-tight text-foreground max-w-xl leading-snug">
                                  “{article.quote}”
                                </p>

                                <div className="h-8" />
                              </div>
                            )}

                            {/* Pílula Flutuante Inferior Esquerda (Categoria Prométhée) */}
                            <div className="absolute bottom-3 left-3 flex items-center gap-2">
                              <span className="rounded-full border border-white/40 bg-black/65 backdrop-blur-md px-3.5 py-1 text-xs font-medium text-white">
                                {article.category}
                              </span>
                              <span className="rounded-full border border-white/30 bg-black/55 backdrop-blur-md px-3 py-1 text-xs font-medium text-white">
                                {article.city}
                              </span>
                            </div>

                            {/* Pílula Flutuante Inferior Direita (Tempo Prométhée + Ícone Relógio) */}
                            <div className="absolute bottom-3 right-3">
                              <span className="rounded-full bg-black/65 backdrop-blur-md px-3 py-1 text-xs font-medium text-white flex items-center gap-1.5">
                                <span>{article.publishedAgo}</span>
                                <Clock className="size-3.5" />
                              </span>
                            </div>
                          </div>

                          {/* Metadados + Manchete + Lead Completo */}
                          <div className="space-y-2.5 mb-4">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">
                                {article.city}
                              </span>
                              <span>·</span>
                              <span>{article.readingTime} de leitura</span>
                              <span>·</span>
                              <span>{article.author}</span>
                            </div>

                            <h3 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground leading-snug">
                              <button
                                type="button"
                                onClick={() => setReadingArticle(article)}
                                className="text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                              >
                                {article.title}
                              </button>
                            </h3>

                            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                              {article.lead}
                            </p>
                          </div>

                          {/* Barra Inferior Prométhée: "Ler mais" sublinhado à esquerda + Curtir, Comentar, Carrossel PNG e Salvar à direita */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/70">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setReadingArticle(article)}
                                className="h-11 min-h-11 px-2 text-xs sm:text-sm font-bold text-foreground underline underline-offset-4 hover:text-primary flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                              >
                                Ler mais
                              </button>

                              <button
                                type="button"
                                onClick={() => openStudioWithArticle(article)}
                                className="h-11 min-h-11 px-3 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                title="Transformar esta notícia em carrossel viral PNG"
                              >
                                <Layers className="size-3.5" />
                                <span>Criar Carrossel PNG</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-1 sm:gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setLikedMap((p) => ({
                                    ...p,
                                    [article.id]: !p[article.id],
                                  }))
                                }
                                className={`h-11 min-h-11 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                  isLiked
                                    ? "bg-foreground text-background"
                                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                }`}
                                aria-label="Curtir matéria"
                              >
                                <Heart className="size-4" />
                                <span>{totalLikes}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setReadingArticle(article)}
                                className="h-11 min-h-11 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                aria-label="Comentários"
                              >
                                <MessageCircle className="size-4" />
                                <span>{totalComments}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setSavedMap((p) => ({
                                    ...p,
                                    [article.id]: !p[article.id],
                                  }))
                                }
                                className={`size-11 min-h-11 rounded-xl flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                  isSaved
                                    ? "bg-foreground text-background"
                                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                }`}
                                aria-label="Salvar matéria"
                              >
                                <Bookmark className="size-4" />
                              </button>
                            </div>
                          </div>
                        </article>

                        {/* Card Nativo de Publicidade (ADS) intercalado no Feed */}
                        {index === 1 && (
                          <div className="rounded-3xl border border-dashed border-border bg-muted/15 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded bg-foreground text-background text-xs font-black uppercase">
                                  ADS · PUBLICIDADE
                                </span>
                                <span className="text-xs font-semibold text-muted-foreground">
                                  Formato Card In-Feed (Nativo Prométhée)
                                </span>
                              </div>
                              <h4 className="text-base font-bold text-foreground">
                                Espaço Comercial para Anunciantes de {selectedCity}
                              </h4>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                Banners e cards nativos com alta taxa de leitura para monetizar o portal com comércios, clínicas, colégios e indústrias locais.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsProposalOpen(true)}
                              className="h-11 min-h-11 px-4 rounded-xl bg-foreground text-background text-xs font-bold shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              Conhecer Modelo
                            </button>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </div>

              {/* Coluna Direita (4 colunas no Desktop): Motor de Mineração + Estúdio PNG + Cards ADS Diferentes Tamanhos */}
              <aside className="lg:col-span-4 space-y-6">
                {/* Card 1: Explicação da Curadoria & Minerador (Só Publica Aprovadas) */}
                <div className="rounded-3xl border border-border/80 bg-muted/25 p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-foreground" />
                      <h3 className="text-sm font-bold text-foreground">
                        Minerador + Curadoria com DNA
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-bold">
                      Ativo
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Nosso minerador monitora milhares de fontes regionais 24h por dia, mas <strong>o portal exibe exclusivamente as notícias aprovadas ou publicadas pela empresa</strong> em seu catálogo editorial.
                  </p>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="rounded-2xl border border-border/60 bg-background p-3">
                      <span className="text-xs text-muted-foreground block">
                        Fontes Mineradas
                      </span>
                      <strong className="text-base font-black text-foreground">
                        +2.400/dia
                      </strong>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background p-3">
                      <span className="text-xs text-muted-foreground block">
                        No Portal Público
                      </span>
                      <strong className="text-base font-black text-foreground">
                        100% Aprovadas
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Card 2: Atalho Interativo para o Gerador de Carrosséis PNG */}
                <div className="rounded-3xl border border-border bg-secondary/50 p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Layers className="size-4 text-foreground" />
                    <h3 className="text-sm font-bold text-foreground">
                      Estúdio de Carrosséis Virais (PNG)
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Escolha qualquer notícia do portal, aplique a metodologia viral de 4 slides (Capa Chamativa → Destrinchar → Impacto → CTA) e baixe os arquivos <strong>.PNG (1080×1350)</strong> prontos para o Instagram.
                  </p>
                  <button
                    type="button"
                    onClick={() => openStudioWithArticle(articles[0])}
                    className="h-11 min-h-11 w-full rounded-2xl bg-foreground text-background text-xs font-bold flex items-center justify-center gap-2 hover:bg-foreground/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Download className="size-4" />
                    <span>Abrir Gerador de Posts PNG</span>
                  </button>
                </div>

                {/* Card 3: ADS Formato Médio (300x250 Display) */}
                <div className="rounded-3xl border border-dashed border-border bg-muted/15 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-xs font-bold uppercase">
                      ADS · 300x250
                    </span>
                    <span className="text-xs text-muted-foreground">Display Lateral</span>
                  </div>
                  <div className="aspect-square max-h-48 w-full rounded-2xl border border-border/60 bg-background flex flex-col items-center justify-center p-4 text-center space-y-2">
                    <TrendingUp className="size-6 text-muted-foreground" />
                    <p className="text-xs font-bold text-foreground">
                      Espaço Publicitário Retangular (ADS)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ideal para campanhas imobiliárias, concessionárias e universidades do Vale.
                    </p>
                  </div>
                </div>

                {/* Card 4: ADS Formato Compacto (Patrocínio de Seção) */}
                <div className="rounded-2xl border border-dashed border-border bg-muted/15 p-4 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold uppercase text-muted-foreground">
                      ADS · Banner Compacto
                    </span>
                    <p className="text-xs font-semibold text-foreground">
                      Assinatura de Patrocínio por Editoria
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-secondary text-secondary-foreground text-xs font-bold">
                    ADS
                  </span>
                </div>
              </aside>
            </div>
          </div>
        )}
      </main>

      {/* ── BARRA DE NAVEGAÇÃO INFERIOR MOBILE (FIEL AO APP PROMÉTHÉE) ── */}
      <nav
        aria-label="Navegação Inferior Mobile"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 h-16 bg-background/95 backdrop-blur-md border-t border-border/80 px-2 flex items-center justify-around"
      >
        <button
          type="button"
          onClick={() => {
            setReadingArticle(null);
            setSelectedTab("Para você");
          }}
          className={`h-11 min-h-11 px-3 rounded-xl flex flex-col items-center justify-center gap-0.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            !readingArticle && !isStudioOpen && !isProposalOpen
              ? "text-foreground"
              : "text-muted-foreground"
          }`}
        >
          <Newspaper className="size-4" />
          <span>Notícias</span>
        </button>

        <button
          type="button"
          onClick={() => setIsCitizenPublishOpen(true)}
          className="h-11 min-h-11 px-3 rounded-xl flex flex-col items-center justify-center gap-0.5 text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="size-4" />
          <span>Publicar</span>
        </button>

        <button
          type="button"
          onClick={() => openStudioWithArticle(readingArticle || articles[0])}
          className="h-11 min-h-11 px-3 rounded-xl flex flex-col items-center justify-center gap-0.5 text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Layers className="size-4" />
          <span>Posts PNG</span>
        </button>

        <button
          type="button"
          onClick={() => setIsProposalOpen(true)}
          className="h-11 min-h-11 px-3 rounded-xl flex flex-col items-center justify-center gap-0.5 text-xs font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <FileText className="size-4" />
          <span>Proposta</span>
        </button>
      </nav>

      {/* ── MODAL 1: ESTÚDIO DE POSTS & CARROSSÉIS VIRAIS COM DOWNLOAD PNG REAL ── */}
      {isStudioOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Estúdio de Carrosséis Virais e Download PNG"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-6xl rounded-3xl bg-background text-foreground border border-border p-5 sm:p-8 max-h-dvh overflow-y-auto space-y-6">
            <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Estúdio Editorial Social · Metodologia Viral 4 Etapas
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-foreground">
                  Criador de Posts e Carrosséis Virais (Exportação .PNG Real)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsStudioOpen(false)}
                className="size-11 min-h-11 rounded-full border border-border hover:bg-muted flex items-center justify-center text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Fechar estúdio de posts"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Controles de Configuração do Carrossel (5 colunas) */}
              <div className="lg:col-span-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    1. Escolher Notícia Aprovada do Portal
                  </label>
                  <select
                    value={studioArticleId}
                    onChange={(e) => {
                      const found = articles.find((a) => a.id === e.target.value);
                      setStudioArticleId(e.target.value);
                      if (found) {
                        setCustomHeadline(found.title);
                        setCustomLead(found.lead);
                        setCustomCoverDataUrl(found.coverImageUrl || "");
                      }
                    }}
                    className="w-full h-11 px-3.5 rounded-xl border border-border bg-muted/30 text-xs font-semibold text-foreground outline-none"
                  >
                    {articles.map((a) => (
                      <option key={a.id} value={a.id}>
                        [{a.city}] {a.title.slice(0, 65)}...
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    2. Testar Tema Visual do Carrossel
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CAROUSEL_THEMES.map((t) => {
                      const active = studioThemeId === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setStudioThemeId(t.id)}
                          className={`h-11 min-h-11 px-3 rounded-xl border text-xs font-bold text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            active
                              ? "border-foreground bg-foreground text-background"
                              : "border-border bg-muted/20 text-foreground hover:bg-muted/50"
                          }`}
                        >
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    3. Título da Capa Chamativa (Slide 1 - Hook)
                  </label>
                  <textarea
                    rows={2}
                    value={effectiveHeadline}
                    onChange={(e) => setCustomHeadline(e.target.value)}
                    className="w-full p-3 rounded-xl border border-border bg-muted/20 text-xs font-semibold text-foreground outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    4. Destrinchar da Notícia (Slide 2 - Síntese)
                  </label>
                  <textarea
                    rows={3}
                    value={effectiveLead}
                    onChange={(e) => setCustomLead(e.target.value)}
                    className="w-full p-3 rounded-xl border border-border bg-muted/20 text-xs text-foreground outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    5. Call to Action Final (Slide 4 - Engajamento)
                  </label>
                  <input
                    type="text"
                    value={customCta}
                    onChange={(e) => setCustomCta(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-border bg-muted/20 text-xs text-foreground outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    6. Foto de Capa Personalizada (Upload Opcional)
                  </label>
                  <label className="h-11 min-h-11 w-full px-4 rounded-xl border border-dashed border-border bg-muted/20 hover:bg-muted/40 text-xs font-semibold text-foreground flex items-center justify-center gap-2 cursor-pointer">
                    <Upload className="size-4" />
                    <span>Enviar Foto do Computador / Celular</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCustomImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Botões de Download PNG Real */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    disabled={isExportingPng}
                    onClick={() => handleDownloadSingleSlidePng(activeSlideIndex)}
                    className="h-11 min-h-11 w-full rounded-xl bg-foreground text-background text-xs font-bold flex items-center justify-center gap-2 hover:bg-foreground/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Download className="size-4" />
                    <span>
                      {isExportingPng
                        ? "Renderizando PNG..."
                        : `Baixar Slide 0${activeSlideIndex + 1} em Alta Resolução (.PNG)`}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={isExportingPng}
                    onClick={handleDownloadAllSlidesPng}
                    className="h-11 min-h-11 w-full rounded-xl border border-border bg-secondary text-secondary-foreground text-xs font-bold flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Download className="size-4" />
                    <span>Baixar Carrossel Completo (Todos os 4 Slides .PNG)</span>
                  </button>
                </div>
              </div>

              {/* Preview Ao Vivo do Carrossel 4 Slides (7 colunas) */}
              <div className="lg:col-span-7 flex flex-col justify-between rounded-3xl border border-border bg-muted/20 p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2, 3].map((idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveSlideIndex(idx)}
                        className={`h-11 min-h-11 px-3.5 rounded-xl text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          activeSlideIndex === idx
                            ? "bg-foreground text-background"
                            : "bg-background border border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {idx === 0 && "1. Capa (Hook)"}
                        {idx === 1 && "2. Destrinchar"}
                        {idx === 2 && "3. Impacto"}
                        {idx === 3 && "4. CTA Final"}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveSlideIndex((p) => (p > 0 ? p - 1 : 3))}
                      className="size-11 min-h-11 rounded-xl border border-border bg-background flex items-center justify-center text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Slide anterior"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSlideIndex((p) => (p < 3 ? p + 1 : 0))}
                      className="size-11 min-h-11 rounded-xl border border-border bg-background flex items-center justify-center text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Próximo slide"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Canvas Visual do Slide Ativo (Proporção 4:5 Instagram) */}
                <div
                  className={`mx-auto w-full max-w-md rounded-3xl border p-5 sm:p-6 flex flex-col justify-between gap-5 transition-colors ${studioTheme.previewBgClass}`}
                >
                  {/* Topo do Slide */}
                  <div
                    className={`rounded-2xl border px-4 py-3 flex items-center justify-between ${studioTheme.previewCardClass}`}
                  >
                    <div className="flex items-center gap-2">
                      <PrometheeWireframeDomeLogo className="size-5" />
                      <span className="text-xs font-black tracking-tight">
                        Vale Agora · Prométhée
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${studioTheme.previewBadgeClass}`}
                    >
                      0{activeSlideIndex + 1} / 04
                    </span>
                  </div>

                  {/* Corpo Dinâmico por Slide */}
                  <div
                    className={`rounded-3xl border p-5 space-y-4 ${studioTheme.previewCardClass}`}
                  >
                    {activeSlideIndex === 0 && (
                      <>
                        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-muted border border-border/40">
                          {effectiveCoverUrl ? (
                            <img
                              src={effectiveCoverUrl}
                              alt={effectiveHeadline}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full p-4 flex flex-col justify-between bg-slate-900 text-white">
                              <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                                {studioArticle.sourceOrigin}
                              </span>
                              <p className="text-xs font-medium opacity-90">
                                “{studioArticle.quote}”
                              </p>
                              <div className="h-6" />
                            </div>
                          )}
                          <div className="absolute bottom-2.5 left-2.5">
                            <span className="rounded-full border border-white/40 bg-black/70 px-3 py-1 text-xs font-semibold text-white">
                              {studioArticle.category} · {studioArticle.city}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <span className={`text-xs font-bold uppercase ${studioTheme.previewMutedClass}`}>
                            CAPA CHAMATIVA · {studioArticle.readingTime} DE LEITURA
                          </span>
                          <h3 className={`text-lg sm:text-xl font-black leading-snug ${studioTheme.previewTextClass}`}>
                            {effectiveHeadline}
                          </h3>
                          <p className={`text-xs font-semibold pt-1 ${studioTheme.previewMutedClass}`}>
                            Arraste para o lado para ver os fatos destrinchados →
                          </p>
                        </div>
                      </>
                    )}

                    {activeSlideIndex === 1 && (
                      <div className="space-y-3 py-2">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${studioTheme.previewBadgeClass}`}
                        >
                          DESTRINCHANDO A NOTÍCIA
                        </span>
                        <h3 className={`text-base sm:text-lg font-black ${studioTheme.previewTextClass}`}>
                          O que você precisa saber sobre o caso:
                        </h3>
                        <p className={`text-xs sm:text-sm leading-relaxed ${studioTheme.previewMutedClass}`}>
                          {effectiveLead}
                        </p>
                        <ul className="space-y-2 pt-2">
                          {studioArticle.bulletSummary.map((b, i) => (
                            <li
                              key={i}
                              className={`text-xs font-semibold flex items-start gap-2 ${studioTheme.previewTextClass}`}
                            >
                              <span className="font-black">0{i + 1}.</span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {activeSlideIndex === 2 && (
                      <div className="space-y-4 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${studioTheme.previewBadgeClass}`}
                        >
                          IMPACTO EM {studioArticle.city.toUpperCase()}
                        </span>
                        <blockquote
                          className={`text-base sm:text-lg font-black leading-snug ${studioTheme.previewTextClass}`}
                        >
                          “{studioArticle.quote}”
                        </blockquote>
                        <p className={`text-xs sm:text-sm leading-relaxed ${studioTheme.previewMutedClass}`}>
                          {studioArticle.body[1] || studioArticle.body[0] || effectiveLead}
                        </p>
                      </div>
                    )}

                    {activeSlideIndex === 3 && (
                      <div className="space-y-4 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${studioTheme.previewBadgeClass}`}
                        >
                          CALL TO ACTION & ENGAJAMENTO
                        </span>
                        <h3 className={`text-lg font-black leading-snug ${studioTheme.previewTextClass}`}>
                          {customCta}
                        </h3>
                        <div className={`space-y-1.5 text-xs font-semibold ${studioTheme.previewMutedClass}`}>
                          <p>• Comente sua opinião abaixo</p>
                          <p>• Salve este carrossel para consultar depois</p>
                          <p>• Compartilhe com moradores de {studioArticle.city}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rodapé do Slide */}
                  <div className="flex items-center justify-between text-xs font-bold opacity-75 px-1">
                    <span>VALE AGORA NEWS</span>
                    <span>CURADORIA REGIONAL</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: PROPOSTA COMERCIAL COMPLETA (SEM MENCIONAR WAESY) ── */}
      {isProposalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Proposta Comercial Vale Agora News"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-4xl rounded-3xl bg-background text-foreground border border-border p-6 sm:p-8 max-h-dvh overflow-y-auto space-y-6">
            <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-bold">
                  Proposta de Estruturação Tecnológica & Editorial
                </span>
                <h2 className="text-xl sm:text-3xl font-black text-foreground mt-2">
                  Ecossistema Vale Agora News · Portal & Automação Jornalística
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsProposalOpen(false)}
                className="size-11 min-h-11 rounded-full border border-border hover:bg-muted flex items-center justify-center text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Fechar proposta"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Escopo de Entregas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <CheckCircle2 className="size-4" />
                  <span>1. Design & Personalização do Portal</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Portal regional minimalista inspirado no Prométhée (mobile e desktop), com filtro por cidades do Vale, carrossel horizontal de plantão, canal participativo (+) e espaços nativos para monetização com <strong>ADS</strong>. Totalmente editável no construtor visual.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <CheckCircle2 className="size-4" />
                  <span>2. Deploy, Infraestrutura & Publicação</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Configuração completa de domínio próprio, certificado SSL, distribuição global de alta velocidade e painel administrativo de publicação imediata.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <CheckCircle2 className="size-4" />
                  <span>3. Mineradores Locais de Notícias (Filtro de Aprovação)</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Estruturação de mineradores automatizados que capturam milhares de fatos e pautas regionais diariamente. <strong>O portal público alimenta-se exclusivamente das notícias aprovadas ou publicadas pela empresa</strong> no catálogo.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <CheckCircle2 className="size-4" />
                  <span>4. Squads de IA Jornalística com DNA da Marca</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Times de agentes editoriais calibrados com a linguagem jornalística do Vale do Paraíba para padronizar títulos, calcular tempo de leitura, destacar fatos principais e aplicar o tom editorial do jornal.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-2 md:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <CheckCircle2 className="size-4" />
                    <span>5. Criador de Posts/Carrosséis Virais PNG + Evolução 6 Meses</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-foreground text-background text-xs font-bold">
                    Roadmap 6 Meses: Auto-Publicação no Instagram
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Inclui gerador integrado de carrosséis virais (Capa Chamativa → Destrinchar da Notícia → Impacto → Call to Action) com exportação em PNG de alta resolução. Em 6 meses, ativação do módulo de auto-publicação direta no Instagram.
                </p>
              </div>
            </div>

            {/* Quadro Financeiro e Condições Comerciais */}
            <div className="rounded-3xl border border-border bg-muted/30 p-6 space-y-4">
              <h3 className="text-base sm:text-lg font-black text-foreground">
                Investimento & Condições Comerciais Facilitadas
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-border bg-background p-4 space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Valor de Implantação
                  </span>
                  <p className="text-2xl font-black text-foreground">R$ 2.000,00</p>
                  <p className="text-xs text-muted-foreground">
                    Em <strong>1 + 2 parcelas</strong> de R$ 666,67 ou em até <strong>12x sem juros no cartão</strong>.
                  </p>
                </div>

                <div className="rounded-2xl border border-foreground bg-foreground text-background p-4 space-y-1">
                  <span className="text-xs font-bold uppercase opacity-80">
                    Condição Especial À Vista (15% OFF)
                  </span>
                  <p className="text-2xl font-black">R$ 1.700,00</p>
                  <p className="text-xs opacity-90">
                    Pagamento à vista via PIX com <strong>15% de desconto imediato</strong>.
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-background p-4 space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Manutenção Pós-6 Meses
                  </span>
                  <p className="text-2xl font-black text-foreground">R$ 99,90/mês</p>
                  <p className="text-xs text-muted-foreground">
                    Inicia <strong>somente após 6 meses</strong> se o portal já estiver monetizado. Se ainda não estiver monetizando, melhoramos o prazo!
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsProposalOpen(false);
                    openStudioWithArticle(articles[0]);
                  }}
                  className="h-11 min-h-11 px-5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-bold text-foreground flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Layers className="size-4" />
                  <span>Testar Estúdio de Carrosséis PNG Agora</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsProposalOpen(false)}
                  className="h-11 min-h-11 px-6 rounded-xl bg-foreground text-background text-xs font-bold hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Continuar Navegando no Portal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: PUBLICAÇÃO CIDADÃ (+ ESTILO THREADS NO FEED) ── */}
      {isCitizenPublishOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Publicar notícia ou relato no feed"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleCitizenSubmit}
            className="w-full max-w-lg rounded-3xl bg-background text-foreground border border-border p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase">
                  Canal Comunitário · Estilo Threads
                </span>
                <h3 className="text-base font-bold text-foreground">
                  Publicar Fato ou Notícia no Feed do Canal
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCitizenPublishOpen(false)}
                className="size-11 min-h-11 rounded-full border border-border hover:bg-muted flex items-center justify-center text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Fechar publicação"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                required
                value={citizenForm.title}
                onChange={(e) => setCitizenForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Manchete curta do fato ou comunicado..."
                className="w-full h-11 px-3.5 rounded-xl border border-border bg-muted/20 text-sm text-foreground outline-none"
              />

              <div className="grid grid-cols-2 gap-2.5">
                <select
                  value={citizenForm.city}
                  onChange={(e) => setCitizenForm((p) => ({ ...p, city: e.target.value }))}
                  className="h-11 px-3 rounded-xl border border-border bg-muted/20 text-xs font-semibold text-foreground outline-none"
                >
                  {VALE_CITIES.filter((c) => c !== "Notícias do Vale").map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>

                <select
                  value={citizenForm.category}
                  onChange={(e) => setCitizenForm((p) => ({ ...p, category: e.target.value }))}
                  className="h-11 px-3 rounded-xl border border-border bg-muted/20 text-xs font-semibold text-foreground outline-none"
                >
                  {PROMETHEE_TABS.filter((t) => t !== "Para você" && t !== "Salvos").map(
                    (cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <input
                type="text"
                value={citizenForm.author}
                onChange={(e) => setCitizenForm((p) => ({ ...p, author: e.target.value }))}
                placeholder="Seu nome ou identificação (opcional)"
                className="w-full h-11 px-3.5 rounded-xl border border-border bg-muted/20 text-sm text-foreground outline-none"
              />

              <textarea
                required
                rows={4}
                value={citizenForm.lead}
                onChange={(e) => setCitizenForm((p) => ({ ...p, lead: e.target.value }))}
                placeholder="Descreva os detalhes do acontecimento na sua cidade..."
                className="w-full p-3.5 rounded-xl border border-border bg-muted/20 text-sm text-foreground outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCitizenPublishOpen(false)}
                className="h-11 min-h-11 px-4 rounded-xl border border-border text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-11 min-h-11 px-5 rounded-xl bg-foreground text-background text-xs font-bold flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Send className="size-3.5" />
                <span>Publicar Agora</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  function setSelectedCategoryAndReset(tab: string) {
    setSelectedTab(tab);
    setSelectedCity("Notícias do Vale");
    setSearchQuery("");
  }
}
