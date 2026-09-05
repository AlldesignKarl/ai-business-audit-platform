"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn("credentials", { email, password, organizationSlug, redirect: false });
    setLoading(false);
    if (result?.error) {
      // NextAuth devuelve "CredentialsSignin" para credenciales incorrectas,
      // pero cualquier otro error (BD caída, Redis, etc.) llega aquí tal cual
      // lo lanzó authorize() — mostrarlo ayuda a diagnosticar en producción.
      setError(result.error === "CredentialsSignin" ? "Email o contraseña incorrectos" : `Error: ${result.error}`);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card/90 p-8 shadow-card backdrop-blur-sm">
        <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-gradient shadow-glow">
          <Sparkles size={20} className="text-white" strokeWidth={2.5} />
        </div>
        <h1 className="mb-1 text-xl font-semibold tracking-tight">AI Business Audit Platform</h1>
        <p className="mb-6 text-sm text-muted-foreground">Inicia sesión para continuar</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            type="password"
            required
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            type="text"
            placeholder="Organización (slug, opcional)"
            value={organizationSlug}
            onChange={(e) => setOrganizationSlug(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="mt-2 w-full">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
