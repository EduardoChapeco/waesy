import {
  createFileRoute,
  Outlet,
  isRedirect,
  redirect,
  Link,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getUserSession, syncSessionToCookies } from "@/services/auth.functions";
import { logSystemError } from "@/services/telemetry.functions";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { WorkspaceAccessDenied } from "@/components/workspace/workspace-access-denied";
import { Button } from "@/components/ui/button";
import { Store, AlertTriangle, ArrowLeft, RefreshCw, LogIn } from "lucide-react";
import { getSystemOnboardingSteps } from "@/services/system-onboarding.functions";
import { WelcomeOnboardingModal } from "@/components/workspace/welcome-onboarding-modal";
import { setClientContextCookies, getClientActiveTenant } from "@/lib/context-auth";

function isPlatformAdminUser(session: any): boolean {
  if (!session) return false;
  const email = (session.email || session.user?.email || "").toLowerCase();
  const MASTER_EMAILS = [
    "contato@usewaesy.com",
    "admin@usewaesy.com",
    "meuwaesy@gmail.com",
    "meuwider@gmail.com",
    "excelenciatour.smo@gmail.com",
    "admin@jah.com",
  ];
  return Boolean(
    session.role === "admin" ||
    session.role === "superadmin" ||
    session.role === "platform_admin" ||
    session.role === "master" ||
    session.role === "admin_master" ||
    session.user?.role === "platform_admin" ||
    session.user?.app_metadata?.role === "admin" ||
    session.user?.app_metadata?.role === "platform_admin" ||
    session.user?.app_metadata?.is_master ||
    session.user?.user_metadata?.is_admin_master ||
    session.user?.user_metadata?.is_superadmin ||
    email.endsWith("@usewaesy.com") ||
    MASTER_EMAILS.includes(email),
  );
}

