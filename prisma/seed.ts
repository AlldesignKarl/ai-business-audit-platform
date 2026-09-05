import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

/**
 * Datos de DEMOSTRACIÓN, claramente ficticios (nombres, direcciones y
 * reseñas inventados a propósito) — solo para poder probar el flujo
 * completo (dashboard, CRM, auditoría, scoring, informes) sin depender de
 * credenciales reales de terceros. Nunca se presentan como negocios reales.
 */
async function main() {
  const organization = await db.organization.upsert({
    where: { slug: "demo-agency" },
    update: {},
    create: { name: "Demo Agency", slug: "demo-agency", plan: "trial" },
  });

  const passwordHash = await bcrypt.hash("Demo1234!", 10);
  const owner = await db.user.upsert({
    where: { email: "owner@demo-agency.test" },
    update: {},
    create: { email: "owner@demo-agency.test", name: "Owner Demo", passwordHash },
  });

  await db.membership.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: owner.id } },
    update: {},
    create: { organizationId: organization.id, userId: owner.id, role: "OWNER" },
  });

  const business1 = await db.business.upsert({
    where: { organizationId_googlePlaceId: { organizationId: organization.id, googlePlaceId: "demo-place-1" } },
    update: {},
    create: {
      organizationId: organization.id,
      name: "Restaurante Demo El Fogón (ficticio)",
      category: "restaurant",
      country: "España",
      city: "Zaragoza",
      address: "Calle Ficticia 12 (dato de demostración)",
      website: undefined,
      phone: "+34600000000",
      rating: 3.6,
      reviewCount: 8,
      googlePlaceId: "demo-place-1",
      status: "NEW",
    },
  });

  const business2 = await db.business.upsert({
    where: { organizationId_googlePlaceId: { organizationId: organization.id, googlePlaceId: "demo-place-2" } },
    update: {},
    create: {
      organizationId: organization.id,
      name: "Clínica Dental Demo Sonrisas (ficticio)",
      category: "dentist",
      country: "España",
      city: "Madrid",
      address: "Avenida Ficticia 45 (dato de demostración)",
      phone: "+34600000001",
      rating: 4.6,
      reviewCount: 120,
      googlePlaceId: "demo-place-2",
      status: "NEW",
      isClient: true,
      clientSince: new Date(),
    },
  });

  await db.emailTemplate.upsert({
    where: { id: "demo-template-audit-intro" },
    update: {},
    create: {
      id: "demo-template-audit-intro",
      organizationId: organization.id,
      name: "Introducción de auditoría",
      subject: "Hemos analizado la presencia digital de {{business_name}}",
      bodyHtml:
        "<p>Hola,</p><p>Hemos realizado un análisis de la presencia digital de <strong>{{business_name}}</strong> y detectado varios puntos de fricción que podrían estar reduciendo sus oportunidades de conversión, entre ellos: {{top_problem}}.</p><p>Puede consultar el informe completo aquí: <a href=\"{{report_link}}\">{{report_link}}</a></p><p>Un saludo.</p><p><a href=\"{{unsubscribe_link}}\">Darse de baja</a></p>",
      variables: ["business_name", "industry", "top_problem", "website", "audit_score", "report_link", "unsubscribe_link"],
    },
  });

  await db.automation.upsert({
    where: { id: "demo-automation-low-rating-review" },
    update: {},
    create: {
      id: "demo-automation-low-rating-review",
      organizationId: organization.id,
      name: "Responder reseñas negativas con aprobación",
      trigger: { event: "review.created" },
      conditions: [{ field: "rating", operator: "lte", value: 3 }],
      actions: [
        { type: "analyze_reviews", params: {} },
        { type: "require_approval", params: { type: "review_response", title: "Respuesta a reseña negativa pendiente de aprobación" } },
      ],
      isActive: true,
    },
  });

  const agent = await db.aiAgent.upsert({
    where: { id: "demo-agent-clinica-sonrisas" },
    update: {},
    create: {
      id: "demo-agent-clinica-sonrisas",
      organizationId: organization.id,
      businessId: business2.id,
      name: "Agente IA — Clínica Dental Demo Sonrisas",
      persona: { tone: "profesional y cercano", services: ["odontología general", "estética dental"] },
      allowedConnectors: [],
    },
  });

  console.log("Seed completado:");
  console.log({ organization: organization.slug, owner: owner.email, businesses: [business1.name, business2.name], agent: agent.name });
  console.log("Login de prueba -> email: owner@demo-agency.test | password: Demo1234! | organización: demo-agency");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
