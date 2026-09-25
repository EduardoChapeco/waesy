import { CampaignDraftCard } from "@/components/adtech/campaign-draft-card";
import type { DynamicRenderableBlock } from "@/types/ad-tech-mcp";

export interface CampaignDynamicBlockProps {
  block: DynamicRenderableBlock;
  onApproved?: (campaignId: string) => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * CampaignDynamicBlock — Adaptador canônico para renderização de blocos MCP
 * Delega diretamente para o CampaignDraftCard (Apple HIG + Mockup Feed Instagram 1:1)
 */
export function CampaignDynamicBlock({
  block,
  onApproved,
  onDismiss,
  className,
}: CampaignDynamicBlockProps) {
  return (
    <CampaignDraftCard
      block={block}
      onApproved={onApproved}
      onDiscard={onDismiss}
      className={className}
    />
  );
}
