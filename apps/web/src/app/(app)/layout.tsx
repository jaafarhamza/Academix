import { AppShell } from "@/components/layout/app-shell";
import type { AppChildren } from "@/types";

export default function AuthenticatedLayout({ children }: AppChildren) {
  return <AppShell>{children}</AppShell>;
}
