"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProspectFields } from "@/app/actions";
import {
  WEBSITE_STATUS_LABELS,
  type Prospect,
  type WebsiteStatus,
} from "@/lib/types";

/**
 * Edit the details you learn mid-call without leaving calling mode.
 *
 * People give you their name, a better number, or a different email in the
 * first thirty seconds, and losing that because the form is on another screen
 * is how a pipeline goes stale. Saves only the fields that changed, so it can't
 * clobber anything edited elsewhere.
 */
export function QuickEdit({ prospect }: { prospect: Prospect }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    contact_name: prospect.contact_name ?? "",
    phone: prospect.phone ?? "",
    email: prospect.email ?? "",
    category: prospect.category ?? "",
    city: prospect.city ?? "",
    website_status: prospect.website_status,
    chamber_member: prospect.chamber_member,
    quoted_amount: prospect.quoted_amount?.toString() ?? "",
  });

  // Re-seed when the runner advances to a different prospect.
  useEffect(() => {
    setForm({
      contact_name: prospect.contact_name ?? "",
      phone: prospect.phone ?? "",
      email: prospect.email ?? "",
      category: prospect.category ?? "",
      city: prospect.city ?? "",
      website_status: prospect.website_status,
      chamber_member: prospect.chamber_member,
      quoted_amount: prospect.quoted_amount?.toString() ?? "",
    });
    setOpen(false);
    setSaved(false);
  }, [prospect.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  function save() {
    startTransition(async () => {
      const result = await updateProspectFields(prospect.id, {
        contact_name: form.contact_name.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        category: form.category.trim() || null,
        city: form.city.trim() || null,
        website_status: form.website_status,
        chamber_member: form.chamber_member,
        quoted_amount: form.quoted_amount.trim()
          ? Number(form.quoted_amount)
          : null,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });
  }

  return (
    <div className="card p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-semibold">
          Business details
          {saved && <span className="ml-2 text-xs text-good">saved</span>}
        </span>
        <span className="text-xs text-ink-faint">
          {open ? "Hide" : "Edit while you talk"}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field
              label="Who you're talking to"
              value={form.contact_name}
              onChange={(v) => set("contact_name", v)}
              placeholder="Name"
              autoFocus
            />
            <Field
              label="Phone"
              value={form.phone}
              onChange={(v) => set("phone", v)}
              type="tel"
            />
          </div>

          <Field
            label="Email"
            value={form.email}
            onChange={(v) => set("email", v)}
            type="email"
          />

          <div className="grid grid-cols-2 gap-2">
            <Field
              label="Category"
              value={form.category}
              onChange={(v) => set("category", v)}
            />
            <Field
              label="City"
              value={form.city}
              onChange={(v) => set("city", v)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="qe-website">
                Website
              </label>
              <select
                id="qe-website"
                className="field"
                value={form.website_status}
                onChange={(e) =>
                  set("website_status", e.target.value as WebsiteStatus)
                }
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
            <Field
              label="Quoted ($)"
              value={form.quoted_amount}
              onChange={(v) => set("quoted_amount", v)}
              type="number"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5">
            <input
              type="checkbox"
              checked={form.chamber_member}
              onChange={(e) => set("chamber_member", e.target.checked)}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            <span className="text-sm">Chamber member</span>
            <span className="ml-auto text-xs text-ink-faint">
              raises the fit score
            </span>
          </label>

          {error && <p className="text-sm text-bad">{error}</p>}

          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="btn btn-primary w-full"
          >
            {pending ? "Saving…" : "Save details"}
          </button>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const id = `qe-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        className="field"
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
