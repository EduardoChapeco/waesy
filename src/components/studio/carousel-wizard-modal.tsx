import React, { useState } from 'react';
import { Sliders, Layers, Wand2, ChevronRight, ChevronLeft, Check, Download, Send, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SlideRenderer, StudioSlideData } from './slide-renderer';

interface CarouselWizardModalProps {
 isOpen?: boolean;
 onClose?: () => void;
 onApplyToBanner?: (slide: StudioSlideData) => void;
}

export function CarouselWizardModal({
 isOpen = true,
 onClose,
 onApplyToBanner,
}: CarouselWizardModalProps) {
 const [step, setStep] = useState(1);
 const [generationEngine, setGenerationEngine] = useState<'escamas' | 'classic'>('escamas');
 const [topic, setTopic] = useState('Super Promoção de Lançamento');
 const [targetAudience, setTargetAudience] = useState('Clientes Premium');
 const [density, setDensity] = useState<'low' | 'medium' | 'high'>('high');
 const [slideCount, setSlideCount] = useState(4);
 const [activeSlideIndex, setActiveSlideIndex] = useState(0);

 const [generatedSlides, setGeneratedSlides] = useState<StudioSlideData[]>([
 {
 id: 's-1',
 index: 1,
 badge: 'Exclusivo',
 title: 'A Nova Era da Sua Experiência Chegou',
 subtitle: 'Mais agilidade, tecnologia e design refinado.',
 body: 'Descubra como o ecossistema Waesy transforma a gestão e o atendimento em uma experiência fluida e moderna.',
 ctaText: 'Arraste para o lado',
 backgroundColor: '#0a0f1d',
 accentColor: '#38bdf8',
 theme: 'dark',
 },
 {
 id: 's-2',
 index: 2,
 badge: 'Diferenciais',
 title: 'Contratos e Carnês 100% Digitais',
 subtitle: 'Sem burocracia, com assinatura biométrica na tela.',
 body: 'Pague parcelas via PIX instantâneo em 1-clique e assine termos com validade jurídica assegurada pela MP 2.200-2/2001.',
 ctaText: 'Conheça Mais',
 backgroundColor: '#061325',
 accentColor: '#10b981',
 theme: 'dark',
 },
 {
 id: 's-3',
 index: 3,
 badge: 'Garantia',
 title: 'Transparência e Reputação Auditada',
 subtitle: 'Atendimento direto com índices públicos de solução.',
 body: 'Acompanhe chamados abertos, réplicas em tempo real e notas com selo de verificação confiável.',
 ctaText: 'Ver Detalhes',
 backgroundColor: '#160d27',
 accentColor: '#a855f7',
 theme: 'dark',
 },
 {
 id: 's-4',
 index: 4,
 badge: 'Chamada Final',
 title: 'Garanta Sua Vaga ou Condição Especial',
 subtitle: 'Acesse nosso portal agora mesmo.',
 body: 'Entre com seu CPF ou Magic Link e tenha acesso completo à sua central 360 graus.',
 ctaText: 'Acessar Agora',
 backgroundColor: '#0a0f1d',
 accentColor: '#f59e0b',
 theme: 'dark',
 },
 ]);

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
 <div className="w-full max-w-5xl h-[85vh] bg-card border border-border rounded-lg shadow-2xl flex flex-col overflow-hidden">
 {/* Header */}
 <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-primary/10 text-primary">
 <Wand2 className="w-5 h-5" />
 </div>
 <div>
 <h2 className="text-sm font-bold text-foreground">
 Gerador de Carrosséis
 </h2>
 <p className="text-[11px] text-muted-foreground">
 Motor Escamas Multi-Camadas nativo do Waesy
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <span className="text-xs font-semibold px-3 py-1 rounded-full bg-muted text-muted-foreground">
 Passo {step} de 3
 </span>
 {onClose && (
 <Button
 type="button"
 variant="ghost"
 onClick={onClose}
 className="h-8 w-8 p-0 rounded-lg text-muted-foreground"
 >
 <X className="w-4 h-4" />
 </Button>
 )}
 </div>
 </div>

 {/* Content */}
 <div className="flex-1 overflow-y-auto no-scrollbar p-6">
 {step === 1 && (
 <div className="max-w-2xl mx-auto space-y-6">
 <div>
 <h3 className="text-xl font-extrabold text-foreground">
 Escolha o Motor de Construção Visual
 </h3>
 <p className="text-xs text-muted-foreground mt-1">
 Selecione o modelo arquitetural para a geração das artes publicitárias.
 </p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <button
 type="button"
 onClick={() => setGenerationEngine('escamas')}
 className={'p-5 rounded-lg border-2 text-left transition-all ' + (
 generationEngine === 'escamas'
 ? 'border-primary bg-primary/5 shadow-md'
 : 'border-border bg-card hover:border-border/80'
 )}
 >
 <div className="p-3 rounded-lg bg-primary/10 text-primary w-fit mb-3">
 <Layers className="w-6 h-6" />
 </div>
 <div className="font-bold text-sm text-foreground">Motor Escamas Pro</div>
 <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
 Artes multi-camadas editáveis individualmente (títulos, badges, texturas e botões em camadas tipo Canva Pro).
 </p>
 </button>

 <button
 type="button"
 onClick={() => setGenerationEngine('classic')}
 className={'p-5 rounded-lg border-2 text-left transition-all ' + (
 generationEngine === 'classic'
 ? 'border-primary bg-primary/5 shadow-md'
 : 'border-border bg-card hover:border-border/80'
 )}
 >
 <div className="p-3 rounded-lg bg-purple-500/10 text-purple-500 w-fit mb-3">
 <Sliders className="w-6 h-6" />
 </div>
 <div className="font-bold text-sm text-foreground">IA Classic Rápido</div>
 <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
 Flyer unificado de alta densidade visual otimizado para conversão rápida de feed e stories.
 </p>
 </button>
 </div>

 <div className="space-y-3 pt-2">
 <label className="text-xs font-bold text-foreground">Tema Principal do Post</label>
 <Input
 value={topic}
 onChange={(e) => setTopic(e.target.value)}
 placeholder="Ex: 3 Razões para assinar o plano premium hoje..."
 className="h-11 rounded-lg bg-muted/20 text-xs"
 />
 </div>

 <div className="space-y-3">
 <label className="text-xs font-bold text-foreground">Público-Alvo / Nicho</label>
 <Input
 value={targetAudience}
 onChange={(e) => setTargetAudience(e.target.value)}
 placeholder="Ex: Clientes corporativos, noivas, estudantes..."
 className="h-11 rounded-lg bg-muted/20 text-xs"
 />
 </div>
 </div>
 )}

 {step === 2 && (
 <div className="max-w-2xl mx-auto space-y-6">
 <div>
 <h3 className="text-xl font-extrabold text-foreground">
 Configurações de Estilo
 </h3>
 <p className="text-xs text-muted-foreground mt-1">
 Ajuste a densidade visual e quantidade de slides.
 </p>
 </div>

 <div className="space-y-2">
 <label className="text-xs font-bold text-foreground">Densidade de Camadas</label>
 <div className="grid grid-cols-3 gap-3">
 {[
 { id: 'low', label: 'Minimal', desc: 'Tipografia limpa e foco no texto' },
 { id: 'medium', label: 'Equilibrado', desc: 'Badges + iluminação sutil' },
 { id: 'high', label: 'Max Pro', desc: 'Bokeh, partículas e sombras 3D' },
 ].map((d) => (
 <button
 key={d.id}
 type="button"
 onClick={() => setDensity(d.id as any)}
 className={'p-4 rounded-lg border text-left transition-all ' + (
 density === d.id
 ? 'border-primary bg-primary/10 shadow-sm'
 : 'border-border bg-card'
 )}
 >
 <div className="font-bold text-xs text-foreground">{d.label}</div>
 <p className="text-[10px] text-muted-foreground mt-1">{d.desc}</p>
 </button>
 ))}
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-xs font-bold text-foreground">Quantidade de Lâminas (Slides)</label>
 <div className="flex items-center gap-2">
 {[3, 4, 5, 7].map((count) => (
 <button
 key={count}
 type="button"
 onClick={() => setSlideCount(count)}
 className={'h-10 px-5 rounded-lg border text-xs font-bold transition-all ' + (
 slideCount === count
 ? 'border-primary bg-primary text-primary-foreground'
 : 'border-border bg-card text-muted-foreground'
 )}
 >
 {count} Slides
 </button>
 ))}
 </div>
 </div>
 </div>
 )}

 {step === 3 && (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-lg font-bold text-foreground">Carrossel Criado com Sucesso</h3>
 <p className="text-xs text-muted-foreground">
 Navegue entre os slides gerados ou exporte diretamente para o seu Hero Banner.
 </p>
 </div>

 <div className="flex items-center gap-2">
 {onApplyToBanner && (
 <Button
 type="button"
 size="sm"
 onClick={() => onApplyToBanner(generatedSlides[activeSlideIndex])}
 className="min-h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-2 shadow-md"
 >
 <Send className="w-3.5 h-3.5" />
 Aplicar ao Hero Banner
 </Button>
 )}
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
 <div className="lg:col-span-2 flex flex-col items-center">
 <div className="w-full max-w-md shadow-2xl">
 <SlideRenderer slide={generatedSlides[activeSlideIndex]} aspectRatio="1:1" />
 </div>

 <div className="flex items-center gap-2 mt-4">
 {generatedSlides.map((_, i) => (
 <button
 key={i}
 type="button"
 onClick={() => setActiveSlideIndex(i)}
 className={'w-8 h-8 rounded-lg text-xs font-bold transition-all ' + (
 activeSlideIndex === i
 ? 'bg-primary text-primary-foreground'
 : 'bg-muted text-muted-foreground'
 )}
 >
 {i + 1}
 </button>
 ))}
 </div>
 </div>

 <div className="space-y-3 bg-muted/20 p-4 rounded-lg border border-border">
 <h4 className="text-xs font-bold text-foreground">Camadas do Slide {activeSlideIndex + 1}</h4>
 <div className="space-y-2 text-xs">
 <div>
 <span className="text-muted-foreground text-[10px]">Título:</span>
 <Input
 value={generatedSlides[activeSlideIndex]?.title || ''}
 onChange={(e) => {
 const val = e.target.value;
 setGeneratedSlides((prev) =>
 prev.map((s, idx) => (idx === activeSlideIndex ? { ...s, title: val } : s))
 );
 }}
 className="h-8 text-xs rounded-lg mt-1"
 />
 </div>
 <div>
 <span className="text-muted-foreground text-[10px]">Subtítulo:</span>
 <Input
 value={generatedSlides[activeSlideIndex]?.subtitle || ''}
 onChange={(e) => {
 const val = e.target.value;
 setGeneratedSlides((prev) =>
 prev.map((s, idx) => (idx === activeSlideIndex ? { ...s, subtitle: val } : s))
 );
 }}
 className="h-8 text-xs rounded-lg mt-1"
 />
 </div>
 <div>
 <span className="text-muted-foreground text-[10px]">Botão CTA:</span>
 <Input
 value={generatedSlides[activeSlideIndex]?.ctaText || ''}
 onChange={(e) => {
 const val = e.target.value;
 setGeneratedSlides((prev) =>
 prev.map((s, idx) => (idx === activeSlideIndex ? { ...s, ctaText: val } : s))
 );
 }}
 className="h-8 text-xs rounded-lg mt-1"
 />
 </div>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* Footer Navigation */}
 <div className="p-4 border-t border-border flex items-center justify-between bg-muted/10">
 <Button
 type="button"
 variant="outline"
 disabled={step === 1}
 onClick={() => setStep(step - 1)}
 className="min-h-10 px-4 rounded-lg text-xs"
 >
 <ChevronLeft className="w-4 h-4 mr-1" />
 Voltar
 </Button>

 {step < 3 ? (
 <Button
 type="button"
 onClick={() => setStep(step + 1)}
 className="min-h-10 px-6 rounded-lg bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-2"
 >
 Avançar
 <ChevronRight className="w-4 h-4" />
 </Button>
 ) : (
 <Button
 type="button"
 onClick={onClose}
 className="min-h-10 px-6 rounded-lg bg-primary text-primary-foreground font-semibold text-xs"
 >
 Concluir e Fechar
 </Button>
 )}
 </div>
 </div>
 </div>
 );
}
