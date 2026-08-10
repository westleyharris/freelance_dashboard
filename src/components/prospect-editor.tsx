"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProspect } from "@/app/actions";
import {
  LOST_REASON_LABELS,
  STAGE_LABELS,
  STAGE_ORDER,
  WEBSITE_STATUS_LABELS,
  type LostReason,
  type Prospect,
  type WebsiteStatus,
} from "@/lib/types";

export function ProspectEditor({ prospect }: { prospect: Prospect }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [stage, setStage] = useState(prospect.stage);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updateProspect(data);
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
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="id" value={prospect.id} />

      <div>
        <label className="label" htmlFor="business_name">
          Business
        </label>
        <input
          id="business_name"
          name="business_name"
          className="field"
          defaultValue={prospect.business_name}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="contact_name">
            Contact
          </label>
          <input
            id="contact_name"
            name="contact_name"
            className="field"
            defaultValue={prospect.contact_name ?? ""}
          />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            className="field"
            defaultValue={prospect.phone ?? ""}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="field"
          defaultValue={prospect.email ?? ""}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="category">
            Category
          </label>
          <input
            id="category"
            name="category"
            className="field"
            defaultValue={prospect.category ?? ""}
          />
        </div>
        <div>
          <label className="label" htmlFor="city">
            City
          </label>
          <input
            id="city"
            name="city"
            className="field"
            defaultValue={prospect.city ?? ""}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="stage">
          Stage
        </label>
        <select
          id="stage"
          name="stage"
          className="field"
          value={stage}
          onChange={(e) => setStage(e.target.value as Prospect["stage"])}
        >
          {STAGE_ORDER.map((option) => (
            <option key={option} value={option}>
              {STAGE_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      {stage === "lost" && (
        <div>
          <label className="label" htmlFor="lost_reason">
            Why?
          </label>
          <select
            id="lost_reason"
            name="lost_reason"
            className="field"
            defaultValue={prospect.lost_reason ?? ""}
          >
            <option value="">—</option>
            {(Object.keys(LOST_REASON_LABELS) as LostReason[]).map((option) => (
              <option key={option} value={option}>
                {LOST_REASON_LABELS[option]}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label" htmlFor="website_status">
          Website
        </label>
        <select
          id="website_status"
          name="website_status"
          className="field"
          defaultValue={prospect.website_status}
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

      <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5">
        <input
          type="checkbox"
          name="chamber_member"
          defaultChecked={prospect.chamber_member}
          className="h-4 w-4 accent-[var(--color-accent)]"
        />
        <span className="text-sm">Chamber of Commerce member</span>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="next_action_at">
            Follow up
          </label>
          <input
            id="next_action_at"
            name="next_action_at"
            type="date"
            className="field"
            defaultValue={prospect.next_action_at ?? ""}
          />
        </div>
        <div>
          <label className="label" htmlFor="quoted_amount">
            Quoted ($)
          </label>
          <input
            id="quoted_amount"
            name="quoted_amount"
            type="number"
            step="1"
            className="field"
            defaultValue={prospect.quoted_amount ?? ""}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="field"
          defaultValue={prospect.notes ?? ""}
        />
      </div>

      {error && <p className="text-sm text-bad">{error}</p>}

      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Saving…" : saved ? "Saved" : "Save changes"}
      </button>
    </form>
  );
}
