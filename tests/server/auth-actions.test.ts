import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = {
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  resend: vi.fn(),
  verifyOtp: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  getClaims: vi.fn(),
};
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth }) }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: "review-lens.example", "x-forwarded-proto": "https" }),
}));

const actions = await import("@/app/(auth)/actions");
const { GET: confirm } = await import("@/app/auth/confirm/route");

const ID = "0f9b3c7e-5d2a-4e8b-9c1d-2a3b4c5d6e7f";
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};
/** Where a Server Action redirected to, or null when it returned instead. */
async function redirectedTo(run: Promise<unknown>): Promise<string | null> {
  try {
    await run;
    return null;
  } catch (error) {
    const digest = (error as { digest?: string }).digest ?? "";
    if (!digest.startsWith("NEXT_REDIRECT")) throw error;
    return digest.split(";")[2];
  }
}
const ok = (data: unknown = {}) => ({ data, error: null });
const fail = (code: string, status = 400) => ({ data: {}, error: Object.assign(new Error(code), { code, status }) });

beforeEach(() => {
  for (const fn of Object.values(auth)) fn.mockReset();
  auth.signOut.mockResolvedValue({ error: null });
});

describe("signUp", () => {
  const valid = { email: " New@Example.com ", password: "correct horse battery", confirm: "correct horse battery" };

  it("creates the account and asks the person to confirm their email", async () => {
    auth.signUp.mockResolvedValue(ok({ user: { id: ID, email_confirmed_at: null }, session: null }));
    expect(await redirectedTo(actions.signUp({}, form(valid)))).toBe("/check-email");
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "correct horse battery",
      options: { emailRedirectTo: "https://review-lens.example/auth/confirm?next=%2F" },
    });
  });

  it("checks the email and password before calling Supabase", async () => {
    expect(await actions.signUp({}, form({ ...valid, password: "short", confirm: "short" }))).toMatchObject({
      error: expect.stringMatching(/at least 8/),
    });
    expect(await actions.signUp({}, form({ ...valid, confirm: "something else" }))).toMatchObject({
      error: expect.stringMatching(/don't match/),
    });
    expect(await actions.signUp({}, form({ ...valid, email: "not-an-email" }))).toMatchObject({
      error: expect.stringMatching(/valid email/),
    });
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("refuses a session that skipped email confirmation", async () => {
    auth.signUp.mockResolvedValue(ok({ user: { id: ID, email_confirmed_at: "2026-10-28T00:00:00Z" }, session: { access_token: "x" } }));
    expect(await actions.signUp({}, form(valid))).toMatchObject({ error: expect.stringMatching(/email confirmation/i) });
    expect(auth.signOut).toHaveBeenCalled();
  });

  it("explains when the app's email sender can't reach the address", async () => {
    auth.signUp.mockResolvedValue(fail("email_address_not_authorized"));
    expect(await actions.signUp({}, form(valid))).toMatchObject({ error: expect.stringMatching(/can't send email/) });
  });
});

describe("signIn", () => {
  const valid = { email: "person@example.com", password: "correct horse battery" };

  it("signs in and goes back to the page the person wanted, but never off the site", async () => {
    auth.signInWithPassword.mockResolvedValue(ok({ user: { id: ID, email_confirmed_at: "2026-10-28T00:00:00Z" } }));
    expect(await redirectedTo(actions.signIn({}, form({ ...valid, next: "/uploads/abc" })))).toBe("/uploads/abc");
    expect(await redirectedTo(actions.signIn({}, form({ ...valid, next: "//evil.example" })))).toBe("/");
    expect(await redirectedTo(actions.signIn({}, form({ ...valid, next: "//reviewlens.invalid//evil.example/login" })))).toBe("/");
  });

  it("gives one message for a wrong password or an unknown email", async () => {
    auth.signInWithPassword.mockResolvedValue(fail("invalid_credentials"));
    expect(await actions.signIn({}, form(valid))).toEqual({ error: "Email or password is incorrect." });
  });

  it("asks unconfirmed accounts to confirm their email first, and keeps no session", async () => {
    auth.signInWithPassword.mockResolvedValue(fail("email_not_confirmed"));
    expect(await actions.signIn({}, form(valid))).toMatchObject({ error: expect.stringMatching(/Confirm your email/) });
    auth.signInWithPassword.mockResolvedValue(ok({ user: { id: ID, email_confirmed_at: null } }));
    expect(await actions.signIn({}, form(valid))).toMatchObject({ error: expect.stringMatching(/Confirm your email/) });
    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });
});

describe("password reset", () => {
  it("gives the same answer whether or not the email has an account", async () => {
    auth.resetPasswordForEmail.mockResolvedValue(ok());
    const sent = await actions.requestPasswordReset({}, form({ email: "person@example.com" }));
    auth.resetPasswordForEmail.mockResolvedValue(fail("user_not_found", 404));
    expect(await actions.requestPasswordReset({}, form({ email: "nobody@example.com" }))).toEqual(sent);
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("person@example.com", {
      redirectTo: "https://review-lens.example/auth/confirm?next=%2Freset-password",
    });
  });

  it("sets a new password only for a signed-in account", async () => {
    auth.getClaims.mockResolvedValue({ data: null, error: null });
    const password = { password: "a brand new secret", confirm: "a brand new secret" };
    expect(await redirectedTo(actions.updatePassword({}, form(password)))).toBe("/sign-in");
    auth.getClaims.mockResolvedValue({ data: { claims: { sub: ID, email: "person@example.com" } }, error: null });
    expect(await actions.updatePassword({}, form({ ...password, confirm: "different" }))).toMatchObject({
      error: expect.stringMatching(/don't match/),
    });
    auth.updateUser.mockResolvedValue(ok({ user: { id: ID } }));
    expect(await redirectedTo(actions.updatePassword({}, form(password)))).toBe("/");
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "a brand new secret" });
  });
});

describe("signOut and resendConfirmation", () => {
  it("signs out and goes to the sign-in page", async () => {
    expect(await redirectedTo(actions.signOut())).toBe("/sign-in");
    expect(auth.signOut).toHaveBeenCalled();
  });

  it("gives the same answer to every confirmation resend", async () => {
    auth.resend.mockResolvedValue(ok());
    const first = await actions.resendConfirmation({}, form({ email: "person@example.com" }));
    auth.resend.mockResolvedValue(fail("user_not_found", 404));
    expect(await actions.resendConfirmation({}, form({ email: "nobody@example.com" }))).toEqual(first);
  });
});

describe("/auth/confirm", () => {
  const open = (query: string) => confirm(new NextRequest(`https://review-lens.example/auth/confirm?${query}`));

  it("confirms a sign-up link on any device and continues to a safe page", async () => {
    auth.verifyOtp.mockResolvedValue(ok());
    const response = await open("token_hash=abc&type=email&next=%2Fupload");
    expect(auth.verifyOtp).toHaveBeenCalledWith({ type: "email", token_hash: "abc" });
    expect(response.headers.get("location")).toBe("https://review-lens.example/upload");
    expect((await open("token_hash=abc&type=email&next=%2F%2Fevil.example")).headers.get("location")).toBe(
      "https://review-lens.example/",
    );
  });

  it("never continues to another site, even with a tidied-up path", async () => {
    auth.verifyOtp.mockResolvedValue(ok());
    for (const next of ["/.//evil.example", "/.//reviewlens.invalid//evil.example"]) {
      const response = await open(`token_hash=abc&type=email&next=${encodeURIComponent(next)}`);
      expect(new URL(response.headers.get("location")!).origin).toBe("https://review-lens.example");
    }
  });

  it("sends password-reset links to the new-password page", async () => {
    auth.verifyOtp.mockResolvedValue(ok());
    expect((await open("token_hash=abc&type=recovery")).headers.get("location")).toBe(
      "https://review-lens.example/reset-password",
    );
  });

  it("accepts the default code links opened in the same browser", async () => {
    auth.exchangeCodeForSession.mockResolvedValue(ok());
    expect((await open("code=xyz&next=%2Freset-password")).headers.get("location")).toBe(
      "https://review-lens.example/reset-password",
    );
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("xyz");
  });

  it("sends broken or expired links back to sign in with a note", async () => {
    auth.verifyOtp.mockResolvedValue(fail("otp_expired", 403));
    expect((await open("token_hash=abc&type=email")).headers.get("location")).toBe(
      "https://review-lens.example/sign-in?error=link",
    );
    expect((await open("type=email")).headers.get("location")).toBe("https://review-lens.example/sign-in?error=link");
    expect((await open("token_hash=abc&type=sms")).headers.get("location")).toBe("https://review-lens.example/sign-in?error=link");
  });
});
