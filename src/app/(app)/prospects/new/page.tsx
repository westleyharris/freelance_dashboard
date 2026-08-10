"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createProspect } from "@/app/actions";
import { PageHeader } from "@/components/ui";
import {
  CATEGORY_SUGGESTIONS,
  WEBSITE_STATUS_LABELS,
  type WebsiteStatus,
} from "@/lib/types";

// Ordered by what actually closed: chambers and Nextdoor produced all three
// wins; Google Maps produced none from 37 calls.
const SOURCES = [
  "Rockwall Chamber",
  "Rowlett Chamber",
  "Mesquite Chamber",
  "Garland Chamber",
  "Forney Chamber",
  "Kaufman Chamber",
  "Terrell Chamber",
  "Wylie Chamber",
  "Nextdoor",
  "Referral",
  "In person",
  "Facebook",
  "Instagram",
  "Google Maps",
  "Other",
];

export default function NewProspectPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createProspect(data);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.push(`/prospects/${result.id}`);
    });
  }

  return (
    <div className="space-y-5">
      <Link href="/prospects" className="text-xs text-ink-muted hover:text-ink">
        &larr; Pipeline
      </Link>

      <PageHeader title="Add prospect" />

      <form onSubmit={onSubmit} className="card max-w-xl space-y-3 p-4">
        <div>
          <label className="label" htmlFor="business_name">
            Business name
          </label>
          <input
            id="business_name"
            name="business_name"
            className="field"
            required
            autoFocus
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="contact_name">
              Contact name
            </label>
            <input id="contact_name" name="contact_name" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="phone">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              className="field"
              placeholder="(469) 555-0134"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="category">
              Category
            </label>
            <input
              id="category"
              name="category"
              className="field"
              list="category-options"
              placeholder="Events, Handyman, Photography…"
            />
            <datalist id="category-options">
              {Object.entries(CATEGORY_SUGGESTIONS).map(([group, items]) =>
                items.map((item) => (
                  <option key={item} value={item} label={group} />
                )),
              )}
            </datalist>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="city">
              City
            </label>
            <input
              id="city"
              name="city"
              className="field"
              placeholder="Rockwall"
            />
          </div>
          <div>
            <label className="label" htmlFor="website_status">
              Website
            </label>
            <select
              id="website_status"
              name="website_status"
              className="field"
              defaultValue="unknown"
            >
              {(Object.keys(WEBSITE_STATUS_LABELS) as WebsiteStatus[]).map(
                (option) => (
                  <option key={option} value={option}>
                    {WEBSITE_STATUS_LABELS[option]}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="source">
              Where did you find them?
            </label>
            <select id="source" name="source" className="field" defaultValue="">
              <option value="">—</option>
              {SOURCES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="source_url">
              Listing URL
            </label>
            <input
              id="source_url"
              name="source_url"
              type="url"
              className="field"
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5">
          <input
            type="checkbox"
            name="chamber_member"
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
          <span className="text-sm">Chamber of Commerce member</span>
          <span className="ml-auto text-xs text-ink-faint">
            best predictor so far
          </span>
        </label>

        <div>
          <label className="label" htmlFor="notes">
            Notes
          </label>
          <textarea id="notes" name="notes" rows={3} className="field" />
        </div>

        {error && <p className="text-sm text-bad">{error}</p>}

        <button className="btn btn-primary w-full" disabled={pending}>
          {pending ? "Saving…" : "Add prospect"}
        </button>
      </form>
    </div>
  );
}
