import Link from "next/link";

import { siteConfig } from "@/lib/constants/site";
import { AppLogo } from "@/components/shared/app-logo";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/70 bg-muted/35">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr] lg:px-8">
        <section>
          <AppLogo className="text-sm font-semibold tracking-[0.16em] uppercase" />
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            {siteConfig.description}
          </p>
        </section>

        {siteConfig.footerLinkGroups.map((group) => (
          <section key={group.title}>
            <h2 className="text-sm font-semibold tracking-tight">{group.title}</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="border-t border-border/70">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
          <p>{currentYear} {siteConfig.name}. All rights reserved.</p>
          <p>Built for modern learning centers.</p>
        </div>
      </div>
    </footer>
  );
}
