import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AtendimentoOverviewView } from "@/components/atendimento/AtendimentoOverviewView";
import { Button } from "@/components/ui/button";
import { getStoreSettings } from "@/services/store.functions";
import { listMarketplaceExternalOrders } from "@/services/marketplace-hub.functions";
import { reconcileExternalIFoodOrder } from "@/services/ifood-reconciliation.functions";
import {
  getAttendanceBusinessIntelligence,
  type AttendanceBusinessIntelligenceDTO,
} from "@/services/whatsapp-operations-metrics.functions";

export type AtendimentoSearch = {
  threadId?: string;
  search?: string;
  channelInstanceId?: string;
  storeId?: string;
  rangeDays?: 7 | 14 | 30 | 90;
  departmentSlug?: string;
  agentProfileId?: string;
};

function parseRangeDays(raw: unknown): 7 | 14 | 30 | 90 {
  const n = Number(raw);
  if (n === 7 || n === 14 || n === 30 || n === 90) return n;
  return 7;
}

const EMPTY_BI: AttendanceBusinessIntelligenceDTO = {
  storeId: "",
  rangeDays: 7,
  generatedAt: new Date(0).toISOString(),
  summary: {
    totalThreadsInPeriod: 0,
    openThreads: 0,
    unassignedThreads: 0,
    awaitingFirstResponse: 0,
    closedInPeriod: 0,
    avgFirstResponseSeconds: null,
    p95FirstResponseSeconds: null,
    avgResolutionSeconds: null,
    firstContactResolutionRate: null,
    csatAvg: null,
    csatCount: 0,
    workerStatus: "unknown",
    outboxPending: 0,
    outboxFailed: 0,
    outboxDeadLetter: 0,
  },
  dailySeries: [],
  channels: [],
  departments: [],
  agents: [],
  filters: {
    availableChannels: [],
    availableDepartments: [],
    availableAgents: [],
  },
};

export const Route = createFileRoute("/workspace/atendimento/")({
  head: () => ({ meta: [{ title: "Atendimento — Visão Geral & BI" }] }),
  validateSearch: (search: Record<string, unknown>): AtendimentoSearch => ({
    threadId: typeof search.threadId === "string" ? search.threadId : undefined,
    search: typeof search.search === "string" ? search.search : undefined,
    channelInstanceId:
      typeof search.channelInstanceId === "string" ? search.channelInstanceId : undefined,
    storeId: typeof search.storeId === "string" ? search.storeId : undefined,
    rangeDays: parseRangeDays(search.rangeDays),
    departmentSlug: typeof search.departmentSlug === "string" ? search.departmentSlug : undefined,
    agentProfileId: typeof search.agentProfileId === "string" ? search.agentProfileId : undefined,
  }),
  beforeLoad: ({ search }) => {
    if (search.threadId || search.search) {
      throw redirect({
        to: "/workspace/atendimento/chat" as any,
        search: {
          threadId: search.threadId,
          search: search.search,
          channelInstanceId: search.channelInstanceId,
          storeId: search.storeId,
        } as any,
      });
    }
  },
  loaderDeps: ({ search }) => ({
    storeId: search.storeId,
    rangeDays: search.rangeDays ?? 7,
    channelInstanceId: search.channelInstanceId,
    departmentSlug: search.departmentSlug,
    agentProfileId: search.agentProfileId,
  }),
  loader: async ({ deps }) => {
    try {
      const store = await getStoreSettings({ data: { store_id: deps?.storeId } }).catch(() => null);
      const storeId = store?.id || deps?.storeId || undefined;
      const bi = await getAttendanceBusinessIntelligence({
        data: {
          storeId,
          rangeDays: deps?.rangeDays ?? 7,
          channelInstanceId: deps?.channelInstanceId,
          departmentSlug: deps?.departmentSlug,
          agentProfileId: deps?.agentProfileId,
        },
      }).catch(() => ({ ...EMPTY_BI, storeId: storeId || "" }));

      return { store, bi };
    } catch (e) {
      console.warn("[workspace.atendimento] Fallback no loader BI:", e);
      return { store: null, bi: EMPTY_BI };
    }
  },
  component: WorkspaceAtendimentoOverviewPage,
});

