import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, severityToVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatScore } from "@/lib/utils";
import { triggerAuditAction, triggerReportAction, createTaskAction, requestSendReportEmailAction } from "@/lib/actions";

export default async function BusinessDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; reportEmailRequested?: string };
}) {
  const session = await getServerSession(authOptions);
  const organizationId = session!.user.organizationId;

  const business = await db.business.findFirst({
    where: { id: params.id, organizationId },
    include: {
      opportunities: { orderBy: { createdAt: "desc" } },
      contacts: true,
      tasks: { orderBy: { createdAt: "desc" } },
      reports: { orderBy: { createdAt: "desc" } },
      audits: { orderBy: { createdAt: "desc" }, take: 1, include: { findings: true } },
    },
  });
  if (!business) notFound();

  const latestAudit = business.audits[0];
  const boundAudit = triggerAuditAction.bind(null, business.id);
  const boundReport = triggerReportAction.bind(null, business.id);

  return (
    <div className="flex flex-col gap-6">
      {searchParams.error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-5 text-sm text-destructive">{decodeURIComponent(searchParams.error)}</CardContent>
        </Card>
      )}
      {searchParams.reportEmailRequested && (
        <Card className="border-success/40 bg-success/5">
          <CardContent className="pt-5 text-sm">
            <strong>Solicitud enviada:</strong> el envío del informe por Gmail está pendiente de aprobación en el{" "}
            <a href="/approvals" className="text-accent hover:underline">
              Approval Center
            </a>
            .
          </CardContent>
        </Card>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{business.name}</h1>
          <p className="text-sm text-muted-foreground">
            {business.category ?? "Sin categoría"} · {business.city ?? "Sin ciudad"}
          </p>
        </div>
        <div className="flex gap-2">
          <form action={boundAudit}>
            <Button variant="outline" type="submit">
              Start audit
            </Button>
          </form>
          <form action={boundReport}>
            <Button type="submit">Generate report</Button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Overall Score" value={formatScore(business.overallScore)} />
        <StatCard label="Opportunity Score" value={formatScore(business.opportunityScore)} />
        <StatCard label="Rating" value={business.rating ? `${business.rating.toFixed(1)}/5` : "—"} />
        <StatCard label="Reseñas" value={String(business.reviewCount ?? "—")} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contacto</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 pt-0 text-sm md:grid-cols-4">
          <div>
            <div className="text-xs text-muted-foreground">Web</div>
            <div>{business.website ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Teléfono</div>
            <div>{business.phone ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Email</div>
            <div>{business.email ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Dirección</div>
            <div>{business.address ?? "—"}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Problemas detectados {latestAudit ? `(${latestAudit.findings.length})` : ""}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {!latestAudit ? (
            <p className="text-sm text-muted-foreground">Todavía no se ha ejecutado ninguna auditoría.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {latestAudit.findings.map((f) => (
                <li key={f.id} className="border-b border-border pb-3 last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={severityToVariant(f.severity)}>{f.severity}</Badge>
                    <span className="font-medium">{f.title}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
                  {f.recommendation && <p className="mt-1 text-sm">→ {f.recommendation}</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Oportunidades</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {business.opportunities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin oportunidades generadas todavía.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {business.opportunities.map((o) => (
                <li key={o.id} className="border-b border-border pb-3 last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={o.priority === "URGENT" ? "critical" : o.priority === "HIGH" ? "high" : "default"}>{o.priority}</Badge>
                    <span className="font-medium">{o.opportunity}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{o.impact}</p>
                  <p className="mt-1 text-sm">Solución: {o.solution}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informes generados</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {business.reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin informes generados todavía.</p>
          ) : (
            <>
              <ul className="text-sm">
                {business.reports.map((r) => (
                  <li key={r.id} className="border-b border-border py-2 last:border-0">
                    v{r.version} — {r.createdAt.toLocaleString("es-ES")}
                  </li>
                ))}
              </ul>
              <form action={requestSendReportEmailAction} className="mt-3 flex gap-2 border-t border-border pt-3">
                <input type="hidden" name="businessId" value={business.id} />
                <input type="hidden" name="reportId" value={business.reports[0]!.id} />
                <input
                  name="to"
                  type="email"
                  required
                  placeholder="Email del destinatario..."
                  className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm"
                />
                <Button type="submit" size="sm" variant="outline">
                  Enviar por Gmail (requiere aprobación)
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tareas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pt-0">
          <form action={createTaskAction} className="flex gap-2">
            <input type="hidden" name="businessId" value={business.id} />
            <input name="title" required placeholder="Nueva tarea..." className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm" />
            <Button type="submit" size="sm">
              Añadir
            </Button>
          </form>
          <ul className="text-sm">
            {business.tasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                <span>{t.title}</span>
                <Badge>{t.status}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-2xl font-semibold">{value}</CardContent>
    </Card>
  );
}
