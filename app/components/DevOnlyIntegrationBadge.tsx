"use client";

export default function DevOnlyIntegrationBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      title="Integracao em desenvolvimento"
      className={`inline-flex items-center gap-1 rounded-md border border-[#4169e1]/45 bg-[#4169e1]/10 font-bold uppercase tracking-[0.16em] text-[#8fb3ff] ${compact ? "px-1.5 py-0.5 text-[8px]" : "px-2 py-1 text-[9px]"}`}
    >
      <span className="material-icons text-[13px]" aria-hidden="true">code</span>
      DEV ONLY
    </span>
  );
}