function WorkspaceAtendimentoOverviewPage() {
  const { store, bi } = (Route.useLoaderData?.() as {
    store: { id?: string; name?: string | null } | null;
    bi: AttendanceBusinessIntelligenceDTO;
  }) || { store: null, bi: EMPTY_BI };
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [isReconcilingIfood, setIsReconcilingIfood] = useState(false);

  const handleFiltersChange = (next: {
    rangeDays?: 7 | 14 | 30 | 90;
    channelInstanceId?: string;
    departmentSlug?: string;
    agentProfileId?: string;
  }) => {
    navigate({
      to: "/workspace/atendimento" as any,
      search: {
        ...search,
        ...next,
      } as any,
    });
  };

  const handleReconcileRecentIfood = async () => {
    setIsReconcilingIfood(true);
    try {
      const orders = await listMarketplaceExternalOrders({ data: { platform: "ifood" } });
      if (!orders || orders.length === 0) {
        toast.info("Nenhum pedido iFood importado recentemente para conciliação com o chat.");
        return;
      }
      const latest = orders[0];
      const res = await reconcileExternalIFoodOrder({
        data: {
          autoLinkIfHighConfidence: true,
          order: {
            id: latest.external_order_id,
            displayId: latest.external_order_id.slice(0, 6).toUpperCase(),
            orderType: "DELIVERY",
            createdAt: latest.imported_at || new Date().toISOString(),
            orderTiming: "INSTANT",
            customer: {
              name: latest.buyer_name || "Cliente iFood",
            },
            delivery: {
              deliveryAddress: {
                streetName: "",
                streetNumber: "",
                neighborhood: "",
                city: "",
                state: "",
                postalCode: "",
              },
              deliveryBy: "MERCHANT",
            },
            items: (latest.items || []).map((it, idx) => ({
              id: String(idx + 1),
              name: it.title || "Item",
              quantity: Math.max(1, Number(it.quantity) || 1),
              unitPrice: (Number(it.unit_price_cents) || 0) / 100,
              totalPrice: ((Number(it.unit_price_cents) || 0) * (Number(it.quantity) || 1)) / 100,
            })),
            total: {
              subTotal: (Number(latest.subtotal_cents) || 0) / 100,
              deliveryFee: (Number(latest.shipping_cost_cents) || 0) / 100,
              benefits: 0,
              orderAmount: (Number(latest.total_amount_cents) || 0) / 100,
            },
          },
        },
      });
      toast.success(
        res.linkStatus === "AUTOMATICALLY_LINKED"
          ? `Pedido iFood #${res.displayId || res.orderId.slice(0, 6)} vinculado ao atendimento.`
          : `Conciliação concluída (${res.linkStatus}).`
      );
    } catch (err: any) {
      toast.error(err?.message || "Falha ao conciliar pedido iFood com o chat.");
    } finally {
      setIsReconcilingIfood(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <AtendimentoOverviewView
        bi={bi || EMPTY_BI}
        storeName={store?.name}
        filters={{
          rangeDays: search.rangeDays ?? 7,
          channelInstanceId: search.channelInstanceId,
          departmentSlug: search.departmentSlug,
          agentProfileId: search.agentProfileId,
        }}
        onFiltersChange={handleFiltersChange}
      />

      <section className="px-4 sm:px-6">
        <div className="rounded-lg border border-border/70 bg-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-foreground">Marketplaces & Conciliação iFood</h2>
            <p className="text-xs text-muted-foreground">
              Vincule pedidos recentes do iFood ao histórico de conversa ou responda perguntas pré-venda do Mercado Livre.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isReconcilingIfood}
              onClick={handleReconcileRecentIfood}
              className="h-11 min-h-11 rounded-lg text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isReconcilingIfood ? "Conciliando..." : "Conciliar Pedido iFood"}
            </Button>
            <Button
              asChild
              variant="secondary"
              className="h-11 min-h-11 rounded-lg text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Link to="/workspace/integracoes/marketplaces">
                Abrir Hub Marketplaces
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
