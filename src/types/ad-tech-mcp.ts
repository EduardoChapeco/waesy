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
  destinationUrl: string | null;
  recommendedImageUrl: string | null;
  displayUrlText?: string;
  sponsorHandle?: string;
}

export interface CampaignTargetingBlueprint {
  locationLabel: string | null;
  radiusKm: number | null;
  ageRange: [number, number] | null;
  interestTags: string[];
  potentialAudienceReach: null;
}

export interface DynamicRenderableBlock {
  blockType: 'CAMPAIGN_PROPOSAL_CARD';
  blockId: string;
  version: '1.0';
  metadata: {
    generatedAt: string;
    sourcePrompt: string;
    provenance: {
      source: 'ai_generated_draft';
      provider: string | null;
      model: string | null;
    };
    planningAssumptions: string[];
  };
  payload: {
    campaignTitle: string;
    platform: AdPlatform;
    status: 'draft_pending_approval';
    budget: {
      dailyCents: number;
      durationDays: number;
      totalCents: number;
      suggestedBiddingStrategy: 'not_selected';
    };
    targeting: CampaignTargetingBlueprint;
    creative: CampaignCreativeMockup;
    actionButtons: {
      primaryAction: {
        label: 'Salvar proposta no Waesy';
        apiEndpoint: '/api/marketing/campaigns/approve';
      };
      secondaryAction: {
        label: 'Editar Parâmetros';
        actionType: 'TOGGLE_EXPANDED_EDITOR';
      };
    };
  };
}
