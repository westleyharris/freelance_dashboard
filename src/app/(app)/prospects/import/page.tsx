"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { bulkImportProspects, type ImportRow } from "@/app/actions";
import { PageHeader } from "@/components/ui";
import { applyMapping, parseTable } from "@/lib/parse-table";

const FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: "business_name", label: "Business name", required: true },
  { key: "phone", label: "Phone" },
  { key: "website", label: "Website" },
  { key: "category", label: "Category" },
  { key: "city", label: "City" },
  { key: "contact_name", label: "Contact" },
  { key: "email", label: "Email" },
  { key: "source_url", label: "Listing URL" },
  { key: "notes", label: "Notes" },
];

const SOURCES = [
  "Rockwall Chamber",
  "Rowlett Chamber",
  "Mesquite Chamber",
  "Garland Chamber",
  "Forney Chamber",
  "Kaufman Chamber",
  "Terrell Chamber",
  "Wylie Chamber",
  "Google Places",
  "Nextdoor",
  "Referral",
  "Other",
];

export default function ImportPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);
  const [source, setSource] = useState(SOURCES[0]);
  const [chamber, setChamber] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    inserted: number;
    duplicates: number;
    unnamed: number;
  } | null>(null);

  const parsed = useMemo(() => parseTable(text), [text]);

  // Auto-detected mapping wins until the user overrides a dropdown.
  const activeMapping = touched ? mapping : parsed.mapping;

  const preview = useMemo(
    () => applyMapping(parsed.rows.slice(0, 5), activeMapping),
    [parsed.rows, activeMapping],
  );

  const hasName = Boolean(activeMapping.business_name);
  const noWebsiteCount = useMemo(() => {
    if (!activeMapping.website) return null;
    return applyMapping(parsed.rows, activeMapping).filter((r) => !r.website)
      .length;
  }, [parsed.rows, activeMapping]);

  function submit() {
    // Built explicitly rather than cast: business_name is the one required
    // field, and rows missing it are dropped here instead of failing server-side.
    const rows: ImportRow[] = applyMapping(parsed.rows, activeMapping)
      .filter((row) => row.business_name)
      .map((row) => ({
        business_name: row.business_name!,
        contact_name: row.contact_name,
        phone: row.phone,
        email: row.email,
        category: row.category,
        city: row.city,
        website: row.website,
        source_url: row.source_url,
        notes: row.notes,
      }));

    startTransition(async () => {
      const outcome = await bulkImportProspects(rows, source, chamber);
      if (outcome?.error) {
        setError(outcome.error);
        return;
      }
      setError(null);
      setResult({
        inserted: outcome.inserted ?? 0,
        duplicates: outcome.duplicates ?? 0,
        unnamed: outcome.unnamed ?? 0,
      });
      setText("");
      setTouched(false);
      router.refresh();
    });
  }

  if (result) {
    return (
      <div className="space-y-5">
        <PageHeader title="Import complete" />
        <div className="card space-y-3 p-5">
          <p className="text-2xl font-semibold text-good">
            {result.inserted} added
          </p>
          <ul className="space-y-1 text-sm text-ink-muted">
            {result.duplicates > 0 && (
              <li>
                {result.duplicates} skipped — already in your pipeline (matched
                on phone number or business name)
              </li>
            )}
            {result.unnamed > 0 && (
              <li>{result.unnamed} skipped — no business name</li>
            )}
          </ul>
          <div className="flex gap-2 pt-2">
            <Link href="/prospects?sort=score" className="btn btn-primary">
              See them by fit score
            </Link>
            <button onClick={() => setResult(null)} className="btn btn-ghost">
              Import more
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link href="/prospects" className="text-xs text-ink-muted hover:text-ink">
        &larr; Pipeline
      </Link>

      <PageHeader
        title="Import prospects"
        subtitle="Paste from a spreadsheet or CSV. Duplicates are skipped automatically."
      />

      <div className="card p-4">
        <label className="label" htmlFor="paste">
          Paste your data — include the header row
        </label>
        <textarea
          id="paste"
          rows={8}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setTouched(false);
          }}
          placeholder={"name\tphone\twebsite\tcategory\nAcme Party Rentals\t(469) 555-0134\t\tEvents"}
          className="field font-mono text-xs"
        />
        <p className="mt-1.5 text-xs text-ink-faint">
          Tabs or commas both work. Copying cells straight out of Excel or
          Google Sheets gives you tabs.
        </p>
      </div>

      {parsed.rows.length > 0 && (
        <>
          <div className="card p-4">
            <h2 className="text-sm font-semibold">
              Columns
              <span className="ml-2 font-normal text-xs text-ink-faint">
                {parsed.rows.length} rows found
                {parsed.malformed > 0 &&
                  ` · ${parsed.malformed} with an odd column count`}
              </span>
            </h2>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="label" htmlFor={`map-${field.key}`}>
                    {field.label}
                    {field.required && <span className="text-bad"> *</span>}
                  </label>
                  <select
                    id={`map-${field.key}`}
                    className="field"
                    value={activeMapping[field.key] ?? ""}
                    onChange={(e) => {
                      setTouched(true);
                      setMapping({
                        ...activeMapping,
                        [field.key]: e.target.value,
                      });
                    }}
                  >
                    <option value="">— not in my data —</option>
                    {parsed.headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {!hasName && (
              <p className="mt-3 text-sm text-bad">
                Pick which column holds the business name — nothing can be
                imported without it.
              </p>
            )}

            {noWebsiteCount !== null && (
              <p className="mt-3 rounded-lg bg-good-soft p-2.5 text-xs text-good">
                {noWebsiteCount} of {parsed.rows.length} have no website. Those
                are your best prospects — they&rsquo;ll score highest.
              </p>
            )}
          </div>

          <div className="card overflow-x-auto p-4">
            <h2 className="mb-3 text-sm font-semibold">
              Preview
              <span className="ml-2 font-normal text-xs text-ink-faint">
                first {preview.length} rows
              </span>
            </h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-ink-muted">
                  {FIELDS.filter((f) => activeMapping[f.key]).map((f) => (
                    <th key={f.key} className="px-2 pb-2 font-medium whitespace-nowrap">
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {FIELDS.filter((f) => activeMapping[f.key]).map((f) => (
                      <td key={f.key} className="max-w-48 truncate px-2 py-1.5">
                        {row[f.key] ?? (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card space-y-3 p-4">
            <div>
              <label className="label" htmlFor="source">
                Where did these come from?
              </label>
              <select
                id="source"
                className="field"
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  setChamber(/chamber/i.test(e.target.value));
                }}
              >
                {SOURCES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-ink-faint">
                Feeds the fit score, and lets you compare sources later.
              </p>
            </div>

            <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5">
              <input
                type="checkbox"
                checked={chamber}
                onChange={(e) => setChamber(e.target.checked)}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              <span className="text-sm">
                These are all Chamber of Commerce members
              </span>
            </label>

            {error && <p className="text-sm text-bad">{error}</p>}

            <button
              onClick={submit}
              disabled={pending || !hasName}
              className="btn btn-primary w-full"
            >
              {pending
                ? "Importing…"
                : `Import ${parsed.rows.length} prospect${parsed.rows.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
