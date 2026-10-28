import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthLink, AuthShell } from "@/components/auth/auth-shell";
import { resendConfirmation } from "../actions";

export const metadata: Metadata = { title: "Check your email" };

export default function CheckEmailPage() {
  return (
    <AuthShell
      title="Check your email"
      intro="We sent you a link. Open it to confirm your email, then sign in."
      footer={
        <p>
          Confirmed already? <AuthLink href="/sign-in">Sign in</AuthLink>
        </p>
      }
    >
      <div className="flex items-start gap-3 text-[15px] text-ink-2">
        <MailCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-ink" />
        <p>
          The link works on any device. If it doesn&apos;t arrive in a few minutes, check your spam folder, or enter your
          email below for a new one.
        </p>
      </div>
      <AuthForm
        action={resendConfirmation}
        submitLabel="Send a new link"
        pendingLabel="Sending…"
        fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]}
      />
    </AuthShell>
  );
}
