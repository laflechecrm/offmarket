"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Star, Columns, Bookmark, Settings, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/search", label: "Recherche", icon: Search },
  { href: "/favorites", label: "Favoris", icon: Star },
  { href: "/pipeline", label: "Pipeline", icon: Columns },
  { href: "/saved", label: "Sauvegardées", icon: Bookmark },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-screen-2xl mx-auto flex h-14 items-center gap-6 px-6">
        <Link href="/search" className="flex items-center gap-2 font-semibold text-foreground shrink-0">
          <TrendingUp className="h-5 w-5 text-primary" />
          <span>Off Market Reprise</span>
        </Link>
        <nav className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                pathname === href || pathname.startsWith(href + "/")
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
