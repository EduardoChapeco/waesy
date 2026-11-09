import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Users,
  Plus,
  Trash2,
  ShieldCheck,
  Bot,
  Car,
  Plane,
  ShoppingBag,
  CheckCircle2,
  Loader2,
  UserCheck,
  Layers,
} from 'lucide-react'
import { saveWhatsAppGovernanceConfig } from '@/services/whatsapp-channel-instances.functions'

export interface DepartmentItem {
  id: string
  name: string
  slug: string
  colorToken: 'emerald' | 'blue' | 'amber' | 'purple' | 'rose'
  routingMode: 'round_robin' | 'least_busy' | 'manual_queue' | 'ai_sdr_first'
  assignedAgentIds: string[]
  aiSdrEnabled: boolean
  aiSdrSkillPrompt: string
  autoGreetingMessage: string; scheduleStart?: string; scheduleEnd?: string; scheduleDays?: string; awayMessage?: string; whatsappInstanceId?: string; aiTriageStages?: Array<{ id: string; title: string; instruction: string; handoffToHuman: boolean }>; }
export interface AgentPermissionItem { agentId: string; name?: string; whatsappInstanceId?: string; onlyAssignedOrSector: boolean; canTransfer: boolean; canCloseTicket: boolean; canManageQr: boolean;
}

export interface GovernanceConfigState {
  onlyManagersCanViewQr: boolean
  onlyManagersCanDisconnect: boolean
  showAgentNamePrefixInMessages: boolean
  autoConvertIncomingToLead: boolean
  enableMobilityBookingBot: boolean
  enableCatalogSalesBot: boolean
  enableCorporateTravelBot: boolean
  departments: DepartmentItem[]
  agentPermissions?: AgentPermissionItem[]
}

interface WhatsAppTeamSectorsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  instanceId?: string
  initialConfig?: Partial<GovernanceConfigState>
  availableAgents?: Array<{ id: string; name: string; role: string }>
  availableInstances?: Array<{ id: string; displayName: string; phone?: string | null }>
  onSaved?: (config: GovernanceConfigState) => void
}

const DEFAULT_DEPARTMENTS: DepartmentItem[] = [
  {
    id: 'dept-vendas',
    name: 'Comercial & Vendas',
    slug: 'vendas',
    colorToken: 'emerald',
    routingMode: 'ai_sdr_first',
    assignedAgentIds: [],
    aiSdrEnabled: true,
    aiSdrSkillPrompt: 'Qualificar lead, apresentar catálogo de ofertas e fechar pedido.',
    autoGreetingMessage: 'Olá! Você está no setor Comercial. Como posso ajudar hoje?',
  },
  {
    id: 'dept-suporte',
    name: 'Suporte & Pós-Venda',
    slug: 'suporte',
    colorToken: 'blue',
    routingMode: 'round_robin',
    assignedAgentIds: [],
    aiSdrEnabled: true,
    aiSdrSkillPrompt: 'Resolver dúvidas de pedidos, rastreio e garantia.',
    autoGreetingMessage: 'Olá! Nosso time de Suporte já recebeu sua mensagem.',
  },
  {
    id: 'dept-mobilidade',
    name: 'Central Mobilidade & Entregas',
    slug: 'mobilidade',
    colorToken: 'amber',
    routingMode: 'ai_sdr_first',
    assignedAgentIds: [],
    aiSdrEnabled: true,
    aiSdrSkillPrompt: 'Cotar corrida ou frete via pino de localização e despachar motorista.',
    autoGreetingMessage: 'Envie sua localização atual e o destino para cotar sua corrida.',
  },
  {
    id: 'dept-viagens',
    name: 'Passagens Aéreas & Corporativo',
    slug: 'viagens',
    colorToken: 'purple',
    routingMode: 'ai_sdr_first',
    assignedAgentIds: [],
    aiSdrEnabled: true,
    aiSdrSkillPrompt: 'Cotar voos, pacotes turísticos e hospedagens corporativas.',
    autoGreetingMessage: 'Informe origem, destino e datas para cotarmos sua viagem.',
  },
]

