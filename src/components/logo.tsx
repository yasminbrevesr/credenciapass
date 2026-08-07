import { classNames } from "@/lib/utils";

export function Logo({
  size = "md",
  inverted = false,
  compact = false,
}: {
  size?: "sm" | "md" | "lg";
  inverted?: boolean;
  compact?: boolean;
}) {
  const frameClass =
    size === "lg" ? "h-12 w-12" : size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const textClass = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span
        className={classNames(
          frameClass,
          "relative shrink-0 overflow-hidden rounded-[10px] border border-white/60 bg-white shadow-sm",
        )}
      >
        <img
          src="/Logo%20Amarelo%20%20(1).jpg"
          alt="CredenciaPass"
          className="absolute inset-1/2 h-[175%] w-[175%] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover"
        />
      </span>

      {!compact ? (
        <span
          className={classNames(
            textClass,
            "font-bold tracking-tight",
            inverted ? "text-white" : "text-slate-950",
          )}
        >
          Credencia<span className="text-brand-600">Pass</span>
        </span>
      ) : null}
    </span>
  );
}
