import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listPickingBatches, scanBarcodePickItem } from "@/services/wms.functions";

export interface PickingBatch {
  id: string;
  company_id?: string;
  store_id?: string;
  batch_number?: string;
  mode?: string;
  status: string;
  zone?: string | null;
  channel?: string | null;
  picker_id?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  photo_url?: string | null;
  sealed?: boolean;
  label_printed?: boolean;
  notes?: string | null;
  created_at: string;
}

export interface PickingItem {
  id: string;
  batch_id?: string;
  order_id?: string | null;
  product_id?: string | null;
  product_name: string;
  quantity_requested: number;
  quantity_picked: number | null;
  location_code?: string | null;
  status: string;
  substitute_product_id?: string | null;
  substitute_name?: string | null;
  substitute_accepted?: boolean | null;
  picked_at?: string | null;
  picker_notes?: string | null;
  sort_order: number;
  created_at: string;
}

export function usePickingBatches(companyId?: string) {
  return useQuery({
    queryKey: ["picking-batches", companyId],
    queryFn: async () => {
      const data = await listPickingBatches();
      return (data || []) as unknown as PickingBatch[];
    },
  });
}

export function usePickingItems(batchId: string | undefined) {
  return useQuery({
    queryKey: ["picking-items", batchId],
    enabled: !!batchId,
    queryFn: async () => {
      const batches = await listPickingBatches();
      const current = batches.find((b: any) => b.id === batchId);
      return (current?.sessions || []) as unknown as PickingItem[];
    },
  });
}

export function useScanPickItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { sessionId: string; barcode: string }) => {
      return scanBarcodePickItem({ data: args });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["picking-batches"] });
      qc.invalidateQueries({ queryKey: ["wms-batches"] });
    },
  });
}
