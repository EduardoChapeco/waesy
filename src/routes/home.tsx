import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/home")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});

export default function HomePage() {
  return null;
}
