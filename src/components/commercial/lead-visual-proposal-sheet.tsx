import { UnifiedProposalWorkspace, type UnifiedProposalWorkspaceLead } from "@/components/tourism/unified-proposal-workspace";

export interface LeadVisualProposalSheetProps {
  isOpen: boolean;
  onClose: () => void;
  lead: UnifiedProposalWorkspaceLead | null;
  storeId?: string;
  onSuccess?: () => void;
}

/**
 * LeadVisualProposalSheet — Wrapper canônico de compatibilidade que delega
 * para o UnifiedProposalWorkspace (fusão dos 3 builders).
 */
export function LeadVisualProposalSheet({
  isOpen,
  onClose,
  lead,
  onSuccess,
}: LeadVisualProposalSheetProps) {
  return (
    <UnifiedProposalWorkspace
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      lead={lead}
      mode="kanban_lead_quote"
      onCreated={() => {
        if (onSuccess) onSuccess();
      }}
    />
  );
}
