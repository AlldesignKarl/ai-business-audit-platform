"use client";

import { useRef } from "react";
import { Search, ScanSearch, FileText, Handshake } from "lucide-react";

const STEPS = [
  { icon: Search, label: "Prospección", color: "from-[hsl(217,91%,62%)] to-[hsl(217,91%,72%)]" },
  { icon: ScanSearch, label: "Auditoría IA", color: "from-[hsl(270,91%,68%)] to-[hsl(217,91%,62%)]" },
  { icon: FileText, label: "Informe", color: "from-[hsl(152,69%,48%)] to-[hsl(270,91%,68%)]" },
  { icon: Handshake, label: "Cliente", color: "from-[hsl(38,95%,56%)] to-[hsl(152,69%,48%)]" },
];

/**
 * Visual 3D del hero: tarjetas en perspectiva que orbitan lentamente y
 * reaccionan al movimiento del ratón con un ligero tilt (CSS puro vía custom
 * properties, sin librerías de 3D — mantiene el bundle ligero).
 */
export function HeroVisual() {
  const containerRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--ry", `${px * 16}deg`);
    el.style.setProperty("--rx", `${-py * 16}deg`);
  }

  function handleMouseLeave() {
    const el = containerRef.current;
    if (!el) return;
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--rx", "0deg");
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative mx-auto h-[360px] w-full max-w-md [perspective:1200px] sm:h-[420px]"
    >
      <div
        className="absolute inset-0 transition-transform duration-300 ease-out [transform-style:preserve-3d]"
        style={{ transform: "rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))" }}
      >
        <div className="absolute inset-0 [transform-style:preserve-3d] animate-orbit-slow">
          {STEPS.map((step, i) => {
            const angle = (360 / STEPS.length) * i;
            const Icon = step.icon;
            return (
              <div
                key={step.label}
                className="absolute left-1/2 top-1/2 flex h-32 w-40 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card/90 shadow-card backdrop-blur-sm [backface-visibility:hidden]"
                style={{ transform: `rotateY(${angle}deg) translateZ(180px)` }}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${step.color} shadow-glow`}>
                  <Icon size={18} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="text-sm font-medium">{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-gradient opacity-60 blur-2xl"
      />
    </div>
  );
}
