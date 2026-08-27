import Image from "next/image";

import logoImage from "../../public/brevescorp-mark.svg";
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
  const imageSize = size === "lg" ? "48px" : size === "sm" ? "32px" : "36px";

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span
        className={classNames(
          frameClass,
          "relative shrink-0 overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-sm",
        )}
      >
        <Image
          src={logoImage}
          alt="Breves Corp"
          fill
          sizes={imageSize}
          priority={size === "lg"}
          className="object-contain p-1"
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
