import { classNames } from "@/lib/utils";

/** Marca do sistema: um "crachá" com o nome ao lado. */
export function Logo({ size = "md", inverted = false }: { size?: "sm" | "md" | "lg"; inverted?: boolean }) {
  const box = size === "lg" ? "h-11 w-11" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";

  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={classNames(
          box,
          "flex items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm",
        )}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-2/3 w-2/3">
          <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9 2.5v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M15 2.5v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="11" r="2.2" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M8 17c.8-1.6 2.3-2.4 4-2.4s3.2.8 4 2.4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className={classNames(text, "font-bold tracking-tight", inverted ? "text-white" : "text-slate-900")}>
        Credencia<span className="text-brand-600">Pass</span>
      </span>
    </span>
  );
}
