import { classNames } from "@/lib/utils";

export function Logo({
  size = "md",
  inverted = false,
}: {
  size?: "sm" | "md" | "lg";
  inverted?: boolean;
}) {
  const frameClass =
    size === "lg" ? "h-20 w-20" : size === "sm" ? "h-10 w-10" : "h-14 w-14";

  const textClass = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span
        className={classNames(
          frameClass,
          "relative shrink-0 overflow-hidden rounded-xl bg-white",
        )}
      >
        <img
          src="/Logo%20Amarelo%20%20(1).jpg"
          alt="BrevesCorp"
          className="absolute inset-1/2 h-[135%] w-[135%] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover"
        />
      </span>

      <span
        className={classNames(
          textClass,
          "font-bold tracking-tight",
          inverted ? "text-white" : "text-slate-950",
        )}
      >
        Credencia<span className="text-brand-600">Pass</span>
      </span>
    </span>
  );
}
