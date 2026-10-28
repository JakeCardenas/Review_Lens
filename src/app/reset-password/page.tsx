import type { Metadata } from "next";
import { updatePassword } from "@/app/(auth)/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { requireUser } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Choose a new password" };

/** Reached from a password-reset email, which signs the person in first. */
export default async function ResetPasswordPage() {
  const user = await requireUser("/reset-password");
  return (
    <AuthShell title="Choose a new password" intro={`For ${user.email}. Pick a new password just for ReviewLens.`}>
      <AuthForm
        action={updatePassword}
        submitLabel="Save new password"
        pendingLabel="Saving…"
        fields={[
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
