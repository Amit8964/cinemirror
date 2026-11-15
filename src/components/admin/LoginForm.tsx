"use client";

import { useActionState } from "react";
import { loginAction, type FormState } from "@/app/admin/actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <form action={action} className="mt-4 space-y-3">
      <label className="block text-sm font-semibold">
        Email
        <input name="email" type="email" required autoComplete="username" defaultValue={state.values?.email ?? ""} className="field mt-1" />
      </label>
      <label className="block text-sm font-semibold">
        Password
        <input name="password" type="password" required autoComplete="current-password" className="field mt-1" />
      </label>
      {state.error && <p role="alert" className="text-sm font-semibold text-danger">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
