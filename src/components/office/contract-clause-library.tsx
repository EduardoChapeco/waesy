import React, { useState, useMemo } from 'react';
import { BookOpen, Plus, Trash2, Edit2, Copy, Check, Search, Tag, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface OfficeContractClause {
 id: string;
 title: string;
 category: 'general' | 'cancellation' | 'liability' | 'payment' | 'lgpd' | 'custom';
 content: string;
 tags?: string[];
 isDefault?: boolean;
}

export const DEFAULT_CLAUSES: OfficeContractClause[] = [
 {
 id: 'cl-1',
 title: 'Objeto do Contrato e Prestação de Serviços',
 category: 'general',
 content: 'O presente instrumento tem por objeto a prestação dos serviços especificados pela CONTRATADA {{loja.nome}} em favor do(a) CONTRATANTE {{cliente.nome}}, inscrito no CPF sob nº {{cliente.cpf}}, conforme as condições expressas neste instrumento.',
 tags: ['objeto', 'serviços', 'padrao'],
 isDefault: true,
 },
 {
 id: 'cl-2',
 title: 'Condições de Pagamento e Vencimento',
 category: 'payment',
 content: 'Pela prestação dos serviços acordados, o CONTRATANTE pagará à CONTRATADA o valor total de {{valor_total}}, com data de vencimento estipulada para {{data_vencimento}}, através de PIX instantâneo ou boleto bancário registrado.',
 tags: ['pagamento', 'pix', 'vencimento'],
 isDefault: true,
 },
 {
 id: 'cl-3',
 title: 'Política de Cancelamento e Rescisão',
 category: 'cancellation',
 content: 'O presente contrato poderá ser rescindido por qualquer das partes mediante aviso prévio de 7 (sete) dias corridos. Em caso de rescisão antecipada pelo CONTRATANTE após início dos trabalhos, será retido 20% do valor total a título de custas operacionais.',
 tags: ['cancelamento', 'rescisao', 'multa'],
 isDefault: true,
 },
 {
 id: 'cl-4',
 title: 'Privacidade e Proteção de Dados (LGPD)',
 category: 'lgpd',
 content: 'As partes comprometem-se a cumprir integralmente as disposições da Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 - LGPD), utilizando os dados pessoais coletados unicamente para a execução do contrato.',
 tags: ['lgpd', 'privacidade', 'dados'],
 isDefault: true,
 },
 {
 id: 'cl-5',
 title: 'Responsabilidades e Limitação de Danos',
 category: 'liability',
 content: 'A responsabilidade da CONTRATADA limita-se aos danos diretos comprovadamente decorrentes de dolo ou culpa grave na execução dos serviços, excluindo-se lucros cessantes e danos indiretos.',
 tags: ['responsabilidade', 'danos'],
 isDefault: false,
 },
];

const CATEGORY_LABELS: Record<string, string> = {
 all: 'Todas',
 general: 'Geral',
 payment: 'Pagamentos',
 cancellation: 'Cancelamento',
 lgpd: 'LGPD',
 liability: 'Responsabilidade',
 custom: 'Personalizadas',
};

export function replaceContractVariables(template: string, vars: Record<string, string>): string {
 let result = template;
 for (const [k, v] of Object.entries(vars)) {
 const pattern = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g');
 result = result.replace(pattern, v || '');
 }
 return result;
}

interface ContractClauseLibraryProps {
 onInsertClause?: (clause: OfficeContractClause) => void;
 className?: string;
}

export function ContractClauseLibrary({
 onInsertClause,
 className = '',
}: ContractClauseLibraryProps) {
 const [clauses, setClauses] = useState<OfficeContractClause[]>(DEFAULT_CLAUSES);
 const [selectedCategory, setSelectedCategory] = useState<string>('all');
 const [searchQuery, setSearchQuery] = useState('');
 const [copiedId, setCopiedId] = useState<string | null>(null);

 const filteredClauses = useMemo(() => {
 return clauses.filter((c) => {
 const matchCat = selectedCategory === 'all' || c.category === selectedCategory;
 const matchQuery =
 !searchQuery ||
 c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
 c.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
 c.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
 return matchCat && matchQuery;
 });
 }, [clauses, selectedCategory, searchQuery]);

 const handleCopy = (id: string, text: string) => {
 navigator.clipboard.writeText(text);
 setCopiedId(id);
 setTimeout(() => setCopiedId(null), 2000);
 };

 return (
 <div className={'p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4 ' + className}>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <BookOpen className="w-5 h-5 text-primary" />
 <h3 className="text-base font-bold text-foreground">Biblioteca de Cláusulas Jurídicas</h3>
 </div>
 <span className="text-xs text-muted-foreground">
 {filteredClauses.length} cláusula{filteredClauses.length !== 1 ? 's' : ''}
 </span>
 </div>

 <div className="flex items-center gap-2">
 <div className="relative flex-1">
 <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Pesquisar por título, texto ou tag..."
 className="pl-9 h-10 rounded-xl bg-muted/30 border-border text-xs"
 />
 </div>
 </div>

 <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 ">
 {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
 <button
 key={k}
 type="button"
 onClick={() => setSelectedCategory(k)}
 className={'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ' + (
 selectedCategory === k
 ? 'bg-primary text-primary-foreground shadow-sm'
 : 'bg-muted/40 text-muted-foreground hover:text-foreground'
 )}
 >
 {label}
 </button>
 ))}
 </div>

 <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar pr-1">
 {filteredClauses.length === 0 ? (
 <div className="py-8 text-center text-xs text-muted-foreground">
 Nenhuma cláusula encontrada para o filtro atual.
 </div>
 ) : (
 filteredClauses.map((clause) => (
 <div
 key={clause.id}
 className="p-3.5 rounded-2xl bg-muted/20 border border-border/60 hover:border-border transition-all space-y-2"
 >
 <div className="flex items-center justify-between">
 <h4 className="text-xs font-bold text-foreground">{clause.title}</h4>
 <div className="flex items-center gap-1">
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => handleCopy(clause.id, clause.content)}
 className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
 title="Copiar texto"
 >
 {copiedId === clause.id ? (
 <Check className="w-3.5 h-3.5 text-emerald-500" />
 ) : (
 <Copy className="w-3.5 h-3.5" />
 )}
 </Button>
 {onInsertClause && (
 <Button
 type="button"
 size="sm"
 onClick={() => onInsertClause(clause)}
 className="h-8 px-3 rounded-lg text-[11px] font-semibold bg-primary/10 text-primary hover:bg-primary/20"
 >
 <Plus className="w-3 h-3 mr-1" />
 Inserir
 </Button>
 )}
 </div>
 </div>

 <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
 {clause.content}
 </p>

 {clause.tags && clause.tags.length > 0 && (
 <div className="flex flex-wrap items-center gap-1 pt-1">
 {clause.tags.map((t) => (
 <span
 key={t}
 className="px-2 py-0.5 rounded-md bg-muted text-[10px] text-muted-foreground flex items-center gap-1"
 >
 <Tag className="w-2.5 h-2.5" />
 {t}
 </span>
 ))}
 </div>
 )}
 </div>
 ))
 )}
 </div>
 </div>
 );
}
