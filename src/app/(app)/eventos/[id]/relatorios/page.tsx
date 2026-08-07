import { notFound } from "next/navigation";

import { QualificationBadge } from "@/components/ui";
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
  const avgPerParticipant = participants.length ? (totalAttendances / participants.length).toFixed(1) : "0";
  const bestDay = byDay.reduce<(typeof byDay)[number] | null>((best, day) => (!best || day.percent > best.percent ? day : best), null);

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
      <section className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
        <div className="relative overflow-hidden rounded-[26px] bg-slate-950 p-6 text-white shadow-xl sm:p-7">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">Visão executiva</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Desempenho de presença</h2>
                <p className="mt-2 max-w-xl text-sm text-slate-400">Leitura rápida do evento, sem repetir métricas em várias seções.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 text-right backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Taxa geral</p>
                <p className="mt-1 text-4xl font-semibold">{attendanceRate}%</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Metric label="Inscritos" value={participants.length} />
              <Metric label="Compareceram" value={generalPresent} />
              <Metric label="Check-ins" value={totalAttendances} />
              <Metric label="Média / inscrito" value={avgPerParticipant} />
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                <span>Ocupação da presença possível</span>
                <span>{totalAttendances} de {possibleAttendances || 0}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-brand-400" style={{ width: `${attendanceRate}%` }} />
              </div>
            </div>
          </div>
        </div>

        <aside className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <InsightCard
            label="Melhor dia"
            value={bestDay ? `${bestDay.percent}%` : "—"}
            detail={bestDay ? formatDate(bestDay.date) : "Sem dados de presença"}
          />
          <InsightCard
            label="Sem presença"
            value={neverAttended}
            detail={participants.length ? `${Math.round((neverAttended / participants.length) * 100)}% dos inscritos` : "0% dos inscritos"}
          />
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">Presença por dia</h3>
              <p className="text-sm text-slate-500">Comparação direta, sem cards repetidos.</p>
            </div>
            <span className="text-xs font-medium text-slate-400">{event.days.length} dia(s)</span>
          </div>

          <div className="space-y-4">
            {byDay.length ? byDay.map((day) => (
              <div key={day.id}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-slate-700">{formatDate(day.date)}</span>
                  <span className="text-slate-500">{day.present} presentes · {day.absent} ausentes · <strong className="text-slate-800">{day.percent}%</strong></span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${day.percent}%` }} />
                </div>
              </div>
            )) : <p className="text-sm text-slate-500">Nenhum dia cadastrado.</p>}
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-900">Perfil dos inscritos</h3>
            <p className="text-sm text-slate-500">Distribuição por qualificação.</p>
          </div>

          <div className="space-y-3">
            {byQualification.map((row) => (
              <div key={row.qualification} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <QualificationBadge value={row.qualification} />
                    <span className="font-medium text-slate-700">{row.total} · {row.percent}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${row.percent}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="lista-presenca" className="card overflow-hidden scroll-mt-24">
        <div className="border-b border-slate-200 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">Detalhamento</h3>
              <p className="text-sm text-slate-500">Use filtros apenas quando precisar investigar pessoas específicas.</p>
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

        <div className="max-h-[28rem] overflow-auto">
          <table className="table min-w-[760px]">
            <thead className="sticky top-0 z-10">
              <tr>
                <th>Nome</th><th>Documento</th><th>Qualificação</th>
                {selectedDay ? <><th>Situação</th><th>Check-in</th></> : <><th className="text-right">Dias presente</th><th className="text-right">Faltas</th><th>Situação</th></>}
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

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-xl">
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  );
}

function InsightCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="card flex min-h-0 flex-col justify-center p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}
