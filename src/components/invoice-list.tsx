"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveInvoice } from "@/app/actions";
import { Badge } from "./ui";
import { invoiceStatusTone, money, shortDate } from "@/lib/format";
import {
  INVOICE_STATUS_LABELS,
  type Invoice,
  type InvoiceStatus,
} from "@/lib/types";

export function InvoiceList({
  projectId,
  invoices,
}: {
  projectId: string;
  invoices: Invoice[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = invoices.reduce((sum, i) => sum + Number(i.amount), 0);
  const paid = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await saveInvoice(data);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setEditing(null);
      router.refresh();
    });
  }

  const invoice = invoices.find((i) => i.id === editing);

  return (
    <div className="space-y-3">
      {invoices.length > 0 && (
        <>
          <ul className="divide-y divide-border">
            {invoices.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {money(Number(item.amount))}
                  </div>
                  <div className="mt-0.5 text-xs text-ink-faint">
                    {item.description ?? "No description"}
                    {item.issued_on && ` · issued ${shortDate(item.issued_on)}`}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={invoiceStatusTone(item.status)}>
                    {INVOICE_STATUS_LABELS[item.status]}
                  </Badge>
                  <button
                    onClick={() => setEditing(item.id)}
                    className="text-xs text-ink-faint hover:text-ink"
                  >
                    Edit
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex justify-between border-t border-border pt-2.5 text-sm">
            <span className="text-ink-muted">
              {money(paid)} paid of {money(total)}
            </span>
            {total - paid > 0 && (
              <span className="font-medium text-warn">
                {money(total - paid)} outstanding
              </span>
            )}
          </div>
        </>
      )}

      {editing === null ? (
        <button
          onClick={() => setEditing("")}
          className="btn btn-ghost w-full"
        >
          {invoices.length ? "Add another invoice" : "Add invoice"}
        </button>
      ) : (
        <form
          onSubmit={onSubmit}
          className="space-y-3 rounded-lg bg-surface-2 p-3"
        >
          <input type="hidden" name="project_id" value={projectId} />
          <input type="hidden" name="id" value={invoice?.id ?? ""} />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="amount">
                Amount ($)
              </label>
              <input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                required
                autoFocus
                className="field"
                defaultValue={invoice?.amount ?? ""}
              />
            </div>
            <div>
              <label className="label" htmlFor="status">
                Status
              </label>
              <select
                id="status"
                name="status"
                className="field"
                defaultValue={invoice?.status ?? "draft"}
              >
                {(Object.keys(INVOICE_STATUS_LABELS) as InvoiceStatus[]).map(
                  (key) => (
                    <option key={key} value={key}>
                      {INVOICE_STATUS_LABELS[key]}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="description">
              Description
            </label>
            <input
              id="description"
              name="description"
              className="field"
              placeholder="Deposit, final payment…"
              defaultValue={invoice?.description ?? ""}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="label" htmlFor="issued_on">
                Issued
              </label>
              <input
                id="issued_on"
                name="issued_on"
                type="date"
                className="field"
                defaultValue={invoice?.issued_on ?? ""}
              />
            </div>
            <div>
              <label className="label" htmlFor="due_on">
                Due
              </label>
              <input
                id="due_on"
                name="due_on"
                type="date"
                className="field"
                defaultValue={invoice?.due_on ?? ""}
              />
            </div>
            <div>
              <label className="label" htmlFor="paid_on">
                Paid
              </label>
              <input
                id="paid_on"
                name="paid_on"
                type="date"
                className="field"
                defaultValue={invoice?.paid_on ?? ""}
              />
            </div>
          </div>

          {error && <p className="text-sm text-bad">{error}</p>}

          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" disabled={pending}>
              {pending ? "Saving…" : "Save invoice"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="btn btn-ghost"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
