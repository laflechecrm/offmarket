"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Entreprises" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-white border-b border-gray-200 h-14 flex items-center px-6">
      <div className="flex items-center gap-8 w-full max-w-screen-2xl mx-auto">
        <span className="font-bold text-gray-900 text-sm tracking-tight">
          Acquisition Finder
        </span>
        <nav className="flex gap-1">
          {links.map(({ href, label }) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
