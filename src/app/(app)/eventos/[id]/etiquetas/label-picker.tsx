"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { QualificationBadge } from "@/components/ui";
import type { LabelFormat } from "@/lib/labels";

type Row = {
  id: string;
  name: string;
  document: string;
  qualification: string;
  organization: string | null;
};

export function LabelPicker({
  eventId,
  formats,
  qualifications,
  selectedQualification,
  participants,
}: {
  eventId: string;
  formats: LabelFormat[];
  qualifications: string[];
  selectedQualification: string;
  participants: Row[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(participants.map((p) => p.id)));
  const [format, setFormat] = useState(formats[0].id);
  const [codeType, setCodeType] = useState("qrcode");
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return participants;
    return participants.filter(
      (participant) =>
        participant.name.toLowerCase().includes(term) ||
        participant.document.toLowerCase().includes(term) ||
        (participant.organization ?? "").toLowerCase().includes(term),
    );
  }, [participants, search]);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function print() {
    const ids = participants.filter((participant) => selected.has(participant.id)).map((p) => p.id);
    if (ids.length === 0) return;

    const params = new URLSearchParams({ formato: format, codigo: codeType, ids: ids.join(",") });
    window.open(`/eventos/${eventId}/etiquetas/imprimir?${params.toString()}`, "_blank");
  }

  const activeFormat = formats.find((item) => item.id === format) ?? formats[0];

  return (
    <div className="space-y-4">
      <section className="card-pad grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-start">
        <div>
          <label className="label" htmlFor="qualificacao">
            Qualificação
          </label>
          <select
            id="qualificacao"
            className="input"
            defaultValue={selectedQualification}
            onChange={(event) => {
              const value = event.target.value;
              router.push(
                value
                  ? `/eventos/${eventId}/etiquetas?qualificacao=${encodeURIComponent(value)}`
                  : `/eventos/${eventId}/etiquetas`,
              );
            }}
          >
            <option value="">Todas</option>
            {qualifications.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="formato">
            Formato da etiqueta
          </label>
          <select
            id="formato"
            className="input"
            value={format}
            onChange={(event) => setFormat(event.target.value)}
          >
            {formats.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">{activeFormat.description}</p>
        </div>

        <div>
          <label className="label" htmlFor="codigo">
            Código impresso
          </label>
          <select
            id="codigo"
            className="input"
            value={codeType}
            onChange={(event) => setCodeType(event.target.value)}
          >
            <option value="qrcode">QR Code</option>
            <option value="barras">Código de barras</option>
            <option value="nenhum">Sem código</option>
          </select>
        </div>

        <div className="flex items-start sm:col-span-2 lg:col-span-1 lg:pt-6">
          <button type="button" className="btn-primary w-full" onClick={print} disabled={selected.size === 0}>
            Gerar folha ({selected.size})
          </button>
        </div>
      </section>

      <section className="card">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <input
            className="input max-w-xs"
            placeholder="Filtrar lista..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => setSelected(new Set(participants.map((participant) => participant.id)))}
          >
            Selecionar todos
          </button>
          <button type="button" className="btn-secondary btn-sm" onClick={() => setSelected(new Set())}>
            Limpar seleção
          </button>
          <span className="ml-auto text-sm text-slate-500">
            {selected.size} de {participants.length} selecionados
          </span>
        </div>

        {visible.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Nenhum inscrito nesta seleção.</p>
        ) : (
          <div className="max-h-[28rem] overflow-y-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-10"></th>
                  <th>Nome</th>
                  <th>Documento</th>
                  <th>Qualificação</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((participant) => (
                  <tr key={participant.id} className="cursor-pointer" onClick={() => toggle(participant.id)}>
                    <td>
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-brand-600"
                        checked={selected.has(participant.id)}
                        onChange={() => toggle(participant.id)}
                        onClick={(event) => event.stopPropagation()}
                      />
                    </td>
                    <td className="font-medium text-slate-900">
                      {participant.name}
                      {participant.organization ? (
                        <p className="text-xs font-normal text-slate-500">{participant.organization}</p>
                      ) : null}
                    </td>
                    <td className="text-slate-600">{participant.document}</td>
                    <td>
                      <QualificationBadge value={participant.qualification} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
