import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getAllowedUsers, getSessionUser } from "@/lib/auth";

export default function LoginPage() {
  const sessionUser = getSessionUser();
  if (sessionUser) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-background px-4 pb-8 pt-12 sm:pt-20">
      <div className="mx-auto w-full max-w-md space-y-5">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">potymarket</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Login with your assigned username and password to continue.
          </p>
        </header>

        <LoginForm users={getAllowedUsers()} />
      </div>
    </main>
  );
}
