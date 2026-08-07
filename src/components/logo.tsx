import { classNames } from "@/lib/utils";

export function Logo({ size = "md", inverted = false }: { size?: "sm" | "md" | "lg"; inverted?: boolean }) {
  const box = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";

  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={classNames(box, "overflow-hidden rounded-xl bg-black shadow-sm ring-1 ring-black/10")}>
        <img src="/brevescorp-logo.svg" alt="BrevesCorp" className="h-full w-full object-cover" />
      </span>
      <span className={classNames(text, "font-bold tracking-tight", inverted ? "text-white" : "text-slate-900")}>
        Credencia<span className="text-brand-600">Pass</span>
      </span>
    </span>
  );
}
