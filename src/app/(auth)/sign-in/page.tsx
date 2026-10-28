import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthLink, AuthShell } from "@/components/auth/auth-shell";
import { Notice } from "@/components/ui";
import { safeNextPath } from "@/lib/auth/paths";
import { signIn } from "../actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const sp = await searchParams;
  const next = safeNextPath(Array.isArray(sp.next) ? sp.next[0] : sp.next);
  return (
    <AuthShell
      title="Welcome back"
      intro="Sign in to see your uploads. Only you can see them."
      footer={
        <>
          <p>
            <AuthLink href="/forgot-password">Forgot your password?</AuthLink>
          </p>
          <p>
            New to ReviewLens? <AuthLink href="/sign-up">Create an account</AuthLink>
          </p>
        </>
      }
    >
      {sp.error === "link" && (
        <Notice tone="warning" title="That link didn't work">
          It may have expired or been used already. Sign in below, or ask for a new link.
        </Notice>
      )}
      <AuthForm
        action={signIn}
        hidden={{ next }}
        submitLabel="Sign in"
        pendingLabel="Signing in…"
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
        ]}
      />
    </AuthShell>
  );
}
