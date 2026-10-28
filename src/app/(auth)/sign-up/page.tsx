import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthLink, AuthShell } from "@/components/auth/auth-shell";
import { signUp } from "../actions";

export const metadata: Metadata = { title: "Create an account" };

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create an account"
      intro="Use any personal email address. Gmail is fine."
      footer={
        <p>
          Already have an account? <AuthLink href="/sign-in">Sign in</AuthLink>
        </p>
      }
    >
      <p className="rounded-control bg-brand-soft p-3 text-sm text-ink">
        Create a new password just for ReviewLens. Don&apos;t use your Gmail or school (SIAS) password. ReviewLens
        never asks for those.
      </p>
      <AuthForm
        action={signUp}
        submitLabel="Create account"
        pendingLabel="Creating your account…"
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          {
            name: "password",
            label: "New ReviewLens password",
            type: "password",
            autoComplete: "new-password",
            help: "At least 8 characters.",
          },
          { name: "confirm", label: "Type the password again", type: "password", autoComplete: "new-password" },
        ]}
      />
    </AuthShell>
  );
}
