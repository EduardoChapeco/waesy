import { VERTICAL_PLAN_CATALOG } from "@/lib/architecture/module-plan-governance";
import { resolveSubsystemBySlug } from "@/lib/vertical-subsystems";
import type {
  VerticalIsolatedModuleDTO,
  VerticalLandingPageDTO,
  VerticalLandingPlanDTO,
  VerticalLandingSectionDTO,
  VerticalMetricDTO,
} from "./vertical-landing-types";

interface NichePresetSeed {
  badge: string;
  heroTitle: string;
  heroSubtitle: string;
  nicheId: string;
  brandId: string;
  sku?: keyof typeof VERTICAL_PLAN_CATALOG;
  modules: VerticalIsolatedModuleDTO[];
  steps: Array<{ title: string; description: string }>;
  metrics: VerticalMetricDTO[];
  faqs: Array<{ question: string; answer: string }>;
}

const PRESETS: Record<string, NichePresetSeed> = {
  waesy: {
    badge: "Ecossistema Waesy",
    heroTitle: "Sistema Modular para Empresas e Cidades",
    heroSubtitle: "Opere com o Waesy Pro All-in-One ou adote subsistemas especializados isolados, com identidade e dados unificados.",
    nicheId: "generic",
    brandId: "waesy",
    sku: "waesy_bundle_pro",
    modules: [
      { id: "pro", title: "Waesy Pro ERP", category: "Gestão", description: "PDV, estoque, financeiro, contratos e CRM em painel único.", highlights: ["Multi-loja", "Pix & Caixa", "RBAC"], iconName: "Building2" },
      { id: "talk", title: "Waesy Talk CRM", category: "Atendimento", description: "WhatsApp multi-atendentes com filas, notas e IA.", highlights: ["Multi-instância", "Filas por setor", "Áudio PTT"], iconName: "MessageSquare" },
      { id: "copilot", title: "Copilot Autônomo", category: "Inteligência", description: "Agentes com plano vivo, subagentes e sandbox.", highlights: ["Navegador cloud", "Planilhas & BI", "MCP aberto"], iconName: "Bot" },
    ],
    steps: [
      { title: "1. Escolha o Sistema", description: "Adote a suíte completa ou um sistema nichado isolado." },
      { title: "2. Conecte sua Equipe", description: "Cadastre empresa, colaboradores e canais WhatsApp." },
      { title: "3. Opere e Venda", description: "Controle vendas, financeiro e publique no Hub se desejar." },
    ],
    metrics: [
      { label: "Sistemas Verticais", value: "20+", detail: "Especializados por nicho" },
      { label: "Comissão Waesy Go", value: "R$ 0,99", detail: "Taxa fixa justa por corrida" },
      { label: "Controle Master", value: "100%", detail: "CMS e RLS Zero-Trust" },
    ],
    faqs: [
      { question: "Posso usar um sistema vertical sem publicar no Marketplace?", answer: "Sim. Cada vertical SaaS opera isoladamente no próprio domínio com opt-in opcional para o Marketplace." },
      { question: "Como acesso meus módulos após criar conta?", answer: "Seu login conecta diretamente ao Workspace já filtrado apenas para os módulos do seu nicho e plano." },
    ],
  },
  turis: {
    badge: "Vertical Turismo & Viagens",
    heroTitle: "Operação Completa para Agências de Viagens",
    heroSubtitle: "Isolado para turismo receptivo, excursões e fretamento: cotações, propostas visuais, embarques, rooming list e frota 2D.",
    nicheId: "tourism",
    brandId: "turis",
    sku: "waesy_tourism_pro",
    modules: [
      { id: "quotes", title: "Cotações & Propostas Visuais", category: "Comercial", description: "Monte roteiros dia a dia com links interativos e aprovação em 1 clique.", highlights: ["Roteiro dia a dia", "Pagamento Pix", "Histórico CRM"], iconName: "Plane" },
      { id: "boarding", title: "Embarques & Rooming List", category: "Operação", description: "Controle embarques por ponto, hotéis parceiros e listas de passageiros.", highlights: ["Mapa 2D poltronas", "Lista de quartos", "Check-in QR"], iconName: "Bus" },
      { id: "vouchers", title: "Vouchers, Contratos & ANAC", category: "Jurídico", description: "Emita contratos e vouchers digitais com assinatura eletrônica e trilha auditável.", highlights: ["Regras ANAC", "Vouchers QR", "Comissões guias"], iconName: "Ticket" },
    ],
    steps: [
      { title: "1. Monte o Roteiro", description: "Cadastre pacote, saídas, hotéis e assentos da frota." },
      { title: "2. Envie a Proposta", description: "Cliente aprova e envia documentos pelo link oficial." },
      { title: "3. Embarque Seguro", description: "Gere vouchers, rooming list e confira comissões no caixa." },
    ],
    metrics: [
      { label: "Embarques", value: "Mapa 2D", detail: "Alocação exata de poltronas" },
      { label: "Contratos", value: "100% Digital", detail: "Assinatura + QR Code" },
      { label: "Vitrines", value: "Opt-In", detail: "Privado ou no Marketplace" },
    ],
    faqs: [
      { question: "O Turis exibe módulos de restaurante ou oficina?", answer: "Não. Todo o painel e os menus são isolados apenas para operação de agências e fretamento." },
      { question: "Posso usar meu próprio domínio no Turis?", answer: "Sim. Planos profissionais suportam subdomínio dedicado e domínio customizado via DNS." },
    ],
  },
  wider: {
    badge: "Vertical Gastronomia & KDS",
    heroTitle: "Cardápio Digital, Cozinha KDS e Delivery",
    heroSubtitle: "Feito exclusivamente para restaurantes, pizzarias, bares e dark kitchens com mesas, comandas e despacho a R$ 0,99.",
    nicheId: "gastronomy",
    brandId: "wider",
    sku: "waesy_gastro_delivery",
    modules: [
      { id: "menu", title: "Cardápio Digital QR & Adicionais", category: "Vendas", description: "Cardápio leve com fotos, combinações de sabores, bordas e adicionais.", highlights: ["QR na mesa", "Sem comissão abusiva", "Horários automáticos"], iconName: "UtensilsCrossed" },
      { id: "kds", title: "KDS Cozinha & Comandas", category: "Salão", description: "Pedidos do salão e delivery organizados por estação com tempo de preparo.", highlights: ["Mapa de mesas", "Impressão térmica", "Divisão de conta"], iconName: "ChefHat" },
      { id: "delivery", title: "Frota Local & Waesy Go", category: "Logística", description: "Despache entregas próprias ou chame entregadores com tarifa fixa.", highlights: ["Taxa fixa R$ 0,99", "Rastreio GPS", "Baixa de insumos"], iconName: "Truck" },
    ],
    steps: [
      { title: "1. Publique o Cardápio", description: "Organize pratos, tamanhos, bordas e insumos de ficha técnica." },
      { title: "2. Produza na Cozinha", description: "Monitores KDS ordenam pedidos de mesas e delivery ao vivo." },
      { title: "3. Entregue e Feche", description: "Despache com motoboy local e feche turnos no PDV." },
    ],
    metrics: [
      { label: "Taxa por Entrega", value: "R$ 0,99", detail: "Frota Waesy Go transparente" },
      { label: "Salão", value: "PDV + QR", detail: "Comandas e mesas ao vivo" },
      { label: "Cozinha", value: "KDS Real-time", detail: "Controle de preparo e estoque" },
    ],
    faqs: [
      { question: "O Wider controla mesas e cozinha ao mesmo tempo?", answer: "Sim. Pedidos de QR Code, garçom ou delivery chegam à mesma fila KDS com status em tempo real." },
    ],
  },
  wowbook: {
    badge: "Vertical Agenda, Beleza & Clínicas",
    heroTitle: "Agenda Inteligente para Clínicas e Salões",
    heroSubtitle: "Projetado para barbearias, salões de beleza, estética e consultórios com comissões automáticas e prontuário.",
    nicheId: "beauty_salon",
    brandId: "wowbook",
    sku: "waesy_salon_beauty",
    modules: [
      { id: "agenda", title: "Agenda por Profissional & Sala", category: "Agendamento", description: "Bloqueios, encaixes, recorrência e confirmações automáticas no WhatsApp.", highlights: ["Link de reserva 24h", "Multi-cadeiras", "Anti no-show"], iconName: "Calendar" },
      { id: "formulas", title: "Fórmulas, Anamnese & Retorno", category: "Atendimento", description: "Histórico clínico ou fórmulas químicas por cliente com lembretes de retorno.", highlights: ["Anamnese segura", "Consumo de insumos", "Clube mensal"], iconName: "HeartPulse" },
      { id: "split", title: "Rateio Salão-Parceiro & Caixa", category: "Financeiro", description: "Cálculo automático de comissões por procedimento e fechamento do dia.", highlights: ["Regra Salão-Parceiro", "Vale & repasses", "PDV rápido"], iconName: "Wallet" },
    ],
    steps: [
      { title: "1. Cadastre Profissionais", description: "Defina escalas, serviços, duração e percentuais de repasse." },
      { title: "2. Receba Agendamentos", description: "Clientes reservam pelo link direto ou via WhatsApp Talk." },
      { title: "3. Feche e Comissione", description: "Registre procedimentos, consumo de produtos e comissões." },
    ],
    metrics: [
      { label: "Confirmações", value: "WhatsApp", detail: "Lembretes pré-atendimento" },
      { label: "Repasses", value: "Automático", detail: "Rateio Salão-Parceiro nativo" },
      { label: "Fichas", value: "Prontuário", detail: "Histórico completo do cliente" },
    ],
    faqs: [
      { question: "Funciona para barbearia por assinatura e clínica?", answer: "Sim. Você seleciona o foco exato (salão, barbearia ou clínica) e o Workspace adapta toda a terminologia." },
    ],
  },
  juris: {
    badge: "Vertical Escritórios Jurídicos",
    heroTitle: "Gestão Jurídica, Prazos e Assinaturas",
    heroSubtitle: "Ambiente dedicado para advocacia e compliance: casos, prazos fatais, cofre GED e contratos de honorários.",
    nicheId: "law_firm",
    brandId: "juris",
    sku: "waesy_legal_office",
    modules: [
      { id: "cases", title: "Processos, Prazos & Diligências", category: "Jurídico", description: "Controle prazos processuais, audiências e responsáveis por cada pasta.", highlights: ["Alertas de prazo", "Agenda forense", "Timeline por caso"], iconName: "Scale" },
      { id: "ged", title: "Dossiê GED & Honorários", category: "Documentos", description: "Armazene peças com hash criptográfico e emita contratos e boletos Pix.", highlights: ["Cofre auditável", "Recorrência mensal", "CRM constituintes"], iconName: "FileSignature" },
    ],
    steps: [
      { title: "1. Abra a Pasta do Caso", description: "Vincule constituinte, parte contrária e documentos GED." },
      { title: "2. Monitore Prazos", description: "Distribua tarefas e receba lembretes de audiências e petições." },
      { title: "3. Assine Honorários", description: "Formalize contratos digitais com validade criptográfica." },
    ],
    metrics: [
      { label: "Documentos", value: "SHA-256", detail: "Integridade de arquivos GED" },
      { label: "Assinatura", value: "Biométrica", detail: "Evidência digital por envelope" },
      { label: "Financeiro", value: "Honorários", detail: "Parcelamento e caixa jurídico" },
    ],
    faqs: [{ question: "Meus dados ficam isolados de outros clientes?", answer: "Sim. Toda pasta, contato e contrato opera sob isolamento multi-tenant com RLS estrito." }],
  },
  eventio: {
    badge: "Vertical Eventos & Ingressos",
    heroTitle: "Bilheteria Digital e Check-in QR",
    heroSubtitle: "Para produtoras, feiras e casas de eventos: lotes progressivos, promoters afiliados e validação na portaria.",
    nicheId: "events",
    brandId: "eventio",
    sku: "waesy_bundle_pro",
    modules: [
      { id: "tickets", title: "Lotes, Setores & Passaportes", category: "Bilheteria", description: "Configure virada automática de lotes, camarotes e ingressos gratuitos ou pagos.", highlights: ["Virada por limite", "Pix instantâneo", "Sem filas"], iconName: "Ticket" },
      { id: "promoters", title: "Portaria QR & Promoters", category: "Operação", description: "Leitura instantânea na entrada com anti-duplicidade e comissões por link.", highlights: ["Check-in rápido", "Repasse promoter", "Painel ao vivo"], iconName: "QrCode" },
    ],
    steps: [
      { title: "1. Crie o Evento e Lotes", description: "Defina ingressos, setores, viradas e equipe de promoters." },
      { title: "2. Venda Online ou PDV", description: "Compradores recebem ingresso com QR Code antifraude na hora." },
      { title: "3. Valide na Portaria", description: "Acompanhe entradas por minuto e faturamento consolidado." },
    ],
    metrics: [
      { label: "Check-in", value: "QR Único", detail: "Bloqueio instantâneo de reuso" },
      { label: "Promoters", value: "Afiliados", detail: "Comissão automática por venda" },
      { label: "Recebimento", value: "Pix Direto", detail: "Conciliação transparente" },
    ],
    faqs: [{ question: "Posso controlar diferentes portarias ao mesmo tempo?", answer: "Sim. Cada colaborador da equipe tem acesso controlado apenas à leitura de ingressos do evento." }],
  },
  talentlink: {
    badge: "Vertical RH & Recrutamento ATS",
    heroTitle: "Recrutamento ATS e Admissão Digital",
    heroSubtitle: "Publique vagas, filtre candidatos em etapas visuais e conclua dossiê admissional, ponto e folha sem papel.",
    nicheId: "services",
    brandId: "talentlink",
    sku: "waesy_legal_office",
    modules: [
      { id: "ats", title: "Portal de Vagas & Kanban ATS", category: "Seleção", description: "Receba currículos estruturados e conduza entrevistas no mesmo fluxo.", highlights: ["Banco de talentos", "Triagem rápida", "Divulgação regional"], iconName: "Users" },
      { id: "hr", title: "Admissão Digital, Ponto & Folha", category: "Departamento Pessoal", description: "Checklists de documentos, ponto geolocalizado e fechamento de folha.", highlights: ["Zero papel", "Contratos trabalho", "Escalas equipe"], iconName: "UserCheck" },
    ],
    steps: [
      { title: "1. Publique a Vaga", description: "Abra posições com requisitos, faixa e perguntas de triagem." },
      { title: "2. Avalie Candidatos", description: "Movimente finalistas no pipeline com notas da equipe." },
      { title: "3. Admita e Gerencie", description: "Converta aprovados direto em colaboradores com contrato assinado." },
    ],
    metrics: [
      { label: "Seleção", value: "ATS Kanban", detail: "Pipeline visual de vagas" },
      { label: "Admissão", value: "Digital", detail: "Documentos e assinatura CLT" },
      { label: "RH", value: "Ponto + Folha", detail: "Operação integrada no Workspace" },
    ],
    faqs: [{ question: "Candidatos precisam pagar para enviar currículo?", answer: "Não. O envio de candidaturas pelo portal público Waesy é 100% gratuito." }],
  },
  signflow: {
    badge: "Vertical Contratos & Assinatura",
    heroTitle: "Contratos Digitais com Prova Biométrica",
    heroSubtitle: "Emita minutas parametrizadas, colha assinatura por selfie e hash SHA-256 e verifique autenticidade online.",
    nicheId: "services",
    brandId: "signflow",
    sku: "waesy_legal_office",
    modules: [
      { id: "envelopes", title: "Minutas & Envelopes em Lote", category: "Automação", description: "Crie templates com variáveis automáticas do cliente e múltiplos signatários.", highlights: ["Variáveis dinâmicas", "Link único por parte", "Status em tempo real"], iconName: "FileSignature" },
      { id: "biometrics", title: "Dossiê SHA-256 & Verificação", category: "Segurança", description: "Registro de IP, geolocalização, selfie quando exigida e certificado de validação.", highlights: ["Anti-adulteração", "Verificador QR", "Auditoria completa"], iconName: "ShieldCheck" },
    ],
    steps: [
      { title: "1. Gere a Minuta", description: "Escolha o modelo ou envie documento pronto com campos dinâmicos." },
      { title: "2. Envie aos Signatários", description: "Envie link direto por WhatsApp ou e-mail para assinatura." },
      { title: "3. Sele o Dossiê", description: "Baixe o PDF final com hashes criptográficos de auditoria." },
    ],
    metrics: [
      { label: "Integridade", value: "SHA-256", detail: "Hash por documento e selfie" },
      { label: "Fluxo", value: "1 Clique", detail: "Assinatura responsiva mobile" },
      { label: "Cofre", value: "Multi-Tenant", detail: "Arquivo organizado por cliente" },
    ],
    faqs: [{ question: "É possível validar um contrato publicamente?", answer: "Sim. Todo envelope gera código/link de validação conferindo integridade criptográfica." }],
  },
  omnipage: {
    badge: "Vertical Páginas & BioLinks",
    heroTitle: "Construtor Visual de Sites e Vitrines",
    heroSubtitle: "Lance landing pages modulares, vitrines rápidas e biolinks com formulário integrado direto ao CRM.",
    nicheId: "services",
    brandId: "omnipage",
    sku: "waesy_retail_commerce",
    modules: [
      { id: "builder", title: "Editor de Blocos Bento & Seções", category: "Design", description: "Publique seções responsivas com imagens desktop/mobile calibradas sem CLS.", highlights: ["Sem código", "SEO automático", "Carregamento rápido"], iconName: "Layout" },
      { id: "leads", title: "Captura de Leads & BioLink", category: "Conversão", description: "Cada formulário ou botão de WhatsApp registra o lead direto no funil CRM.", highlights: ["BioLink oficial", "Afiliados & UTM", "Domínio próprio"], iconName: "Globe" },
    ],
    steps: [
      { title: "1. Escolha os Blocos", description: "Combine hero, galeria, ofertas, formulários e depoimentos." },
      { title: "2. Suba suas Mídias", description: "Faça upload otimizado para desktop e celular no mesmo lugar." },
      { title: "3. Publique no Domínio", description: "Receba contatos e pedidos direto no painel." },
    ],
    metrics: [
      { label: "SEO & GEO", value: "Nativo", detail: "Schema.org e OpenGraph" },
      { label: "Velocidade", value: "Edge SSR", detail: "Servido no Cloudflare Workers" },
      { label: "Integração", value: "CRM + Pix", detail: "Leads e vendas no mesmo painel" },
    ],
    faqs: [{ question: "As páginas funcionam em domínio próprio?", answer: "Sim. Você pode apontar um domínio customizado ou usar seu endereço oficial Waesy." }],
  },
  autocenter: {
    badge: "Vertical Oficinas & Autocenters",
    heroTitle: "Ordens de Serviço por Placa e Odômetro",
    heroSubtitle: "Controle pátio automotivo, checklists com fotos de avarias, orçamento via WhatsApp e estoque de peças.",
    nicheId: "automotive",
    brandId: "waesy_studio",
    sku: "waesy_automotive_workshop",
    modules: [
      { id: "os", title: "OS Completa por Placa & Chassi", category: "Oficina", description: "Registre histórico completo do veículo, mecânico responsável e checklist de entrada.", highlights: ["Consulta por placa", "Odômetro salvo", "Fotos de vistoria"], iconName: "Car" },
      { id: "parts", title: "Estoque de Peças & Orçamento", category: "Operação", description: "Aprovação de serviços pelo cliente no WhatsApp com baixa automática de peças.", highlights: ["Baixa automática", "Comissão mecânicos", "Caixa & garantias"], iconName: "Wrench" },
    ],
    steps: [
      { title: "1. Faça o Check-in do Veículo", description: "Informe placa, quilometragem e avarias na recepção." },
      { title: "2. Envie o Orçamento", description: "Liste peças e mão de obra para aprovação instantânea do cliente." },
      { title: "3. Entregue e Fature", description: "Dê baixa automática no estoque e receba no PDV." },
    ],
    metrics: [
      { label: "Checklist", value: "Por Placa", detail: "Histórico salvo por veículo" },
      { label: "Estoque", value: "Baixa BOM", detail: "Peças descontadas na OS" },
      { label: "Equipe", value: "Comissões", detail: "Produtividade por mecânico" },
    ],
    faqs: [{ question: "Consigo separar catálogo de peças e serviços de mão de obra?", answer: "Sim. Cada OS soma produtos de estoque e serviços técnicos separadamente no total e nas comissões." }],
  },
  imobiliaria: {
    badge: "Vertical Imobiliárias & Locações",
    heroTitle: "Imóveis, Vistorias e Contratos Digitais",
    heroSubtitle: "Gerencie carteira de venda e locação, agende visitas no CRM e sele vistorias fotográficas e contratos.",
    nicheId: "real_estate",
    brandId: "waesy_studio",
    sku: "waesy_real_estate",
    modules: [
      { id: "catalog", title: "Carteira Venda & Temporada", category: "Imóveis", description: "Publique fichas técnicas com área, quartos, condomínio, mapa e fotos.", highlights: ["Busca por bairro", "Venda & Aluguel", "Destaques regionais"], iconName: "Building2" },
      { id: "inspections", title: "Vistorias & Contratos Locação", category: "Operação", description: "Laudos fotográficos de entrada/saída vinculados a contratos assinados digitalmente.", highlights: ["Checklists de cômodo", "Assinatura locador/locatário", "Repasses CRM"], iconName: "FileCheck" },
    ],
    steps: [
      { title: "1. Cadastre os Imóveis", description: "Inclua proprietário, matrícula, fotos e condições comerciais." },
      { title: "2. Agende Visitas", description: "Distribua interessados no funil para cada corretor." },
      { title: "3. Vistorie e Assine", description: "Finalize contrato e termo de vistoria digital no mesmo sistema." },
    ],
    metrics: [
      { label: "Laudos", value: "Vistoria 360", detail: "Fotos por ambiente datadas" },
      { label: "CRM", value: "Corretores", detail: "Pipeline de propostas e visitas" },
      { label: "Contratos", value: "Digitais", detail: "Assinatura eletrônica integrada" },
    ],
    faqs: [{ question: "Posso ocultar imóveis privados da vitrine pública?", answer: "Sim. Você controla quais imóveis aparecem apenas para sua carteira e quais vão ao portal." }],
  },
  store: {
    badge: "Vertical Lojas & Varejo",
    heroTitle: "PDV Ágil, Estoque em Grade e Vitrine Online",
    heroSubtitle: "Controle variações de cor, tamanho e código EAN, opere frente de caixa ágil e receba pedidos locais.",
    nicheId: "retail",
    brandId: "waesy_studio",
    sku: "waesy_retail_commerce",
    modules: [
      { id: "stock", title: "Catálogo com Grades & EAN", category: "Estoque", description: "Gerencie combinações de tamanho, cor, código de barras e alertas de reposição.", highlights: ["Múltiplas grades", "Custo e margem", "Inventário rápido"], iconName: "Package" },
      { id: "pdv", title: "Caixa PDV & Vitrine da Loja", category: "Vendas", description: "Frente de caixa com código de barras, turnos de operadores e despacho local.", highlights: ["Turnos & sangria", "Vitrine integrada", "Entrega Waesy Go"], iconName: "ShoppingBag" },
    ],
    steps: [
      { title: "1. Importe seu Catálogo", description: "Organize categorias, preços, variações e estoque inicial." },
      { title: "2. Venda no Balcão ou Online", description: "Pedidos e vendas do PDV compartilham o mesmo saldo." },
      { title: "3. Controle Margem e Caixa", description: "Feche turnos com visão clara de pagamentos e lucro." },
    ],
    metrics: [
      { label: "Estoque", value: "Grades + EAN", detail: "Atualização em tempo real" },
      { label: "PDV", value: "Multi-Turno", detail: "Abertura e fechamento seguro" },
      { label: "Canal", value: "Loja + Online", detail: "Mesmo estoque unificado" },
    ],
    faqs: [{ question: "O Waesy Store suporta variações de tamanho e cor com código EAN?", answer: "Sim. Produtos suportam grades combinadas, SKU próprio e código de barras." }],
  },
  mercado: {
    badge: "Vertical Supermercados & Mercearias",
    heroTitle: "PDV de Caixa Rápido, Balança, Lotes e Delivery",
    heroSubtitle: "Operação completa para mercados, hortifrutis, açougues e mercearias com itens pesáveis, validade de lotes e entregas Waesy Go.",
    nicheId: "retail",
    brandId: "waesy_studio",
    sku: "waesy_retail_commerce",
    modules: [
      { id: "weighable", title: "Produtos Pesáveis & Balança PDV", category: "Frente de Caixa", description: "Venda por quilo/grama com código de balança, ajuste de separação e leitura EAN instantânea.", highlights: ["Itens por quilo", "Ajuste de balança", "Caixa rápido"], iconName: "ShoppingBag" },
      { id: "batches", title: "Controle de Lotes, Validade & Encartes", category: "Estoque", description: "Monitore vencimento de perecíveis, giro de gôndola e publique ofertas do dia.", highlights: ["Alerta de validade", "Encartes digitais", "Entrega Waesy Go"], iconName: "Package" },
    ],
    steps: [
      { title: "1. Cadastre Secos e Perecíveis", description: "Configure produtos por unidade ou peso (kg/g) e validade de lotes." },
      { title: "2. Opere Caixa e Separação", description: "Passe compras no PDV ou separe pedidos online com ajuste real de peso." },
      { title: "3. Despache no Bairro", description: "Entregue compras de mercado com frota própria ou Waesy Go." },
    ],
    metrics: [
      { label: "Pesáveis", value: "Kg + Balança", detail: "Ajuste exato na separação" },
      { label: "Perecíveis", value: "Lote & Validade", detail: "Prevenção de perdas" },
      { label: "Delivery", value: "R$ 0,99", detail: "Taxa fixa Waesy Go" },
    ],
    faqs: [{ question: "O Waesy Mercado suporta produtos vendidos por quilo com variação de peso na separação?", answer: "Sim. Você pode operar por faixas de 100g ou ajuste exato de balança antes da entrega." }],
  },
};

