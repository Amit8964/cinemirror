import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";
import { Logo } from "@/components/SiteChrome";
import { adminConfigured, getAdmin, usingDevCredentials } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <main className="grid flex-1 place-items-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center"><Logo className="!text-4xl" /></div>
        <div className="mt-6 rounded-2xl border border-line bg-surface p-6">
          <h1 className="text-lg font-bold">Admin sign in</h1>
          {adminConfigured() ? (
            <>
              <LoginForm />
              {usingDevCredentials() && (
                <p className="mt-4 rounded-lg border border-accent/30 bg-accent/10 p-3 text-xs text-text/80">
                  Development mode: sign in with <b>admin@cinemirror.local</b> / <b>admin123</b>. Set
                  ADMIN_EMAIL and ADMIN_PASSWORD before deploying.
                </p>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">
              Admin access is not configured. Set <code className="text-text">ADMIN_EMAIL</code>,{" "}
              <code className="text-text">ADMIN_PASSWORD</code> and <code className="text-text">AUTH_SECRET</code> in
              the server environment, then restart.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
