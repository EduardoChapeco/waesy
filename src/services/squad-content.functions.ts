import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabase';
import { getServerIdentity, assertStoreAccess } from '@/lib/server-access';
import { executeUnifiedAiCall } from '@/services/api-orchestrator.functions';

export type PostFormat = 'single' | 'carousel' | 'story_reels';
export type VisualTemplate = 'minimal-dark' | 'bold-color' | 'editorial' | 'data-card' | 'testimonial' | 'clean-white';

export interface SquadPostStrategy {
  format: PostFormat;
  slides_count: number;
  template: VisualTemplate;
  theme: string;
  target_sin: string; // Lente criativa opcional; não é validação comportamental.
  title: string;
}

export interface SquadPostCopy {
  slides: Array<{
    index: number;
    headline: string;
    body: string;
    badge?: string;
    cta?: string | null;
  }>;
  caption: string;
  hashtags: string;
}

export interface SquadGeneratedPost {
  id: string;
  store_id: string;
  title: string;
  theme: string;
  format: PostFormat;
  slides_count: number;
  strategy_data: SquadPostStrategy;
  copy_data: SquadPostCopy;
  rendered_slides_html: string[];
  exported_image_urls: string[];
  caption: string;
  hashtags: string;
  target_sin_trigger?: string | null;
  simlab_validation_score: null;
  provenance: {
    record_kind: 'llm_generated_marketing_draft';
    provider: string;
    model: string;
    generated_at: string;
    human_reviewed: false;
  };
  status: 'draft' | 'scheduled' | 'published';
  scheduled_for?: string | null;
  created_at: string;
  updated_at: string;
}

