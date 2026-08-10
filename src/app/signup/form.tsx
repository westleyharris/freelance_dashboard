"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bootstrapAccount } from "./actions";
import { createClient } from "@/lib/supabase/client";

export function SignupForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await bootstrapAccount(data);
      if (result?.error) {
        setError(result.error);
        return;
      }

      // Sign straight in so there's no second password prompt.
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(`Account created, but sign-in failed: ${signInError.message}`);
        return;
      }

      router.push("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4 p-6">
      <div>
        <h1 className="text-lg font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-ink-muted">
          One-time setup for the Freelance Dashboard.
        </p>
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
          autoComplete="username"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="field"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="mt-1 text-xs text-ink-faint">
          At least 8 characters. Use a password manager.
        </p>
      </div>

      {error && <p className="text-sm text-bad">{error}</p>}

      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Creating…" : "Create account & sign in"}
      </button>

      <p className="text-center text-xs text-ink-faint">
        This page stops working once the first account exists.
      </p>
    </form>
  );
}
