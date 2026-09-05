import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatScore } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "default" | "success" | "high" | "critical"> = {
  NEW: "default",
  ANALYZED: "default",
  QUALIFIED: "high",
  CONTACTED: "high",
  REPLIED: "high",
  MEETING: "high",
  CUSTOMER: "success",
  IN_PROGRESS: "success",
  COMPLETED: "success",
  NOT_INTERESTED: "critical",
};

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string; discoveryStarted?: string };
}) {
  const session = await getServerSession(authOptions);
  const organizationId = session!.user.organizationId;

  const businesses = await db.business.findMany({
    where: {
      organizationId,
      ...(searchParams.status ? { status: searchParams.status as never } : {}),
      ...(searchParams.q ? { name: { contains: searchParams.q, mode: "insensitive" } } : {}),
    },
    orderBy: { opportunityScore: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      {searchParams.discoveryStarted && (
        <Card className="border-success/40 bg-success/5">
          <CardContent className="pt-5 text-sm">
            <strong>Búsqueda iniciada:</strong> estamos buscando negocios en background. Los nuevos resultados
            aparecerán aquí en unos minutos — puedes recargar esta página para verlos.
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Negocios</h1>
          <p className="text-sm text-muted-foreground">{businesses.length} resultados</p>
        </div>
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={searchParams.q}
            placeholder="Buscar por nombre..."
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          />
        </form>
      </div>

      {businesses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="font-medium">Todavía no hay negocios</p>
            <p className="text-sm text-muted-foreground">Lanza una búsqueda de prospección para empezar.</p>
            <Link href="/discovery" className="text-sm text-accent hover:underline">
              Ir a Prospección →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Categoría</th>
                <th className="px-4 py-2">Ciudad</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Health Score</th>
                <th className="px-4 py-2">Opportunity</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((b) => (
                <tr key={b.id} className="border-t border-border hover:bg-muted/50">
                  <td className="px-4 py-2">
                    <Link href={`/businesses/${b.id}`} className="font-medium text-accent hover:underline">
                      {b.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{b.category ?? "—"}</td>
                  <td className="px-4 py-2">{b.city ?? "—"}</td>
                  <td className="px-4 py-2">
                    <Badge variant={STATUS_VARIANT[b.status] ?? "default"}>{b.status}</Badge>
                  </td>
                  <td className="px-4 py-2">{formatScore(b.overallScore)}</td>
                  <td className="px-4 py-2">{formatScore(b.opportunityScore)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
