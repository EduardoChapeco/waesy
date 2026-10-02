export type DesignSystemStateMode = "all" | "ready" | "loading" | "empty" | "error";

export type DesignSystemFamily = "all" | "actions" | "forms" | "surfaces" | "overlays";

export interface ComponentStateProps {
  mode: DesignSystemStateMode;
}
