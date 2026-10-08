import type { BlockManifest, InspectorField } from "./builder-types";

export interface BuilderManifestContractIssue {
  blockType: string;
  ruleId: string;
  path: string;
  message: string;
}

function schemaKeys(schema: unknown): Set<string> | null {
  const candidate = schema as any;
  if (!candidate || typeof candidate !== "object") return null;
  if (candidate.shape && typeof candidate.shape === "object") {
    return new Set(Object.keys(candidate.shape));
  }
  const shape = candidate._def?.shape;
  if (typeof shape === "function") {
    const value = shape();
    return value && typeof value === "object" ? new Set(Object.keys(value)) : null;
  }
  if (shape && typeof shape === "object") return new Set(Object.keys(shape));
  return null;
}

function validateInspectorFields(
  fields: InspectorField[] | undefined,
  schema: unknown,
  blockType: string,
  surface: string,
  issues: BuilderManifestContractIssue[],
) {
  if (!fields) return;
  const keys = schemaKeys(schema);
  if (!keys) {
    if (surface.includes(".array")) {
      for (const field of fields) {
        if (!field.name || !field.label || !field.type) {
          issues.push({
            blockType,
            ruleId: "BUILDER_INSPECTOR_FIELD_INCOMPLETE",
            path: `${blockType}.inspector.${surface}.${field.name || "unknown"}`,
            message: "Campo do Inspector precisa de name, label e type.",
          });
        }
      }
      return;
    }
    issues.push({
      blockType,
      ruleId: "BUILDER_INSPECTOR_SCHEMA_UNREADABLE",
      path: `${blockType}.inspector.${surface}`,
      message: `Não foi possível determinar os campos do schema ${surface}.`,
    });
    return;
  }
  for (const field of fields) {
    if (!field.name || !field.label || !field.type) {
      issues.push({
        blockType,
        ruleId: "BUILDER_INSPECTOR_FIELD_INCOMPLETE",
        path: `${blockType}.inspector.${surface}.${field.name || "unknown"}`,
        message: "Campo do Inspector precisa de name, label e type.",
      });
      continue;
    }
    if (!keys.has(field.name)) {
      issues.push({
        blockType,
        ruleId: "BUILDER_INSPECTOR_FIELD_NOT_IN_SCHEMA",
        path: `${blockType}.inspector.${surface}.${field.name}`,
        message: `Campo ${field.name} não existe no schema ${surface}.`,
      });
    }
    if (field.type === "select" && (!field.options || field.options.length === 0)) {
      issues.push({
        blockType,
        ruleId: "BUILDER_INSPECTOR_SELECT_WITHOUT_OPTIONS",
        path: `${blockType}.inspector.${surface}.${field.name}`,
        message: "Campo select precisa declarar pelo menos uma opção.",
      });
    }
    if (field.type === "array") {
      validateInspectorFields(field.arrayFields, undefined, blockType, `${surface}.${field.name}.array`, issues);
    }
  }
}

function validateDefaultProps(
  blockType: string,
  manifest: BlockManifest,
  issues: BuilderManifestContractIssue[],
) {
  const defaults = manifest.defaultProps || {};
  if (defaults.block_type !== blockType) {
    issues.push({ blockType, ruleId: "BUILDER_DEFAULT_BLOCK_TYPE_MISMATCH", path: `${blockType}.defaultProps.block_type`, message: `defaultProps.block_type deve ser ${blockType}.` });
  }
  if (!defaults.node_type) {
    issues.push({ blockType, ruleId: "BUILDER_DEFAULT_NODE_TYPE_MISSING", path: `${blockType}.defaultProps.node_type`, message: "defaultProps.node_type é obrigatório." });
  }
  const surfaces: Array<[string, keyof BlockManifest, string]> = [
    ["content", "contentSchema", "content"],
    ["layout", "layoutSchema", "layout_rules"],
    ["design", "styleSchema", "design_tokens"],
  ];
  for (const [label, schemaKey, valueKey] of surfaces) {
    const schema = manifest[schemaKey];
    if (!schema) continue;
    const result = (schema as any).safeParse(defaults[valueKey as keyof typeof defaults] ?? {});
    if (!result.success) {
      issues.push({
        blockType,
        ruleId: `BUILDER_DEFAULT_${label.toUpperCase()}_INVALID`,
        path: `${blockType}.defaultProps.${valueKey}`,
        message: result.error.issues.map((issue: any) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
      });
    }
  }
}

export function validateBuilderManifest(blockType: string, manifest: BlockManifest): BuilderManifestContractIssue[] {
  const issues: BuilderManifestContractIssue[] = [];
  if (manifest.type !== blockType) issues.push({ blockType, ruleId: "BUILDER_MANIFEST_TYPE_MISMATCH", path: `${blockType}.type`, message: `Manifest type deve ser ${blockType}.` });
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) issues.push({ blockType, ruleId: "BUILDER_MANIFEST_VERSION_INVALID", path: `${blockType}.version`, message: "Version deve usar semver (x.y.z)." });
  if (!manifest.name || !manifest.description) issues.push({ blockType, ruleId: "BUILDER_MANIFEST_METADATA_INCOMPLETE", path: blockType, message: "Manifest precisa de name e description." });
  validateDefaultProps(blockType, manifest, issues);
  validateInspectorFields(manifest.inspector?.content, manifest.contentSchema, blockType, "content", issues);
  validateInspectorFields(manifest.inspector?.layout, manifest.layoutSchema, blockType, "layout", issues);
  validateInspectorFields(manifest.inspector?.design, manifest.styleSchema, blockType, "design", issues);
  return issues;
}

export function validateBuilderRegistry(registry: Record<string, BlockManifest>): BuilderManifestContractIssue[] {
  return Object.entries(registry).flatMap(([blockType, manifest]) => validateBuilderManifest(blockType, manifest));
}
