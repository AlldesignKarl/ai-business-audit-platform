import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAiCostToday, getAiCostThisMonth } from "@/lib/ai/cost-guard";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const organizationId = session!.user.organizationId;

  const [
    totalBusinesses,
    analyzed,
    highOpportunity,
    reportsGenerated,
    emailsSent,
    emailsOpened,
    replies,
    customers,
    recentActivity,
    aiCostToday,
    aiCostMonth,
  ] = await Promise.all([
    db.business.count({ where: { organizationId } }),
    db.business.count({ where: { organizationId, status: { not: "NEW" } } }),
    db.business.count({ where: { organizationId, opportunityScore: { gte: 65 } } }),
    db.report.count({ where: { business: { organizationId } } }),
    db.email.count({ where: { business: { organizationId }, status: "SENT" } }),
    db.emailEvent.count({ where: { type: "OPENED", email: { business: { organizationId } } } }),
    db.emailEvent.count({ where: { type: "REPLIED", email: { business: { organizationId } } } }),
    db.business.count({ where: { organizationId, isClient: true } }),
    db.activity.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take: 10 }),
    getAiCostToday(organizationId),
    getAiCostThisMonth(organizationId),
  ]);

  const stats = [
    { label: "Businesses discovered", value: totalBusinesses },
    { label: "Businesses analyzed", value: analyzed },
    { label: "High opportunity", value: highOpportunity },
    { label: "Reports generated", value: reportsGenerated },
    { label: "Emails sent", value: emailsSent },
    { label: "Emails opened", value: emailsOpened },
    { label: "Replies", value: replies },
    { label: "Customers", value: customers },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Vista general de prospección, auditoría y crecimiento.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <CardTitle>{s.label}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-2xl font-semibold">{s.value}</CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>AI cost today</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-2xl font-semibold">${aiCostToday.toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>AI cost this month</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-2xl font-semibold">${aiCostMonth.toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Acceso rápido</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex flex-col gap-2 text-sm">
            <Link className="text-accent hover:underline" href="/discovery">
              Buscar nuevos negocios →
            </Link>
            <Link className="text-accent hover:underline" href="/businesses">
              Ver todos los negocios →
            </Link>
            <Link className="text-accent hover:underline" href="/approvals">
              Approval Center →
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actividad reciente</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay actividad registrada.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {recentActivity.map((a) => (
                <li key={a.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                  <span>
                    <span className="font-medium">{a.actorType}</span> · {a.action}
                  </span>
                  <span className="text-xs text-muted-foreground">{a.createdAt.toLocaleString("es-ES")}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
