import type { ReactNode } from "react";

import { classNames } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle ? <div className="mt-1 text-sm text-slate-500">{subtitle}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="text-base font-semibold text-slate-700">{title}</p>
      {description ? <p className="max-w-md text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "brand" | "green" | "amber";
}) {
  const tones = {
    default: "text-slate-900",
    brand: "text-brand-600",
    green: "text-emerald-600",
    amber: "text-amber-600",
  } as const;

  return (
    <div className="card-pad">
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
      <p className={classNames("mt-1 text-3xl font-bold", tones[tone])}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

const BADGE_TONES = [
  "bg-brand-50 text-brand-700",
  "bg-emerald-50 text-emerald-700",
  "bg-amber-50 text-amber-700",
  "bg-purple-50 text-purple-700",
  "bg-rose-50 text-rose-700",
  "bg-cyan-50 text-cyan-700",
];

/** Cor estável por texto: a mesma qualificação recebe sempre a mesma cor. */
export function QualificationBadge({ value }: { value: string }) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) % 997;
  return <span className={classNames("badge", BADGE_TONES[hash % BADGE_TONES.length])}>{value}</span>;
}

export function Alert({ tone = "info", children }: { tone?: "info" | "warn" | "error"; children: ReactNode }) {
  const tones = {
    info: "bg-brand-50 text-brand-800",
    warn: "bg-amber-50 text-amber-800",
    error: "bg-red-50 text-red-700",
  } as const;
  return <div className={classNames("rounded-lg px-3 py-2 text-sm", tones[tone])}>{children}</div>;
}
