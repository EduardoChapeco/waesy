export type WaesySkillSurface = "copilot" | "agent" | "builder" | "editor" | "mining" | "qa";

export interface WaesyRuntimeSkill {
  slug: string;
  version: string;
  description: string;
  surfaces: WaesySkillSurface[];
  capabilities: string[];
  allowedTools: string[];
  requiredRole?: string;
}

const RUNTIME_SKILLS: readonly WaesyRuntimeSkill[] = [
  {
    slug: "waesy-copilot-orchestration",
    version: "1.0.0",
    description: "Fragmenta pedidos, seleciona squads e executa o loop ReAct com verificação.",
    surfaces: ["copilot", "agent", "builder", "editor", "mining", "qa"],
    capabilities: ["prompt_fragmentation", "react_loop", "tool_calling", "evidence_validation", "artifact_delivery"],
    allowedTools: ["mcp", "gateway", "mining", "builder_registry", "design_tokens"],
  },
];

export function listRuntimeSkills(surface?: WaesySkillSurface): WaesyRuntimeSkill[] {
  return RUNTIME_SKILLS.filter((skill) => !surface || skill.surfaces.includes(surface)).map((skill) => ({ ...skill, surfaces: [...skill.surfaces], capabilities: [...skill.capabilities], allowedTools: [...skill.allowedTools] }));
}

export function getRuntimeSkill(slug: string, surface?: WaesySkillSurface): WaesyRuntimeSkill | undefined {
  return listRuntimeSkills(surface).find((skill) => skill.slug === slug);
}

export function canUseRuntimeSkill(slug: string, surface: WaesySkillSurface, role?: string): boolean {
  const skill = getRuntimeSkill(slug, surface);
  return Boolean(skill && (!skill.requiredRole || skill.requiredRole === role));
}
