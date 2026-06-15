"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CreatorLoginForm } from "@/components/creator-login-form";
import { ThemeToggle } from "@/components/theme-toggle";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";

  return (
    <div className="min-h-dvh kraftstoff-bg kraftgeon-grid flex items-center justify-center p-6">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="card w-full max-w-md p-8">
        <p className="mono-label mb-2">Ersteller-Login</p>
        <h1 className="text-2xl font-bold mb-6">Anmelden</h1>
        <CreatorLoginForm redirect={redirect} />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
