import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getUserSession, syncSessionToCookies } from "@/services/auth.functions";
import { getBrowserClient } from "@/lib/supabase";

async function resolveAccountSessionWithFallback() {
  let session = await getUserSession().catch(() => null);
  if (!session && typeof window !== "undefined") {
    try {
      const supabase = getBrowserClient();
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token && data?.session?.refresh_token) {
        await syncSessionToCookies({
          data: {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          },
        }).catch(() => null);
        session = await getUserSession().catch(() => null);
      }
    } catch {
      // Fallback silencioso
    }
  }
  return session;
}

export const Route = createFileRoute("/_store/conta")({
  beforeLoad: async ({ location }) => {
    // Permitir que /conta e /conta/ renderizem a tela amigável de login/dashboard
    const isRootAccount = location.pathname === "/conta" || location.pathname === "/conta/";
    if (!isRootAccount) {
      const session = await resolveAccountSessionWithFallback();
      if (!session) {
        throw redirect({
          to: "/entrar",
          search: { returnUrl: location.pathname + (location.searchStr || "") },
        });
      }
    }
  },
  loader: async () => {
    try {
      const session = await resolveAccountSessionWithFallback();
      return { session: session || null };
    } catch {
      return { session: null };
    }
  },
  component: AccountLayout,
});

function AccountLayout() {
  return <Outlet />;
}

export default AccountLayout;
