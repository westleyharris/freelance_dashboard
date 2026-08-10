"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { scoreBand, STAGE_LABELS, type ProspectStage } from "@/lib/types";

interface Hit {
  id: string;
  business_name: string;
  phone: string | null;
  category: string | null;
  city: string | null;
  stage: ProspectStage;
  icp_score: number;
}

const PAGES = [
  { label: "Today", href: "/" },
  { label: "Calling mode", href: "/call" },
  { label: "Never called", href: "/call?mode=new" },
  { label: "Pipeline", href: "/prospects" },
  { label: "Pipeline by fit score", href: "/prospects?sort=score" },
  { label: "Import prospects", href: "/prospects/import" },
  { label: "Add prospect", href: "/prospects/new" },
  { label: "Clients", href: "/clients" },
  { label: "Projects", href: "/projects" },
  { label: "Money", href: "/money" },
];

/**
 * Cmd/Ctrl-K search over every prospect and screen.
 *
 * With a few hundred prospects, scrolling the pipeline to find one business is
 * the slowest thing in the app. The list loads once on first open and filters
 * locally, so typing stays instant.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [prospects, setProspects] = useState<Hit[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Open/close. Escape closes, Cmd+K toggles.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((was) => !was);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Fetch once, the first time it's opened.
  useEffect(() => {
    if (!open || prospects) return;
    fetch("/api/search")
      .then((r) => (r.ok ? r.json() : { prospects: [] }))
      .then((d) => setProspects(d.prospects ?? []))
      .catch(() => setProspects([]));
  }, [open, prospects]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      // Wait for the dialog to mount before stealing focus.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    const pages = PAGES.filter((p) => !q || p.label.toLowerCase().includes(q))
      .slice(0, q ? 4 : PAGES.length)
      .map((p) => ({ kind: "page" as const, ...p }));

    if (!q) return pages;

    const digits = q.replace(/\D/g, "");
    const matches = (prospects ?? [])
      .filter((p) => {
        if (p.business_name.toLowerCase().includes(q)) return true;
        if (p.category?.toLowerCase().includes(q)) return true;
        if (p.city?.toLowerCase().includes(q)) return true;
        // Let a partial phone number find someone mid-call.
        if (digits.length >= 3 && p.phone?.replace(/\D/g, "").includes(digits))
          return true;
        return false;
      })
      .slice(0, 8)
      .map((p) => ({ kind: "prospect" as const, ...p }));

    return [...pages, ...matches];
  }, [query, prospects]);

  const go = useCallback(
    (item: (typeof results)[number]) => {
      setOpen(false);
      router.push(item.kind === "page" ? item.href : `/prospects/${item.id}`);
    },
    [router],
  );

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (event.key === "Enter" && results[cursor]) {
      event.preventDefault();
      go(results[cursor]);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="presentation"
    >
      <div
        className="card rise-in w-full max-w-lg overflow-hidden p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCursor(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search prospects, or jump to a screen…"
          aria-label="Search"
          className="w-full border-b border-border bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-ink-faint"
        />

        <ul className="max-h-80 overflow-y-auto py-1.5">
          {results.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-ink-faint">
              {prospects === null ? "Loading…" : "Nothing matches"}
            </li>
          )}

          {results.map((item, i) => {
            const active = i === cursor;
            return (
              <li key={item.kind === "page" ? item.href : item.id}>
                <button
                  onClick={() => go(item)}
                  onMouseEnter={() => setCursor(i)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${
                    active ? "bg-accent-soft text-ink" : "text-ink-muted"
                  }`}
                >
                  {item.kind === "page" ? (
                    <>
                      <span className="text-xs text-ink-faint">Go to</span>
                      <span className="font-medium">{item.label}</span>
                    </>
                  ) : (
                    <>
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${scoreBand(item.icp_score).tone}`}
                      >
                        {item.icp_score}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium text-ink">
                        {item.business_name}
                      </span>
                      <span className="shrink-0 text-xs text-ink-faint">
                        {STAGE_LABELS[item.stage]}
                      </span>
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-xs text-ink-faint">
          <Key>↑↓</Key> navigate
          <Key>↵</Key> open
          <Key>esc</Key> close
        </div>
      </div>
    </div>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-sans text-[0.65rem] text-ink-muted">
      {children}
    </kbd>
  );
}
