import Image from "next/image";
import { classNames } from "@/lib/utils";

export function Logo({
  size = "md",
  inverted = false,
}: {
  size?: "sm" | "md" | "lg";
  inverted?: boolean;
}) {
  const imageSize = size === "lg" ? 64 : size === "sm" ? 32 : 40;
  const textClass = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";

  return (
    <span className="inline-flex items-center gap-3 whitespace-nowrap">
      <Image
        src="/Logo Amarelo  (1).jpg"
        alt="BrevesCorp"
        width={imageSize}
        height={imageSize}
        className="shrink-0 rounded-xl object-contain"
        priority
      />

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
