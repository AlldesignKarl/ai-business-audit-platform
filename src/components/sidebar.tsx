"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Building2,
  ShieldCheck,
  Activity,
  Settings,
  LogOut,
  Search,
  Bot,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/businesses", label: "Negocios", icon: Building2 },
  { href: "/discovery", label: "Prospección", icon: Search },
  { href: "/automations", label: "Automatizaciones", icon: Zap },
  { href: "/approvals", label: "Approval Center", icon: ShieldCheck },
  { href: "/ai-agents", label: "AI Agents", icon: Bot },
  { href: "/system-health", label: "System Health", icon: Activity },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function Sidebar({ organizationName }: { organizationName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-card/60 backdrop-blur-sm">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-gradient shadow-glow">
          <Sparkles size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-tight">AI Business Audit</div>
          <div className="truncate text-xs text-muted-foreground">{organizationName}</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 p-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-all",
                active
                  ? "bg-accent/15 font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent-gradient" />
              )}
              <Icon size={16} className={cn(active && "text-accent")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-2">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
