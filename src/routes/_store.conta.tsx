import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getUserSession } from "@/services/auth.functions";

export const Route = createFileRoute("/_store/conta")({
  beforeLoad: async ({ location }) => {
    // Permitir que /conta e /conta/ renderizem a tela amigável de login/dashboard
    const isRootAccount = location.pathname === "/conta" || location.pathname === "/conta/";
    if (!isRootAccount) {
      const session = await getUserSession().catch(() => null);
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
      const session = await getUserSession().catch(() => null);
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
