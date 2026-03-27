"use client";

import Link from "next/link";
import { MenuIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { siteConfig } from "@/lib/constants/site";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/shared/app-logo";
import { ModeToggle } from "@/components/shared/mode-toggle";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function PublicHeader() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const updateScrollState = () => {
      setIsScrolled(window.scrollY > 8);
    };

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateScrollState);
    };
  }, []);

  return (
    <header
      className={cn(
        "relative fixed inset-x-0 top-0 z-50 transition-all duration-300",
        isScrolled
          ? "border-b border-border/70 bg-background/75 shadow-lg shadow-foreground/8 backdrop-blur-xl supports-backdrop-filter:bg-background/60"
          : "border-b border-transparent bg-transparent shadow-none backdrop-blur-0",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-chart-4/30 via-chart-5/30 to-primary/30 transition-opacity duration-300",
          isScrolled ? "opacity-100" : "opacity-70",
        )}
      />

      <div className="relative mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-8 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-muted/70"
          aria-label={`${siteConfig.name} home`}
        >
          <span className="inline-flex size-2.5 rounded-full bg-linear-to-br from-chart-4 to-chart-5" />
          <AppLogo className="text-sm font-semibold tracking-[0.16em] uppercase" />
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-1 md:flex"
        >
          {siteConfig.publicNavLinks.map((link) => (
            <Button
              key={link.href}
              asChild
              variant="ghost"
              size="lg"
              className={cn(
                pathname === link.href && "bg-muted text-foreground",
              )}
            >
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </nav>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              className="absolute left-1/2 -translate-x-1/2 md:hidden"
              aria-label="Open navigation menu"
            >
              <MenuIcon />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="top"
            className="border-b border-border/70 bg-background/95 pt-12 backdrop-blur-xl"
          >
            <SheetHeader className="p-0">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            </SheetHeader>
            <nav
              aria-label="Mobile primary"
              className="grid gap-2 px-4 pb-4"
            >
              {siteConfig.publicNavLinks.map((link) => (
                <SheetClose
                  key={link.href}
                  asChild
                >
                  <Button
                    asChild
                    variant={pathname === link.href ? "secondary" : "ghost"}
                    className="h-10 justify-start rounded-xl px-3"
                  >
                    <Link href={link.href}>{link.label}</Link>
                  </Button>
                </SheetClose>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-2">
          <Button
            asChild
            size="lg"
            className="hidden md:inline-flex"
          >
            <Link href="/center/register">Get Started</Link>
          </Button>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
