"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card/90 p-8 text-center shadow-card backdrop-blur-sm">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/15">
          <AlertTriangle size={20} className="text-destructive" strokeWidth={2.5} />
        </div>
        <h1 className="mb-1 text-lg font-semibold tracking-tight">Algo ha ido mal</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Ha ocurrido un error inesperado. Puedes intentarlo de nuevo; si el problema persiste, contacta con soporte.
        </p>
        {error.digest && <p className="mb-6 font-mono text-xs text-muted-foreground">Ref: {error.digest}</p>}
        <Button onClick={() => reset()} className="w-full">
          Intentar de nuevo
        </Button>
      </div>
    </div>
  );
}
