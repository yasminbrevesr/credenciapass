import Link from "next/link";
import { notFound } from "next/navigation";

import { QualificationBadge, StatCard } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import {
  loadEventForReports,
  loadParticipants,
  summarizeByDay,
  summarizeByQualification,
} from "@/lib/reports";
import { formatDate, formatDateLong, formatDateTime, formatDocument } from "@/lib/utils";

export const metadata = { title: "Relatórios" };

type StatusFilter = "todos" | "presentes" | "ausentes" | "";

export default async function ReportsPage(props: PageProps<"/eventos/[id]/relatorios">) {
  await requireAdmin();
  const { id } = await props.params;
  const searchParams = await props.searchParams;

  const event = await loadEventForReports(id);
  if (!event) notFound();

  const participants = await loadParticipants(id);
  const byQualification = summarizeByQualification(event, participants);
  const byDay = summarizeByDay(event.days, participants);

  // Mantém compatibilidade com links antigos que usavam ?dia=...
  const legacyDay = typeof searchParams.dia === "string" ? searchParams.dia : "";
  const requestedScope = typeof searchParams.escopo === "string" ? searchParams.escopo : legacyDay;
  const scope = requestedScope || "geral";
  const selectedDay = scope === "geral" ? undefined : event.days.find((day) => day.id === scope);
  const effectiveScope = selectedDay ? selectedDay.id : "geral";

  const rawStatus = typeof searchParams.situacao === "string" ? searchParams.situacao : "";
  const statusFilter: StatusFilter =
    rawStatus === "todos" || rawStatus === "presentes" || rawStatus === "ausentes" ? rawStatus : "";

  const generalPresent = participants.filter((participant) => participant.attendances.length > 0).length;
  const neverAttended = participants.length - generalPresent;
  const totalPossibleAttendances = participants.length * event.days.length;
  const totalAttendances = participants.reduce((sum, participant) => sum + participant.attendances.length, 0);
  const generalPercent = totalPossibleAttendances > 0 ? Math.round((totalAttendances / totalPossibleAttendances) * 100) : 0;

  const selectedPresent = selectedDay
    ? participants.filter((participant) => participant.attendances.some((item) => item.eventDayId === selectedDay.id)).length
    : generalPresent;
  const selectedAbsent = participants.length - selectedPresent;

  const visibleRows = statusFilter
    ? participants.filter((participant) => {
        const present = selectedDay
          ? participant.attendances.some((item) => item.eventDayId === selectedDay.id)
          : participant.attendances.length > 0;
        if (statusFilter === "presentes") return present;
        if (statusFilter === "ausentes") return !present;
        return true;
      })
    : [];

  const scopeHref = (nextScope: string) => {
    const params = new URLSearchParams({ escopo: nextScope });
    return `/eventos/${id}/relatorios?${params.toString()}#lista-presenca`;
  };

  const statusHref = (status: Exclude<StatusFilter, "">) => {
    const params = new URLSearchParams({ escopo: effectiveScope, situacao: status });
    return `/eventos/${id}/relatorios?${params.toString()}#lista-presenca`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Central de relatórios</h2>
        <p className="mt-1 text-sm text-slate-500">
          Panorama do evento, distribuição dos inscritos e acompanhamento de presença por dia ou no geral.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Inscritos" value={participants.length} tone="brand" />
        <StatCard label="Dias do evento" value={event.days.length} />
        <StatCard label="Presenças registradas" value={totalAttendances} tone="green" />
        <StatCard label="Não compareceram" value={neverAttended} tone="amber" hint="Nenhuma presença no evento" />
        <StatCard label="Índice geral" value={`${generalPercent}%`} />
      </div>

      <section className="card-pad">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">Visão geral de presença</h3>
            <p className="mt-1 text-sm text-slate-500">
              Compare presentes e ausentes no panorama geral e acompanhe a evolução em cada dia do evento.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Presentes</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Ausentes</span>
          </div>
        </div>

        <div className="space-y-4">
          <PresenceBar
            label="Panorama geral"
            present={generalPresent}
            absent={neverAttended}
            total={participants.length}
            hint="Considera presente quem compareceu em pelo menos um dia"
          />
          {byDay.map((day) => (
            <PresenceBar
              key={day.id}
              label={formatDate(day.date)}
              present={day.present}
              absent={day.absent}
              total={participants.length}
              hint={`${day.percent}% de presença`}
            />
          ))}
        </div>
      </section>

      <section className="card-pad no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">Exportar relatórios</h3>
            <p className="text-sm text-slate-500">Planilhas Excel prontas para tratamento e envio.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`/api/eventos/${id}/relatorios/inscritos`} className="btn-secondary btn-sm">
              Inscritos por qualificação
            </a>
            <a href={`/api/eventos/${id}/relatorios/presenca`} className="btn-primary btn-sm">
              Presença por dia e geral
            </a>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="border-b border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900">Listagem de inscritos por qualificação</h3>
            <p className="mt-1 text-sm text-slate-500">Distribuição dos {participants.length} inscritos por categoria.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Qualificação</th>
                  <th className="text-right">Inscritos</th>
                  <th className="text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {byQualification.map((row) => (
                  <tr key={row.qualification}>
                    <td><QualificationBadge value={row.qualification} /></td>
                    <td className="text-right font-medium text-slate-900">{row.total}</td>
                    <td className="text-right text-slate-500">{row.percent}%</td>
                  </tr>
                ))}
                <tr>
                  <td className="font-semibold text-slate-900">Total</td>
                  <td className="text-right font-semibold text-slate-900">{participants.length}</td>
                  <td className="text-right text-slate-500">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900">Listagem de presença por dia</h3>
            <p className="mt-1 text-sm text-slate-500">Resumo diário de presentes, ausentes e percentual de comparecimento.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Dia</th>
                  <th className="text-right">Presentes</th>
                  <th className="text-right">Ausentes</th>
                  <th className="text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {byDay.map((day) => (
                  <tr key={day.id}>
                    <td className="text-slate-700">{formatDate(day.date)}</td>
                    <td className="text-right font-medium text-emerald-700">{day.present}</td>
                    <td className="text-right font-medium text-amber-700">{day.absent}</td>
                    <td className="text-right text-slate-500">{day.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section id="lista-presenca" className="card scroll-mt-6 overflow-hidden">
        <div className="border-b border-slate-200 p-5">
          <div>
            <h3 className="font-semibold text-slate-900">Lista de presença</h3>
            <p className="mt-1 text-sm text-slate-500">
              Escolha o panorama geral ou um dia específico e depois selecione quem deseja visualizar.
            </p>
          </div>

          <div className="no-print mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-64">
              <label className="label" htmlFor="scope-selector">Período</label>
              <div className="flex flex-wrap gap-2" id="scope-selector">
                <Link href={scopeHref("geral")} className={effectiveScope === "geral" ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>
                  Panorama geral
                </Link>
                {event.days.map((day) => (
                  <Link
                    key={day.id}
                    href={scopeHref(day.id)}
                    className={effectiveScope === day.id ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
                  >
                    {formatDate(day.date)}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="no-print mt-4 flex flex-wrap gap-2">
            <Link href={statusHref("todos")} className={statusFilter === "todos" ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>
              Todos ({participants.length})
            </Link>
            <Link href={statusHref("presentes")} className={statusFilter === "presentes" ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>
              Presentes ({selectedPresent})
            </Link>
            <Link href={statusHref("ausentes")} className={statusFilter === "ausentes" ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>
              Ausentes ({selectedAbsent})
            </Link>
          </div>
        </div>

        {!statusFilter ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-slate-700">Selecione Todos, Presentes ou Ausentes para abrir a lista.</p>
            <p className="mt-1 text-xs text-slate-500">A tabela fica recolhida até você escolher o recorte que deseja analisar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 text-sm text-slate-600">
              {selectedDay ? formatDateLong(selectedDay.date) : "Panorama geral do evento"} · {visibleRows.length} registros
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Documento</th>
                  <th>Qualificação</th>
                  {selectedDay ? (
                    <>
                      <th>Situação</th>
                      <th>Check-in</th>
                    </>
                  ) : (
                    <>
                      <th className="text-right">Dias presente</th>
                      <th className="text-right">Dias de falta</th>
                      <th>Situação geral</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((participant) => {
                  const attendance = selectedDay
                    ? participant.attendances.find((item) => item.eventDayId === selectedDay.id)
                    : undefined;
                  const presentDays = participant.attendances.length;
                  const absentDays = Math.max(0, event.days.length - presentDays);
                  const generalOk = presentDays > 0;
                  return (
                    <tr key={participant.id}>
                      <td className="font-medium text-slate-900">{participant.name}</td>
                      <td className="text-slate-600">{formatDocument(participant.document) || "S/N"}</td>
                      <td className="text-slate-600">{participant.qualification || "S/N"}</td>
                      {selectedDay ? (
                        <>
                          <td>
                            {attendance ? (
                              <span className="badge bg-emerald-50 text-emerald-700">Presente</span>
                            ) : (
                              <span className="badge bg-amber-50 text-amber-700">Ausente</span>
                            )}
                          </td>
                          <td className="text-slate-600">{attendance ? formatDateTime(attendance.checkedInAt) : "S/N"}</td>
                        </>
                      ) : (
                        <>
                          <td className="text-right font-medium text-emerald-700">{presentDays}</td>
                          <td className="text-right font-medium text-amber-700">{absentDays}</td>
                          <td>
                            {generalOk ? (
                              <span className="badge bg-emerald-50 text-emerald-700">Compareceu</span>
                            ) : (
                              <span className="badge bg-amber-50 text-amber-700">Não compareceu</span>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {visibleRows.length === 0 ? <p className="p-5 text-sm text-slate-500">Nenhum inscrito neste filtro.</p> : null}
          </div>
        )}
      </section>
    </div>
  );
}

function PresenceBar({
  label,
  present,
  absent,
  total,
  hint,
}: {
  label: string;
  present: number;
  absent: number;
  total: number;
  hint: string;
}) {
  const presentPercent = total > 0 ? (present / total) * 100 : 0;
  const absentPercent = total > 0 ? (absent / total) * 100 : 0;

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-800">{label}</p>
          <p className="text-xs text-slate-500">{hint}</p>
        </div>
        <p className="text-xs text-slate-600">
          <strong className="text-emerald-700">{present}</strong> presentes · <strong className="text-amber-700">{absent}</strong> ausentes
        </p>
      </div>
      <div className="flex h-5 w-full overflow-hidden rounded-full bg-slate-100" aria-label={`${label}: ${present} presentes e ${absent} ausentes`}>
        <div className="bg-emerald-500 transition-all" style={{ width: `${presentPercent}%` }} />
        <div className="bg-amber-400 transition-all" style={{ width: `${absentPercent}%` }} />
      </div>
    </div>
  );
}
