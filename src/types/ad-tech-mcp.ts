/**
 * Contrato Canônico de Tipos: Ad-Tech Omnichannel & Blocos Dinâmicos MCP
 * Utilizado pelo Servidor MCP (mcp-server.functions.ts) e pela UI do Workspace
 */

export type AdPlatform = 'meta_instagram' | 'meta_facebook' | 'google_search' | 'omnichannel_local';
export type AdPlacementFormat = 'feed_square_1x1' | 'stories_vertical_9x16' | 'search_snippet' | 'banner_horizontal';

export interface CampaignCreativeMockup {
  format: AdPlacementFormat;
  headline: string;
  bodyCopy: string;
  callToActionLabel: 'Comprar Agora' | 'Saiba Mais' | 'Garantir Ingresso' | 'Fazer Reserva' | 'Chamar no WhatsApp';
  destinationUrl: string;
  recommendedImageUrl: string;
  displayUrlText?: string;
  sponsorHandle?: string;
}

export interface CampaignTargetingBlueprint {
  locationLabel: string;
  radiusKm: number;
  ageRange: [number, number];
  interestTags: string[];
  potentialAudienceReach: {
    minDailyImpressions: number;
    maxDailyImpressions: number;
    estimatedCpaCents: number;
  };
}

export interface DynamicRenderableBlock {
  blockType: 'CAMPAIGN_PROPOSAL_CARD';
  blockId: string;
  version: '1.0';
  metadata: {
    generatedAt: string;
    sourcePrompt: string;
    modelPersona: 'AdTech-Optimizer-V4';
  };
  payload: {
    campaignTitle: string;
    platform: AdPlatform;
    status: 'draft_pending_approval';
    budget: {
      dailyCents: number;
      durationDays: number;
      totalCents: number;
      suggestedBiddingStrategy: 'LOWEST_COST_MAX_CONVERSIONS';
    };
    targeting: CampaignTargetingBlueprint;
    creative: CampaignCreativeMockup;
    actionButtons: {
      primaryAction: {
        label: 'Aprovar & Ativar Campanha';
        apiEndpoint: '/api/marketing/campaigns/approve';
        payloadToken: string;
      };
      secondaryAction: {
        label: 'Editar Parâmetros';
        actionType: 'TOGGLE_EXPANDED_EDITOR';
      };
    };
  };
}
