import * as React from "react";
import {
  Button,
  IconButton,
  Input,
  Textarea,
  Badge,
  StatusBadge,
  Chip,
  Card,
  MetricCard,
  EntityCard,
  OfferCard,
  ActionCard,
  MediaCard,
  DataSummaryCard,
  PreviewCard,
  InteractiveCard,
  Modal,
  ConfirmationDialog,
  FormDialog,
  BottomSheet,
  SideSheet,
  CommandModal,
  DataTable,
  TableToolbar,
  DataEmptyState,
  NativeCalendarWidget,
  InChatDataTable,
  InChatApproval,
  InChatProductCarousel,
  InChatForm,
  TravelIntentCard,
  FlightOfferCard,
  FlightSearchWidget,
  TravelSearchResults,
  TravelSearchBubble,
  CategoryBubbleCarousel,
  HorizontalProductShelf,
  OfferHero,
  MediaMosaic,
  ProductCard,
  PriceBlock,
  PromoBanner,
  CustomerRow,
  LeadRow,
  ActivityTimeline,
  TaskRow,
  QuickActions,
  WorkspaceTwoPane,
  MasterDetailLayout,
  DashboardGrid,
} from "@/design-system";
import {
  Sparkles,
  Plane,
  Users,
  Briefcase,
  TrendingUp,
  Search,
  Calendar,
  Layers,
  Layout,
  Store,
  CheckCircle2,
} from "lucide-react";

