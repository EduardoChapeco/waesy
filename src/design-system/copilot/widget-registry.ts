import * as React from "react";
import { InChatDataTable } from "./in-chat-data-table";
import { InChatApproval } from "./in-chat-approval";
import { InChatProductCarousel } from "./in-chat-product-carousel";
import { InChatForm } from "./in-chat-form";
import { FlightSearchWidget } from "../travel/flight-search-widget";
import { TravelSearchResults } from "../travel/travel-search-results";
import { TravelIntentCard } from "../travel/travel-intent-card";

export interface StructuredWidgetPayload {
  type: "widget";
  widget: string;
  data: unknown;
}

export type WidgetComponent<T = any> = React.ComponentType<T>;

class WidgetRegistryService {
  private registry = new Map<string, WidgetComponent<any>>();

  constructor() {
    // Register canonical built-in widgets
    this.register("data-table", InChatDataTable);
    this.register("approval", InChatApproval);
    this.register("flight-search", FlightSearchWidget);
    this.register("travel-offers", TravelSearchResults);
    this.register("travel-intent", TravelIntentCard);
    this.register("product-carousel", InChatProductCarousel);
    this.register("form", InChatForm);
  }

  public register<T>(widgetName: string, component: WidgetComponent<T>): void {
    this.registry.set(widgetName, component);
  }

  public get(widgetName: string): WidgetComponent<any> | undefined {
    return this.registry.get(widgetName);
  }

  public has(widgetName: string): boolean {
    return this.registry.has(widgetName);
  }

  public list(): string[] {
    return Array.from(this.registry.keys());
  }
}

export const WidgetRegistry = new WidgetRegistryService();

/**
 * Renderizador declarativo de widget sem switch gigantes
 */
export function renderCopilotWidget(payload: StructuredWidgetPayload): React.ReactNode {
  const Component = WidgetRegistry.get(payload.widget);
  if (!Component) {
    return null;
  }
  return React.createElement(Component, payload.data as any);
}
