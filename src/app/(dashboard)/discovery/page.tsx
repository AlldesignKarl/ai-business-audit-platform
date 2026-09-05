import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { triggerDiscoveryAction, runProspectingAgentAction } from "@/lib/actions";
import { getCapabilities } from "@/lib/env";

interface DiscoverySearchParams {
  error?: string;
  suggested?: string;
  country?: string;
  city?: string;
  province?: string;
  category?: string;
  sector?: string;
  opportunityCriteria?: string;
  explanation?: string;
}

export default function DiscoveryPage({ searchParams }: { searchParams: DiscoverySearchParams }) {
  const capabilities = getCapabilities();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Prospección de negocios</h1>
        <p className="text-sm text-muted-foreground">
          Busca negocios públicamente disponibles por ubicación y categoría. El análisis se ejecuta en background.
        </p>
      </div>

      {searchParams.error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-5 text-sm text-destructive">
            <strong>No se pudo iniciar la búsqueda:</strong> {decodeURIComponent(searchParams.error)}
          </CardContent>
        </Card>
      )}

      {!capabilities.googlePlaces && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="pt-5 text-sm">
            <strong>Fuente de datos no configurada:</strong> falta <code>GOOGLE_PLACES_API_KEY</code>. La búsqueda no
            devolverá resultados hasta configurarla — la plataforma nunca genera negocios simulados.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>🤖 Agente de Prospección</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="mb-3 text-sm text-muted-foreground">
            Describe qué tipo de negocios buscas en lenguaje natural. El agente solo rellena el formulario de abajo
            con su sugerencia — nunca lanza la búsqueda ni inventa negocios por sí solo, tú siempre confirmas.
          </p>
          {!capabilities.ai && (
            <p className="mb-3 text-xs text-warning">
              Falta configurar <code>ANTHROPIC_API_KEY</code> en el servidor para usar este agente. Mientras tanto,
              rellena la búsqueda manualmente abajo.
            </p>
          )}
          <form action={runProspectingAgentAction} className="flex gap-2">
            <input
              name="goal"
              required
              placeholder="Ej: restaurantes en Madrid con mala presencia digital"
              className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
            <Button type="submit" disabled={!capabilities.ai}>
              Sugerir
            </Button>
          </form>
        </CardContent>
      </Card>

      {searchParams.suggested && searchParams.explanation && (
        <Card className="border-accent/40 bg-accent/5">
          <CardContent className="pt-5 text-sm">
            <strong>Sugerencia aplicada:</strong> {decodeURIComponent(searchParams.explanation)} Revisa los campos
            abajo y pulsa &ldquo;Buscar negocios&rdquo; cuando estés conforme.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Nueva búsqueda</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <form action={triggerDiscoveryAction} className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Field name="category" label="Categoría / sector" placeholder="Restaurantes" required defaultValue={searchParams.category} />
            <Field name="country" label="País" placeholder="España" required defaultValue={searchParams.country} />
            <Field name="province" label="Provincia" placeholder="Zaragoza" defaultValue={searchParams.province} />
            <Field name="city" label="Ciudad" placeholder="Zaragoza" defaultValue={searchParams.city} />
            <Field name="postalCode" label="Código postal" placeholder="50001" />
            <Field name="zone" label="Zona" placeholder="Centro" />
            <Field name="language" label="Idioma" placeholder="es" />
            <Field name="maxResults" label="Máx. resultados" defaultValue="20" type="number" />
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Criterio de oportunidad</label>
              <select
                name="opportunityCriteria"
                defaultValue={searchParams.opportunityCriteria ?? "any"}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="any">Todos</option>
                <option value="high_opportunity_only">Solo alta oportunidad</option>
              </select>
            </div>
            <div className="col-span-full">
              <Button type="submit">Buscar negocios</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  name,
  label,
  placeholder,
  defaultValue,
  required,
  type = "text",
}: {
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
    </div>
  );
}
