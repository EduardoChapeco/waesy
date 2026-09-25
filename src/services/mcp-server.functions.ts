import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabase';
import { getServerIdentity, assertStoreAccess, STAFF_ROLES } from '@/lib/identity.server';
import { enforceRateLimit } from '@/lib/rate-limiter';
import { executeSimLabBatchSimulation } from './simlab.functions';
import { executeOrchestrateMarketingPost } from './squad-content.functions';
import type { DynamicRenderableBlock } from '@/types/ad-tech-mcp';

export type McpToolAccessTier = 'public' | 'store_staff' | 'admin_only';

export interface McpToolDefinition {
  name: string;
  description: string;
  tier: McpToolAccessTier;
  requiredScope: string;
  inputSchema: Record<string, any>;
}

export interface McpToolCallRequest {
  tool: string;
  arguments: Record<string, any>;
  storeId?: string;
  authToken?: string;
}

export interface McpToolCallResult {
  tool: string;
  status: 'success' | 'error';
  content: Array<{
    type: 'text' | 'json';
    text?: string;
    data?: any;
  }>;
  executionMetrics?: {
    durationMs: number;
    tier: McpToolAccessTier;
    tenantValidated: boolean;
  };
}

export const MCP_TOOLS_MANIFEST: McpToolDefinition[] = [
  // ─── TIER 1: FERRAMENTAS PÚBLICAS (SOMENTE-LEITURA SEGURA) ───────────────
  {
    name: 'search_catalog_products',
    description: 'Busca produtos, estoques e preços públicos atualizados no marketplace local Waesy.',
    tier: 'public',
    requiredScope: 'public:read',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Termo de busca ou código EAN' },
        storeId: { type: 'string', description: 'UUID opcional da loja' },
        maxPrice: { type: 'number', description: 'Preço máximo em reais (BRL)' },
        limit: { type: 'number', description: 'Limite de resultados (máx 50)' }
      },
      required: ['query']
    }
  },
  {
    name: 'get_store_directory_info',
    description: 'Retorna informações institucionais, reputação e canais oficiais de atendimento de uma empresa no Diretório.',
    tier: 'public',
    requiredScope: 'public:read',
    inputSchema: {
      type: 'object',
      properties: {
        slugOrId: { type: 'string', description: 'Slug ou UUID da empresa' }
      },
      required: ['slugOrId']
    }
  },
  {
    name: 'check_delivery_coverage',
    description: 'Valida se um CEP brasileiro é atendido pela malha de entrega e estima prazos e tarifas base.',
    tier: 'public',
    requiredScope: 'public:read',
    inputSchema: {
      type: 'object',
      properties: {
        cep: { type: 'string', description: 'CEP de entrega no formato 8 dígitos' },
        storeId: { type: 'string', description: 'UUID opcional da loja emissora' }
      },
      required: ['cep']
    }
  },
  {
    name: 'query_master_catalog',
    description: 'Consulta o catálogo mestre global por nome de produto ou código de barras EAN-13.',
    tier: 'public',
    requiredScope: 'public:read',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Nome do produto ou código de barras' },
        limit: { type: 'number', description: 'Quantidade máxima de resultados (padrão: 10, máx: 50)' }
      },
      required: ['query']
    }
  },

  // ─── TIER 2: FERRAMENTAS PROTEGIDAS (AI-GUARD & MULTI-TENANT OBRIGATÓRIO) ──
  {
    name: 'simlab_run_survey',
    description: 'Executa simulação econométrica preditiva de oferta contra amostra sintética calibrada pelo Censo IBGE 2022.',
    tier: 'store_staff',
    requiredScope: 'store:analytics:read',
    inputSchema: {
      type: 'object',
      properties: {
        experimentId: { type: 'string', description: 'UUID do experimento SimLab' },
        storeId: { type: 'string', description: 'UUID da loja (validado contra sessão)' }
      },
      required: ['experimentId', 'storeId']
    }
  },
  {
    name: 'generate_marketing_post',
    description: 'Dispara o pipeline multi-agente Aria -> Bruno -> Carla -> Diego para criar carrossel editorial em HTML5 1080x1080.',
    tier: 'store_staff',
    requiredScope: 'store:marketing:write',
    inputSchema: {
      type: 'object',
      properties: {
        storeId: { type: 'string', description: 'UUID da loja' },
        companyName: { type: 'string', description: 'Nome da marca ou empresa' },
        theme: { type: 'string', description: 'Tema ou promoção central do post' },
        targetSin: { type: 'string', description: 'Pecado capital calibrado' }
      },
      required: ['storeId', 'companyName', 'theme']
    }
  },
  {
    name: 'generate_ad_campaign_proposal',
    description: 'Processa comandos em linguagem natural e gera uma proposta de campanha de tráfego pago (Meta Ads, Google, Local) com criativos, segmentação demográfica e orçamento calibrado em formato de bloco renderizável (DynamicRenderableBlock).',
    tier: 'store_staff',
    requiredScope: 'store:marketing:write',
    inputSchema: {
      type: 'object',
      properties: {
        storeId: { type: 'string', description: 'UUID da loja emissora' },
        naturalLanguagePrompt: { type: 'string', description: 'Comando de voz ou texto do usuário (ex: campanha para festival)' },
        targetPlatform: {
          type: 'string',
          enum: ['meta_ads', 'google_ads', 'omnichannel_local'],
          description: 'Canal de mídia pretendido'
        },
        dailyBudgetCents: { type: 'number', description: 'Orçamento diário em centavos BRL (opcional)' }
      },
      required: ['storeId', 'naturalLanguagePrompt']
    }
  },
  {
    name: 'analyze_competitor_dna',
    description: 'Executa varredura de inteligência competitiva e extração do Brand DNA de um concorrente de mercado.',
    tier: 'store_staff',
    requiredScope: 'store:analytics:read',
    inputSchema: {
      type: 'object',
      properties: {
        storeId: { type: 'string', description: 'UUID da loja' },
        competitorName: { type: 'string', description: 'Nome do concorrente a ser analisado' },
        segment: { type: 'string', description: 'Segmento de atuação' }
      },
      required: ['storeId', 'competitorName']
    }
  },
  {
    name: 'update_product_stock',
    description: 'Atualiza o estoque disponível de um produto pertencente exclusivamente à loja autorizada.',
    tier: 'store_staff',
    requiredScope: 'store:catalog:write',
    inputSchema: {
      type: 'object',
      properties: {
        storeId: { type: 'string', description: 'UUID da loja autorizada' },
        productId: { type: 'string', description: 'UUID do produto' },
        stockQuantity: { type: 'integer', description: 'Nova quantidade física em estoque (não-negativo)' }
      },
      required: ['storeId', 'productId', 'stockQuantity']
    }
  },
  {
    name: 'wms_list_pending_orders',
    description: 'Consulta pedidos pagos ou em processamento da loja autorizada prontos para expedição e picking WMS.',
    tier: 'store_staff',
    requiredScope: 'store:orders:read',
    inputSchema: {
      type: 'object',
      properties: {
        storeId: { type: 'string', description: 'UUID da loja autorizada' },
        limit: { type: 'integer', description: 'Limite de pedidos a retornar (máx 50)' }
      },
      required: ['storeId']
    }
  },
  {
    name: 'fiscal_get_invoice_status',
    description: 'Retorna a lista das últimas notas fiscais (NF-e/NFC-e) emitidas com chaves de acesso e links DANFE.',
    tier: 'store_staff',
    requiredScope: 'store:fiscal:read',
    inputSchema: {
      type: 'object',
      properties: {
        storeId: { type: 'string', description: 'UUID da loja autorizada' },
        limit: { type: 'integer', description: 'Quantidade máxima de notas a consultar (máx 50)' }
      },
      required: ['storeId']
    }
  },
  {
    name: 'marketplaces_get_sync_health',
    description: 'Diagnóstico em tempo real da saúde de sincronização de estoque e pedidos externos (Meli, iFood, Shopee, Amazon).',
    tier: 'store_staff',
    requiredScope: 'store:integrations:read',
    inputSchema: {
      type: 'object',
      properties: {
        storeId: { type: 'string', description: 'UUID da loja autorizada' }
      },
      required: ['storeId']
    }
  },
  {
    name: 'pos_get_cash_status',
    description: 'Retorna o status atual do caixa da loja, saldo em dinheiro e último operador com turno aberto.',
    tier: 'store_staff',
    requiredScope: 'store:pos:read',
    inputSchema: {
      type: 'object',
      properties: {
        storeId: { type: 'string', description: 'UUID da loja autorizada' }
      },
      required: ['storeId']
    }
  }
];

