import type { ExperienceNode } from "@/lib/builder/builder-types";
import type { OmniPageDocument } from "@/types/omni-builder";

/** Tipos canônicos do Omni continuam distintos; o renderer legado os recebe sob namespace. */
export const OMNI_EXPERIENCE_NODE_PREFIX = "waesy_omni:";

const MOTION_TRIGGER: Record<string, string> = {
  fade: "fade_up",
  "slide-up": "fade_up",
  "zoom-in": "zoom_in",
  stagger: "stagger",
};

export function omniPageToExperienceNodes(document: OmniPageDocument): ExperienceNode[] {
  return document.blocks.map((block, index) => {
    const styling = block.styling ?? {};
    const motionTrigger = styling.scrollAnimation
      ? MOTION_TRIGGER[styling.scrollAnimation]
      : undefined;

    return {
      id: block.id,
      node_type: "element",
      block_type: `${OMNI_EXPERIENCE_NODE_PREFIX}${block.type}` as ExperienceNode["block_type"],
      content: structuredClone(block.config ?? {}),
      design_tokens: {
        ...(styling.backgroundColor ? { backgroundColor: styling.backgroundColor } : {}),
        ...(styling.textColor ? { textColor: styling.textColor } : {}),
        ...(motionTrigger
          ? {
              animation: {
                trigger: motionTrigger,
                delayMs: styling.animationDelayMs ?? 0,
              },
            }
          : {}),
        omniStyling: structuredClone(styling),
      },
      layout_rules: {},
      responsive_overrides: {},
      data_bindings: {},
      action_bindings: {},
      sort_order: index,
      is_hidden: block.isHidden ?? false,
      ...(block.assetRefs ? { asset_refs: structuredClone(block.assetRefs) } : {}),
    } as ExperienceNode;
  });
}
