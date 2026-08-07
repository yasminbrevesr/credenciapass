"use client";

import { useMemo, useState } from "react";

type EligibleParticipant = { id: string; name: string };

export function DownloadEligibleCertificates({
  eventId,
  participants,
}: {
  eventId: string;
  participants: EligibleParticipant[];
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(participants.map((participant) => participant.id)));
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const selectedParticipants = useMemo(
    () => participants.filter((participant) => selected.has(participant.id)),
    [participants, selected],
  );

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(participants.map((participant) => participant.id)));
  }

  function clearAll() {
    setSelected(new Set());
  }

  async function downloadSelected() {
    if (running || selectedParticipants.length === 0) return;
    setRunning(true);
    setProgress(0);
    setError("");

    try {
      for (let index = 0; index < selectedParticipants.length; index += 1) {
        const participant = selectedParticipants[index];
        const response = await fetch(`/api/eventos/${eventId}/certificados/${participant.id}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Não foi possível gerar o certificado de ${participant.name}.`);

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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-secondary btn-sm" onClick={selectAll} disabled={running}>Selecionar todos</button>
        <button type="button" className="btn-secondary btn-sm" onClick={clearAll} disabled={running}>Limpar seleção</button>
        <span className="text-sm text-slate-500">{selected.size} selecionados</span>
        <button type="button" className="btn-primary btn-sm ml-auto" onClick={downloadSelected} disabled={running || selected.size === 0}>
          {running ? `Baixando ${progress} de ${selectedParticipants.length}...` : `Baixar selecionados (${selectedParticipants.length})`}
        </button>
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {!running && progress === selectedParticipants.length && selectedParticipants.length > 0 ? (
        <p className="text-xs text-emerald-700">Downloads iniciados.</p>
      ) : null}

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th className="w-10"></th>
              <th>Nome</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {participants.map((participant) => (
              <tr key={participant.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(participant.id)}
                    onChange={() => toggle(participant.id)}
                    disabled={running}
                    className="h-4 w-4 accent-brand-600"
                  />
                </td>
                <td className="font-medium text-slate-900">{participant.name}</td>
                <td className="text-right">
                  <button type="button" className="btn-secondary btn-sm" onClick={() => toggle(participant.id)} disabled={running}>
                    {selected.has(participant.id) ? "Remover" : "Selecionar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
