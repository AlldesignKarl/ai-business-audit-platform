import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  Sparkles,
  Search,
  ScanSearch,
  FileText,
  Handshake,
  Bot,
  Zap,
  ShieldCheck,
  Activity,
  Lock,
  ArrowRight,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { HeroVisual } from "@/components/marketing/hero-visual";

const STEPS = [
  {
    icon: Search,
    title: "1. Prospección automática",
    description:
      "La IA busca negocios públicamente disponibles por ubicación y categoría, respetando robots.txt y sin generar nunca datos simulados.",
  },
  {
    icon: ScanSearch,
    title: "2. Auditoría con IA",
    description:
      "Analiza web, SEO local, reputación y redes sociales con evidencia real, y explica cada hallazgo con lenguaje cauteloso y profesional.",
  },
  {
    icon: FileText,
    title: "3. Informe profesional",
    description:
      "Genera un PDF con puntuación de oportunidad 0-100 y recomendaciones concretas — listo para presentar o enviar por email.",
  },
  {
    icon: Handshake,
    title: "4. Conversión a cliente",
    description:
      "Cuando el negocio autoriza tus conectores, tu AI Agent solo actúa dentro de los permisos concedidos — nunca publica sin aprobación.",
  },
];

const FEATURES = [
  {
    icon: Bot,
    title: "AI Agents especializados",
    description: "Un agente por cliente, más un Agente de Automatización y un Agente de Prospección a nivel de plataforma.",
  },
  {
    icon: Zap,
    title: "Automatizaciones WHEN/IF/THEN",
    description: "Reglas sobre eventos reales de la plataforma. Cada una empieza inactiva hasta que la revisas.",
  },
  {
    icon: ShieldCheck,
    title: "Approval Center",
    description: "Toda acción sensible —publicar, enviar, modificar— pasa por aquí antes de tener efecto. Incluso para el OWNER.",
  },
  {
    icon: Lock,
    title: "Conectores con permisos granulares",
    description: "Analizar, modificar, responder, enviar, publicar: cada permiso se concede uno a uno, nunca todos por defecto.",
  },
  {
    icon: Activity,
    title: "Observabilidad completa",
    description: "Colas, conectores, coste de IA y actividad reciente, siempre visibles en System Health y el Dashboard.",
  },
  {
    icon: Sparkles,
    title: "Multi-tenant desde el diseño",
    description: "Aislamiento estricto por organización, cifrado de credenciales y control de coste de IA por día.",
  },
];

export default async function RootPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-gradient shadow-glow">
            <Sparkles size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold tracking-tight">AI Business Audit</span>
        </div>
        <Link href="/login">
          <Button variant="outline" size="sm">
            Iniciar sesión
          </Button>
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-6 py-10 md:grid-cols-2 md:py-16">
        <div className="flex flex-col gap-6">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Prospección y auditoría <span className="gradient-text">impulsadas por IA</span>, con un humano al mando
            en cada paso
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Encuentra negocios, audita su presencia digital con evidencia real y convierte oportunidades en clientes —
            sin inventar nunca un dato, una API o un resultado.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/login">
              <Button size="lg" className="gap-2">
                Entrar a la plataforma <ArrowRight size={16} />
              </Button>
            </Link>
            <a href="#como-funciona">
              <Button size="lg" variant="ghost">
                Ver cómo funciona
              </Button>
            </a>
          </div>
        </div>
        <HeroVisual />
      </section>

      <section id="como-funciona" className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Cómo funciona</h2>
          <p className="mt-2 text-sm text-muted-foreground">De la búsqueda pública a un cliente activo, en cuatro pasos.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="animate-float rounded-xl border border-border bg-card/80 p-5 shadow-card backdrop-blur-sm [animation-delay:var(--d)]"
                style={{ ["--d" as string]: `${STEPS.indexOf(step) * 0.4}s` }}
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-gradient shadow-glow">
                  <Icon size={18} className="text-white" strokeWidth={2.5} />
                </div>
                <h3 className="text-sm font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{step.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Todo lo que necesita una agencia digital</h2>
          <p className="mt-2 text-sm text-muted-foreground">Diseñado para que la IA proponga y la persona decida.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-xl border border-border bg-card/60 p-5 transition-colors hover:border-accent/40">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Icon size={16} className="text-accent" />
                </div>
                <h3 className="text-sm font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 to-accent2/10 p-10 text-center shadow-glow">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Empieza a auditar negocios hoy</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Inicia sesión con tu cuenta de agencia y lanza tu primera búsqueda de prospección en minutos.
          </p>
          <Link href="/login" className="mt-6 inline-block">
            <Button size="lg" className="gap-2">
              Entrar a la plataforma <ArrowRight size={16} />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-6 pb-8 text-center text-xs text-muted-foreground">
        AI Business Audit Platform — nunca inventa datos reales, APIs ni resultados.
      </footer>
    </div>
  );
}