function buildPlansForSeed(displayName: string, seed: NichePresetSeed): VerticalLandingPlanDTO[] {
  const catalogSku = seed.sku ? VERTICAL_PLAN_CATALOG[seed.sku] : VERTICAL_PLAN_CATALOG.waesy_retail_commerce;
  const starterPrice = Math.max(7900, Math.round(catalogSku.monthlyPriceCents * 0.65));
  const proPrice = catalogSku.monthlyPriceCents;
  const entPrice = Math.max(proPrice + 12000, VERTICAL_PLAN_CATALOG.waesy_bundle_pro.monthlyPriceCents);

  return [
    {
      id: `${seed.brandId}-starter`,
      sku: catalogSku.sku,
      name: `${displayName} Essencial`,
      badge: "Início Rápido",
      tagline: `Módulos base de ${displayName} para operar imediatamente.`,
      monthlyPriceCents: starterPrice,
      annualPriceCents: Math.round(starterPrice * 12 * 0.8),
      isFeatured: false,
      ctaLabel: "Começar Essencial",
      features: seed.modules.slice(0, 2).map((m) => m.title),
      limits: ["Até 3 usuários", "1 canal WhatsApp", "Suporte padrão"],
    },
    {
      id: `${seed.brandId}-pro`,
      sku: catalogSku.sku,
      name: `${displayName} Profissional`,
      badge: "Mais Escolhido",
      tagline: catalogSku.tagline,
      monthlyPriceCents: proPrice,
      annualPriceCents: catalogSku.annualPriceCents,
      isFeatured: true,
      ctaLabel: "Assinar Profissional",
      features: [...seed.modules.map((m) => m.title), "Financeiro & Caixa", "Automações WhatsApp"],
      limits: [
        `Até ${catalogSku.limits.maxTeamMembers} usuários`,
        `${catalogSku.limits.maxWhatsappInstances} canais WhatsApp`,
        `${catalogSku.limits.maxMonthlyAiCalls} execuções IA/mês`,
      ],
    },
    {
      id: `${seed.brandId}-enterprise`,
      sku: "waesy_bundle_pro",
      name: `${displayName} Enterprise`,
      badge: "Multi-Filiais",
      tagline: "Operação expandida com equipe ilimitada, Copilot avançado e múltiplas unidades.",
      monthlyPriceCents: entPrice,
      annualPriceCents: Math.round(entPrice * 12 * 0.8),
      isFeatured: false,
      ctaLabel: "Contratar Enterprise",
      features: [...seed.modules.map((m) => m.title), "Copilot IA & Subagentes", "Multi-filiais + API"],
      limits: ["Equipe ilimitada", "Canais WhatsApp expandidos", "Gerência dedicada"],
    },
  ];
}