export const Route = createFileRoute("/workspace")({
  beforeLoad: async () => {
    let session: any = null;
    try {
      session = await getUserSession();
    } catch (e) {
      console.warn("[workspace layout] Erro ao carregar sessão:", e);
      session = null;
    }

    // Fallback defensivo no cliente (DEC-443/DEC-446): reconciliação síncrona com localStorage e cookies
    if (!session?.user && typeof window !== "undefined") {
      try {
        const { getBrowserClient } = await import("@/lib/supabase");
        const client = getBrowserClient();
        let { data: { session: browserSession } } = await client.auth.getSession();
        if (!browserSession?.user) {
          const refreshRes = await client.auth.refreshSession().catch(() => null);
          if (refreshRes?.data?.session) {
            browserSession = refreshRes.data.session;
          }
        }
        if (!browserSession?.user) {
          try {
            const rawBackup = localStorage.getItem("waesy_auth_backup");
            if (rawBackup) {
              const backup = JSON.parse(rawBackup);
              if (backup?.access_token && backup?.refresh_token) {
                const restoreRes = await client.auth.setSession({
                  access_token: backup.access_token,
                  refresh_token: backup.refresh_token,
                }).catch(() => null);
                if (restoreRes?.data?.session) {
                  browserSession = restoreRes.data.session;
                }
              }
            }
          } catch {}
        }
        if (browserSession?.user) {
          if (browserSession.access_token && browserSession.refresh_token) {
            await syncSessionToCookies({
              data: {
                access_token: browserSession.access_token,
                refresh_token: browserSession.refresh_token,
              },
            }).catch(() => null);
          }
          const retrySession = await getUserSession().catch(() => null);
          if (retrySession?.user) {
            session = retrySession;
          } else {
            const userMeta = browserSession.user.user_metadata || {};
            const storeId = userMeta.store_id || null;
            session = {
              id: browserSession.user.id,
              user: browserSession.user,
              email: browserSession.user.email,
              role: (userMeta.role as any) || "owner",
              store_id: storeId,
              memberships: storeId ? [{ store_id: storeId, role: "owner", name: "Minha Empresa" }] : [],
            };
          }
        }
      } catch (browserAuthErr) {
        console.warn("[workspace layout] Falha no fallback de sessão client:", browserAuthErr);
      }
    }

    if (!session?.user) {
      if (typeof window !== "undefined") {
        let hasClientAuth = false;
        try {
          hasClientAuth =
            Boolean(localStorage.getItem("waesy_auth_backup")) ||
            document.cookie.includes("waesy-auth-token") ||
            document.cookie.includes("-auth-token");
        } catch {}

        if (hasClientAuth) {
          return { session: null, needsClientHydration: true };
        }

        throw redirect({ to: "/entrar", search: { returnUrl: "/workspace" } });
      }

      let hasAnyAuthCookie = false;
      try {
        const { getRequestHeader } = await import("@tanstack/start-server-core");
        const raw = getRequestHeader("cookie") || "";
        hasAnyAuthCookie = raw.includes("waesy-auth-token") || raw.includes("-auth-token");
      } catch {}

      if (!hasAnyAuthCookie) {
        throw redirect({ to: "/entrar", search: { returnUrl: "/workspace" } });
      }

      return { session: null, needsClientHydration: true };
    }

    const isPlatformAdmin = isPlatformAdminUser(session);
    const hasStore =
      (session?.memberships && session.memberships.length > 0) ||
      Boolean(session?.store_id) ||
      session?.role === "store_owner" ||
      session?.role === "owner" ||
      session?.role === "admin" ||
      session?.role === "manager" ||
      session?.role === "seller" ||
      session?.role === "collaborator" ||
      isPlatformAdmin;

    // REGRA INVIOLÁVEL: O Workspace exige um negócio cadastrado.
    // Quem não possui loja/empresa não pode ver o workspace nem ferramentas operacionais.
    // É redirecionado imediatamente para o cadastro do seu negócio.
    if (!hasStore && session?.user) {
      throw redirect({ to: "/criar-negocio" });
    }

    return { session };
  },
  loader: async ({ context }) => {
    try {
      let session: any = (context as any)?.session;
      if (!session) {
        try {
          session = await getUserSession();
        } catch (e) {
          console.warn("[workspace layout] Erro ao carregar sessão:", e);
          session = null;
        }
      }

      if (!session?.user && typeof window !== "undefined") {
        try {
          const { getBrowserClient } = await import("@/lib/supabase");
          const client = getBrowserClient();
          let { data: { session: browserSession } } = await client.auth.getSession();
          if (!browserSession?.user) {
            const refreshRes = await client.auth.refreshSession().catch(() => null);
            if (refreshRes?.data?.session) {
              browserSession = refreshRes.data.session;
            }
          }
          if (!browserSession?.user) {
            try {
              const rawBackup = localStorage.getItem("waesy_auth_backup");
              if (rawBackup) {
                const backup = JSON.parse(rawBackup);
                if (backup?.access_token && backup?.refresh_token) {
                  const restoreRes = await client.auth.setSession({
                    access_token: backup.access_token,
                    refresh_token: backup.refresh_token,
                  }).catch(() => null);
                  if (restoreRes?.data?.session) {
                    browserSession = restoreRes.data.session;
                  }
                }
              }
            } catch {}
          }
          if (browserSession?.user) {
            if (browserSession.access_token && browserSession.refresh_token) {
              await syncSessionToCookies({
                data: {
                  access_token: browserSession.access_token,
                  refresh_token: browserSession.refresh_token,
                },
              }).catch(() => null);
            }
            const retrySession = await getUserSession().catch(() => null);
            if (retrySession?.user) {
              session = retrySession;
            } else {
              const userMeta = browserSession.user.user_metadata || {};
              const storeId = userMeta.store_id || null;
              session = {
                id: browserSession.user.id,
                user: browserSession.user,
                email: browserSession.user.email,
                role: (userMeta.role as any) || "owner",
                store_id: storeId,
                memberships: storeId ? [{ store_id: storeId, role: "owner", name: "Minha Empresa" }] : [],
              };
            }
          }
        } catch (browserAuthErr) {
          console.warn("[workspace layout] Falha no fallback de sessão client:", browserAuthErr);
        }
      }

      if (!session?.user) {
        if (typeof window !== "undefined") {
          let hasClientAuth = false;
          try {
            hasClientAuth =
              Boolean(localStorage.getItem("waesy_auth_backup")) ||
              document.cookie.includes("waesy-auth-token") ||
              document.cookie.includes("-auth-token");
          } catch {}

          if (!hasClientAuth) {
            throw redirect({ to: "/entrar", search: { returnUrl: "/workspace" } });
          }
        } else {
          let hasAnyAuthCookie = false;
          try {
            const { getRequestHeader } = await import("@tanstack/start-server-core");
            const raw = getRequestHeader("cookie") || "";
            hasAnyAuthCookie = raw.includes("waesy-auth-token") || raw.includes("-auth-token");
          } catch {}

          if (!hasAnyAuthCookie) {
            throw redirect({ to: "/entrar", search: { returnUrl: "/workspace" } });
          }
        }
      }

      const isPlatformAdmin = isPlatformAdminUser(session);
      const hasStore =
        (session?.memberships && session.memberships.length > 0) ||
        Boolean(session?.store_id) ||
        session?.role === "store_owner" ||
        session?.role === "owner" ||
        session?.role === "admin" ||
        session?.role === "manager" ||
        session?.role === "seller" ||
        session?.role === "collaborator" ||
        isPlatformAdmin ||
        (context as any)?.needsClientHydration;

      if (!hasStore && session?.user) {
        throw redirect({ to: "/criar-negocio" });
      }

      const onboardingData = await getSystemOnboardingSteps().catch(() => ({
        show: false,
        steps: [],
      }));

      return { session, onboardingData };
    } catch (err) {
      if (isRedirect(err)) throw err;
      console.error("[loader:workspace] Unhandled loader error:", err);
      return { session: null, onboardingData: { show: false, steps: [] } };
    }
  },
  component: WorkspaceLayout,
  errorComponent: WorkspaceErrorComponent,
});

function WorkspaceErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  if (isRedirect(error)) {
    throw error;
  }

  const normalizedError = error instanceof Error ? error : new Error(String(error));

  useEffect(() => {
    if (!isRedirect(error)) {
      logSystemError({
        data: {
          severity: "ERROR",
          subsystem: "workspace_layout",
          route: typeof window !== "undefined" ? window.location.pathname : "/workspace",
          message: normalizedError.message || "Unknown workspace error",
          error_payload: { stack: normalizedError.stack },
        },
      }).catch(() => {});
    }
  }, [error, normalizedError.message, normalizedError.stack]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4 text-center">
      <div className="max-w-md w-full bg-card p-6 sm:p-8 rounded-lg border border-border/80 space-y-4">
        <div className="size-14 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertTriangle className="size-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-foreground">Erro no Workspace</h2>
          <p className="text-xs text-muted-foreground">
            Ocorreu uma instabilidade momentânea ao carregar os dados deste espaço de trabalho.
          </p>
        </div>

        {normalizedError.message && (
          <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/20 text-left text-xs font-mono text-destructive space-y-1 max-h-40 overflow-y-auto no-scrollbar">
            <span className="font-bold block">Diagnóstico Técnico:</span>
            <span className="break-all">{normalizedError.message}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <Button
            onClick={() => {
              if (typeof window !== "undefined") window.location.reload();
              reset();
            }}
            className="w-full sm:w-auto min-h-11 rounded-lg text-xs font-bold gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <RefreshCw className="size-3.5" />
            <span>Recarregar Painel</span>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto min-h-11 rounded-lg text-xs font-bold gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Link to="/workspace">
              <ArrowLeft className="size-3.5" />
              <span>Painel Geral</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function WorkspaceLayout() {
  const loaderData = Route.useLoaderData() as any;
  const search = (Route.useSearch?.() as { storeId?: string }) || {};
  const [activeSession, setActiveSession] = useState<any>(loaderData?.session || null);
  const [isHydratingAuth, setIsHydratingAuth] = useState(!loaderData?.session?.user);

  useEffect(() => {
    if (activeSession?.user) {
      setIsHydratingAuth(false);
      return;
    }

    let isMounted = true;

    async function hydrateClientSession() {
      try {
        const { getBrowserClient } = await import("@/lib/supabase");
        const client = getBrowserClient();
        let { data: { session: browserSession } } = await client.auth.getSession();

        if (!browserSession?.user) {
          const refreshRes = await client.auth.refreshSession().catch(() => null);
          if (refreshRes?.data?.session) {
            browserSession = refreshRes.data.session;
          }
        }

        if (!browserSession?.user && typeof window !== "undefined") {
          try {
            const rawBackup = localStorage.getItem("waesy_auth_backup");
            if (rawBackup) {
              const backup = JSON.parse(rawBackup);
              if (backup?.access_token && backup?.refresh_token) {
                const restoreRes = await client.auth.setSession({
                  access_token: backup.access_token,
                  refresh_token: backup.refresh_token,
                }).catch(() => null);
                if (restoreRes?.data?.session) {
                  browserSession = restoreRes.data.session;
                }
              }
            }
          } catch {}
        }

        if (browserSession?.user) {
          if (browserSession.access_token && browserSession.refresh_token) {
            await syncSessionToCookies({
              data: {
                access_token: browserSession.access_token,
                refresh_token: browserSession.refresh_token,
              },
            }).catch(() => null);
          }

          const retrySession = await getUserSession().catch(() => null);
          if (!isMounted) return;

          if (retrySession?.user) {
            setActiveSession(retrySession);
            setIsHydratingAuth(false);
            return;
          }

          const userMeta = browserSession.user.user_metadata || {};
          const storeId = userMeta.store_id || null;
          setActiveSession({
            id: browserSession.user.id,
            user: browserSession.user,
            email: browserSession.user.email,
            role: (userMeta.role as any) || "owner",
            store_id: storeId,
            memberships: storeId ? [{ store_id: storeId, role: "owner", name: "Minha Empresa" }] : [],
          });
          setIsHydratingAuth(false);
          return;
        }

        if (isMounted) {
          setIsHydratingAuth(false);
          window.location.href = "/entrar?returnUrl=" + encodeURIComponent(window.location.pathname + window.location.search);
        }
      } catch (err) {
        console.warn("[workspace layout] Erro ao recuperar sessão client:", err);
        if (isMounted) {
          setIsHydratingAuth(false);
          window.location.href = "/entrar?returnUrl=" + encodeURIComponent(window.location.pathname + window.location.search);
        }
      }
    }

    hydrateClientSession();

    return () => {
      isMounted = false;
    };
  }, [activeSession?.user]);

  const session = activeSession;
  const onboardingData = loaderData?.onboardingData;
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const isBuilder = pathname.startsWith("/workspace/builder/");
  const isStudio = pathname.startsWith("/workspace/estudio") || pathname.startsWith("/workspace/marketing/studio");
  const isProposalStudio =
    pathname.startsWith("/workspace/turismo/propostas/") &&
    pathname !== "/workspace/turismo/propostas";
  const isContractEditor = pathname.includes("/contratos/") && pathname.endsWith("/editor");
  const rawSearchStr =
    routerState.location.searchStr ||
    (typeof window !== "undefined" ? window.location.search : "");
  const routeSearchParams = new URLSearchParams(rawSearchStr);
  const viewModeParam = routeSearchParams.get("view");
  const isEmbeddedRequested = viewModeParam === "embedded" || viewModeParam === "sidebar";
  const isStandaloneRequested =
    viewModeParam === "standalone" || routeSearchParams.get("fullscreen") === "true";
  const isNativeFullPageChatOrCopilot =
    (pathname.startsWith("/workspace/atendimento") ||
      pathname.startsWith("/workspace/copilot")) &&
    !isEmbeddedRequested;
  const isStandaloneVerticalApp =
    isNativeFullPageChatOrCopilot ||
    (isStandaloneRequested &&
      (pathname.startsWith("/workspace/pdv") ||
        pathname.startsWith("/workspace/pedidos/gestor")));
  const isImmersiveEditor = isBuilder || isStudio || isProposalStudio || isContractEditor || isStandaloneVerticalApp;

  const isPlatformAdmin = isPlatformAdminUser(session);

  const memberships = (session?.memberships as any[]) || [];
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  const queryStoreId = search?.storeId || searchParams.get("storeId");
  const isQueryStoreValid =
    queryStoreId && (isPlatformAdmin || memberships.some((m: any) => m.store_id === queryStoreId));
  const existingCookieTenant = typeof window !== "undefined" ? getClientActiveTenant() : null;
  const isExistingTenantValid =
    existingCookieTenant &&
    (isPlatformAdmin || memberships.some((m: any) => m.store_id === existingCookieTenant));

  const activeStoreId =
    (isQueryStoreValid ? queryStoreId : null) ||
    (isExistingTenantValid ? existingCookieTenant : null) ||
    session?.store_id ||
    memberships[0]?.store_id;

  useEffect(() => {
    if (typeof window !== "undefined" && activeStoreId) {
      setClientContextCookies({ context: "store", storeId: activeStoreId });
    }
  }, [activeStoreId]);

  const activeMembership =
    memberships.find((m: any) => m.store_id === activeStoreId) || memberships[0];
  const effectiveRole = (
    isPlatformAdmin ? "owner" : activeMembership?.role || session?.role || "collaborator"
  ).toLowerCase();

  // Fullscreen Immersion Mode para o Construtor Visual (Wix/Framer), Estúdio e Studio de Propostas (Canva/Figma)
  if (isImmersiveEditor) {
    const IMMERSION_ALLOWED_ROLES = [
      "owner",
      "admin",
      "proprietario",
      "manager",
      "gerente",
      "content",
      "specialist",
      "profissional",
    ];
    if (!isStandaloneVerticalApp && !isPlatformAdmin && !IMMERSION_ALLOWED_ROLES.includes(effectiveRole)) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <WorkspaceAccessDenied
            role={effectiveRole}
            path={pathname}
            storeName={activeMembership?.name}
          />
        </div>
      );
    }
    if (isStandaloneVerticalApp) {
      return (
        <div className="h-dvh w-full overflow-hidden flex flex-col bg-background text-foreground">
          <Outlet />
        </div>
      );
    }
    return <Outlet />;
  }

  const hasStore =
    (session?.memberships && session.memberships.length > 0) ||
    Boolean(session?.store_id) ||
    session?.role === "store_owner" ||
    session?.role === "owner" ||
    session?.role === "admin" ||
    session?.role === "manager" ||
    session?.role === "seller" ||
    session?.role === "collaborator" ||
    isPlatformAdmin;

  if (isHydratingAuth || !session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin motion-reduce:animate-none" />
          <p className="text-xs text-muted-foreground font-medium">Validando credenciais do Workspace...</p>
        </div>
      </div>
    );
  }

  if (!hasStore) {
    return null;
  }

  return (
    <>
      <WorkspaceShell session={session}>
        <Outlet />
      </WorkspaceShell>

      {onboardingData?.show && onboardingData.steps && onboardingData.steps.length > 0 && (
        <WelcomeOnboardingModal initialSteps={onboardingData.steps} />
      )}
    </>
  );
}
