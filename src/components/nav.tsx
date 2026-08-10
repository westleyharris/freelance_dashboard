"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Today", icon: HomeIcon },
  { href: "/call", label: "Call", icon: PhoneIcon },
  { href: "/prospects", label: "Pipeline", icon: ListIcon },
  { href: "/calendar", label: "Calendar", icon: CalendarIcon },
  { href: "/clients", label: "Clients", icon: UsersIcon },
  { href: "/projects", label: "Projects", icon: FolderIcon },
  { href: "/money", label: "Money", icon: MoneyIcon },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-52 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="px-5 py-5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-accent to-info text-[0.7rem] font-bold text-[#06101f]">
            H
          </span>
          <div>
            <div className="text-sm font-semibold tracking-tight">
              Harris Web Works
            </div>
            <div className="text-xs text-ink-faint">Freelance Dashboard</div>
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 px-2">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-150 ${
              isActive(pathname, href)
                ? "bg-accent-soft font-medium text-accent"
                : "text-ink-muted hover:translate-x-0.5 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <Icon />
            {label}
          </Link>
        ))}
      </nav>

      <form action="/auth/signout" method="post" className="mt-auto p-3">
        <button className="w-full rounded-lg px-3 py-2 text-left text-xs text-ink-faint hover:bg-surface-2 hover:text-ink-muted">
          Sign out
        </button>
      </form>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface/95 backdrop-blur md:hidden">
      {LINKS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1 text-[0.65rem] ${
            isActive(pathname, href) ? "text-accent" : "text-ink-faint"
          }`}
        >
          <Icon />
          {label}
        </Link>
      ))}
    </nav>
  );
}

/* --- icons: inline so there's no icon dependency to install or update ----- */

const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function HomeIcon() {
  return (
    <svg {...base} aria-hidden>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg {...base} aria-hidden>
      <path d="M6.5 3h3l1.5 4.5-2 1.5a12 12 0 0 0 6 6l1.5-2 4.5 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3Z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg {...base} aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg {...base} aria-hidden>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.5M17.5 20a5.5 5.5 0 0 0-2-4.2" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg {...base} aria-hidden>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg {...base} aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function MoneyIcon() {
  return (
    <svg {...base} aria-hidden>
      <path d="M12 3v18M16 7.5c0-1.4-1.8-2.5-4-2.5S8 6.1 8 7.5s1.6 2.2 4 2.8 4 1.4 4 3-1.8 2.7-4 2.7-4-1.1-4-2.5" />
    </svg>
  );
}
