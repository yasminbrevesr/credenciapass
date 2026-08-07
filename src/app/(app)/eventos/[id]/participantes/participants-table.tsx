"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { QualificationBadge } from "@/components/ui";
import { formatDocument, formatPhone } from "@/lib/utils";

import { deleteAllParticipantsAction, deleteParticipantsBatchAction } from "./actions";

type ParticipantRow = {
  id: string;
  name: string;
  document: string;
  qualification: string;
  organization: string | null;
  email: string | null;
  phone: string | null;
  attendanceCount: number;
};

export function ParticipantsTable({
  eventId,
  participants,
  total,
  isAdmin,
}: {
  eventId: string;
  participants: ParticipantRow[];
  total: number;
  isAdmin: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [isPending, startTransition] = useTransition();
  const selectedCount = selected.size;
  const pageIds = useMemo(() => participants.map((participant) => participant.id), [participants]);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    setSelected((current) => {
      const next = new Set(current);
      if (allPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function deleteSelected() {
    if (!selectedCount || isPending) return;
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir ${selectedCount} inscrito${selectedCount === 1 ? "" : "s"}? Presenças e certificados vinculados também serão removidos. Esta ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      await deleteParticipantsBatchAction(eventId, [...selected]);
      setSelected(new Set());
      window.location.reload();
    });
  }

  function deleteAll() {
    if (!total || isPending) return;
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir TODOS os ${total} inscritos deste evento? Presenças e certificados vinculados também serão removidos. Esta ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      await deleteAllParticipantsAction(eventId);
      setSelected(new Set());
      window.location.reload();
    });
  }

  const base = `/eventos/${eventId}/participantes`;

  return (
    <div className="space-y-3">
      {isAdmin ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
          <button type="button" className="btn-secondary btn-sm" onClick={togglePage} disabled={isPending || participants.length === 0}>
            {allPageSelected ? "Desmarcar página" : "Selecionar página"}
          </button>
          <span className="text-sm text-slate-500">{selectedCount} selecionado{selectedCount === 1 ? "" : "s"}</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary btn-sm border-red-200 text-red-700 hover:bg-red-50"
              onClick={deleteSelected}
              disabled={isPending || selectedCount === 0}
            >
              {isPending ? "Excluindo..." : `Excluir selecionados${selectedCount ? ` (${selectedCount})` : ""}`}
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm border-red-200 text-red-700 hover:bg-red-50"
              onClick={deleteAll}
              disabled={isPending || total === 0}
            >
              Excluir todos
            </button>
          </div>
        </div>
      ) : null}

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              {isAdmin ? (
                <th className="w-10">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={togglePage}
                    disabled={isPending || participants.length === 0}
                    className="h-4 w-4 accent-brand-600"
                    aria-label="Selecionar inscritos desta página"
                  />
                </th>
              ) : null}
              <th>Nome</th>
              <th>Documento</th>
              <th>Qualificação</th>
              <th>Contato</th>
              <th>Presenças</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {participants.map((participant) => (
              <tr key={participant.id}>
                {isAdmin ? (
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(participant.id)}
                      onChange={() => toggle(participant.id)}
                      disabled={isPending}
                      className="h-4 w-4 accent-brand-600"
                      aria-label={`Selecionar ${participant.name}`}
                    />
                  </td>
                ) : null}
                <td>
                  <Link href={`${base}/${participant.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                    {participant.name}
                  </Link>
                  <p className="text-xs text-slate-500">{participant.organization || "S/N"}</p>
                </td>
                <td className="text-slate-600">{formatDocument(participant.document) || "S/N"}</td>
                <td><QualificationBadge value={participant.qualification || "S/N"} /></td>
                <td className="text-slate-600">
                  <p>{participant.email || "S/N"}</p>
                  <p className="text-xs text-slate-500">{formatPhone(participant.phone) || "S/N"}</p>
                </td>
                <td className="text-slate-600">{participant.attendanceCount}</td>
                <td className="text-right whitespace-nowrap">
                  <Link href={`${base}/${participant.id}`} className="btn-secondary btn-sm">Abrir</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
