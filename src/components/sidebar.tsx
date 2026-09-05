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
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/businesses", label: "Negocios", icon: Building2 },
  { href: "/discovery", label: "Prospección", icon: Search },
  { href: "/approvals", label: "Approval Center", icon: ShieldCheck },
  { href: "/ai-agents", label: "AI Agents", icon: Bot },
  { href: "/system-health", label: "System Health", icon: Activity },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function Sidebar({ organizationName }: { organizationName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-card">
      <div className="border-b border-border px-4 py-4">
        <div className="text-sm font-semibold">AI Business Audit</div>
        <div className="text-xs text-muted-foreground">{organizationName}</div>
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
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-2">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
