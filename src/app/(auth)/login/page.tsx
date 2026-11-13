import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/current-user";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/dashboard");
  const sp = await props.searchParams;
  const callbackUrl = typeof sp.callbackUrl === "string" ? sp.callbackUrl : "";
  const changed = sp.changed === "1";

  return (
    <div className="bg-sidebar flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-sidebar-foreground mb-6 flex items-center justify-center gap-2">
          <span className="bg-brand-gold inline-block size-3 rounded-full" aria-hidden />
          <span className="text-xl font-semibold tracking-tight">BD CRM</span>
        </div>
        <div className="bg-card rounded-lg p-6 shadow-lg">
          <h1 className="mb-1 text-lg font-semibold">Sign in</h1>
          <p className="text-muted-foreground mb-5 text-sm">Use your firm email address.</p>
          <LoginForm callbackUrl={callbackUrl} passwordChanged={changed} />
        </div>
      </div>
    </div>
  );
}
