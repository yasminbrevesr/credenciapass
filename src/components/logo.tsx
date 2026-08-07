import Image from "next/image";

/** Logo oficial do CredenciaPass. */
export function Logo({
  size = "md",
}: {
  size?: "sm" | "md" | "lg";
  inverted?: boolean;
}) {
  const width = size === "lg" ? 212 : size === "sm" ? 128 : 160;
  const height = Math.round((width * 58) / 212);

  return (
    <span className="inline-flex shrink-0 items-center">
      <Image
        src="/credenciapass-logo.svg"
        alt="CredenciaPass"
        width={width}
        height={height}
        priority
        className="h-auto object-contain"
      />
    </span>
  );
}
