import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/home")({
  loader: () => {
    throw redirect({ to: "/cadastroantecipado" });
  },
  component: () => null,
});

export default function HomePage() {
  return null;
}
