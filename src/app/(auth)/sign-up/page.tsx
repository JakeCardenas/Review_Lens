import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthLink, AuthShell } from "@/components/auth/auth-shell";
import { signUp } from "../actions";

export const metadata: Metadata = { title: "Create an account" };

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create your account"
      intro="Start with any personal email address. Gmail works too."
      footer={
        <p>
          Already have an account? <AuthLink href="/sign-in">Sign in</AuthLink>
        </p>
      }
    >
      <p className="flex gap-2.5 rounded-card bg-brand-tint p-4 text-[15px] text-ink">
        <KeyRound aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-ink" />
        <span>Pick a new password just for ReviewLens, not your Gmail or school password.</span>
      </p>
      <AuthForm
        action={signUp}
        submitLabel="Create account"
        pendingLabel="Creating your account…"
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          {
            name: "password",
            label: "Password",
            type: "password",
            autoComplete: "new-password",
            help: "At least 8 characters.",
          },
          { name: "confirm", label: "Confirm password", type: "password", autoComplete: "new-password" },
        ]}
      />
    </AuthShell>
  );
}
