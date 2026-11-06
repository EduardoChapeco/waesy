import React, { useMemo } from 'react';
import { MessageSquare, Clock, MapPin, Calendar, Users, CheckCircle2, ChevronRight, ChevronLeft, UserCheck, MoreVertical, Edit3, FileText, Plane, Trash2, AlertTriangle, Paperclip, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

export interface LeadCardProps {
  lead: any;
  currentStageId?: string;
  stages?: Array<{ id: string; title: string }>;
  team?: Array<{ profile_id?: string; id?: string; name?: string; full_name?: string }>;
  onOpenDetails?: (lead: any) => void;
  onGenerateProposal?: (lead: any) => void;
  onCalculateCommission?: (lead: any) => void;
  onOpenFlightGrid?: (lead: any) => void;
  onStageChange?: (leadId: string, newStage: string) => void;
  onPromote?: (leadId: string) => void;
  onDelete?: (leadId: string) => void;
  prevStageId?: string | null;
  nextStageId?: string | null;
}

const INTEREST_TYPE_LABELS: Record<string, string> = {
  package_flight: 'Pacote Aéreo',
  hotel: 'Hospedagem',
  package_ground: 'Terrestre',
  flights: 'Passagens',
  cruise: 'Cruzeiro',
  visa: 'Visto & Doc',
  corporate: 'Corporativo',
  other: 'Personalizado',
};

export function LeadCard({
  lead,
  currentStageId,
  stages = [],
  team = [],
  onOpenDetails,
  onGenerateProposal,
  onCalculateCommission,
  onOpenFlightGrid,
  onStageChange,
  onPromote,
  onDelete,
  prevStageId,
  nextStageId,
}: LeadCardProps) {
  const initials = useMemo(() => {
    if (!lead?.full_name) return 'L';
    return lead.full_name
      .split(' ')
      .map((n: string) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [lead?.full_name]);

  // Tempo de permanência na etapa calculado com base em updated_at ou created_at
  const stageTimer = useMemo(() => {
    const refDate = lead.updated_at || lead.created_at;
    if (!refDate) return 'há 1h';
    const diffMs = Math.max(0, Date.now() - new Date(refDate).getTime());
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'agora';
    if (diffHours < 24) return `há ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  }, [lead.updated_at, lead.created_at]);

  // Staleness calculation (inactivity since last contact)
  const staleness = useMemo(() => {
    const lastDate = lead.last_contacted_at || lead.created_at;
    if (!lastDate) return { isStale: false, isCold: false, days: 0 };
    const diffMs = Math.abs(new Date().getTime() - new Date(lastDate).getTime());
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return {
      days,
      isStale: days >= 5 && days < 10,
      isCold: days >= 10,
    };
  }, [lead.last_contacted_at, lead.created_at]);

  // Pax formatting
  const paxBreakdown = useMemo(() => {
    const adults = lead.pax_adults || 1;
    const children = lead.pax_children || 0;
    const infants = lead.pax_infants || 0;
    const total = adults + children + infants;
    const parts: string[] = [];
    if (adults > 0) parts.push(`${adults} ADT`);
    if (children > 0) parts.push(`${children} CHD`);
    if (infants > 0) parts.push(`${infants} INF`);
    return {
      total: `${total} Pax`,
      detail: parts.join(', '),
    };
  }, [lead.pax_adults, lead.pax_children, lead.pax_infants]);

  // Travel dates formatting
  const travelPeriod = useMemo(() => {
    if (lead.interest_period) return lead.interest_period;
    if (!lead.travel_start) return null;
    const start = new Date(lead.travel_start).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    if (!lead.travel_end) return start;
    const end = new Date(lead.travel_end).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    return `${start} a ${end}`;
  }, [lead.interest_period, lead.travel_start, lead.travel_end]);

  // Checklist completion
  const checklistStats = useMemo(() => {
    const items = Array.isArray(lead.checklist) ? lead.checklist : [];
    const total = items.length;
    const done = items.filter((i: any) => i.done).length;
    return { total, done };
  }, [lead.checklist]);

  // Contadores de comentários/notas e anexos/passageiros
  const counters = useMemo(() => {
    const notesCount = lead.notes || lead.message ? 1 : 0;
    const activitiesCount = Array.isArray(lead.activities) ? lead.activities.length : 0;
    const paxDocsCount = Array.isArray(lead.pax_list) ? lead.pax_list.length : 0;
    const attachmentsCount = Array.isArray(lead.attachments) ? lead.attachments.length : paxDocsCount;
    return {
      comments: notesCount + activitiesCount,
      attachments: attachmentsCount,
    };
  }, [lead.notes, lead.message, lead.activities, lead.pax_list, lead.attachments]);

  const categoryLabel = useMemo(() => {
    if (lead.interest_type && INTEREST_TYPE_LABELS[lead.interest_type]) {
      return INTEREST_TYPE_LABELS[lead.interest_type];
    }
    if (Array.isArray(lead.tags) && lead.tags.length > 0) {
      return String(lead.tags[0]).split(':')[0];
    }
    return 'Roteiro';
  }, [lead.interest_type, lead.tags]);

  const isLgpdActive = useMemo(() => {
    if (lead.lgpd_accepted === false) return false;
    return Boolean(
      lead.lgpd_accepted ||
      lead.is_consent_lgpd ||
      lead.custom_fields?.lgpd_accepted ||
      lead.source === 'whatsapp' ||
      lead.source === 'site' ||
      lead.phone
    );
  }, [lead]);

  const cleanPhone = (lead.phone || '').replace(/\D/g, '');
  const whatsappUrl = cleanPhone
    ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(
        `Olá ${lead.full_name}, tudo bem? Sou da equipe comercial da agência de viagens. Gostaria de dar andamento à sua viagem ${
          lead.destination ? `para ${lead.destination}` : ''
        }.`
      )}`
    : null;

  const assignedMember = team.find((m) => (m.profile_id || m.id) === lead.assigned_to);
  const assignedInitials = useMemo(() => {
    const name = assignedMember?.full_name || assignedMember?.name || '';
    if (!name) return initials;
    return name
      .split(' ')
      .map((n: string) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [assignedMember, initials]);

  const temperatureMeta = useMemo(() => {
    const rawTemp = String(lead.temperature || lead.custom_fields?.temperature || '').toLowerCase();
    if (rawTemp === 'hot' || rawTemp === 'quente' || ((lead.estimated_value_cents || 0) >= 1200000 && !staleness.isCold)) {
      return {
        label: 'Quente',
        dotColor: 'bg-orange-500',
      };
    }
    if (rawTemp === 'cold' || rawTemp === 'frio' || staleness.isCold) {
      return {
        label: 'Frio',
        dotColor: 'bg-sky-500',
      };
    }
    return {
      label: 'Morno',
      dotColor: 'bg-warning',
    };
  }, [lead.temperature, lead.custom_fields, lead.estimated_value_cents, staleness.isCold]);

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetails?.(lead);
        }
      }}
      onClick={() => onOpenDetails?.(lead)}
      className="p-4 rounded-2xl border border-border/60 bg-card hover:border-foreground/25 transition-colors duration-150 space-y-3 text-xs group cursor-pointer relative select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* Topo do Card: Nome em Destaque + WhatsApp 1-Clique + Menu Contextual */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-sm text-foreground tracking-tight leading-snug break-words group-hover:text-primary transition-colors">
            {lead.full_name}
          </h4>
          {lead.phone && (
            <p className="text-2xs text-muted-foreground font-mono tabular-nums mt-1">
              {lead.phone}
            </p>
          )}
        </div>

        {/* Ações Rápidas de Topo */}
        <div /* design-lint-ignore DL-15 reason:"Conteiner nao interativo; onClick apenas isola propagacao de evento" expiry:"2027-12-31" */ className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              /* design-lint-ignore DL-14 reason:"Gatilho compacto em card denso de Kanban; card inteiro ja possui area tatil ampla" expiry:"2027-12-31" */
              className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-emerald-600 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Iniciar conversa no WhatsApp"
            >
              <MessageSquare className="size-3.5" />
            </a>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                /* design-lint-ignore DL-14 reason:"Menu contextual secundario dentro de card denso de Kanban" expiry:"2027-12-31" */
                className="size-7 rounded-lg text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <MoreVertical className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs w-52 p-2 rounded-xl">
              <DropdownMenuItem /* design-lint-ignore DL-15 reason:"Primitivo Radix com foco por teclado nativo e indicador visual focus:bg-accent no componente base" expiry:"2027-12-31" */ onClick={() => onOpenDetails?.(lead)} className="cursor-pointer font-medium">
                <Edit3 className="size-3.5 mr-2" />
                Abrir Ficha 360°
              </DropdownMenuItem>
              {onGenerateProposal && (
                <DropdownMenuItem /* design-lint-ignore DL-15 reason:"Primitivo Radix com foco por teclado nativo e indicador visual focus:bg-accent no componente base" expiry:"2027-12-31" */ onClick={() => onGenerateProposal(lead)} className="cursor-pointer font-medium text-primary">
                  <FileText className="size-3.5 mr-2" />
                  Gerar Proposta Visual
                </DropdownMenuItem>
              )}
              {onOpenFlightGrid && (
                <DropdownMenuItem /* design-lint-ignore DL-15 reason:"Primitivo Radix com foco por teclado nativo e indicador visual focus:bg-accent no componente base" expiry:"2027-12-31" */ onClick={() => onOpenFlightGrid(lead)} className="cursor-pointer font-medium text-sky-500">
                  <Plane className="size-3.5 mr-2" />
                  Malha Aérea e Voos
                </DropdownMenuItem>
              )}

              {stages.length > 0 && onStageChange && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1 text-2xs font-bold text-muted-foreground uppercase font-mono">
                    Mover para Estágio:
                  </div>
                  {stages
                    .filter((s) => s.id !== currentStageId)
                    .map((s) => (
                      <DropdownMenuItem /* design-lint-ignore DL-15 reason:"Primitivo Radix com foco por teclado nativo e indicador visual focus:bg-accent no componente base" expiry:"2027-12-31" */
                        key={s.id}
                        onClick={() => onStageChange(lead.id, s.id)}
                        className="cursor-pointer text-2xs"
                      >
                        → {s.title}
                      </DropdownMenuItem>
                    ))}
                </>
              )}

              {onPromote && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem /* design-lint-ignore DL-15 reason:"Primitivo Radix com foco por teclado nativo e indicador visual focus:bg-accent no componente base" expiry:"2027-12-31" */
                    onClick={() => onPromote(lead.id)}
                    className="text-emerald-600 font-bold cursor-pointer"
                  >
                    <UserCheck className="size-3.5 mr-2" />
                    Converter em Cliente
                  </DropdownMenuItem>
                </>
              )}

              {onDelete && (
                <DropdownMenuItem /* design-lint-ignore DL-15 reason:"Primitivo Radix com foco por teclado nativo e indicador visual focus:bg-accent no componente base" expiry:"2027-12-31" */
                  onClick={() => onDelete(lead.id)}
                  className="text-rose-600 font-medium cursor-pointer"
                >
                  <Trash2 className="size-3.5 mr-2" />
                  Excluir Lead
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Corpo Estruturado: Roteiro, Datas e Valores Financeiros */}
      <div className="space-y-2">
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <MapPin className="size-3.5 text-primary shrink-0" />
            <span className="truncate">{lead.destination || 'Destino a definir'}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-2xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3 text-muted-foreground shrink-0" />
              <span>{paxBreakdown.total}</span>
            </span>
            {travelPeriod && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-3 text-muted-foreground shrink-0" />
                <span>{travelPeriod}</span>
              </span>
            )}
          </div>
        </div>

        {/* Faixa Financeira: Valor Estimado da Venda em Tabular-Nums */}
        {lead.estimated_value_cents > 0 && (
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="font-mono tabular-nums font-bold text-sm text-foreground">
              {formatMoney(lead.estimated_value_cents)}
            </span>
          </div>
        )}
      </div>

      {/* Alerta de Inatividade / Staleness */}
      {staleness.isStale && (
        <div
          className={cn(
            'text-2xs font-medium inline-flex items-center gap-2',
            staleness.isCold
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-warning-strong'
          )}
        >
          <AlertTriangle className="size-3 shrink-0" />
          <span>
            {staleness.isCold ? 'Inativo há' : 'Sem resposta há'} {staleness.days}d
          </span>
        </div>
      )}

      {/* Rodapé Operacional: Status + Categoria + SLA + Avanço de Etapa */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-2xs">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="inline-flex items-center gap-2 text-2xs text-muted-foreground font-medium">
            <span className={cn('size-2 rounded-full shrink-0', temperatureMeta.dotColor)} />
            <span>{temperatureMeta.label}</span>
          </span>
          <span className="text-2xs text-muted-foreground">·</span>
          <span className="text-2xs text-muted-foreground truncate max-w-28 font-medium">
            {categoryLabel}
          </span>
          <span className="text-2xs text-muted-foreground">·</span>
          <span className="inline-flex items-center gap-1 text-muted-foreground font-mono tabular-nums text-2xs">
            <Clock className="size-3 shrink-0" />
            <span>{stageTimer}</span>
          </span>
        </div>

        {/* Avatar do Responsável + Botões de Avanço Rápido 44px */}
        <div /* design-lint-ignore DL-15 reason:"Conteiner nao interativo; onClick apenas isola propagacao de evento" expiry:"2027-12-31" */ className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Avatar className="size-6 rounded-full border border-border/60" title={assignedMember?.full_name || assignedMember?.name || lead.full_name}>
            <AvatarFallback className="text-3xs font-bold bg-muted text-foreground">
              {assignedInitials}
            </AvatarFallback>
          </Avatar>

          {prevStageId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onStageChange?.(lead.id, prevStageId)}
              className="h-11 min-h-11 w-9 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              title="Voltar etapa"
            >
              <ChevronLeft className="size-4" />
            </Button>
          )}
          {nextStageId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onStageChange?.(lead.id, nextStageId)}
              className="h-11 min-h-11 w-9 rounded-lg text-primary hover:bg-primary/10 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              title="Avançar etapa"
            >
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

