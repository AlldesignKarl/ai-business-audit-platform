# AI Business Growth & Audit Platform

SaaS de prospección automática, auditoría digital con IA y optimización de
negocios mediante automatizaciones y conectores. Ver el detalle completo del
alcance funcional en el prompt original del proyecto; este README cubre cómo
levantar, operar y extender la plataforma.

## Stack técnico

- **Frontend/Backend**: Next.js 14 (App Router) + TypeScript, Server Actions
- **Base de datos**: PostgreSQL vía Prisma ORM (esquema multi-tenant)
- **Colas / background jobs**: BullMQ + Redis, proceso de workers separado
- **Auth**: NextAuth (Credentials + JWT), RBAC por organización
- **IA**: capa `AI Orchestrator` propia (provider-agnostic) sobre `@anthropic-ai/sdk`,
  con fallback determinista sin IA si no hay credenciales
- **Informes PDF**: Playwright (Chromium headless) sobre plantilla HTML propia
- **Email**: Resend / SMTP (nodemailer) con fallback de solo-registro
- **Estilos**: Tailwind CSS

## 1. Qué se ha construido

Una plataforma funcional de extremo a extremo, no una maqueta:

- **Prospección**: búsqueda masiva de negocios (país/ciudad/provincia/CP/zona/
  categoría/idioma/máx. resultados/criterio de oportunidad) vía Google Places
  API (New), con deduplicación, caché, rate limiting y cola en background.
- **Descubrimiento**: modelo de datos `Business` + `BusinessSource` que
  almacena toda la información pública recopilada.
- **Motor de auditoría IA**: reglas deterministas y explicables (no una caja
  negra) que auditan web (técnico/SEO/conversión), SEO local, reputación y
  redes sociales, cada una con severidad (CRITICAL/HIGH/MEDIUM/LOW/OPPORTUNITY)
  y explicación del "por qué" del impacto potencial.
- **Scoring**: `Business Opportunity Score` y `Business Health Score` (0-100)
  por categoría, con fórmula transparente y reproducible.
- **Generación de oportunidades**: cada problema se traduce automáticamente
  en una oportunidad comercial (problema/oportunidad/impacto/solución/prioridad).
- **Informes PDF**: informe profesional completo (portada, resumen ejecutivo,
  scores, top problems, auditorías por categoría, oportunidades, plan de
  acción 30/60/90, conclusión) generado con Chromium headless.
- **CRM**: estados de negocio (NEW → COMPLETED), contactos, tareas, historial.
- **Dashboard**: KPIs, coste de IA hoy/mes, actividad en tiempo real.
- **Email comercial**: plantillas con variables, suppression list, unsubscribe
  firmado, límites diarios, tracking de eventos (SENT/OPENED/BOUNCED/...).
- **Arquitectura de conectores (plugins)**: Google, Website, Email, WhatsApp
  (Meta Cloud API), Instagram/Facebook (Meta Graph API), Calendar (Google
  Calendar), Analytics (GA4), CRM interno — todos con `connect/authenticate/
  getData/updateData/disconnect`, OAuth2 real donde aplica, credenciales
  cifradas (AES-256-GCM) y permisos granulares (analyze/modify/respond/send/publish).
- **AI Agent por cliente**: recomienda acciones acotadas a los conectores
  autorizados; nunca ejecuta cambios directamente.
- **Automation Builder**: reglas WHEN/IF/THEN persistidas y ejecutadas por el
  motor de automatizaciones.
- **Approval Center**: toda acción sensible (publicar cambios web, responder
  reseñas, acciones de automatización) pasa por aquí antes de tener efecto.
- **Seguridad**: RBAC por rol y organización, aislamiento multi-tenant,
  cifrado de credenciales, rate limiting (login y proveedores externos),
  validación de firma de webhooks (WhatsApp), CSP headers, Zod en cada input.
- **Observabilidad**: página System Health (estado de colas, conectores,
  jobs recientes) y control de coste de IA (`ai_runs`, presupuesto diario).

## 2. Qué funciona de verdad ahora mismo (probado en este entorno)

- Registro/login con NextAuth, RBAC y aislamiento por organización.
- Motor de auditoría 100% funcional **sin necesitar ninguna API key**: reglas
  deterministas sobre datos ya presentes en el negocio (o sobre un escaneo
  técnico real de su web pública si tiene una).
- Generación de informe PDF real (Chromium headless) a partir de una
  auditoría completada — verificado generando PDFs válidos multi-página.
- Sistema de colas BullMQ + Redis end-to-end: encolado → worker → job
  completado → registrado en `JobRun` — verificado con un job real.
- Dashboard, listado de negocios, ficha de negocio, Approval Center y
  System Health renderizando datos reales de la base de datos.
- Seed de datos de demostración (**claramente ficticios**, nunca datos reales).

## 3. APIs / credenciales que necesitas configurar

Ninguna es obligatoria para arrancar — la plataforma detecta qué falta y
deshabilita (nunca simula) la funcionalidad asociada. Verlo en `/system-health`.

