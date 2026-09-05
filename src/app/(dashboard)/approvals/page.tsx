import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { decideApprovalAction } from "@/lib/actions";

export default async function ApprovalsPage() {
  const session = await getServerSession(authOptions);
  const organizationId = session!.user.organizationId;

  const approvals = await db.approval.findMany({
    where: { organizationId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: { business: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Approval Center</h1>
        <p className="text-sm text-muted-foreground">Toda acción sensible de IA o automatización pasa por aquí antes de tener efecto.</p>
      </div>

      {approvals.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">No hay aprobaciones pendientes.</CardContent>
        </Card>
      ) : (
        approvals.map((a) => {
          const approve = decideApprovalAction.bind(null, a.id, "APPROVED");
          const reject = decideApprovalAction.bind(null, a.id, "REJECTED");
          return (
            <Card key={a.id}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base font-medium text-foreground">{a.title}</CardTitle>
                <Badge>{a.type}</Badge>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">{a.description}</p>
                {a.business && <p className="mt-1 text-xs text-muted-foreground">Negocio: {a.business.name}</p>}
                <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(a.payload, null, 2)}</pre>
                <div className="mt-3 flex gap-2">
                  <form action={approve}>
                    <Button size="sm">Approve</Button>
                  </form>
                  <form action={reject}>
                    <Button size="sm" variant="destructive">
                      Reject
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
