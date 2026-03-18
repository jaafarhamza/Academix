import type { AppChildren } from "@/types";
import { PageShell } from "@/components/layout/page-shell";

export default function PublicLayout({ children }: AppChildren) {
  return <PageShell>{children}</PageShell>;
}
