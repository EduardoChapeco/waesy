import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUserSession } from "@/services/auth.functions";

export interface RequireAuthOptions {
  title?: string;
  description?: string;
  actionContext?: string;
  returnUrl?: string;
  onSuccess?: () => void;
}

/**
 * useActionAuthGuard — Hook de Proteção em Ações Chave
 * Valida a sessão do usuário de forma reativa e não-bloqueante.
 * Se autenticado, executa imediatamente `onSuccess`.
 * Se anônimo, engatilha o modal de login contextual com retorno ao fluxo original.
 */
export function useActionAuthGuard() {
  const { data: session } = useQuery({
    queryKey: ["user-session"],
    queryFn: () => getUserSession(),
    staleTime: 1000 * 60 * 5, // 5 min
  });

  const isAuthenticated = Boolean(session?.id);

  const [isOpen, setIsOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<RequireAuthOptions>({});

  const requireAuth = useCallback(
    (options?: RequireAuthOptions) => {
      if (isAuthenticated) {
        options?.onSuccess?.();
        return true;
      }

      setModalConfig(options || {});
      setIsOpen(true);
      return false;
    },
    [isAuthenticated]
  );

  return {
    isAuthenticated,
    session,
    requireAuth,
    modalProps: {
      isOpen,
      onOpenChange: setIsOpen,
      title: modalConfig.title,
      description: modalConfig.description,
      actionContext: modalConfig.actionContext,
      returnUrl: modalConfig.returnUrl,
    },
  };
}