export function buildDefaultVerticalLanding(slugInput?: string | null): VerticalLandingPageDTO {
  const cleanSlug = (slugInput || "waesy").trim().toLowerCase();
  const sub = resolveSubsystemBySlug(cleanSlug) || resolveSubsystemBySlug("waesy")!;
  const seed = PRESETS[sub.id] || {
    badge: sub.shortName,
    heroTitle: sub.name,
    heroSubtitle: `${sub.description} ${sub.howItWorks}`,
    nicheId: sub.primaryNicheId || "generic",
    brandId: sub.brandVerticalId || "waesy",
    sku: (sub.defaultVerticalSku as keyof typeof VERTICAL_PLAN_CATALOG) || "waesy_bundle_pro",
    modules: sub.modulesIncluded.map((modKey, idx) => ({
      id: modKey,
      title: modKey.replace(/^module_/, "").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      category: idx === 0 ? "Núcleo do Sistema" : "Módulo Conectado",
      description: `Recurso dedicado do módulo ${sub.shortName} dentro da arquitetura isolada do subsistema.`,
      highlights: ["Permissões RBAC", "Sincronização em tempo real", "Integrado ao Hub Waesy"],
      iconName: "Layers",
    })),
    steps: [
      { title: "1. Acesse sua Conta", description: `Entre ou crie seu acesso diretamente pelo portal ${sub.shortName}.` },
      { title: "2. Configure seu Perfil", description: "Personalize recursos, equipe e regras operacionais." },
      { title: "3. Opere ao Vivo", description: `Utilize ${sub.shortName} isolado ou conectado aos demais apps Waesy.` },
    ],
    metrics: [
      { label: "Subdomínio Oficial", value: sub.canonicalDomain, detail: "Domínio isolado próprio" },
      { label: "Módulos Inclusos", value: `${sub.modulesIncluded.length}`, detail: "Apenas recursos deste sistema" },
      { label: "Hub Waesy", value: sub.isStandaloneApp ? "Integrado" : "Central", detail: "Identidade única segura" },
    ],
    faqs: [
      {
        question: `Como funciona o acesso isolado ao ${sub.shortName}?`,
        answer: `${sub.howItWorks} Todo o fluxo de login e cadastro direciona automaticamente para este ambiente.`,
      },
      {
        question: "Posso editar imagens, seções e planos desta página?",
        answer: "Sim. O Admin Master controla textos, seções visuais, uploads de imagem/vídeo e pacotes em tempo real.",
      },
    ],
  };

  const displayName = sub.shortName || sub.name;
  const sections: VerticalLandingSectionDTO[] = [
    {
      id: `default-${sub.id}-workflow`,
      landing_slug: sub.id,
      section_type: "workflow_steps",
      title: `Como o ${displayName} Funciona`,
      subtitle: "Fluxo operacional direto sem etapas sobrando.",
      badge_tag: "Fluxo do Nicho",
      body: null,
      media_desktop_url: null,
      media_mobile_url: null,
      video_url: null,
      cta_label: null,
      cta_href: null,
      items_json: seed.steps,
      layout_variant: "grid_3",
      sort_order: 10,
      is_active: true,
    },
  ];

  return {
    slug: sub.id,
    subsystem_id: sub.id,
    brand_vertical_id: seed.brandId,
    niche_id: seed.nicheId,
    vertical_sku: seed.sku || "waesy_retail_commerce",
    display_name: sub.name,
    tagline: sub.description,
    badge_label: seed.badge,
    hero_title: seed.heroTitle,
    hero_subtitle: seed.heroSubtitle,
    hero_cta_label: sub.category === "public_app" ? `Abrir ${sub.shortName}` : `Começar no ${sub.shortName}`,
    hero_cta_secondary_label: "Entrar no Painel",
    hero_image_desktop_url: null,
    hero_image_mobile_url: null,
    hero_video_url: null,
    login_split_image_url: null,
    logo_url: null,
    isolated_modules: seed.modules,
    plans: buildPlansForSeed(displayName, seed),
    faq_items: seed.faqs,
    metrics_items: seed.metrics,
    sections,
    is_published: true,
  };
}