export function DS4Showcase() {
  const [activeTab, setActiveTab] = React.useState<string>("foundations");

  // Modal showcase states
  const [modalOpen, setModalOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [sideSheetOpen, setSideSheetOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [interactiveSelected, setInteractiveSelected] = React.useState(true);

  // Sample data for data table
  const sampleTableData = [
    { id: "1", client: "Agência Horizonte", plan: "Enterprise", status: "active", revenue: "R$ 14.850,00" },
    { id: "2", client: "Rota das Águas", plan: "Pro", status: "pending", revenue: "R$ 4.200,00" },
    { id: "3", client: "Expedições Sul", plan: "Starter", status: "completed", revenue: "R$ 1.890,00" },
  ];

  const tableColumns = [
    { id: "client", header: "Cliente", accessorKey: "client" as const },
    { id: "plan", header: "Plano", accessorKey: "plan" as const },
    {
      id: "status",
      header: "Status",
      cell: (row: typeof sampleTableData[0]) => (
        <StatusBadge status={row.status as any} />
      ),
    },
    { id: "revenue", header: "Faturamento", accessorKey: "revenue" as const, align: "right" as const },
  ];

  return (
    <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto py-6 select-none">
      {/* Category Navigation Bar */}
      <div className="flex items-center gap-2 p-1 rounded-lg bg-muted/60 overflow-x-auto no-scrollbar no-scrollbar scrollbar-none">
        {[
          { id: "foundations", label: "Fundações & Tokens" },
          { id: "primitives", label: "Primitivos" },
          { id: "cards", label: "Famílias de Cards" },
          { id: "modals", label: "Modais & Sheets" },
          { id: "patterns", label: "Padrões de Descoberta" },
          { id: "data", label: "Tabelas & Dados" },
          { id: "travel", label: "Turismo & Voo" },
          { id: "copilot", label: "Copilot & Widgets" },
          { id: "domains", label: "Domínios (Commerce & CRM)" },
          { id: "layouts", label: "Galeria de Layouts" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-11 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === tab.id
                ? "bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. Foundations & Tokens */}
      {activeTab === "foundations" && (
        <section className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">Fundações & Tokens Semânticos</h3>
            <p className="text-xs text-muted-foreground">
              Sistema de cores acromáticas, tipografia tabular e elevação pura por borda e contraste.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border border-border/70 bg-card space-y-2">
              <div className="h-10 rounded-lg bg-background border border-border" />
              <span className="text-xs font-semibold text-foreground block">Canvas</span>
              <span className="text-2xs text-muted-foreground block font-mono">--canvas</span>
            </div>

            <div className="p-4 rounded-lg border border-border/70 bg-card space-y-2">
              <div className="h-10 rounded-lg bg-card border border-border" />
              <span className="text-xs font-semibold text-foreground block">Surface</span>
              <span className="text-2xs text-muted-foreground block font-mono">--surface</span>
            </div>

            <div className="p-4 rounded-lg border border-border/70 bg-card space-y-2">
              <div className="h-10 rounded-lg bg-muted border border-border" />
              <span className="text-xs font-semibold text-foreground block">Surface Subtle</span>
              <span className="text-2xs text-muted-foreground block font-mono">--surface-subtle</span>
            </div>

            <div className="p-4 rounded-lg border border-border/70 bg-card space-y-2">
              <div className="h-10 rounded-lg bg-primary" />
              <span className="text-xs font-semibold text-foreground block">Accent / Primary</span>
              <span className="text-2xs text-muted-foreground block font-mono">--accent</span>
            </div>
          </div>
        </section>
      )}

      {/* 2. Primitives */}
      {activeTab === "primitives" && (
        <section className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">Primitivos de Alta Fidelidade</h3>
            <p className="text-xs text-muted-foreground">
              Botões, campos, tags e controles com alvos táteis mínimos de 44px e anéis de foco acessíveis.
            </p>
          </div>

          {/* Buttons */}
          <div className="p-6 rounded-lg border border-border/70 bg-card space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Botões & Ações
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="default" data-action-intent="preview-only" data-action-reason="Especime do catalogo de componentes">Ação Primária</Button>
              <Button variant="secondary" data-action-intent="preview-only" data-action-reason="Especime do catalogo de componentes">Ação Secundária</Button>
              <Button variant="outline" data-action-intent="preview-only" data-action-reason="Especime do catalogo de componentes">Contorno</Button>
              <Button variant="ghost" data-action-intent="preview-only" data-action-reason="Especime do catalogo de componentes">Fantasma</Button>
              <Button variant="destructive" data-action-intent="preview-only" data-action-reason="Especime do catalogo de componentes">Excluir Item</Button>
              <Button isLoading loadingText="Processando" data-action-intent="preview-only" data-action-reason="Especime do catalogo de componentes">Carregando</Button>
              <IconButton icon={<Sparkles className="size-4" />} aria-label="Copilot IA" />
            </div>
          </div>

          {/* Badges & Chips */}
          <div className="p-6 rounded-lg border border-border/70 bg-card space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Badges & Status
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status="active" />
              <StatusBadge status="pending" />
              <StatusBadge status="review" />
              <StatusBadge status="completed" />
              <StatusBadge status="danger" />
              <Badge variant="ai" withDot>Copilot IA</Badge>
              <Chip isSelected count={12}>Selecionado</Chip>
              <Chip count={4}>Filtro Ativo</Chip>
            </div>
          </div>

          {/* Inputs */}
          <div className="p-6 rounded-lg border border-border/70 bg-card space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Campos de Formulário
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome do Responsável"
                placeholder="Insira o nome completo..."
                helperText="Identificação oficial do usuário."
              />
              <Input
                label="Pesquisa Rápida"
                placeholder="Buscar clientes ou pedidos..."
                leftAddon={<Search className="size-4 text-muted-foreground" />}
              />
            </div>
            <Textarea
              label="Observações da Reserva"
              placeholder="Descreva detalhes específicos da proposta..."
            />
          </div>
        </section>
      )}

      {/* 3. Cards Families (All 8 Families) */}
      {activeTab === "cards" && (
        <section className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">As 8 Famílias Especializadas de Cards</h3>
            <p className="text-xs text-muted-foreground">
              Cards com propósito semântico estrito, eliminando caixas genéricas indistintas.
            </p>
          </div>

          {/* 1. MetricCards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              label="Receita Operacional"
              value="R$ 184.250"
              delta={{ value: "+14.8%", isPositive: true, period: "vs. mês anterior" }}
              icon={<TrendingUp className="size-4 text-emerald-600" />}
            />
            <MetricCard
              label="Cotações Abertas"
              value="42"
              delta={{ value: "+5 hoje", isPositive: true }}
              icon={<Briefcase className="size-4 text-primary" />}
            />
            <MetricCard
              label="Taxa de Cancelamento"
              value="1.2%"
              delta={{ value: "-0.4%", isPositive: true, period: "estável" }}
              icon={<Users className="size-4 text-muted-foreground" />}
            />
          </div>

          {/* 2. EntityCard & 3. ActionCard */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EntityCard
              title="Hotel Resort Fazenda do Lago"
              subtitle="Santa Catarina, Brasil • 4 estrelas"
              statusSlot={<StatusBadge status="active" label="Parceiro Ouro" />}
              actionSlot={<Button variant="outline" size="sm" data-action-intent="preview-only" data-action-reason="Especime do catalogo de componentes">Ver Empresa</Button>}
            />
            <ActionCard
              title="Nova Cotação Aérea"
              description="Inicie a parametrização de trechos nacionais ou internacionais com tarifas corporativas."
              icon={<Plane className="size-5" />}
              onClick={() => {}}
            />
          </div>

          {/* 4. OfferCard & 5. MediaCard */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <OfferCard
              title="Pacote Nordeste Completo — 7 Dias em Porto de Galinhas"
              price="R$ 2.450,00"
              originalPrice="R$ 2.890,00"
              category="Turismo & Lazer"
              location="Pernambuco, Brasil"
              badgeText="Mais Vendido"
              ctaText="Ver Pacote"
              onCtaClick={() => {}}
            />
            <MediaCard
              title="Vídeo Apresentação — Rota das Emoções"
              subtitle="Expedição pelos Lençóis Maranhenses e Parnaíba"
              duration="04:22"
              badge="Full HD"
              onPlay={() => {}}
            />
          </div>

          {/* 6. DataSummaryCard, 7. PreviewCard & 8. InteractiveCard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DataSummaryCard
              title="Resumo do Período"
              category="Financeiro"
              items={[
                { label: "Total Faturado", value: "R$ 68.400", highlight: true },
                { label: "Comissões Pagas", value: "R$ 8.210" },
                { label: "Transações", value: "142" },
              ]}
              footerNote="Atualizado há 10 minutos via conciliação bancária."
            />
            <div className="space-y-4">
              <PreviewCard
                title="Voucher-Aereo-AD4210.pdf"
                fileType="PDF"
                fileSize="1.4 MB"
                updatedAt="Hoje"
                onOpen={() => {}}
              />
              <PreviewCard
                title="Contrato-Locacao-Frota.docx"
                fileType="DOCX"
                fileSize="540 KB"
                updatedAt="Ontem"
                onOpen={() => {}}
              />
            </div>
            <InteractiveCard
              title="Tarifa Flexível Plus"
              description="Inclui remarcação gratuita e 2 bagagens despachadas de 23kg."
              selected={interactiveSelected}
              onSelect={() => setInteractiveSelected(!interactiveSelected)}
              badge="Recomendada"
            >
              <div className="text-xs font-semibold text-foreground font-mono">
                + R$ 180,00 / passageiro
              </div>
            </InteractiveCard>
          </div>
        </section>
      )}

      {/* 4. Modals & Sheets */}
      {activeTab === "modals" && (
        <section className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">Sistema Completo de Diálogos & Folhas</h3>
            <p className="text-xs text-muted-foreground">
              Modais para desktop e folhas táteis (Bottom / Side Sheets) para telas móveis.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Button variant="outline" onClick={() => setModalOpen(true)}>
              Abrir Modal Central
            </Button>
            <Button variant="outline" onClick={() => setConfirmOpen(true)}>
              Diálogo de Confirmação
            </Button>
            <Button variant="outline" onClick={() => setSheetOpen(true)}>
              Abrir Bottom Sheet
            </Button>
            <Button variant="outline" onClick={() => setSideSheetOpen(true)}>
              Abrir Side Sheet
            </Button>
          </div>

          <Modal
            open={modalOpen}
            onOpenChange={setModalOpen}
            title="Detalhes da Reserva"
            description="Visualize e edite os dados operacionais da reserva."
          >
            <div className="space-y-3 text-xs">
              <p className="text-muted-foreground">
                Aqui é renderizado o conteúdo detalhado com rolagem independente e anéis de foco normativos.
              </p>
            </div>
          </Modal>

          <ConfirmationDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Cancelar Cotação?"
            description="Esta cotação não foi confirmada pelo cliente. O cancelamento arquivará a proposta."
            confirmLabel="Sim, Cancelar"
            isDestructive
            onConfirm={() => setConfirmOpen(false)}
          />

          <BottomSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            title="Ações Rápidas no Polegar"
            description="Ergonomia móvel perfeita com suporte a swipe e fechamento por toque."
          >
            <div className="space-y-2 text-xs">
              <Button className="w-full" data-action-intent="preview-only" data-action-reason="Especime do catalogo de componentes">Confirmar Seleção</Button>
            </div>
          </BottomSheet>

          <SideSheet
            open={sideSheetOpen}
            onOpenChange={setSideSheetOpen}
            title="Painel de Inspeção"
            description="Visualização lateral de atributos sem perder o contexto da tabela principal."
          >
            <div className="space-y-3 text-xs">
              <p className="text-muted-foreground">
                Painel lateral ideal para inspeção de faturas, contratos e históricos.
              </p>
            </div>
          </SideSheet>
        </section>
      )}

      {/* 5. Discovery Patterns */}
      {activeTab === "patterns" && (
        <section className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">Padrões de Descoberta & Vitrines</h3>
            <p className="text-xs text-muted-foreground">
              Carrosséis de bolha, prateleiras de produtos, heróis de oferta e mosaicos de mídia.
            </p>
          </div>

          <CategoryBubbleCarousel
            items={[
              { id: "1", label: "Praias" },
              { id: "2", label: "Serra & Frio" },
              { id: "3", label: "Ecoturismo" },
              { id: "4", label: "Resorts" },
              { id: "5", label: "Cruzeiros" },
              { id: "6", label: "Internacional" },
            ]}
            selectedId="1"
          />

          <OfferHero
            title="Temporada de Verão no Nordeste Brasileiro"
            subtitle="Condições exclusivas com voos diretos e cancelamento grátis até 7 dias antes do embarque."
            badge="Super Oferta"
            onCtaClick={() => {}}
          />

          <HorizontalProductShelf title="Em Destaque Esta Semana" subtitle="As opções mais reservadas pela comunidade">
            <div className="w-64 shrink-0">
              <OfferCard
                title="Pousada Mar Azul — Maragogi"
                price="R$ 1.890"
                category="Hospedagem"
                onCtaClick={() => {}}
              />
            </div>
            <div className="w-64 shrink-0">
              <OfferCard
                title="Passeio de Catamarã em Noronha"
                price="R$ 480"
                category="Passeios"
                onCtaClick={() => {}}
              />
            </div>
            <div className="w-64 shrink-0">
              <OfferCard
                title="Transfer Privativo Aeroporto Recife"
                price="R$ 160"
                category="Mobilidade"
                onCtaClick={() => {}}
              />
            </div>
          </HorizontalProductShelf>
        </section>
      )}

      {/* 6. Data Tables */}
      {activeTab === "data" && (
        <section className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">Sistema de Tabelas & Toolbar</h3>
            <p className="text-xs text-muted-foreground">
              Tabela empresarial de alta legibilidade com alinhamento tabular e metamorfose mobile.
            </p>
          </div>

          <TableToolbar
            searchPlaceholder="Buscar por cliente ou plano..."
            totalCount={sampleTableData.length}
            onRefresh={() => {}}
          />

          <DataTable
            columns={tableColumns}
            data={sampleTableData}
            keyExtractor={(item) => item.id}
            isSelectable
          />
        </section>
      )}

      {/* 7. Travel & Flights */}
      {activeTab === "travel" && (
        <section className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">Travel Copilot & Módulo de Turismo</h3>
            <p className="text-xs text-muted-foreground">
              Widgets inteligentes para pesquisa, exibição e seleção de voos e cotações de pacotes.
            </p>
          </div>

          <TravelSearchBubble
            route="São Paulo → Recife"
            dates="15 a 22 Nov 2026"
            passengers="2 Adultos"
          />

          <TravelIntentCard
            origin="São Paulo"
            originCode="SAO"
            destination="Recife"
            destinationCode="REC"
            dates="15 Nov - 22 Nov"
            passengers="2 Adultos"
            travelClass="Econômica"
            baggage="Mala despachada inclusa"
          />

          <FlightSearchWidget onSearch={() => {}} />

          <FlightOfferCard
            airline="Azul Linhas Aéreas"
            flightNumber="AD 4210"
            departureTime="08:35"
            departureAirport="GRU"
            arrivalTime="11:45"
            arrivalAirport="REC"
            duration="3h 10m"
            stops={0}
            baggageIncluded
            price="R$ 1.280,00"
            pricePerPerson="R$ 640 / passageiro"
            isBestOption
            onSelect={() => {}}
          />
        </section>
      )}

      {/* 8. Copilot & Widgets */}
      {activeTab === "copilot" && (
        <section className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">Copilot & Widgets Vivos</h3>
            <p className="text-xs text-muted-foreground">
              Superfície conversacional de aplicação com renderização declarativa via WidgetRegistry.
            </p>
          </div>

          <InChatApproval
            title="Aprovação de Reembolso de Voo"
            summary="Cancelamento solicitado pelo passageiro devido a alteração de malha."
            amount="R$ 1.420,00"
            metadata={[
              { label: "Localizador", value: "XZ89QA" },
              { label: "Passageiro", value: "Carlos Mendonça" },
            ]}
            onApprove={() => {}}
            onReject={() => {}}
          />

          <InChatProductCarousel
            products={[
              { id: "1", title: "Mala de Bordo Rígida 10kg", price: "R$ 380,00", category: "Acessórios" },
              { id: "2", title: "Seguro Viagem Internacional", price: "R$ 120,00", category: "Proteção" },
            ]}
          />

          <InChatForm
            title="Completar Dados do Passageiro"
            description="Preencha os campos obrigatórios para emissão do e-ticket."
            fields={[
              { id: "cpf", label: "CPF do Titular", required: true },
              { id: "birthdate", label: "Data de Nascimento", type: "date", required: true },
            ]}
            onSubmit={() => {}}
          />
        </section>
      )}

      {/* 9. Domain Libraries (Commerce, CRM, Workspace) */}
      {activeTab === "domains" && (
        <section className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">Módulos Verticais de Domínio</h3>
            <p className="text-xs text-muted-foreground">
              Componentes de comércio local, CRM de clientes e produtividade no workspace.
            </p>
          </div>

          <PromoBanner
            title="Semana do Turismo Local"
            description="Use o cupom para 10% de desconto em todas as hospedagens municipais."
            couponCode="TURISMO10"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CustomerRow
              name="Beatriz Alcantara"
              email="beatriz@alcantara.com.br"
              phone="(49) 99821-4400"
              spentTotal="R$ 12.800"
              statusBadge={<StatusBadge status="active" label="Cliente VIP" />}
            />
            <LeadRow
              title="Locação de Vans Corporativas"
              company="Metalúrgica Fronteira"
              estimatedValue="R$ 18.500"
              stageBadge={<StatusBadge status="pending" label="Em Negociação" />}
            />
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Tarefas Operacionais
            </h4>
            <TaskRow
              id="t1"
              title="Emitir voucher e apólice de seguro para localizador XZ89QA"
              category="Turismo"
              dueDate="16h"
              priority="high"
            />
            <TaskRow
              id="t2"
              title="Conciliar repasses municipais de mobilidade urbana"
              category="Financeiro"
              dueDate="Amanhã"
              completed
            />
          </div>
        </section>
      )}

      {/* 10. Layouts & Shells Gallery */}
      {activeTab === "layouts" && (
        <section className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">Galeria de Layouts & Cascas Estruturais</h3>
            <p className="text-xs text-muted-foreground">
              Topologias canônicas: Three-Pane Desktop, Two-Pane, Master-Detail, Mobile Shell e Dashboard Grid.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-border/70 bg-card space-y-3">
              <div className="flex items-center gap-2">
                <Layout className="size-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">Workspace Three-Pane</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Casca desktop com NavigationRail de 64px, MasterPanel de 320px com pesquisa e Workspace central com rolagem independente de 100dvh.
              </p>
              <div className="h-20 rounded-lg bg-muted/40 border border-border/60 flex items-stretch p-1 gap-1">
                <div className="w-6 rounded bg-primary/20 shrink-0" />
                <div className="w-16 rounded bg-card border border-border/60 shrink-0" />
                <div className="flex-1 rounded bg-background border border-border/40" />
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border/70 bg-card space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">Master-Detail Layout</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Lista mestre com 4 colunas e painel de detalhe de 8 colunas para inspeção e edição imediata sem navegações destrutivas.
              </p>
              <div className="h-20 rounded-lg bg-muted/40 border border-border/60 flex items-stretch p-1 gap-1">
                <div className="w-1/3 rounded bg-card border border-border/60 shrink-0" />
                <div className="flex-1 rounded bg-background border border-border/40" />
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
