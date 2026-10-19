import {
  UnifiedProposalWorkspace,
  type UnifiedProposalWorkspaceProps,
} from "./unified-proposal-workspace";

export type UniversalQuoteProposalStudioProps = UnifiedProposalWorkspaceProps;

/**
 * UniversalQuoteProposalStudio — Wrapper canônico de compatibilidade que delega
 * para o UnifiedProposalWorkspace (fusão dos 3 builders de proposta).
 */
export function UniversalQuoteProposalStudio(props: UniversalQuoteProposalStudioProps) {
  return <UnifiedProposalWorkspace {...props} />;
}