| Variable | Para qué | Sin ella |
|---|---|---|
| `GOOGLE_PLACES_API_KEY` | Prospección masiva de negocios | La búsqueda no devuelve resultados |
| `ANTHROPIC_API_KEY` | Narrativa IA enriquecida (agente, redacción de emails/propuestas) | Se usa un proveedor determinista basado en reglas |
| `GOOGLE_OAUTH_CLIENT_ID/SECRET` | Conectores Google Business Profile / Calendar / Analytics | Esos conectores quedan sin `authorizationUrl` |
| `SMTP_*` o `RESEND_API_KEY` | Envío real de emails comerciales | Los emails quedan en estado `QUEUED`, nunca `SENT` simulado |
| `WHATSAPP_*` | Conector WhatsApp Business (Meta Cloud API) | Conector deshabilitado |
| `META_APP_ID/SECRET` | Conectores Instagram/Facebook | Conectores deshabilitados |
| `GA4_PROPERTY_ID` | Conector de Analytics | Conector deshabilitado |

Todas documentadas con instrucciones en [`.env.example`](.env.example).

## 4. Variables de entorno obligatorias

```
AUTH_SECRET       # openssl rand -base64 32
ENCRYPTION_KEY    # openssl rand -base64 32 (cifra credenciales de conectores)
DATABASE_URL      # postgresql://user:pass@host:5432/db
REDIS_URL         # redis://host:6379
```

## 5. Cómo iniciar el proyecto

```bash
cp .env.example .env
# Rellena AUTH_SECRET, ENCRYPTION_KEY, DATABASE_URL, REDIS_URL como mínimo

# Con Docker (recomendado):
docker compose up -d          # levanta Postgres + Redis

npm install
npm run db:migrate            # aplica el esquema
npm run db:seed               # datos de demostración (ficticios)

npm run dev                   # servidor web  (localhost:3000)
npm run worker                # proceso de workers en background (otra terminal)
```

Login de prueba tras el seed: `owner@demo-agency.test` / `Demo1234!` /
organización `demo-agency`.

## 6. Cómo probarlo

- **UI**: entra en `/discovery` para lanzar una búsqueda (necesita
  `GOOGLE_PLACES_API_KEY`), o usa el negocio de demo ya creado por el seed.
  En la ficha de un negocio: `Start audit` → `Generate report`.
- **Tests unitarios**: `npm test` (motor de scoring, generador de
  oportunidades, reglas de auditoría web, robots.txt, cifrado).
- **Smoke test end-to-end** (motor de auditoría + PDF, sin necesidad de UI):
  ```bash
  npx tsx scripts/smoke-test.ts
  ```
- **Smoke test de colas** (BullMQ real, requiere `npm run worker` en paralelo):
  ```bash
  npx tsx scripts/queue-smoke-test.ts
  ```
- **Build de producción**: `npm run build` (verificado sin errores de tipos
  ni de compilación en este entorno).

## 7. Qué queda pendiente

- Publicación real de cambios en la web del cliente (`WebsiteConnector`
  genera la propuesta de cambio vía Approval Center, pero publicarla de
  verdad requiere las credenciales del CMS específico del cliente — WordPress,
  Shopify, etc. — que no existen de forma genérica).
- Generador visual de webs completas (sección 21 del brief) — la
  infraestructura de IA y de propuestas ya existe; falta el flujo de
  preview/publish específico.
- Comparativa de competencia (sección 34) — requiere una fuente de datos de
  competidores más allá de lo que provee Google Places por negocio.
- Editor visual de emails drag-and-drop (hoy: plantillas HTML + variables).
- Backend S3 real para informes (`ReportStorageDriver` ya tiene la interfaz
  lista; falta implementar `S3StorageDriver` con `@aws-sdk/client-s3`).
- Panel de administración de precios de propuestas comerciales (el modelo de
  datos `Proposal`/`ProposalItem` ya soporta precio configurable).
- Command palette y animaciones avanzadas de la UI premium (hoy: UI limpia y
  funcional con Tailwind, sin cmdk todavía cableado).
- Tests de integración de conectores reales (hoy: unit tests de la lógica
  pura; los conectores OAuth requieren credenciales reales para probarse
  end-to-end).

## 8. Recomendaciones para la siguiente fase

1. Cerrar el bucle de publicación web con al menos un CMS concreto (empezar
   por WordPress vía su REST API, es el más común entre negocios locales).
2. Añadir un segundo `AIProvider` (p.ej. OpenAI) para validar que el
   `ModelRouter` desacopla de verdad de un único proveedor.
3. Sustituir el `LogEmailProvider`/pruebas manuales por un entorno de
   staging con Resend en modo sandbox para validar plantillas reales.
4. Añadir tests de integración con una base de datos de test (actualmente
   los tests unitarios no tocan Postgres; sería valioso un job de CI con
   Postgres+Redis de servicio, tal como se hizo manualmente en este entorno).
5. Implementar el `S3StorageDriver` para informes en cuanto haya un bucket
   real disponible.
