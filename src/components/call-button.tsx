"use client";

import { useEffect, useState } from "react";
import { telHref } from "@/lib/format";

/**
 * How a "Call" tap actually places the call.
 *
 * On a Mac a plain `tel:` link hands off to the iPhone over Continuity, which
 * is why pressing Call there prompts to open the phone. These are the ways
 * around that without paying for telephony.
 */
export type CallMethod = "tel" | "facetime" | "google-voice";

export const CALL_METHODS: {
  id: CallMethod;
  label: string;
  hint: string;
}[] = [
  {
    id: "tel",
    label: "Phone",
    hint: "Normal dialer. On a Mac this hands off to your iPhone.",
  },
  {
    id: "facetime",
    label: "FaceTime Audio",
    hint: "Talks through the Mac's mic and speakers. Still relays through your iPhone, so it needs to be nearby and on the same Wi-Fi.",
  },
  {
    id: "google-voice",
    label: "Google Voice",
    hint: "Dials from the browser with no iPhone involved. Free for US calls — needs a Google Voice number set up once.",
  },
];

const STORAGE_KEY = "hww.call-method";

export function useCallMethod() {
  const [method, setMethod] = useState<CallMethod>("tel");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) setMethod(saved as CallMethod);
  }, []);

  const update = (next: CallMethod) => {
    setMethod(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  return [method, update] as const;
}

export function callUrl(phone: string | null | undefined, method: CallMethod) {
  const tel = telHref(phone);
  if (!tel) return null;

  const digits = tel.replace("tel:", "");

  switch (method) {
    case "facetime":
      return `facetime-audio://${digits}`;
    case "google-voice":
      // Google Voice opens with the number pre-loaded; you press dial there.
      return `https://voice.google.com/u/0/calls?a=nc,%2B${digits.replace("+", "")}`;
    default:
      return tel;
  }
}

/** Call link that respects the saved method. */
export function CallLink({
  phone,
  children,
  className = "btn btn-primary",
}: {
  phone: string | null | undefined;
  children: React.ReactNode;
  className?: string;
}) {
  const [method] = useCallMethod();
  const href = callUrl(phone, method);

  if (!href) {
    return (
      <span className="btn btn-ghost text-ink-faint">No phone number</span>
    );
  }

  return (
    <a
      href={href}
      className={className}
      // Google Voice is a web app, so it needs its own tab.
      {...(method === "google-voice"
        ? { target: "_blank", rel: "noreferrer" }
        : {})}
    >
      {children}
    </a>
  );
}

/** Picker, shown in calling mode. */
export function CallMethodPicker() {
  const [method, setMethod] = useCallMethod();
  const active = CALL_METHODS.find((m) => m.id === method);

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold">How calls are placed</h3>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {CALL_METHODS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setMethod(option.id)}
            className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              method === option.id
                ? "border-transparent bg-accent-soft text-accent"
                : "border-border bg-surface-2 text-ink-muted hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {active && (
        <p className="mt-2.5 text-xs text-ink-faint">{active.hint}</p>
      )}
    </div>
  );
}
