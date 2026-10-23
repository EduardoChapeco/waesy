"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Building,
  Home,
  Briefcase,
  Heart,
  Star,
  Edit2,
  FileText,
  CheckCircle2,
  Phone,
  User,
} from "lucide-react";
import { formatCep, formatPhone } from "@/lib/document-validator";
import { cn } from "@/lib/utils";
import type { UserAddressDTO } from "@/services/addresses.functions";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";
import { AddressInstructionsModal } from "./address-instructions-modal";

interface AddressCardHubProps {
  address: UserAddressDTO;
  isSelected?: boolean;
  onSelect?: () => void;
  onEdit: (addr: UserAddressDTO) => void;
  onDelete?: (id: string) => void;
  onSetDefault?: (addr: UserAddressDTO) => void;
  onUpdated?: (addr: UserAddressDTO) => void;
  mode?: "account" | "checkout";
  isRecommended?: boolean;
}

export function AddressCardHub({
  address,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  onSetDefault,
  onUpdated,
  mode = "account",
  isRecommended = false,
}: AddressCardHubProps) {
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);

  const getIconElement = (iconName?: string) => {
    switch (iconName) {
      case "building":
        return <Building className="size-4" />;
      case "briefcase":
        return <Briefcase className="size-4" />;
      case "heart":
        return <Heart className="size-4" />;
      case "map_pin":
        return <MapPin className="size-4" />;
      case "home":
      default:
        return <Home className="size-4" />;
    }
  };

  const hasInstructions = Boolean(
    address.instructions || address.reference_point || address.block_tower || address.intercom_code
  );

  return (
    <>
      <div
        className={cn(
          "rounded-lg border p-4 sm:p-5 flex flex-col justify-between gap-4 transition-colors motion-reduce:transition-none bg-card text-left relative",
          isSelected
            ? "border-primary ring-2 ring-primary/20 bg-primary/5"
            : address.is_default
            ? "border-border/80"
            : "border-border/60 hover:border-border"
        )}
      >
        {/* Cabeçalho do Card */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {mode === "checkout" ? (
              <button
                type="button"
                onClick={onSelect}
                aria-label={`Selecionar endereço ${address.street}, ${address.number}`}
                className={cn(
                  "size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <div
                  className={cn(
                    "size-5 rounded-full border-2 flex items-center justify-center transition-colors",
                    isSelected
                      ? "border-primary-foreground bg-primary-foreground"
                      : "border-muted-foreground bg-background"
                  )}
                >
                  {isSelected && <div className="size-2 rounded-full bg-primary" />}
                </div>
              </button>
            ) : (
              <div
                className={cn(
                  "size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center shrink-0 border border-border/40",
                  address.is_default ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                {getIconElement(address.icon)}
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-foreground break-words text-wrap leading-tight">
                  {address.street}, {address.number}
                </span>

                {address.is_default && (
                  <Badge variant="secondary" className="text-xs px-2 py-0 h-5 font-bold">
                    Endereço predefinido
                  </Badge>
                )}

                {isRecommended && (
                  <Badge
                    variant="outline"
                    className="text-xs px-2 py-0 h-5 font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                  >
                    Recomendado
                  </Badge>
                )}

                {address.is_apartment && (
                  <Badge variant="outline" className="text-xs px-2 py-0 h-5 font-bold text-primary border-primary/30">
                    Apto/Condomínio
                  </Badge>
                )}
              </div>

              {/* Complemento */}
              {address.complement && (
                <p className="text-xs text-muted-foreground break-words text-wrap">
                  {address.complement}
                </p>
              )}

              {/* Bairro, Cidade, Estado e CEP */}
              <p className="text-xs text-muted-foreground break-words text-wrap">
                {address.neighborhood}, {address.city} - {address.state}, CEP {formatCep(address.zipcode)}
              </p>

              {/* Destinatário e Telefone (Mercado Livre Image 1 & 2) */}
              {(address.recipient_name || address.recipient_phone) && (
                <div className="flex items-center gap-2 pt-1 text-xs text-foreground font-medium flex-wrap">
                  {address.recipient_name && (
                    <span className="flex items-center gap-1">
                      <User className="size-3 text-muted-foreground" />
                      <span>{address.recipient_name}</span>
                    </span>
                  )}
                  {address.recipient_phone && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="size-3 text-muted-foreground" />
                      <span>{formatPhone(address.recipient_phone)}</span>
                    </span>
                  )}
                </div>
              )}

              {/* Bloco / Interfone / Ponto de Referência resumido */}
              {(address.block_tower || address.intercom_code || address.reference_point) && (
                <div className="pt-1 text-xs text-muted-foreground space-y-1">
                  {(address.block_tower || address.intercom_code) && (
                    <p className="font-medium text-foreground/80">
                      {address.block_tower ? `Bloco/Torre: ${address.block_tower}` : ""}
                      {address.block_tower && address.intercom_code ? " • " : ""}
                      {address.intercom_code ? `Interfone: ${address.intercom_code}` : ""}
                    </p>
                  )}
                  {address.reference_point && (
                    <p className="italic">Ref: {address.reference_point}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Menu de ações do card no modo Conta */}
          {mode === "account" && onDelete && (
            <div className="shrink-0">
              <CrudActionsMenu
                entityName="Endereço"
                onDelete={() => onDelete(address.id)}
                deleteConfirmTitle="Excluir endereço?"
                deleteConfirmDescription={`Remover ${address.street}, ${address.number} (${address.city})?`}
                customActions={[
                  ...(!address.is_default && onSetDefault
                    ? [
                        {
                          id: "set-default",
                          label: "Tornar Predefinido",
                          icon: Star,
                          onClick: () => onSetDefault(address),
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          )}
        </div>

        {/* ── Linha de Ações Interativas (Mercado Livre Image 2: "Editar endereço" / "Adicionar indicações") ── */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/40 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onEdit(address)}
              className="min-h-11 px-2 text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
            >
              <Edit2 className="size-3" />
              <span>Editar endereço</span>
            </button>

            <button
              type="button"
              onClick={() => setIsInstructionsOpen(true)}
              className="min-h-11 px-2 text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
            >
              <FileText className="size-3" />
              <span>{hasInstructions ? "Editar indicações" : "Adicionar indicações"}</span>
            </button>
          </div>

          <div>
            {!address.is_default && onSetDefault && (
              <button
                type="button"
                onClick={() => onSetDefault(address)}
                className="min-h-11 px-2 text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
              >
                <CheckCircle2 className="size-3" />
                <span>Escolher como predefinido</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal Dedicado de Indicações de Entrega */}
      <AddressInstructionsModal
        isOpen={isInstructionsOpen}
        onClose={() => setIsInstructionsOpen(false)}
        address={address}
        onSuccess={(updated) => {
          onUpdated?.(updated);
        }}
      />
    </>
  );
}
