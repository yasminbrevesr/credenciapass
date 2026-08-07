import { notFound } from "next/navigation";

import { QualificationBadge, StatCard } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import {
  loadEventForReports,
  loadParticipants,
  summarizeByDay,
  summarizeByQualification,
} from "@/lib/reports";
import { formatDate, formatDateTime, formatDocument } from "@/lib/utils";

export const metadata = { title: "Relatórios" };

type StatusFilter = "todos" | "ausentes";

export default async function ReportsPage(props: PageProps<"/eventos/[id]/relatorios">) {
  await requireAdmin();
  const { id } = await props.params;
  const searchParams = await props.searchParams;

  const event = await loadEventForReports(id);
  if (!event) notFound();

  const participants = await loadParticipants(id);
  const byQualification = summarizeByQualification(event, participants);
  const byDay = summarizeByDay(event.days, participants);

  const requestedScope = typeof searchParams.escopo === "string" ? searchParams.escopo : "geral";
  const selectedDay = requestedScope === "geral" ? undefined : event.days.find((day) => day.id === requestedScope);
  const effectiveScope = selectedDay ? selectedDay.id : "geral";
  const statusFilter: StatusFilter = searchParams.situacao === "ausentes" ? "ausentes" : "todos";

  const generalPresent = participants.filter((participant) => participant.attendances.length > 0).length;
  const neverAttended = participants.length - generalPresent;
  const totalAttendances = participants.reduce((sum, participant) => sum + participant.attendances.length, 0);
  const possibleAttendances = participants.length * event.days.length;
  const attendanceRate = possibleAttendances > 0 ? Math.round((totalAttendances / possibleAttendances) * 100) : 0;

  const selectedPresent = selectedDay
    ? participants.filter((participant) => participant.attendances.some((item) => item.eventDayId === selectedDay.id)).length
    : generalPresent;
  const selectedAbsent = participants.length - selectedPresent;

  const visibleRows = participants.filter((participant) => {
    if (statusFilter === "todos") return true;
    const present = selectedDay
      ? participant.attendances.some((item) => item.eventDayId === selectedDay.id)
      : participant.attendances.length > 0;
    return !present;
  });

  const filterHref = (scope: string, status: StatusFilter = statusFilter) => {
    const params = new URLSearchParams({ escopo: scope, situacao: status });
    return `/eventos/${id}/relatorios?${params.toString()}#lista-presenca`;
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Central de relatórios</h2>
        <p className="mt-1 text-sm text-slate-500">Indicadores gerais e listas operacionais do evento.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard compact label="Inscritos" value={participants.length} tone="brand" />
        <StatCard compact label="Compareceram" value={generalPresent} tone="green" />
        <StatCard compact label="Não compareceram" value={neverAttended} tone="amber" />
        <StatCard compact label="Check-ins" value={totalAttendances} />
        <StatCard compact label="Taxa de presença" value={`${attendanceRate}%`} />
      </div>

      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">Dashboard de presença</h3>
            <p className="text-sm text-slate-500">Resumo visual do desempenho geral e por dia.</p>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="badge bg-emerald-50 text-emerald-700">Presentes</span>
            <span className="badge bg-amber-50 text-amber-700">Ausentes</span>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <DashboardTile label="Geral" present={generalPresent} absent={neverAttended} total={participants.length} />
          {byDay.map((day) => (
            <DashboardTile key={day.id} label={formatDate(day.date)} present={day.present} absent={day.absent} total={participants.length} />
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="border-b border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">Inscritos por qualificação</h3>
          </div>
          <table className="table">
            <thead><tr><th>Qualificação</th><th className="text-right">Inscritos</th><th className="text-right">%</th></tr></thead>
            <tbody>
              {byQualification.map((row) => (
                <tr key={row.qualification}>
                  <td><QualificationBadge value={row.qualification} /></td>
                  <td className="text-right font-medium">{row.total}</td>
                  <td className="text-right text-slate-500">{row.percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">Presença por dia</h3>
          </div>
          <table className="table">
            <thead><tr><th>Dia</th><th className="text-right">Presentes</th><th className="text-right">Ausentes</th><th className="text-right">%</th></tr></thead>
            <tbody>
              {byDay.map((day) => (
                <tr key={day.id}>
                  <td>{formatDate(day.date)}</td>
                  <td className="text-right font-medium text-emerald-700">{day.present}</td>
                  <td className="text-right font-medium text-amber-700">{day.absent}</td>
                  <td className="text-right text-slate-500">{day.percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section id="lista-presenca" className="card overflow-hidden scroll-mt-6">
        <div className="border-b border-slate-200 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">Lista de presença</h3>
              <p className="text-sm text-slate-500">Todos aparecem por padrão. Use os filtros quando precisar.</p>
            </div>

            <form className="flex flex-wrap items-end gap-2" action={`/eventos/${id}/relatorios`}>
              <div>
                <label className="label" htmlFor="escopo">Data</label>
                <select id="escopo" name="escopo" className="input min-w-52" defaultValue={effectiveScope}>
                  <option value="geral">Panorama geral</option>
                  {event.days.map((day) => <option key={day.id} value={day.id}>{formatDate(day.date)}</option>)}
                </select>
              </div>
              <input type="hidden" name="situacao" value={statusFilter} />
              <button type="submit" className="btn-secondary">Aplicar</button>
            </form>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <a href={filterHref(effectiveScope, "todos")} className={statusFilter === "todos" ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>
              Todos ({participants.length})
            </a>
            <a href={filterHref(effectiveScope, "ausentes")} className={statusFilter === "ausentes" ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>
              Ausentes ({selectedAbsent})
            </a>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th><th>Documento</th><th>Qualificação</th>
                {selectedDay ? <><th>Situação</th><th>Check-in</th></> : <><th className="text-right">Dias presente</th><th className="text-right">Dias de falta</th><th>Situação</th></>}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((participant) => {
                const attendance = selectedDay ? participant.attendances.find((item) => item.eventDayId === selectedDay.id) : undefined;
                const presentDays = participant.attendances.length;
                const absentDays = Math.max(0, event.days.length - presentDays);
                return (
                  <tr key={participant.id}>
                    <td className="font-medium text-slate-900">{participant.name}</td>
                    <td className="text-slate-600">{formatDocument(participant.document) || "S/N"}</td>
                    <td className="text-slate-600">{participant.qualification || "S/N"}</td>
                    {selectedDay ? (
                      <>
                        <td>{attendance ? <span className="badge bg-emerald-50 text-emerald-700">Presente</span> : <span className="badge bg-amber-50 text-amber-700">Ausente</span>}</td>
                        <td className="text-slate-600">{attendance ? formatDateTime(attendance.checkedInAt) : "S/N"}</td>
                      </>
                    ) : (
                      <>
                        <td className="text-right text-emerald-700">{presentDays}</td>
                        <td className="text-right text-amber-700">{absentDays}</td>
                        <td>{presentDays > 0 ? <span className="badge bg-emerald-50 text-emerald-700">Compareceu</span> : <span className="badge bg-amber-50 text-amber-700">Não compareceu</span>}</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function DashboardTile({ label, present, absent, total }: { label: string; present: number; absent: number; total: number }) {
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-slate-800">{label}</p>
        <span className="text-sm font-semibold text-slate-700">{pct}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-amber-100">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-500">
        <span>{present} presentes</span>
        <span>{absent} ausentes</span>
      </div>
    </div>
  );
}
