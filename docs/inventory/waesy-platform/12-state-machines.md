# 12 — Inventário de Máquinas de Estado e Transições

## 1. Ciclo de Vida do Pedido (`orders`)
```text
[draft / cart] ──(finalizar)──> [pending_payment]
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼ (webhook pago)                      ▼ (expirou / recusado)
             [payment_approved]                       [cancelled]
                    │
                    ▼ (lojista aceitou)
             [in_preparation]
                    │
                    ▼ (embalado)
             [ready_for_dispatch]
                    │
                    ▼ (motoboy coletou)
             [in_transit]
                    │
                    ▼ (entregue ao cliente)
             [delivered] ──(após 7 dias)──> [completed]
```

## 2. Ciclo de Vida da Cotação de Turismo (`travel_proposals`)
```text
[draft] ──(enviar ao cliente)──> [sent]
                                   │
                    ┌──────────────┴──────────────┐
                    ▼ (cliente aprovou)           ▼ (cliente recusou / expirou)
             [approved]                       [lost / expired]
                    │
                    ▼ (gerar reserva)
             [converted_to_booking] ──(emitir voucher)──> [voucher_issued]
```

## 3. Ciclo de Vida do Documento no Omni Builder (`omni_documents`)
```text
[draft (em edição em settings.omni_page_draft)]
       │
       ▼ (clique em Publicar)
[published (gravado em settings.omni_page_published + snapshot em omni_document_versions)]
       │
       ▼ (clique em Restaurar Versão Anterior)
[rollback (versão histórica restaurada atomicamente)]
```
