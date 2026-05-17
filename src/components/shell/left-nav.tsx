"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Wallet,
  HeartPulse,
  BookOpen,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home", icon: Compass },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/health/weight", label: "Health", icon: HeartPulse, match: "/health" },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function LeftNav() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 flex-col border-r border-border bg-paper/60 px-4 py-8">
      <div className="px-3 pb-10">
        <Link href="/" className="font-serif text-2xl tracking-tight">
          northstar
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">a quiet command center</p>
      </div>
      <nav className="flex flex-col gap-1">
        {links.map(({ href, label, icon: Icon, match }) => {
          const active = match
            ? pathname.startsWith(match)
            : pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-3 text-[11px] text-muted-foreground">
        v0.1 · local-first
      </div>
    </aside>
  );
}
