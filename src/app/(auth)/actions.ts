"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNextPath } from "@/lib/auth/paths";
import { getCurrentUser } from "@/lib/server/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string };

const Email = z.string().trim().toLowerCase().pipe(z.email({ error: "Enter a valid email address." }).max(254));
const NewPassword = z
  .string()
  .min(8, { error: "Use at least 8 characters for your password." })
  .max(72, { error: "Use at most 72 characters for your password." });
const AnyPassword = z.string().min(1, { error: "Enter your password." }).max(72);

const text = (data: FormData, name: string) => {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
};

/** This site's address, for the links in sign-up and password emails. Supabase only follows addresses on its allow list. */
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocol = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

const TOO_MANY = "Too many attempts right now. Wait a few minutes, then try again.";

/** Messages for Supabase Auth error codes people can act on. Anything else gets a general message. */
function explain(error: { code?: string; status?: number; message: string }, fallback: string): string {
  if (error.status === 429 || error.code?.startsWith("over_")) return TOO_MANY;
  if (error.code === "weak_password") return `Choose a stronger password. ${error.message}`;
  if (error.code === "email_address_not_authorized") {
    return "ReviewLens can't send email to that address yet, because its email sender isn't set up. Try again later.";
  }
  if (error.code === "email_address_invalid") return "That email address can't receive email. Check it and try again.";
  return fallback;
}

function newPasswordProblem(password: string, confirm: string): string | null {
  const parsed = NewPassword.safeParse(password);
  if (!parsed.success) return parsed.error.issues[0].message;
  return password === confirm ? null : "The passwords don't match.";
}

export async function signUp(_prev: AuthState, data: FormData): Promise<AuthState> {
  const email = Email.safeParse(text(data, "email"));
  if (!email.success) return { error: email.error.issues[0].message };
  const password = text(data, "password");
  const problem = newPasswordProblem(password, text(data, "confirm"));
  if (problem) return { error: problem };

  const supabase = await createSupabaseServerClient();
  const { data: result, error } = await supabase.auth.signUp({
    email: email.data,
    password,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=%2F` },
  });
  if (error) return { error: explain(error, "Your account couldn't be created. Try again in a moment.") };
  // A session straight away means Supabase's "Confirm email" setting is off. ReviewLens requires a
  // confirmed email, so it doesn't keep that session.
  if (result.session) {
    await supabase.auth.signOut();
    return {
      error:
        "Sign-up is paused because email confirmation is turned off for this app. The app owner needs to turn on Confirm email in Supabase.",
    };
  }
  // Supabase answers the same way when the email already has an account, so this doesn't reveal it.
  redirect("/check-email");
}

export async function signIn(_prev: AuthState, data: FormData): Promise<AuthState> {
  const email = Email.safeParse(text(data, "email"));
  const password = AnyPassword.safeParse(text(data, "password"));
  if (!email.success || !password.success) return { error: "Enter your email and password." };

  const supabase = await createSupabaseServerClient();
  const { data: result, error } = await supabase.auth.signInWithPassword({ email: email.data, password: password.data });
  const unconfirmed =
    "Confirm your email first: open the link we sent when you signed up. You can get a new link on the Check your email page.";
  if (error) {
    if (error.code === "email_not_confirmed") return { error: unconfirmed };
    if (error.code === "invalid_credentials") return { error: "Email or password is incorrect." };
    return { error: explain(error, "Signing in didn't work. Try again in a moment.") };
  }
  if (!result.user?.email_confirmed_at) {
    await supabase.auth.signOut();
    return { error: unconfirmed };
  }
  redirect(safeNextPath(data.get("next")));
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

const RESET_SENT =
  "If an account uses that email, we sent a link to set a new password. It can take a few minutes, so check your spam folder too.";

export async function requestPasswordReset(_prev: AuthState, data: FormData): Promise<AuthState> {
  const email = Email.safeParse(text(data, "email"));
  if (!email.success) return { error: email.error.issues[0].message };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${await siteOrigin()}/auth/confirm?next=%2Freset-password`,
  });
  // Only rate limits are reported; anything else would reveal whether the email has an account.
  if (error && (error.status === 429 || error.code?.startsWith("over_"))) return { error: TOO_MANY };
  return { message: RESET_SENT };
}

export async function updatePassword(_prev: AuthState, data: FormData): Promise<AuthState> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const password = text(data, "password");
  const problem = newPasswordProblem(password, text(data, "confirm"));
  if (problem) return { error: problem };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { error: "Choose a password different from your old one." };
    return { error: explain(error, "Your password couldn't be changed. Try again in a moment.") };
  }
  redirect("/");
}

const RESEND_SENT =
  "If that email has an account waiting for confirmation, we sent a new link. It can take a few minutes, so check your spam folder too.";

export async function resendConfirmation(_prev: AuthState, data: FormData): Promise<AuthState> {
  const email = Email.safeParse(text(data, "email"));
  if (!email.success) return { error: email.error.issues[0].message };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.data,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=%2F` },
  });
  if (error && (error.status === 429 || error.code?.startsWith("over_"))) return { error: TOO_MANY };
  return { message: RESEND_SENT };
}
