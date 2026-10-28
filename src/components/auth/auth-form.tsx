"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button, Notice } from "@/components/ui";
import type { AuthState } from "@/app/(auth)/actions";

export type AuthField = {
  name: string;
  label: string;
  type: "email" | "password";
  autoComplete: "email" | "current-password" | "new-password";
  help?: string;
};

export const fieldClasses =
  "min-h-12 w-full rounded-control border-2 border-field bg-surface px-3.5 text-[16px] text-ink placeholder:text-ink-3 hover:border-ink-3 focus-visible:border-brand-ink";

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
  const [showPasswords, setShowPasswords] = useState(false);
  const hasPassword = fields.some((field) => field.type === "password");

  return (
    <form action={formAction} className="grid gap-5">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {fields.map((field, index) => {
        const isPassword = field.type === "password";
        const firstPassword = isPassword && fields.findIndex((f) => f.type === "password") === index;
        return (
          <div key={field.name} className="grid gap-1.5">
            <div className="flex items-end justify-between gap-3">
              <label htmlFor={`auth-${field.name}`} className="text-[15px] font-bold">
                {field.label}
              </label>
              {firstPassword && hasPassword && (
                <button
                  type="button"
                  aria-pressed={showPasswords}
                  onClick={() => setShowPasswords((value) => !value)}
                  className="press -mr-1 inline-flex min-h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-1.5 text-sm font-bold text-brand-ink hover:bg-brand-soft"
                >
                  {showPasswords ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
                  {showPasswords ? "Hide" : "Show"}
                  <span className="sr-only"> password</span>
                </button>
              )}
            </div>
            <input
              id={`auth-${field.name}`}
              name={field.name}
              type={isPassword && showPasswords ? "text" : field.type}
              autoComplete={field.autoComplete}
              required
              minLength={field.autoComplete === "new-password" ? 8 : undefined}
              maxLength={field.type === "email" ? 254 : 72}
              inputMode={field.type === "email" ? "email" : undefined}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint={index === fields.length - 1 ? "go" : "next"}
              aria-describedby={field.help ? `auth-${field.name}-help` : undefined}
              className={fieldClasses}
            />
            {field.help && (
              <p id={`auth-${field.name}-help`} className="text-sm text-ink-2">
                {field.help}
              </p>
            )}
          </div>
        );
      })}
      {state.error && <Notice tone="error" title={state.error} />}
      {state.message && <Notice tone="success" title={state.message} live />}
      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
