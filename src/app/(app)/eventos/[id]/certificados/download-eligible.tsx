"use client";

import { useEffect, useMemo, useState } from "react";

type CertificateParticipant = {
  id: string;
  name: string;
  qualification: string;
  attendanceLabel: string;
  statusLabel: string;
  eligible: boolean;
  downloadLabel: string;
};

export function DownloadEligibleCertificates({
  eventId,
  participants,
}: {
  eventId: string;
  participants: CertificateParticipant[];
}) {
  const eligible = useMemo(() => participants.filter((participant) => participant.eligible), [participants]);
  const eligibleIdsKey = useMemo(() => eligible.map((participant) => participant.id).join("|"), [eligible]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const selectedParticipants = useMemo(
    () => eligible.filter((participant) => selected.has(participant.id)),
    [eligible, selected],
  );

  useEffect(() => {
    setSelected(new Set());
    setProgress(0);
    setError("");
  }, [eligibleIdsKey]);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(eligible.map((participant) => participant.id)));
  }

  function clearAll() {
    setSelected(new Set());
  }

  async function saveCertificate(participant: CertificateParticipant) {
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
  }

  async function downloadSelected() {
    if (running || selectedParticipants.length === 0) return;
    setRunning(true);
    setProgress(0);
    setError("");

    try {
      for (let index = 0; index < selectedParticipants.length; index += 1) {
        await saveCertificate(selectedParticipants[index]);
        setProgress(index + 1);
        await new Promise((resolve) => setTimeout(resolve, 180));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar os certificados.");
    } finally {
      setRunning(false);
    }
  }

  async function downloadOne(participant: CertificateParticipant) {
    if (running) return;
    setRunning(true);
    setError("");
    try {
      await saveCertificate(participant);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar o certificado.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <button type="button" className="btn-secondary btn-sm" onClick={selectAll} disabled={running || eligible.length === 0}>
          Selecionar todos
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={clearAll} disabled={running || selectedParticipants.length === 0}>
          Limpar seleção
        </button>
        <span className="text-sm text-slate-500">{selectedParticipants.length} de {eligible.length} elegíveis selecionados</span>
        <button type="button" className="btn-primary btn-sm ml-auto" onClick={downloadSelected} disabled={running || selectedParticipants.length === 0}>
          {running && selectedParticipants.length > 0
            ? `Baixando ${progress} de ${selectedParticipants.length}...`
            : `Baixar selecionados (${selectedParticipants.length})`}
        </button>
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th className="w-10">Sel.</th>
              <th>Nome</th>
              <th>Qualificação</th>
              <th>Presenças</th>
              <th>Situação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {participants.map((participant) => (
              <tr key={participant.id}>
                <td>
                  {participant.eligible ? (
                    <input
                      type="checkbox"
                      checked={selected.has(participant.id)}
                      onChange={() => toggle(participant.id)}
                      disabled={running}
                      className="h-4 w-4 accent-brand-600"
                      aria-label={`Selecionar ${participant.name}`}
                    />
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="font-medium text-slate-900">{participant.name}</td>
                <td className="text-slate-600">{participant.qualification}</td>
                <td className="text-slate-600">{participant.attendanceLabel}</td>
                <td>
                  <span className={participant.eligible ? "badge bg-emerald-50 text-emerald-700" : "badge bg-amber-50 text-amber-700"}>
                    {participant.statusLabel}
                  </span>
                </td>
                <td className="text-right">
                  {participant.eligible ? (
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => downloadOne(participant)}
                      disabled={running}
                    >
                      {participant.downloadLabel}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
