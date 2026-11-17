"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  {
    href: "/",
    label: "Flags",
    active: (path: string) => path === "/" || path.startsWith("/flags"),
  },
  {
    href: "/users",
    label: "Users",
    active: (path: string) => path.startsWith("/users"),
  },
  {
    href: "/demo",
    label: "Demo",
    active: (path: string) => path.startsWith("/demo"),
  },
];

/** The header's section links, highlighting the current one. */
export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-4 text-sm">
      {LINKS.map((link) => {
        const active = link.active(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "transition-colors hover:text-foreground",
              active ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
