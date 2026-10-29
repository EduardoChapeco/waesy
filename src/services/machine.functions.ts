import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { saveStudioProject } from "./studio.functions";

export interface CarouselSlide {
 slideNumber: number;
 type: 'hook' | 'problem' | 'insight' | 'step' | 'case_study' | 'cta';
 headline: string;
 subheadline?: string;
 bodyText: string;
 visualPrompt: string;
 suggestedColors: { background: string; text: string; accent: string };
 layers: Array<{
 id: string;
 type: 'background' | 'atmospheric' | 'subject' | 'text' | 'badge';
 content: string;
 zIndex: number;
 style: Record<string, any>;
 }>;
}

export interface GeneratedCarousel {
 id: string;
 title: string;
 niche: string;
 slides: CarouselSlide[];
 caption: string;
 hashtags: string[];
 viralScore: number; // 0-100
}

export const generateViralCarouselContent = createServerFn({ method: "POST" })
 .validator(
 z.object({
 topic: z.string().min(3),
 niche: z.enum(["gastronomia", "turismo", "eventos", "varejo", "servicos", "juridico", "geral"]).default("geral"),
 targetAudience: z.string().optional(),
 numberOfSlides: z.number().int().min(4).max(10).default(6),
 toneOfVoice: z.enum(["provocativo", "educativo", "inspirador", "urgente"]).default("educativo"),
 }),
 )
 .handler(async ({ data }): Promise<GeneratedCarousel> => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "content", "seller"]);

 // 1. Geração de Conteúdo Viral Estruturado
 const slides: CarouselSlide[] = [];

 // Slide 1: Hook / Gancho de Parada de Feed
 slides.push({
 slideNumber: 1,
 type: 'hook',
 headline: `O Erro que 90% das Pessoas Cometem em ${data.topic.toUpperCase()}`,
 subheadline: 'Arraste para o lado e veja como evitar prejuízo imediato.',
 bodyText: '',
 visualPrompt: `Fundo escuro minimalista com tipografia impactante em destaque para ${data.niche}`,
 suggestedColors: { background: '#0F172A', text: '#FFFFFF', accent: '#F59E0B' },
 layers: [
 { id: 'bg-1', type: 'background', content: '#0F172A', zIndex: 1, style: { width: '100%', height: '100%' } },
 { id: 'txt-1', type: 'text', content: `O Maior Erro em ${data.topic}`, zIndex: 2, style: { fontSize: 36, fontWeight: 'bold', color: '#FFFFFF' } },
 { id: 'badge-1', type: 'badge', content: 'DESLIZE ️', zIndex: 3, style: { background: '#F59E0B', color: '#000000' } },
 ],
 });

 // Slides 2 a N-1: Conteúdo / Insights
 for (let i = 2; i < data.numberOfSlides; i++) {
 slides.push({
 slideNumber: i,
 type: i % 2 === 0 ? 'problem' : 'insight',
 headline: `Passo 0${i - 1}: Dominando ${data.topic}`,
 subheadline: `Dica prática de execução rápida para ${data.niche}.`,
 bodyText: `Ao invés de repetir fórmulas genéricas, aplique a técnica do ecossistema Waesy focada em alta conversão e consistência.`,
 visualPrompt: `Card limpo estilo Apple HIG com contraste refinado`,
 suggestedColors: { background: '#1E293B', text: '#F8FAFC', accent: '#3B82F6' },
 layers: [
 { id: `bg-${i}`, type: 'background', content: '#1E293B', zIndex: 1, style: { width: '100%', height: '100%' } },
 { id: `txt-${i}`, type: 'text', content: `Insight Prático #${i - 1}`, zIndex: 2, style: { fontSize: 24, fontWeight: '600', color: '#3B82F6' } },
 ],
 });
 }

 // Slide Final: CTA
 slides.push({
 slideNumber: data.numberOfSlides,
 type: 'cta',
 headline: 'Gostou deste conteúdo?',
 subheadline: 'Salve para consultar depois e compartilhe com sua equipe.',
 bodyText: 'Clique no link da nossa bio para acessar a ferramenta completa.',
 visualPrompt: 'Visual elegante de encerramento com ícones de salvar e compartilhar',
 suggestedColors: { background: '#0F172A', text: '#FFFFFF', accent: '#10B981' },
 layers: [
 { id: 'bg-cta', type: 'background', content: '#0F172A', zIndex: 1, style: { width: '100%', height: '100%' } },
 { id: 'txt-cta', type: 'text', content: 'Salve este post!', zIndex: 2, style: { fontSize: 32, fontWeight: 'bold', color: '#10B981' } },
 ],
 });

 const caption = ` Você já parou para analisar como está lidando com ${data.topic}?

Muitas empresas perdem tempo e vendas por não terem clareza nos processos. No carrossel acima, separamos os passos fundamentais para transformar sua operação em ${data.niche}.

 Qual dessas dicas chamou mais a sua atenção? Comente abaixo!

#${data.niche} #gestao #crescimento #negocios #waesy`;

 return {
 id: 'car-' + Math.random().toString(36).substring(2, 9),
 title: data.topic,
 niche: data.niche,
 slides,
 caption,
 hashtags: [data.niche, 'negocios', 'vendas', 'inovacao', 'waesy'],
 viralScore: 88,
 };
 });

export const exportCarouselToStudio = createServerFn({ method: "POST" })
 .validator(
 z.object({
 carouselTitle: z.string(),
 slides: z.array(z.record(z.unknown())),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

 // Criar projeto no Studio Gráfico com os slides como pranchetas
 const canvasData = {
 canvas: {
 width: 1080,
 height: 1350, // Formato 4:5 Instagram Portrait
 backgroundColor: '#0F172A',
 },
 slides: data.slides,
 };

 const project = await saveStudioProject({
  data: {
  title: `[Carrossel Machine] ${data.carouselTitle}`,
  project_type: 'graphic',
  aspect_ratio: '4:5',
  canvas_data: canvasData,
  },
  });

 return {
 status: 'success',
 projectId: project.id,
 editorUrl: `/workspace/studio?project=${project.id}`,
 };
 });

export const huntNicheTrendsAI = createServerFn({ method: "GET" })
 .validator(z.object({ niche: z.string() }))
 .handler(async ({ data }) => {
 return {
 niche: data.niche,
 trends: [
 {
 trendHeadline: `Por que o modelo tradicional de ${data.niche} está com os dias contados`,
 growthScore: 94,
 format: 'Carrossel 7 slides com contradição de mercado',
 trigger: 'FOMO & Alerta de Urgência',
 },
 {
 trendHeadline: `O Guia Definitivo para Economizar 30% em ${data.niche}`,
 growthScore: 89,
 format: 'Passo a passo visual com checklist',
 trigger: 'Utilidade Imediata',
 },
 {
 trendHeadline: `3 Ferramentas Gratuitas que Todo Profissional de ${data.niche} Deveria Usar`,
 growthScore: 92,
 format: 'Carrossel de recursos e links',
 trigger: 'Curadoria de Valor',
 },
 ],
 };
 });
