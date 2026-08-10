"use client";

import { useState, useTransition } from "react";
import { submitIntake } from "./actions";
import { PAGE_OPTIONS, type IntakeForm } from "@/lib/types";

/**
 * Mirrors Client Website Intake Form.docx question for question, so the answers
 * you're used to reading come back in the same order.
 */
export function IntakeFormView({ intake }: { intake: IntakeForm }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await submitIntake(data);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="card p-8 text-center">
        <h1 className="text-lg font-semibold">Thanks — got it.</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Your answers came through. Wes will be in touch shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="token" value={intake.token} />

      <div className="card p-5">
        <h1 className="text-lg font-semibold">Website info — quick questions</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Takes about five minutes. Skip anything you&rsquo;re not sure about.
        </p>
      </div>

      <Question label="Business name" htmlFor="business_name">
        <input
          id="business_name"
          name="business_name"
          className="field"
          required
          defaultValue={intake.business_name ?? ""}
        />
      </Question>

      <Question label="What does your business do?" htmlFor="what_business_does">
        <textarea
          id="what_business_does"
          name="what_business_does"
          rows={3}
          className="field"
        />
      </Question>

      <Question label="Best contact (email or phone)" htmlFor="best_contact">
        <input id="best_contact" name="best_contact" className="field" />
      </Question>

      <Question label="City / service area" htmlFor="service_area">
        <input
          id="service_area"
          name="service_area"
          className="field"
          placeholder="Forney, Rockwall, Mesquite…"
        />
      </Question>

      <fieldset className="card p-4">
        <legend className="px-1 text-sm font-medium">
          What pages do you want?
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PAGE_OPTIONS.map((page) => (
            <label
              key={page}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5 text-sm"
            >
              <input
                type="checkbox"
                name="pages_wanted"
                value={page}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              {page}
            </label>
          ))}
        </div>
        <input
          name="pages_custom"
          className="field mt-2"
          placeholder="Anything else? (optional)"
        />
      </fieldset>

      <Question
        label="Do you have any websites you like?"
        hint="Links if yes — optional"
        htmlFor="reference_sites"
      >
        <textarea
          id="reference_sites"
          name="reference_sites"
          rows={2}
          className="field"
        />
      </Question>

      <fieldset className="card p-4">
        <legend className="px-1 text-sm font-medium">
          Do you have text or photos already?
        </legend>
        <div className="mt-2 flex gap-2">
          {["Yes", "Some", "No"].map((option) => (
            <label
              key={option}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-surface-2 px-3 py-2.5 text-sm"
            >
              <input
                type="radio"
                name="has_content"
                value={option}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              {option}
            </label>
          ))}
        </div>
      </fieldset>

      <Question
        label="Anything special you want on the site?"
        htmlFor="special_requests"
      >
        <textarea
          id="special_requests"
          name="special_requests"
          rows={3}
          className="field"
          placeholder="Online booking, gallery, reviews, contact form…"
        />
      </Question>

      <Question
        label="Anything else you want me to know?"
        htmlFor="anything_else"
      >
        <textarea
          id="anything_else"
          name="anything_else"
          rows={3}
          className="field"
        />
      </Question>

      <div className="card p-4">
        <h2 className="text-sm font-medium">How it works</h2>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-ink-muted">
          <div>
            <dt className="text-ink-faint">Source code</dt>
            <dd>GitHub — yours</dd>
          </div>
          <div>
            <dt className="text-ink-faint">Hosting</dt>
            <dd>Cloudflare — your account</dd>
          </div>
          <div>
            <dt className="text-ink-faint">Domain</dt>
            <dd>Namecheap — your name</dd>
          </div>
          <div>
            <dt className="text-ink-faint">Form sending</dt>
            <dd>FormBackend</dd>
          </div>
        </dl>
      </div>

      {error && <p className="text-sm text-bad">{error}</p>}

      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Sending…" : "Send my answers"}
      </button>
    </form>
  );
}

function Question({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-4">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {hint && <p className="mt-0.5 text-xs text-ink-faint">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}
