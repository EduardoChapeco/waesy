const fs = require('fs');

// 1. Atualizar ads.functions.ts
let adsContent = fs.readFileSync('src/services/ads.functions.ts', 'utf8');

const newApproveFunction = `
export const approveAndPublishAdCampaign = createServerFn({ method: "POST" })
  .validator(
    z.object({
      campaignTitle: z.string().min(1, "Título obrigatório"),
      platform: z.enum(["meta_instagram", "meta_facebook", "google_search", "omnichannel_local"]).default("meta_instagram"),
      dailyBudgetCents: z.number().positive("Orçamento deve ser positivo"),
      durationDays: z.number().int().positive().default(7),
      targeting: z.object({
        locationLabel: z.string(),
        radiusKm: z.number(),
        ageRange: z.tuple([z.number(), z.number()]),
        interestTags: z.array(z.string()),
      }),
      creative: z.object({
        format: z.string(),
        headline: z.string(),
        bodyCopy: z.string(),
        callToActionLabel: z.string(),
        destinationUrl: z.string(),
        recommendedImageUrl: z.string(),
      }),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

    const totalBudgetCents = data.dailyBudgetCents * data.durationDays;
    const now = new Date();
    const endsAt = new Date(now.getTime() + data.durationDays * 24 * 60 * 60 * 1000);

    const placementMap: Record<string, string[]> = {
      meta_instagram: ["feed", "story"],
      meta_facebook: ["feed"],
      google_search: ["search"],
      omnichannel_local: ["feed", "banner", "search", "story"],
    };

    const { data: inserted, error } = await supabase
      .from("ad_campaigns")
      .insert({
        store_id: identity.store_id,
        title: data.campaignTitle,
        type: data.platform.startsWith("meta") ? "social_boost" : "featured_placement",
        budget_cents: totalBudgetCents,
        status: "active",
        starts_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        placements: placementMap[data.platform] || ["feed"],
        settings: {
          platform: data.platform,
          daily_budget_cents: data.dailyBudgetCents,
          duration_days: data.durationDays,
          targeting: data.targeting,
          creative: data.creative,
          approved_by_user_id: identity.id,
          approved_at: now.toISOString(),
          created_via: "mcp_ai_voice_command",
        },
      })
      .select("id, title, status, budget_cents, created_at")
      .single();

    if (error) {
      console.error("[ads] Erro ao aprovar campanha via MCP:", error);
      throw new Error(\`Falha ao registrar campanha: \${error.message}\`);
    }

    return {
      success: true,
      campaignId: inserted.id,
      title: inserted.title,
      status: inserted.status,
      totalBudgetCents: inserted.budget_cents,
      message: \`Campanha "\${inserted.title}" aprovada e ativada com sucesso!\`,
    };
  });
`;

if (!adsContent.includes('approveAndPublishAdCampaign')) {
  adsContent += '\n' + newApproveFunction;
  fs.writeFileSync('src/services/ads.functions.ts', adsContent, 'utf8');
  console.log('[success] ads.functions.ts updated with approveAndPublishAdCampaign');
}

// 2. Atualizar mcp-server.functions.ts
let mcpContent = fs.readFileSync('src/services/mcp-server.functions.ts', 'utf8');

const mcpToolDefinition = `  {
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
`;

if (!mcpContent.includes('generate_ad_campaign_proposal')) {
  mcpContent = mcpContent.replace(
    "name: 'analyze_competitor_dna',",
    mcpToolDefinition + "    name: 'analyze_competitor_dna',"
  );

  const mcpHandlerExecution = `
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
        const matchMoney = prompt.match(/R\\$\\s*([0-9]+(?:[.,][0-9]{2})?)/i) || prompt.match(/([0-9]+)\\s*(?:reais|p\/dia|por dia)/i);
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
      const cleanTheme = prompt.replace(/(cria|campanha|anúncio|anuncio|meta ads|de r\\$\\s*[0-9]+|por dia)/gi, '').trim() || 'Destaques da Temporada';
      const titleCaseTheme = cleanTheme.charAt(0).toUpperCase() + cleanTheme.slice(1);

      const campaignTitle = \`Campanha: \${titleCaseTheme} • \${storeName}\`;
      const headline = \`\${titleCaseTheme} em \${city} — \${storeName}\`;
      const bodyCopy = \`Aproveite as melhores condições e novidades exclusivas da \${storeName} em \${city}. Clique abaixo para conferir ofertas imperdíveis e atendimento rápido via WhatsApp.\`;
      const destinationUrl = \`https://usewaesy.pages.dev/c/\${storeRow?.slug || storeId}\`;

      const blockPayload = {
        blockType: 'CAMPAIGN_PROPOSAL_CARD',
        blockId: \`mcp-camp-\${Date.now()}\`,
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
            locationLabel: \`\${city}, \${state} e raio de 25 km\`,
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
            displayUrlText: \`usewaesy.com/c/\${storeRow?.slug || 'loja'}\`,
            sponsorHandle: storeName
          },
          actionButtons: {
            primaryAction: {
              label: 'Aprovar & Ativar Campanha',
              apiEndpoint: '/api/marketing/campaigns/approve',
              payloadToken: \`sig_\${Date.now()}_\${storeId.slice(0, 8)}\`
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
            text: \`Proposta de campanha "\${campaignTitle}" gerada com sucesso via MCP com orçamento de R$ \${(dailyCents / 100).toFixed(2)}/dia.\`
          }
        ],
        executionMetrics: {
          durationMs: Date.now() - startTime,
          tier: toolDef.tier,
          tenantValidated
        }
      };
    }
`;

  mcpContent = mcpContent.replace(
    "if (data.tool === 'analyze_competitor_dna') {",
    mcpHandlerExecution + "    if (data.tool === 'analyze_competitor_dna') {"
  );

  fs.writeFileSync('src/services/mcp-server.functions.ts', mcpContent, 'utf8');
  console.log('[success] mcp-server.functions.ts updated with generate_ad_campaign_proposal');
}
