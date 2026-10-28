"use client";

import { useActionState } from "react";
import { Button, Notice } from "@/components/ui";
import type { AuthState } from "@/app/(auth)/actions";

export type AuthField = {
  name: string;
  label: string;
  type: "email" | "password";
  autoComplete: "email" | "current-password" | "new-password";
  help?: string;
};

/** A small account form posted to a Server Action, showing its error or confirmation message. */
export function AuthForm({
  action,
  fields,
  submitLabel,
  pendingLabel,
  hidden = {},
}: {
  action: (state: AuthState, data: FormData) => Promise<AuthState>;
  fields: AuthField[];
  submitLabel: string;
  pendingLabel: string;
  hidden?: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="grid gap-4">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {fields.map((field) => (
        <div key={field.name} className="grid gap-1.5">
          <label htmlFor={`auth-${field.name}`} className="font-semibold">
            {field.label}
          </label>
          <input
            id={`auth-${field.name}`}
            name={field.name}
            type={field.type}
            autoComplete={field.autoComplete}
            required
            minLength={field.autoComplete === "new-password" ? 8 : undefined}
            maxLength={field.type === "email" ? 254 : 72}
            inputMode={field.type === "email" ? "email" : undefined}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint={field === fields[fields.length - 1] ? "go" : "next"}
            aria-describedby={field.help ? `auth-${field.name}-help` : undefined}
            className="min-h-11 w-full rounded-control border border-line-strong bg-surface px-3 text-[16px] text-ink"
          />
          {field.help && (
            <p id={`auth-${field.name}-help`} className="text-sm text-ink-2">
              {field.help}
            </p>
          )}
        </div>
      ))}
      {state.error && <Notice tone="error" title={state.error} />}
      {state.message && <Notice tone="success" title={state.message} live />}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
