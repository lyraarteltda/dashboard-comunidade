"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/activity-log", label: "Registro de Atividades" },
] as const;

interface NavHeaderProps {
  activePage?: string;
  children?: ReactNode;
}

export function NavHeader({ children }: NavHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface-0/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded-md bg-primary" />
            <span className="text-sm font-semibold text-foreground tracking-tight">
              Dashboard Comunidade
            </span>
          </div>

          <nav className="hidden sm:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "bg-surface-3 text-foreground"
                      : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {children}
      </div>

      {/* Mobile nav */}
      <div className="flex sm:hidden border-t border-border">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 py-2 text-center text-xs font-medium transition-colors ${
                active
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
