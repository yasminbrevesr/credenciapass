"use client";

import { useState } from "react";

type EligibleParticipant = { id: string; name: string };

export function DownloadEligibleCertificates({
  eventId,
  participants,
}: {
  eventId: string;
  participants: EligibleParticipant[];
}) {
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  async function downloadAll() {
    if (running || participants.length === 0) return;
    setRunning(true);
    setProgress(0);
    setError("");

    try {
      for (let index = 0; index < participants.length; index += 1) {
        const participant = participants[index];
        const response = await fetch(`/api/eventos/${eventId}/certificados/${participant.id}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Não foi possível gerar o certificado de ${participant.name}.`);
        }

        const blob = await response.blob();
        const disposition = response.headers.get("Content-Disposition") ?? "";
        const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
        const simpleMatch = disposition.match(/filename="([^"]+)"/i);
        const fileName = utf8Match
          ? decodeURIComponent(utf8Match[1])
          : simpleMatch?.[1] ?? `certificado-${participant.id}.pdf`;

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);

        setProgress(index + 1);
        await new Promise((resolve) => setTimeout(resolve, 180));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar os certificados.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="ml-auto flex flex-col items-end gap-1">
      <button type="button" className="btn-primary" onClick={downloadAll} disabled={running}>
        {running
          ? `Baixando ${progress} de ${participants.length}...`
          : `Baixar certificados separados (${participants.length})`}
      </button>
      {error ? <p className="max-w-sm text-right text-xs text-red-600">{error}</p> : null}
      {!running && progress === participants.length && participants.length > 0 ? (
        <p className="text-xs text-emerald-700">Downloads iniciados.</p>
      ) : null}
    </div>
  );
}
