import { useCallback, useRef, useState } from "react";
import { SearchableSelect, type SearchableOption } from "@/components/ui/searchable-select";
import { listCustomers } from "@/services/crm.functions";

export interface CrmCustomerRecord {
  id: string;
  full_name?: string | null;
  legal_name?: string | null;
  name?: string | null;
  phone?: string | null;
  mobile?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  document?: string | null;
  document_number?: string | null;
  cpf?: string | null;
  city?: string | null;
  state?: string | null;
}

interface CustomerSearchComboboxProps {
  value?: string;
  onSelectCustomer: (customer: CrmCustomerRecord | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  clearable?: boolean;
  selectedLabel?: string;
}

/**
 * Reusable server-side searchable CRM customer picker.
 * Queries `listCustomers` incrementally (limit 25) instead of preloading full customer lists.
 */
export function CustomerSearchCombobox({
  value = "",
  onSelectCustomer,
  placeholder = "Buscar cliente no CRM...",
  searchPlaceholder = "Digite nome, telefone ou CPF...",
  disabled = false,
  className,
  clearable = true,
  selectedLabel,
}: CustomerSearchComboboxProps) {
  const cacheRef = useRef<Map<string, CrmCustomerRecord>>(new Map());
  const [selectedOptionFallback, setSelectedOptionFallback] = useState<SearchableOption | null>(
    () => (value && selectedLabel ? { value, label: selectedLabel } : null),
  );

  const handleSearch = useCallback(async (query: string): Promise<SearchableOption[]> => {
    const res = await listCustomers({
      data: {
        query: query.trim() || undefined,
        limit: 25,
      },
    });
    const list: CrmCustomerRecord[] = Array.isArray((res as { customers?: CrmCustomerRecord[] })?.customers)
      ? (res as { customers: CrmCustomerRecord[] }).customers
      : Array.isArray(res)
        ? (res as CrmCustomerRecord[])
        : [];

    return list.map((c) => {
      cacheRef.current.set(c.id, c);
      const displayName = c.full_name || c.legal_name || c.name || "Cliente sem nome";
      const contact = c.phone || c.mobile || c.whatsapp || c.email || "";
      return {
        value: c.id,
        label: displayName,
        sublabel: [contact, c.city].filter(Boolean).join(" · ") || undefined,
      };
    });
  }, []);

  const handleChange = useCallback(
    (selectedId: string) => {
      if (!selectedId) {
        setSelectedOptionFallback(null);
        onSelectCustomer(null);
        return;
      }
      const customer = cacheRef.current.get(selectedId) ?? null;
      if (customer) {
        const displayName =
          customer.full_name || customer.legal_name || customer.name || "Cliente selecionado";
        const contact = customer.phone || customer.mobile || customer.whatsapp || "";
        setSelectedOptionFallback({
          value: customer.id,
          label: displayName,
          sublabel: contact || undefined,
        });
      }
      onSelectCustomer(customer);
    },
    [onSelectCustomer],
  );

  return (
    <SearchableSelect
      value={value}
      onChange={handleChange}
      onSearch={handleSearch}
      selectedOptionFallback={
        selectedOptionFallback?.value === value
          ? selectedOptionFallback
          : value && selectedLabel
            ? { value, label: selectedLabel }
            : null
      }
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      disabled={disabled}
      className={className}
      clearable={clearable}
    />
  );
}