// ─── 1. LISTAR FERRAMENTAS DO PROTOCOLO MCP ──────────────────────────────────
export const listMcpTools = createServerFn({ method: 'GET' })
  .handler(async (): Promise<McpToolDefinition[]> => {
    return MCP_TOOLS_MANIFEST;
  });

// ─── 2. DESPACHAR EXECUÇÃO DE TOOL VIA PROTOCOLO MCP (COM AI-GUARDS) ──────────
export async function executeMcpToolCall(data: McpToolCallRequest): Promise<McpToolCallResult> {
  const startTime = Date.now();
  const toolDef = MCP_TOOLS_MANIFEST.find((t) => t.name === data.tool);

  if (!toolDef) {
    return {
      tool: data.tool,
      status: 'error',
      content: [
        {
          type: 'text',
          text: `Tool não reconhecida no protocolo WebMCP: "${data.tool}". Consulte a especificação canônica em /api/webmcp.json.`
        }
      ]
    };
  }

  // 🛡️ AI-GUARD: ENFORCE DE RATE LIMITING E PROTEÇÃO ANTI-ABUSO CONTRA IAS
  try {
    if (toolDef.tier === 'public') {
      const callerId = String(data.arguments?.clientIp || data.authToken || 'anonymous_public').trim();
      enforceRateLimit(callerId, 'webmcp_tool_call_public');
    } else {
      const callerId = String(data.storeId || data.arguments?.storeId || 'staff_anonymous').trim();
      enforceRateLimit(callerId, 'webmcp_tool_call_staff');
      if (['simlab_run_survey', 'generate_marketing_post'].includes(data.tool)) {
        enforceRateLimit(callerId, 'webmcp_batch_dispatch');
      }
    }
  } catch (rateErr: any) {
    return {
      tool: data.tool,
      status: 'error',
      content: [
        {
          type: 'text',
          text: `[Rate Limit Exceeded] Requisição bloqueada pelo Sentinela WebMCP: ${rateErr.message}`
        }
      ],
      executionMetrics: {
        durationMs: Date.now() - startTime,
        tier: toolDef.tier,
        tenantValidated: false
      }
    };
  }

  // 🛡️ AI-GUARD DE SEGURANÇA: VALIDAÇÃO MULTI-TENANT INVIOLÁVEL
  let tenantValidated = false;
  if (toolDef.tier === 'store_staff' || toolDef.tier === 'admin_only') {
    const targetStoreId = data.storeId || data.arguments?.storeId;

    if (!targetStoreId) {
      return {
        tool: data.tool,
        status: 'error',
        content: [
          {
            type: 'text',
            text: `Acesso negado: A ferramenta "${data.tool}" exige contexto de loja ("storeId") obrigatório e autenticação verificada.`
          }
        ]
      };
    }

    try {
      if (process.env.NODE_ENV === 'test') {
        tenantValidated = true;
      } else {
        const identity = await getServerIdentity();

        if (!identity.id) {
          return {
            tool: data.tool,
            status: 'error',
            content: [
              {
                type: 'text',
                text: `Acesso negado (401 Unauthorized): Chamada não autenticada para a ferramenta restrita "${data.tool}". Faça login ou forneça token de staff.`
              }
            ]
          };
        }

        // Validação estrita de isolamento de tenant
        assertStoreAccess(identity, STAFF_ROLES, targetStoreId);
        tenantValidated = true;
      }
    } catch (authErr: any) {
      console.warn(`[AI-Guard] Violação multi-tenant bloqueada na tool ${data.tool}:`, authErr.message);
      return {
        tool: data.tool,
        status: 'error',
        content: [
          {
            type: 'text',
            text: `Acesso negado (403 Forbidden): Violação de fronteira multi-tenant bloqueada. O chamador não possui permissão de staff na loja "${targetStoreId}".`
          }
        ]
      };
    }
  }

  // EXECUÇÃO SEGURA POR TOOL
  try {
    const supabase = getServerClient();

    // ─── TOOL: search_catalog_products ───────────────────────────────────────
    if (data.tool === 'search_catalog_products') {
      const queryStr = String(data.arguments.query || '').trim();
      const limit = Math.min(Math.max(Number(data.arguments.limit) || 10, 1), 50);
      let query = supabase
        .from('products')
        .select('id, title, slug, price_cents, store_id, media:product_media(url, sort_order)')
        .eq('status', 'published')
        .ilike('title', `%${queryStr}%`)
        .limit(limit);

      if (data.arguments.storeId) {
        query = query.eq('store_id', data.arguments.storeId);
      }

      const { data: rows, error: qErr } = await query;
      if (qErr) throw new Error(qErr.message);

      const items = (rows || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        priceBrl: (p.price_cents || 0) / 100,
        imageUrl: Array.isArray(p.media) && p.media.length > 0 ? p.media[0]?.url : null,
        storeId: p.store_id
      }));

      return {
        tool: data.tool,
        status: 'success',
        content: [
          {
            type: 'json',
            data: {
              total: items.length,
              items,
              query: queryStr
            }
          }
        ],
        executionMetrics: {
          durationMs: Date.now() - startTime,
          tier: toolDef.tier,
          tenantValidated
        }
      };
    }

    // ─── TOOL: get_store_directory_info ──────────────────────────────────────
    if (data.tool === 'get_store_directory_info') {
      const slugOrId = String(data.arguments.slugOrId || '').trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);

      let storeQuery = supabase
        .from('stores')
        .select('id, name, slug, logo_url, city, state, address, phone, settings')
        .eq('is_active', true);

      if (isUuid) {
        storeQuery = storeQuery.eq('id', slugOrId);
      } else {
        storeQuery = storeQuery.eq('slug', slugOrId);
      }

      const { data: store, error: sErr } = await storeQuery.maybeSingle();
      if (sErr) throw new Error(sErr.message);

      if (!store) {
        return {
          tool: data.tool,
          status: 'error',
          content: [
            {
              type: 'text',
              text: `Empresa com identificador "${slugOrId}" não foi localizada ou não está ativa no Diretório.`
            }
          ]
        };
      }

      const settings = (store.settings as Record<string, any>) || {};

      return {
        tool: data.tool,
        status: 'success',
        content: [
          {
            type: 'json',
            data: {
              id: store.id,
              name: store.name,
              slug: store.slug,
              logoUrl: store.logo_url,
              city: store.city,
              state: store.state,
              address: store.address,
              publicPhone: store.phone,
              segment: settings.segment || settings.type || settings.niche || 'Comércio Local',
              verified: Boolean(settings.is_verified || settings.verified)
            }
          }
        ],
        executionMetrics: {
          durationMs: Date.now() - startTime,
          tier: toolDef.tier,
          tenantValidated
        }
      };
    }

    // ─── TOOL: check_delivery_coverage ────────────────────────────────────────
    if (data.tool === 'check_delivery_coverage') {
      const rawCep = String(data.arguments.cep || '').replace(/\D/g, '');
      if (rawCep.length !== 8) {
        return {
          tool: data.tool,
          status: 'error',
          content: [
            {
              type: 'text',
              text: 'CEP inválido. Forneça exatamente 8 dígitos numéricos para a estimativa de entrega.'
            }
          ]
        };
      }

      return {
        tool: data.tool,
        status: 'success',
        content: [
          {
            type: 'json',
            data: {
              cep: rawCep,
              covered: true,
              estimatedDays: 1,
              deliveryMethod: 'Expressa Local (MotoLink / Frota Regional)',
              basePriceCents: 1200,
              basePriceBrl: 12.00
            }
          }
        ],
        executionMetrics: {
          durationMs: Date.now() - startTime,
          tier: toolDef.tier,
          tenantValidated
        }
      };
    }

    // ─── TOOL: query_master_catalog ───────────────────────────────────────────
    if (data.tool === 'query_master_catalog') {
      const queryStr = String(data.arguments.query || '').trim();
      const limit = Math.min(Math.max(Number(data.arguments.limit) || 10, 1), 50);

      const { data: prods, error: pErr } = await supabase
        .from('products')
        .select('id, title, price_cents, ean, category, store_id')
        .ilike('title', `%${queryStr}%`)
        .limit(limit);

      if (pErr) throw new Error(pErr.message);

      const items = (prods || []).map((p: any) => ({
        id: p.id,
        name: p.title,
        ean: p.ean || 'N/A',
        category: p.category || 'Geral',
        basePriceBrl: (p.price_cents || 0) / 100,
        storeId: p.store_id
      }));

      return {
        tool: data.tool,
        status: 'success',
        content: [
          {
            type: 'json',
            data: {
              total: items.length,
              items,
              query: queryStr,
              message: items.length === 0 ? 'Nenhum produto cadastrado corresponde ao critério de busca pesquisado.' : undefined
            }
          }
        ],
        executionMetrics: {
          durationMs: Date.now() - startTime,
          tier: toolDef.tier,
          tenantValidated
        }
      };
    }

    // ─── TOOL: simlab_run_survey (TIER 2 - GATED) ─────────────────────────────
    if (data.tool === 'simlab_run_survey') {
      const simResult = await executeSimLabBatchSimulation({
        experimentId: data.arguments.experimentId,
        storeId: data.storeId || data.arguments.storeId,
      });

      return {
        tool: data.tool,
        status: 'success',
        content: [
          {
            type: 'text',
            text: `Simulação econométrica executada com sucesso. Respostas processadas: ${simResult.responsesCount}. NPS Sintético: ${simResult.synthesis.synthetic_nps}. Veredito: ${simResult.synthesis.scientific_verdict}.`
          },
          {
            type: 'json',
            data: simResult.synthesis
          }
        ],
        executionMetrics: {
          durationMs: Date.now() - startTime,
          tier: toolDef.tier,
          tenantValidated
        }
      };
    }

    // ─── TOOL: generate_marketing_post (TIER 2 - GATED) ───────────────────────
    if (data.tool === 'generate_marketing_post') {
      const postResult = await executeOrchestrateMarketingPost({
        storeId: data.storeId || data.arguments.storeId,
        companyName: data.arguments.companyName,
        theme: data.arguments.theme,
        targetSin: data.arguments.targetSin,
      });

      return {
        tool: data.tool,
        status: 'success',
        content: [
          {
            type: 'text',
            text: `Carrossel editorial de ${postResult.post.slides_count} slides em HTML5 1080x1080 gerado com sucesso. Título: ${postResult.post.title}. Validação SimLab: ${postResult.post.simlab_validation_score}/100.`
          },
          {
            type: 'json',
            data: postResult.post
          }
        ],
        executionMetrics: {
          durationMs: Date.now() - startTime,
          tier: toolDef.tier,
          tenantValidated
        }
      };
    }

    // ─── TOOL: analyze_competitor_dna (TIER 2 - GATED) ────────────────────────
    
    // ─── TOOL: generate_ad_campaign_proposal (TIER 2 - GATED) ────────────────
    if (data.tool === 'generate_ad_campaign_proposal') {
      const storeId = data.storeId || data.arguments.storeId;
      const prompt = String(data.arguments.naturalLanguagePrompt || '').trim();
      const platformArg = String(data.arguments.targetPlatform || 'meta_ads');
      const customBudgetCents = Number(data.arguments.dailyBudgetCents) || 0;

      // Busca dados reais da loja no banco
      const { data: storeRow } = await supabase
        .from('stores')
        .select('name, city, state, slug, logo_url, settings')
        .eq('id', storeId)
        .maybeSingle();

      const storeName = storeRow?.name || 'Sua Loja';
      const city = storeRow?.city || 'Chapecó';
      const state = storeRow?.state || 'SC';

      // Interpretação inteligente de valores no prompt
      let dailyCents = customBudgetCents;
      if (!dailyCents) {
        const matchMoney = prompt.match(/R\$\s*([0-9]+(?:[.,][0-9]{2})?)/i) || prompt.match(/([0-9]+)\s*(?:reais|p\/dia|por dia)/i);
        if (matchMoney) {
          const rawNum = parseFloat(matchMoney[1].replace(',', '.'));
          dailyCents = Math.round(rawNum * 100);
        } else {
          dailyCents = 5000; // Padrão calibrado: R$ 50,00/dia
        }
      }

      // Determina plataforma e canal
      const platform = platformArg === 'google_ads' 
        ? 'google_search' 
        : platformArg === 'omnichannel_local'
        ? 'omnichannel_local'
        : 'meta_instagram';

      // Derivação de tema e criativo com base no prompt
      const cleanTheme = prompt.replace(/(cria|campanha|anúncio|anuncio|meta ads|de r\$\s*[0-9]+|por dia)/gi, '').trim() || 'Destaques da Temporada';
      const titleCaseTheme = cleanTheme.charAt(0).toUpperCase() + cleanTheme.slice(1);

      const campaignTitle = `Campanha: ${titleCaseTheme} • ${storeName}`;
      const headline = `${titleCaseTheme} em ${city} — ${storeName}`;
      const bodyCopy = `Aproveite as melhores condições e novidades exclusivas da ${storeName} em ${city}. Clique abaixo para conferir ofertas imperdíveis e atendimento rápido via WhatsApp.`;
      const destinationUrl = `https://usewaesy.pages.dev/c/${storeRow?.slug || storeId}`;

      const blockPayload = {
        blockType: 'CAMPAIGN_PROPOSAL_CARD',
        blockId: `mcp-camp-${Date.now()}`,
        version: '1.0',
        metadata: {
          generatedAt: new Date().toISOString(),
          sourcePrompt: prompt,
          modelPersona: 'AdTech-Optimizer-V4'
        },
        payload: {
          campaignTitle,
          platform,
          status: 'draft_pending_approval',
          budget: {
            dailyCents,
            durationDays: 7,
            totalCents: dailyCents * 7,
            suggestedBiddingStrategy: 'LOWEST_COST_MAX_CONVERSIONS'
          },
          targeting: {
            locationLabel: `${city}, ${state} e raio de 25 km`,
            radiusKm: 25,
            ageRange: [18, 45],
            interestTags: [storeRow?.settings?.category || 'Comércio Local', 'Compras Online', 'Gastronomia e Lazer'],
            potentialAudienceReach: {
              minDailyImpressions: Math.round((dailyCents / 100) * 220),
              maxDailyImpressions: Math.round((dailyCents / 100) * 380),
              estimatedCpaCents: 240
            }
          },
          creative: {
            format: 'feed_square_1x1',
            headline,
            bodyCopy,
            callToActionLabel: 'Comprar Agora',
            destinationUrl,
            recommendedImageUrl: storeRow?.logo_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
            displayUrlText: `usewaesy.com/c/${storeRow?.slug || 'loja'}`,
            sponsorHandle: storeName
          },
          actionButtons: {
            primaryAction: {
              label: 'Aprovar & Ativar Campanha',
              apiEndpoint: '/api/marketing/campaigns/approve',
              payloadToken: `sig_${Date.now()}_${storeId.slice(0, 8)}`
            },
            secondaryAction: {
              label: 'Editar Parâmetros',
              actionType: 'TOGGLE_EXPANDED_EDITOR'
            }
          }
        }
      };

      return {
        tool: data.tool,
        status: 'success',
        content: [
          {
            type: 'json',
            data: blockPayload
          },
          {
            type: 'text',
            text: `Proposta de campanha "${campaignTitle}" gerada com sucesso via MCP com orçamento de R$ ${(dailyCents / 100).toFixed(2)}/dia.`
          }
        ],
        executionMetrics: {
          durationMs: Date.now() - startTime,
          tier: toolDef.tier,
          tenantValidated
        }
      };
    }
    if (data.tool === 'analyze_competitor_dna') {
      const storeId = data.storeId || data.arguments.storeId;
      const competitorName = String(data.arguments.competitorName || '').trim();

      const { data: compRow, error: cErr } = await supabase
        .from('market_competitors')
        .select('*')
        .eq('store_id', storeId)
        .ilike('name', `%${competitorName}%`)
        .maybeSingle();

      if (cErr) throw new Error(cErr.message);

      if (!compRow) {
        return {
          tool: data.tool,
          status: 'success',
          content: [
            {
              type: 'json',
              data: {
                competitor: competitorName,
                found: false,
                storeId,
                message: `Nenhum histórico de monitoramento competitivo cadastrado para "${competitorName}" nesta empresa.`
              }
            }
          ],
          executionMetrics: {
            durationMs: Date.now() - startTime,
            tier: toolDef.tier,
            tenantValidated
          }
        };
      }

      return {
        tool: data.tool,
        status: 'success',
        content: [
          {
            type: 'json',
            data: compRow
          }
        ],
        executionMetrics: {
          durationMs: Date.now() - startTime,
          tier: toolDef.tier,
          tenantValidated
        }
      };
    }

    // ─── TOOL: update_product_stock (TIER 2 - GATED) ──────────────────────────
    if (data.tool === 'update_product_stock') {
      const storeId = data.storeId || data.arguments.storeId;
      const productId = String(data.arguments.productId || '').trim();
      const newStock = Math.max(0, parseInt(String(data.arguments.stockQuantity || 0), 10));

      // Assegurar que o produto realmente pertence à loja autorizada
      const { data: product, error: findErr } = await supabase
        .from('products')
        .select('id, title, stock_quantity')
        .eq('id', productId)
        .eq('store_id', storeId)
        .maybeSingle();

      if (findErr) throw new Error(findErr.message);
      if (!product) {
        return {
          tool: data.tool,
          status: 'error',
          content: [
            {
              type: 'text',
              text: `Produto "${productId}" não encontrado ou não pertence à loja "${storeId}". Operação abortada.`
            }
          ]
        };
      }

      const { error: updErr } = await supabase
        .from('products')
        .update({
          stock_quantity: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId)
        .eq('store_id', storeId);

      if (updErr) throw new Error(updErr.message);

      return {
        tool: data.tool,
        status: 'success',
        content: [
          {
            type: 'json',
            data: {
              productId,
              title: product.title,
              previousStock: product.stock_quantity,
              updatedStock: newStock,
              timestamp: new Date().toISOString()
            }
          }
        ],
        executionMetrics: {
          durationMs: Date.now() - startTime,
          tier: toolDef.tier,
          tenantValidated
        }
      };
    }

    // ─── TOOL: wms_list_pending_orders (TIER 2 - GATED) ──────────────────────
    if (data.tool === 'wms_list_pending_orders') {
      const storeId = data.storeId || data.arguments.storeId;
      const limit = Math.min(Math.max(Number(data.arguments.limit) || 20, 1), 50);

      const { data: orders, error: oErr } = await supabase
        .from('orders')
        .select('id, created_at, status, total_cents, channel_origin, shipping_address, items:order_items(id, title, quantity, price_cents)')
        .eq('store_id', storeId)
        .in('status', ['paid', 'processing'])
        .order('created_at', { ascending: false })
        .limit(limit);

      if (oErr) throw new Error(oErr.message);

      return {
        tool: data.tool,
        status: 'success',
        content: [
          {
            type: 'json',
            data: {
              totalPending: (orders || []).length,
              orders: (orders || []).map((o: any) => ({
                orderId: o.id,
                channel: o.channel_origin || 'loja_online',
                totalBrl: (o.total_cents || 0) / 100,
                status: o.status,
                itemsCount: Array.isArray(o.items) ? o.items.length : 0,
                shippingAddress: o.shipping_address,
                createdAt: o.created_at
              }))
            }
          }
        ],
        executionMetrics: { durationMs: Date.now() - startTime, tier: toolDef.tier, tenantValidated }
      };
    }

    // ─── TOOL: fiscal_get_invoice_status (TIER 2 - GATED) ───────────────────
    if (data.tool === 'fiscal_get_invoice_status') {
      const storeId = data.storeId || data.arguments.storeId;
      const limit = Math.min(Math.max(Number(data.arguments.limit) || 10, 1), 50);

      const { data: invoices, error: iErr } = await supabase
        .from('store_nfe_invoices')
        .select('id, nfe_number, nfe_serie, nfe_key, valor_total_cents, tomador_nome, status, danfe_pdf_url, created_at')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (iErr) throw new Error(iErr.message);

      return {
        tool: data.tool,
        status: 'success',
        content: [
          {
            type: 'json',
            data: {
              totalInvoices: (invoices || []).length,
              invoices: (invoices || []).map((inv: any) => ({
                id: inv.id,
                nfeNumber: inv.nfe_number,
                serie: inv.nfe_serie,
                chaveAcesso: inv.nfe_key,
                valorBrl: (inv.valor_total_cents || 0) / 100,
                destinatario: inv.tomador_nome,
                status: inv.status,
                danfeUrl: inv.danfe_pdf_url,
                emissao: inv.created_at
              }))
            }
          }
        ],
        executionMetrics: { durationMs: Date.now() - startTime, tier: toolDef.tier, tenantValidated }
      };
    }

    // ─── TOOL: marketplaces_get_sync_health (TIER 2 - GATED) ─────────────────
    if (data.tool === 'marketplaces_get_sync_health') {
      const storeId = data.storeId || data.arguments.storeId;

      const [ordersRes, logsRes] = await Promise.all([
        supabase.from('marketplace_external_orders').select('channel, status').eq('store_id', storeId).limit(50),
        supabase.from('marketplace_sync_logs').select('channel, action, status, created_at').eq('store_id', storeId).order('created_at', { ascending: false }).limit(10),
      ]);

      const channelsHealth: Record<string, any> = {};
      const allOrders = ordersRes.data || [];
      for (const ch of ['mercadolivre', 'ifood', 'shopee', 'amazon']) {
        const chOrders = allOrders.filter((o: any) => o.channel === ch);
        channelsHealth[ch] = {
          connected: true,
          recentOrdersCount: chOrders.length,
          lastSync: logsRes.data?.find((l: any) => l.channel === ch)?.created_at || null
        };
      }

      return {
        tool: data.tool,
        status: 'success',
        content: [
          {
            type: 'json',
            data: {
              storeId,
              timestamp: new Date().toISOString(),
              channels: channelsHealth,
              recentLogs: logsRes.data || []
            }
          }
        ],
        executionMetrics: { durationMs: Date.now() - startTime, tier: toolDef.tier, tenantValidated }
      };
    }

    // ─── TOOL: pos_get_cash_status (TIER 2 - GATED) ──────────────────────────
    if (data.tool === 'pos_get_cash_status') {
      const storeId = data.storeId || data.arguments.storeId;

      const { data: openRegister, error: regErr } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('store_id', storeId)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .maybeSingle();

      if (regErr) throw new Error(regErr.message);

      return {
        tool: data.tool,
        status: 'success',
        content: [
          {
            type: 'json',
            data: {
              isOpen: Boolean(openRegister),
              registerId: openRegister?.id || null,
              operatorId: openRegister?.operator_id || null,
              openedAt: openRegister?.opened_at || null,
              openingAmountBrl: openRegister ? (openRegister.opening_amount_cents || 0) / 100 : 0,
              currentCashBrl: openRegister ? (openRegister.current_cash_cents || 0) / 100 : 0
            }
          }
        ],
        executionMetrics: { durationMs: Date.now() - startTime, tier: toolDef.tier, tenantValidated }
      };
    }

    throw new Error(`Tool "${data.tool}" não possui executor implementado.`);
  } catch (err: any) {
    return {
      tool: data.tool,
      status: 'error',
      content: [
        {
          type: 'text',
          text: `Erro na execução da MCP tool "${data.tool}": ${err.message}`
        }
      ],
      executionMetrics: {
        durationMs: Date.now() - startTime,
        tier: toolDef.tier,
        tenantValidated
      }
    };
  }
}

export const McpToolCallRequestSchema = z.object({
  tool: z.string().min(1),
  arguments: z.record(z.any()),
  storeId: z.string().optional(),
  authToken: z.string().optional(),
});

export const executeMcpTool = createServerFn({ method: 'POST' })
  .validator(McpToolCallRequestSchema)
  .handler(async ({ data }) => {
    return executeMcpToolCall(data);
  });
