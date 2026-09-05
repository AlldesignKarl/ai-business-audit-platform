import "dotenv/config";
import { db } from "@/lib/db";
import { enqueueJob } from "@/lib/queue/queues";

async function main() {
  const business = await db.business.findFirstOrThrow({ where: { name: { contains: "Sonrisas" } } });
  console.log("Enqueuing analyze_business for", business.name, business.id);
  const job = await enqueueJob("analyze_business", { businessId: business.id }, { dedupKey: `analyze:${business.id}:queuetest` });
  console.log("Job enqueued:", job.id);
}

main()
  .catch((e) => {
    console.error("QUEUE SMOKE TEST FAILED:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