// ─── RENDERIZADOR DE TEMPLATE HTML5 1080x1080 ────────────────────────────────
function escapeHtml(value: string): string {
  const replacements: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return value.replace(/[&<>"']/g, (char) => replacements[char] || char);
}

export function renderSlideHTML5(params: {
  headline: string;
  body: string;
  slideIndex: number;
  totalSlides: number;
  companyName: string;
  template: VisualTemplate;
  primaryColor?: string;
  cta?: string | null;
}): string {
  const { headline, body, slideIndex, totalSlides, companyName, template, cta } = params;
  const primaryColor = /^#[0-9a-fA-F]{6}$/.test(params.primaryColor || "") ? params.primaryColor! : '#4f46e5';

  let bgStyle = 'background: #090d16; color: #f8fafc;';
  let fontImport = '@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800;900&display=swap");';
  let fontFamily = "'Plus Jakarta Sans', sans-serif";

  if (template === 'clean-white') {
    bgStyle = 'background: #ffffff; color: #0f172a;';
  } else if (template === 'bold-color') {
    bgStyle = `background: radial-gradient(circle at top right, ${primaryColor}33, #090d16 70%); color: #ffffff;`;
  } else if (template === 'editorial') {
    fontImport = '@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,900;1,400&family=Inter:wght@400;600&display=swap");';
    fontFamily = "'Playfair Display', serif";
    bgStyle = 'background: #0f172a; color: #f1f5f9;';
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    ${fontImport}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1080px;
      height: 1080px;
      overflow: hidden;
      font-family: ${fontFamily};
      ${bgStyle}
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 80px;
      position: relative;
    }
    .watermark {
      position: absolute;
      top: 80px;
      right: 80px;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      opacity: 0.5;
    }
    .content-box {
      margin-top: auto;
      margin-bottom: auto;
      max-width: 920px;
    }
    .badge {
      display: inline-block;
      padding: 8px 18px;
      border-radius: 9999px;
      background: ${primaryColor}22;
      border: 1px solid ${primaryColor}66;
      color: ${primaryColor};
      font-size: 18px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 24px;
    }
    .headline {
      font-size: 64px;
      font-weight: 900;
      line-height: 1.15;
      letter-spacing: -1.5px;
      margin-bottom: 28px;
    }
    .body-text {
      font-size: 28px;
      line-height: 1.5;
      opacity: 0.85;
      font-weight: 400;
    }
    .cta-pill {
      display: inline-block;
      margin-top: 36px;
      padding: 16px 36px;
      border-radius: 20px;
      background: ${primaryColor};
      color: #ffffff;
      font-size: 22px;
      font-weight: 800;
    }
    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 32px;
      font-size: 20px;
      font-weight: 600;
      opacity: 0.7;
    }
  </style>
</head>
<body>
  <div class="watermark">${escapeHtml(companyName)}</div>
  <div class="content-box">
    <div class="badge">Dica Estratégica</div>
    <h1 class="headline">${escapeHtml(headline)}</h1>
    <p class="body-text">${escapeHtml(body)}</p>
    ${cta ? `<div class="cta-pill">${escapeHtml(cta)}</div>` : ''}
  </div>
  <div class="footer">
    <span>@${escapeHtml(companyName.toLowerCase().replace(/\s+/g, ''))}</span>
    <span>Slide ${slideIndex} de ${totalSlides}</span>
  </div>
</body>
</html>`;
}

// ─── 1. RASCUNHO DE POST GERADO POR IA (SEM SCORE DE VALIDAÇÃO) ──────────────
export async function executeOrchestrateMarketingPost(data: {
  storeId: string;
  companyName: string;
  segment?: string;
  theme: string;
  targetSin?: string;
}): Promise<{ success: boolean; post: SquadGeneratedPost }> {
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ['owner', 'admin', 'manager', 'content'], data.storeId);

  const strategy = z.object({
    format: z.enum(['single', 'carousel', 'story_reels']),
    slides_count: z.number().int().min(1).max(8),
    template: z.enum(['minimal-dark', 'bold-color', 'editorial', 'data-card', 'testimonial', 'clean-white']),
    theme: z.string().trim().min(1).max(240),
    target_sin: z.string().trim().max(80),
    title: z.string().trim().min(1).max(240),
  });
  const copy = z.object({
    slides: z.array(z.object({
      index: z.number().int().positive(),
      headline: z.string().trim().min(1).max(240),
      body: z.string().trim().min(1).max(1000),
      badge: z.string().trim().max(80).optional(),
      cta: z.string().trim().max(120).nullable().optional(),
    }).strict()).min(1).max(8),
    caption: z.string().trim().min(1).max(3000),
    hashtags: z.string().trim().max(600),
  }).strict();
  const schema = z.object({ strategy, copy }).strict();

  const inputFacts = {
    business_name: data.companyName,
    segment: data.segment || null,
    campaign_theme: data.theme,
    creative_lens: data.targetSin || null,
  };
  const aiResult = await executeUnifiedAiCall({
    systemPrompt: `Crie um rascunho de campanha de marketing em português brasileiro. Retorne somente JSON com strategy e copy, incluindo 1 a 8 slides e um slide por item. Use exclusivamente os fatos recebidos.
Não invente estatísticas, resultados, garantias, depoimentos, certificações, escassez, descontos, preço, entrega, disponibilidade, participação de mercado ou eficácia. Não chame o rascunho de validado, vencedor ou de alta conversão. Quando faltar informação, escreva conteúdo educativo/hipotético sem apresentar a lacuna como fato. A lente criativa, se houver, é apenas uma opção de estilo, não evidência de eficácia. A saída será revisada por uma pessoa antes de ser publicada.`,
    userPrompt: JSON.stringify(inputFacts),
    responseFormat: 'json_object',
    temperature: 0.4,
    feature: 'squad_marketing_post_draft',
    storeId: data.storeId,
  });

  let raw: unknown = aiResult.parsedJson;
  if (!raw && aiResult.content) {
    try { raw = JSON.parse(aiResult.content); } catch { throw new Error('A IA retornou conteúdo inválido; nenhum template fixo foi usado como fallback.'); }
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new Error('A IA não retornou um rascunho válido; nenhum conteúdo predefinido foi usado.');
  const { strategy: generatedStrategy, copy: generatedCopy } = parsed.data;
  if (generatedCopy.slides.length !== generatedStrategy.slides_count) throw new Error('A IA retornou contagem de slides inconsistente; nenhum resultado parcial foi salvo.');
  if (generatedCopy.slides.some((slide, index) => slide.index !== index + 1)) throw new Error('A IA retornou sequência de slides inválida.');

  const slidesHtml = generatedCopy.slides.map((slide) => renderSlideHTML5({
    headline: slide.headline,
    body: slide.body,
    slideIndex: slide.index,
    totalSlides: generatedStrategy.slides_count,
    companyName: data.companyName,
    template: generatedStrategy.template,
    cta: slide.cta,
  }));
  const generatedAt = new Date().toISOString();
  const postRecord: SquadGeneratedPost = {
    id: '',
    store_id: data.storeId,
    title: generatedStrategy.title,
    theme: generatedStrategy.theme,
    format: generatedStrategy.format,
    slides_count: generatedStrategy.slides_count,
    strategy_data: generatedStrategy,
    copy_data: generatedCopy,
    rendered_slides_html: slidesHtml,
    exported_image_urls: [],
    caption: generatedCopy.caption,
    hashtags: generatedCopy.hashtags,
    target_sin_trigger: data.targetSin || null,
    simlab_validation_score: null,
    provenance: {
      record_kind: 'llm_generated_marketing_draft',
      provider: aiResult.provider,
      model: aiResult.model,
      generated_at: generatedAt,
      human_reviewed: false,
    },
    status: 'draft',
    created_at: generatedAt,
    updated_at: generatedAt,
  };

  const db = getServerClient();
  const { data: saved, error } = await db
    .from('squad_generated_posts')
    .insert({
      store_id: postRecord.store_id,
      title: postRecord.title,
      theme: postRecord.theme,
      format: postRecord.format,
      slides_count: postRecord.slides_count,
      strategy_data: postRecord.strategy_data,
      copy_data: postRecord.copy_data,
      rendered_slides_html: postRecord.rendered_slides_html,
      caption: postRecord.caption,
      hashtags: postRecord.hashtags,
      target_sin_trigger: postRecord.target_sin_trigger,
      simlab_validation_score: null,
      provenance: postRecord.provenance,
      status: 'draft',
    })
    .select('id, created_at, updated_at')
    .single();
  if (error || !saved) throw new Error(`O rascunho foi gerado, mas não pôde ser salvo: ${error?.message || 'registro ausente'}`);
  postRecord.id = saved.id;
  postRecord.created_at = saved.created_at;
  postRecord.updated_at = saved.updated_at;
  return { success: true, post: postRecord };
}

export const OrchestrateMarketingPostSchema = z.object({
  storeId: z.string().uuid(),
  companyName: z.string().min(1),
  segment: z.string().optional(),
  theme: z.string().min(1),
  targetSin: z.string().optional(),
});

export const orchestrateMarketingPost = createServerFn({ method: 'POST' })
  .validator(OrchestrateMarketingPostSchema)
  .handler(async ({ data }) => {
    return executeOrchestrateMarketingPost(data);
  });

// ─── 2. LISTAR POSTS GERADOS POR SQUADS ───────────────────────────────────────
export async function executeListSquadGeneratedPosts(data: { storeId: string }): Promise<SquadGeneratedPost[]> {
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ['owner', 'admin', 'manager', 'content'], data.storeId);
  const db = getServerClient();
  const { data: rows, error } = await db
    .from('squad_generated_posts')
    .select('*')
    .eq('store_id', data.storeId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Falha ao carregar posts do workspace: ${error.message}`);
  return (rows || []).map((row: any) => ({
    ...row,
    simlab_validation_score: null,
    provenance: row.provenance || { record_kind: 'legacy_post', notice: 'Proveniência/validação legada não verificada.' },
  })) as SquadGeneratedPost[];
}

export const listSquadGeneratedPosts = createServerFn({ method: 'GET' })
  .validator(z.object({ storeId: z.string().uuid() }))
  .handler(async ({ data }) => executeListSquadGeneratedPosts(data));
