"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [error, setError] = useState("");
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form
        className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const result = await signIn("credentials", {
            email: form.get("email"),
            password: form.get("password"),
            redirect: true,
            callbackUrl: "/dashboard",
          });
          if (result?.error) setError("Identifiants invalides.");
        }}
      >
        <h1 className="text-xl font-semibold">TradeIntel Maroc</h1>
        <p className="mt-1 text-sm text-slate-500">Connexion B2B sécurisée.</p>
        <div className="mt-5 space-y-3">
          <Input name="email" type="email" placeholder="admin@tradeintel.ma" defaultValue="admin@tradeintel.ma" />
          <Input name="password" type="password" placeholder="Mot de passe" defaultValue="admin123" />
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <Button className="mt-5 w-full" type="submit">Se connecter</Button>
      </form>
    </main>
  );
}
