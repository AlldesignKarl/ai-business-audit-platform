import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCapabilities } from "@/lib/env";
import { QUEUE_NAMES } from "@/lib/queue/job-types";
import { getQueueCounts } from "@/lib/queue/queues";

export default async function SystemHealthPage() {
  const session = await getServerSession(authOptions);
  const organizationId = session!.user.organizationId;
  const capabilities = getCapabilities();

  const [queueCounts, recentJobs, connectors] = await Promise.all([
    Promise.all(QUEUE_NAMES.map(async (name) => ({ name, counts: await getQueueCounts(name) }))),
    db.jobRun.findMany({ where: { organizationId }, orderBy: { startedAt: "desc" }, take: 20 }),
    db.connector.findMany({ where: { organizationId } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">System Health</h1>
        <p className="text-sm text-muted-foreground">Estado de colas, conectores y capacidades configuradas.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Capacidades (según variables de entorno)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 pt-0 text-sm md:grid-cols-3">
          {Object.entries(capabilities).map(([key, enabled]) => (
            <div key={key} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span>{key}</span>
              <Badge variant={enabled ? "success" : "critical"}>{enabled ? "Activo" : "No configurado"}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Colas</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-1">Cola</th>
                <th className="py-1">Waiting</th>
                <th className="py-1">Active</th>
                <th className="py-1">Completed</th>
                <th className="py-1">Failed</th>
                <th className="py-1">Delayed</th>
              </tr>
            </thead>
            <tbody>
              {queueCounts.map((q) => (
                <tr key={q.name} className="border-t border-border">
                  <td className="py-1 font-medium">{q.name}</td>
                  <td className="py-1">{q.counts.waiting ?? 0}</td>
                  <td className="py-1">{q.counts.active ?? 0}</td>
                  <td className="py-1">{q.counts.completed ?? 0}</td>
                  <td className="py-1">{q.counts.failed ?? 0}</td>
                  <td className="py-1">{q.counts.delayed ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conectores</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 text-sm">
          {connectors.length === 0 ? (
            <p className="text-muted-foreground">Sin conectores configurados todavía.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {connectors.map((c) => (
                <li key={c.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                  <span>{c.type}</span>
                  <Badge variant={c.status === "CONNECTED" ? "success" : c.status === "ERROR" ? "critical" : "default"}>{c.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimos jobs en background</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 text-sm">
          <ul className="flex flex-col gap-2">
            {recentJobs.map((j) => (
              <li key={j.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                <span>
                  {j.queue} · {j.type}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{j.progress ?? 0}%</span>
                  <Badge variant={j.status === "COMPLETED" ? "success" : j.status === "FAILED" ? "critical" : "default"}>{j.status}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
