import AppShell from "@/app/components/AppShell";
import ErrorBoundary from "@/app/components/ErrorBoundary";
import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <AppShell>{children}</AppShell>
    </ErrorBoundary>
  );
}
