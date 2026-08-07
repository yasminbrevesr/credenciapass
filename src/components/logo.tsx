import { classNames } from "@/lib/utils";

export function Logo({ size = "md", inverted = false }: { size?: "sm" | "md" | "lg"; inverted?: boolean }) {
  const mark = size === "lg" ? "h-16 w-16" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";

  return (
    <span className="inline-flex max-w-full items-center gap-2.5 whitespace-nowrap">
      <svg
        viewBox="0 0 100 100"
        className={classNames(mark, "shrink-0")}
        role="img"
        aria-label="BrevesCorp"
      >
        <rect width="100" height="100" rx="18" fill="#050505" />
        <path
          d="M24 20H52C66 20 76 29 76 42C76 55 66 64 52 64H24V20Z"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="7"
          strokeLinejoin="miter"
        />
        <path
          d="M24 53V79H61"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="7"
          strokeLinejoin="miter"
        />
        <path
          d="M49 55L69 88"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="7"
          strokeLinecap="square"
        />
        <path
          d="M58 55L75 83L91 55"
          fill="none"
          stroke="#D89A50"
          strokeWidth="7"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>

      <span
        className={classNames(
          text,
          "font-bold tracking-tight",
          inverted ? "text-white" : "text-slate-950",
        )}
      >
        Credencia<span className="text-brand-600">Pass</span>
      </span>
    </span>
  );
}
