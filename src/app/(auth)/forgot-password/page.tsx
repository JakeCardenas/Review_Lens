import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthLink, AuthShell } from "@/components/auth/auth-shell";
import { requestPasswordReset } from "../actions";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      intro="Enter your email and we'll send you a link to choose a new password."
      footer={
        <p>
          Remembered it? <AuthLink href="/sign-in">Sign in</AuthLink>
        </p>
      }
    >
      <AuthForm
        action={requestPasswordReset}
        submitLabel="Send reset link"
        pendingLabel="Sending…"
        fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]}
      />
    </AuthShell>
  );
}