export function WhatsAppTeamSectorsDrawer({
  open,
  onOpenChange,
  companyId,
  instanceId,
  initialConfig,
  availableAgents = [], availableInstances = [],
  onSaved,
}: WhatsAppTeamSectorsDrawerProps) {
  const [activeSection, setActiveSection] = useState<'sectors' | 'triage' | 'agents' | 'rbac' | 'concierge'>('sectors')
  const [agentPermissions, setAgentPermissions] = useState<Record<string, AgentPermissionItem>>(() => { const map: Record<string, AgentPermissionItem> = {}; for (const ap of initialConfig?.agentPermissions || []) map[ap.agentId] = ap; return map; })
  const [isSaving, setIsSaving] = useState(false)

  const [onlyManagersCanViewQr, setOnlyManagersCanViewQr] = useState(
    initialConfig?.onlyManagersCanViewQr ?? true,
  )
  const [onlyManagersCanDisconnect, setOnlyManagersCanDisconnect] = useState(
    initialConfig?.onlyManagersCanDisconnect ?? true,
  )
  const [showAgentNamePrefixInMessages, setShowAgentNamePrefixInMessages] = useState(
    initialConfig?.showAgentNamePrefixInMessages ?? true,
  )
  const [autoConvertIncomingToLead, setAutoConvertIncomingToLead] = useState(
    initialConfig?.autoConvertIncomingToLead ?? true,
  )
  const [enableMobilityBookingBot, setEnableMobilityBookingBot] = useState(
    initialConfig?.enableMobilityBookingBot ?? true,
  )
  const [enableCatalogSalesBot, setEnableCatalogSalesBot] = useState(
    initialConfig?.enableCatalogSalesBot ?? true,
  )
  const [enableCorporateTravelBot, setEnableCorporateTravelBot] = useState(
    initialConfig?.enableCorporateTravelBot ?? true,
  )

  const [departments, setDepartments] = useState<DepartmentItem[]>(
    initialConfig?.departments && initialConfig.departments.length > 0
      ? initialConfig.departments
      : DEFAULT_DEPARTMENTS,
  )

  const [newDeptName, setNewDeptName] = useState('')
  const [newDeptRouting, setNewDeptRouting] = useState<DepartmentItem['routingMode']>('round_robin')

  const handleAddDepartment = () => {
    if (!newDeptName.trim()) {
      toast.error('Informe o nome do setor ou fila.')
      return
    }
    const slug = newDeptName
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')

    const nextDept: DepartmentItem = {
      id: `dept-${Date.now()}`,
      name: newDeptName.trim(),
      slug,
      colorToken: 'emerald',
      routingMode: newDeptRouting,
      assignedAgentIds: [],
      aiSdrEnabled: true,
      aiSdrSkillPrompt: '',
      autoGreetingMessage: `Olá! Você foi conectado ao setor ${newDeptName.trim()}.`,
      scheduleStart: '08:00',
      scheduleEnd: '18:00',
      scheduleDays: 'Seg a Sex',
      awayMessage: 'Nosso setor está fora do horário de expediente. Retornaremos no próximo turno.',
      whatsappInstanceId: instanceId || '',
      aiTriageStages: [
        { id: 'st-1', title: '1. Recepção IA', instruction: 'Recepcionar cliente, identificar demanda e responder dúvidas rápidas.', handoffToHuman: false },
        { id: 'st-2', title: '2. Qualificação', instruction: 'Coletar dados essenciais do pedido ou chamado.', handoffToHuman: false },
        { id: 'st-3', title: '3. Passagem p/ Humano', instruction: 'Transferir para atendente do setor com resumo e pausar IA.', handoffToHuman: true },
      ],
    }
    setDepartments((prev) => [...prev, nextDept])
    setNewDeptName('')
    toast.success('Setor adicionado à fila de atendimento.')
  }

  const handleRemoveDepartment = (id: string) => {
    setDepartments((prev) => prev.filter((d) => d.id !== id))
  }

  const handleToggleAgentInDept = (deptId: string, agentId: string) => {
    setDepartments((prev) =>
      prev.map((d) => {
        if (d.id !== deptId) return d
        const exists = d.assignedAgentIds.includes(agentId)
        return {
          ...d,
          assignedAgentIds: exists
            ? d.assignedAgentIds.filter((a) => a !== agentId)
            : [...d.assignedAgentIds, agentId],
        }
      }),
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const payload: GovernanceConfigState = {
        onlyManagersCanViewQr,
        onlyManagersCanDisconnect,
        showAgentNamePrefixInMessages,
        autoConvertIncomingToLead,
        enableMobilityBookingBot,
        enableCatalogSalesBot,
        enableCorporateTravelBot,
        departments,
      }
      if (true) {
        await saveWhatsAppGovernanceConfig({
          data: {
            ...(instanceId ? { instanceId } : {}),
            agentPermissions: Object.values(agentPermissions),
            departments: departments.map((d) => ({
              id: d.id,
              name: d.name,
              description: d.aiSdrSkillPrompt || d.autoGreetingMessage,
              color: d.colorToken,
              instanceIds: [instanceId],
              assignedAgentIds: d.assignedAgentIds,
              roundRobinEnabled: d.routingMode === 'round_robin',
              aiSdrEnabled: d.aiSdrEnabled,
              slaMinutes: 15, scheduleStart: d.scheduleStart || '08:00', scheduleEnd: d.scheduleEnd || '18:00', scheduleDays: d.scheduleDays || 'Seg a Sex', awayMessage: d.awayMessage || '', whatsappInstanceId: d.whatsappInstanceId || instanceId || '', aiTriageStages: d.aiTriageStages || [],
            })),
            permissions: {
              onlyManagersCanViewQr,
              onlyManagersCanDisconnect,
              showAgentNamePrefixInMessages,
              autoConvertIncomingToLead,
              defaultLeadSource: 'WhatsApp Orgânico',
              enableMobilityBookingBot,
              enableCatalogSalesBot,
              enableCorporateTravelBot,
            },
          },
        })
      }
      toast.success('Governança, setores e permissões do WhatsApp salvos.')
      onSaved?.(payload)
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar configurações.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto pt-safe-modal pb-32 pb-safe">
        <SheetHeader className="pb-4 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Layers className="size-5" />
            </div>
            <div>
              <SheetTitle className="text-base font-bold">
                Setores, Atendentes & Governança
              </SheetTitle>
              <SheetDescription className="text-xs">
                Gerencie filas de distribuição, permissões RBAC de QR Code e canais assistidos por IA.
              </SheetDescription>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 rounded-xl bg-muted p-1 mt-3">
            <button
              type="button"
              onClick={() => setActiveSection('sectors')}
              className={`flex h-11 min-h-11 items-center justify-center gap-2 rounded-lg text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
                activeSection === 'sectors'
                  ? 'bg-background text-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="size-3.5" />
              Setores ({departments.length})
            </button>
            <button type="button" onClick={() => setActiveSection('triage')} className={`flex h-11 min-h-11 items-center justify-center gap-1 rounded-lg text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary ${activeSection === 'triage' ? 'bg-background text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}`}>IA & Etapas</button>
            <button type="button" onClick={() => setActiveSection('agents')} className={`flex h-11 min-h-11 items-center justify-center gap-1 rounded-lg text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary ${activeSection === 'agents' ? 'bg-background text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}`}>Atendentes</button>
            <button type="button" className="hidden" onClick={() => {}}>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('rbac')}
              className={`flex h-11 min-h-11 items-center justify-center gap-2 rounded-lg text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
                activeSection === 'rbac'
                  ? 'bg-background text-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShieldCheck className="size-3.5" />
              Permissões RBAC
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('concierge')}
              className={`flex h-11 min-h-11 items-center justify-center gap-2 rounded-lg text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
                activeSection === 'concierge'
                  ? 'bg-background text-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Bot className="size-3.5" />
              Bots & Concierge
            </button>
          </div>
        </SheetHeader>

        <div className="py-5 space-y-5">
          {activeSection === 'sectors' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
                <p className="text-xs font-semibold text-foreground">Criar Novo Setor / Fila</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    placeholder="Ex: Financeiro, Locação..."
                    className="h-11 text-xs sm:col-span-2"
                  />
                  <select
                    value={newDeptRouting}
                    onChange={(e) =>
                      setNewDeptRouting(e.target.value as DepartmentItem['routingMode'])
                    }
                    className="h-11 rounded-md border border-input bg-background px-3 text-xs focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="ai_sdr_first">IA SDR + Transbordo</option>
                    <option value="round_robin">Rodízio (Round-Robin)</option>
                    <option value="least_busy">Menos Ocupado</option>
                    <option value="manual_queue">Fila Manual</option>
                  </select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddDepartment}
                  className="h-11 min-h-11 w-full text-xs font-semibold gap-2 focus-visible:ring-2"
                >
                  <Plus className="size-4" />
                  Adicionar Setor de Atendimento
                </Button>
              </div>

              <div className="space-y-3">
                {departments.map((dept) => (
                  <div
                    key={dept.id}
                    className="rounded-xl border border-border/70 bg-background p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs font-semibold">
                          #{dept.slug}
                        </Badge>
                        <span className="text-sm font-bold text-foreground">{dept.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={dept.routingMode}
                          onChange={(e) =>
                            setDepartments((prev) =>
                              prev.map((d) =>
                                d.id === dept.id
                                  ? {
                                      ...d,
                                      routingMode: e.target.value as DepartmentItem['routingMode'],
                                    }
                                  : d,
                              ),
                            )
                          }
                          className="h-11 rounded-md border border-input bg-muted/40 px-3 text-xs focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <option value="ai_sdr_first">IA SDR Primeiro</option>
                          <option value="round_robin">Round-Robin</option>
                          <option value="least_busy">Menos Ocupado</option>
                          <option value="manual_queue">Fila Manual</option>
                        </select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveDepartment(dept.id)}
                          className="size-11 text-muted-foreground hover:text-destructive focus-visible:ring-2"
                          aria-label={`Remover setor ${dept.name}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                      <Label className="text-xs text-muted-foreground">Diretriz da IA e Horário do Setor</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <Input value={dept.scheduleDays || 'Seg a Sex'} onChange={(e) => setDepartments((prev) => prev.map((d) => d.id === dept.id ? { ...d, scheduleDays: e.target.value } : d))} placeholder="Dias (Seg a Sex)" className="h-11 text-xs" />
                        <Input type="time" value={dept.scheduleStart || '08:00'} onChange={(e) => setDepartments((prev) => prev.map((d) => d.id === dept.id ? { ...d, scheduleStart: e.target.value } : d))} className="h-11 text-xs" />
                        <Input type="time" value={dept.scheduleEnd || '18:00'} onChange={(e) => setDepartments((prev) => prev.map((d) => d.id === dept.id ? { ...d, scheduleEnd: e.target.value } : d))} className="h-11 text-xs" />
                        <select value={dept.whatsappInstanceId || instanceId || ''} onChange={(e) => setDepartments((prev) => prev.map((d) => d.id === dept.id ? { ...d, whatsappInstanceId: e.target.value } : d))} className="h-11 rounded-md border border-input bg-background px-2 text-xs focus-visible:ring-2 focus-visible:ring-primary">
                          <option value="">WhatsApp Padrão</option>
                          {availableInstances.map((inst) => (<option key={inst.id} value={inst.id}>{inst.displayName} {inst.phone ? `(${inst.phone})` : ''}</option>))}
                        </select>
                      </div>
                      <Input value={dept.awayMessage || ''} onChange={(e) => setDepartments((prev) => prev.map((d) => d.id === dept.id ? { ...d, awayMessage: e.target.value } : d))} placeholder="Mensagem automática fora do horário deste setor..." className="h-11 text-xs" />
                      <Label className="text-xs text-muted-foreground block pt-1">
                        Diretriz da IA SDR neste setor
                      </Label>
                      <Input
                        value={dept.aiSdrSkillPrompt}
                        onChange={(e) =>
                          setDepartments((prev) =>
                            prev.map((d) =>
                              d.id === dept.id ? { ...d, aiSdrSkillPrompt: e.target.value } : d,
                            ),
                          )
                        }
                        placeholder="Ex: Qualificar pedido, enviar catálogo e coletar CEP..."
                        className="h-11 text-xs"
                      />
                    </div>

                    {availableAgents.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <Label className="text-xs text-muted-foreground">
                          Atendentes escalados nesta fila ({dept.assignedAgentIds.length})
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {availableAgents.map((agent) => {
                            const selected = dept.assignedAgentIds.includes(agent.id)
                            return (
                              <button
                                key={agent.id}
                                type="button"
                                onClick={() => handleToggleAgentInDept(dept.id, agent.id)}
                                className={`flex h-11 min-h-11 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
                                  selected
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                <UserCheck className="size-3.5" />
                                {agent.name}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'triage' && (
            <div className="space-y-4">
              {departments.map((dept) => {
                const stages = dept.aiTriageStages && dept.aiTriageStages.length > 0 ? dept.aiTriageStages : [
                  { id: 'st-1', title: 'Etapa 1: Recepção IA', instruction: 'Recepcionar cliente, entender o que ele deseja e responder dúvidas imediatas.', handoffToHuman: false },
                  { id: 'st-2', title: 'Etapa 2: Qualificação', instruction: 'Coletar dados essenciais (pedido, CPF ou item desejado).', handoffToHuman: false },
                  { id: 'st-3', title: 'Etapa 3: Passagem p/ Humano', instruction: 'Transferir para atendente do setor com resumo da conversa e pausar IA.', handoffToHuman: true },
                ];
                return (
                  <div key={dept.id} className="rounded-xl bg-muted/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">{dept.name}</span>
                      <Badge variant="secondary" className="text-xs">IA Atende 1º → Humano Assume</Badge>
                    </div>
                    <div className="space-y-2">
                      {stages.map((st, idx) => (
                        <div key={st.id} className="rounded-lg bg-card p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-foreground">{st.title}</span>
                            <Badge variant={st.handoffToHuman ? 'default' : 'secondary'} className="text-xs">{st.handoffToHuman ? 'Transfere p/ Humano' : 'Automático IA'}</Badge>
                          </div>
                          <Input
                            value={st.instruction}
                            onChange={(e) => {
                              const nextStages = stages.map((item, i) => i === idx ? { ...item, instruction: e.target.value } : item);
                              setDepartments((prev) => prev.map((d) => d.id === dept.id ? { ...d, aiTriageStages: nextStages } : d));
                            }}
                            className="h-11 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeSection === 'agents' && (
            <div className="space-y-3">
              {availableAgents.length === 0 ? (
                <div className="rounded-xl bg-muted/40 p-6 text-center text-xs text-muted-foreground">Nenhum atendente cadastrado na equipe.</div>
              ) : (
                availableAgents.map((agent) => {
                  const perm = agentPermissions[agent.id] || { agentId: agent.id, name: agent.name, whatsappInstanceId: '', onlyAssignedOrSector: false, canTransfer: true, canCloseTicket: true, canManageQr: false };
                  const updatePerm = (patch: Partial<AgentPermissionItem>) => setAgentPermissions((prev) => ({ ...prev, [agent.id]: { ...perm, ...patch } }));
                  return (
                    <div key={agent.id} className="rounded-xl bg-muted/40 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-foreground">{agent.name}</p>
                          <p className="text-xs text-muted-foreground uppercase">{agent.role}</p>
                        </div>
                        <select
                          value={perm.whatsappInstanceId || ''}
                          onChange={(e) => updatePerm({ whatsappInstanceId: e.target.value })}
                          className="h-11 rounded-lg border border-input bg-background px-3 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <option value="">WhatsApp Geral da Loja</option>
                          {availableInstances.map((inst) => (<option key={inst.id} value={inst.id}>Vincular: {inst.displayName} {inst.phone ? `(${inst.phone})` : ''}</option>))}
                        </select>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        <button type="button" onClick={() => updatePerm({ onlyAssignedOrSector: !perm.onlyAssignedOrSector })} className={`h-11 min-h-11 rounded-lg px-3 text-xs font-semibold flex items-center justify-between cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ${perm.onlyAssignedOrSector ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'}`}>
                          <span>Restrito ao Setor</span>
                          <span>{perm.onlyAssignedOrSector ? 'Sim' : 'Não'}</span>
                        </button>
                        <button type="button" onClick={() => updatePerm({ canTransfer: !perm.canTransfer })} className={`h-11 min-h-11 rounded-lg px-3 text-xs font-semibold flex items-center justify-between cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ${perm.canTransfer ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'}`}>
                          <span>Transferir Chat</span>
                          <span>{perm.canTransfer ? 'Sim' : 'Não'}</span>
                        </button>
                        <button type="button" onClick={() => updatePerm({ canCloseTicket: !perm.canCloseTicket })} className={`h-11 min-h-11 rounded-lg px-3 text-xs font-semibold flex items-center justify-between cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ${perm.canCloseTicket ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'}`}>
                          <span>Fechar Ticket</span>
                          <span>{perm.canCloseTicket ? 'Sim' : 'Não'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeSection === 'rbac' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-border/70 p-4">
                <div className="space-y-1 pr-4">
                  <p className="text-sm font-semibold text-foreground">
                    Restringir visualização do QR Code a Gestores/Admins
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Operadores e atendentes atendem normalmente na fila, mas não podem parear novos aparelhos.
                  </p>
                </div>
                <Switch
                  checked={onlyManagersCanViewQr}
                  onCheckedChange={setOnlyManagersCanViewQr}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/70 p-4">
                <div className="space-y-1 pr-4">
                  <p className="text-sm font-semibold text-foreground">
                    Bloquear desconexão de instância por operadores
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Somente proprietários e gerentes da empresa podem desconectar sessões de WhatsApp ativas.
                  </p>
                </div>
                <Switch
                  checked={onlyManagersCanDisconnect}
                  onCheckedChange={setOnlyManagersCanDisconnect}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/70 p-4">
                <div className="space-y-1 pr-4">
                  <p className="text-sm font-semibold text-foreground">
                    Identificar nome do atendente nas mensagens enviadas
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Adiciona o prefixo em negrito (*Nome do Atendente:*) no topo das respostas humanas.
                  </p>
                </div>
                <Switch
                  checked={showAgentNamePrefixInMessages}
                  onCheckedChange={setShowAgentNamePrefixInMessages}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/70 p-4">
                <div className="space-y-1 pr-4">
                  <p className="text-sm font-semibold text-foreground">
                    Auto-converter novos contatos em Leads no Funil CRM
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cria automaticamente o cartão no Kanban CRM e vincula o telefone verificado ao perfil civil.
                  </p>
                </div>
                <Switch
                  checked={autoConvertIncomingToLead}
                  onCheckedChange={setAutoConvertIncomingToLead}
                />
              </div>
            </div>
          )}

          {activeSection === 'concierge' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-border/70 p-4">
                <div className="flex items-start gap-3 pr-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning-strong ">
                    <Car className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      Despacho de Mobilidade, Fretes & Mudanças via WhatsApp
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Permite que o cliente envie localização, receba cotação de Moto/Carro/Frete, código OTP de 4 dígitos e link de rastreio ao vivo.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={enableMobilityBookingBot}
                  onCheckedChange={setEnableMobilityBookingBot}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/70 p-4">
                <div className="flex items-start gap-3 pr-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <ShoppingBag className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      Catálogo de Compras, Reservas & Locação Conversacional
                    </p>
                    <p className="text-xs text-muted-foreground">
                      A IA SDR envia cards de produtos, agenda reservas de mesas/serviços e gera cobrança PIX direto na conversa.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={enableCatalogSalesBot}
                  onCheckedChange={setEnableCatalogSalesBot}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/70 p-4">
                <div className="flex items-start gap-3 pr-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Plane className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      Cotação de Passagens Aéreas & Pacotes Corporativos
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Coleta origem, destino, datas e quantidade de passageiros e retorna opções estruturadas de voos e pacotes.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={enableCorporateTravelBot}
                  onCheckedChange={setEnableCorporateTravelBot}
                />
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 min-h-11 text-xs focus-visible:ring-2"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="h-11 min-h-11 gap-2 text-xs font-semibold focus-visible:ring-2"
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Salvar Governança e Filas
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
