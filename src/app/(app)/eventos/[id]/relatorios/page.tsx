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
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-white/70 bg-gradient-to-br from-slate-950 via-slate-900 to-brand-900 p-6 text-white shadow-2xl shadow-slate-300/30 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-amber-300/10 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1.25fr_.75fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-xl">
              Analytics · visão executiva
            </div>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Presença do evento em uma visão mais clara e acionável.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
              Acompanhe adesão, volume de check-ins e evolução por dia sem perder o acesso às listas operacionais.
            </p>

            <div className="mt-7 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
              <HeroMetric label="Inscritos" value={participants.length} />
              <HeroMetric label="Compareceram" value={generalPresent} />
              <HeroMetric label="Check-ins" value={totalAttendances} />
              <HeroMetric label="Ausentes" value={neverAttended} />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.08] p-5 shadow-2xl backdrop-blur-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Taxa de presença</p>
                <p className="mt-2 text-5xl font-semibold tracking-tight">{attendanceRate}%</p>
              </div>
              <div
                className="grid h-20 w-20 place-items-center rounded-full"
                style={{ background: `conic-gradient(#d89a50 ${attendanceRate * 3.6}deg, rgba(255,255,255,.12) 0deg)` }}
              >
                <div className="h-14 w-14 rounded-full bg-slate-950/90" />
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {byDay.slice(0, 4).map((day) => (
                <div key={day.id}>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                    <span>{formatDate(day.date)}</span>
                    <span>{day.percent}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-brand-400" style={{ width: `${day.percent}%` }} />
                  </div>
                </div>
              ))}
              {byDay.length === 0 ? <p className="text-sm text-slate-400">Sem dias cadastrados.</p> : null}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <GlassMetric label="Taxa de presença" value={`${attendanceRate}%`} hint="Check-ins possíveis realizados" />
        <GlassMetric label="Pessoas alcançadas" value={generalPresent} hint={`${neverAttended} ainda sem presença`} />
        <GlassMetric label="Média por participante" value={participants.length ? (totalAttendances / participants.length).toFixed(1) : "0"} hint="Check-ins por inscrito" />
        <GlassMetric label="Dias monitorados" value={event.days.length} hint="Janelas de presença" />
      </div>

      <section className="rounded-[24px] border border-white/70 bg-white/65 p-5 shadow-xl shadow-slate-200/40 backdrop-blur-xl">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Performance</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">Presença geral e por dia</h3>
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

      <section id="lista-presenca" className="card overflow-hidden scroll-mt-24">
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

function HeroMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 backdrop-blur-xl">
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  );
}

function GlassMetric({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-[22px] border border-white/80 bg-white/60 p-5 shadow-lg shadow-slate-200/50 backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function DashboardTile({ label, present, absent, total }: { label: string; present: number; absent: number; total: number }) {
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;
  return (
    <div className="rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-slate-800">{label}</p>
        <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">{pct}%</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-amber-100">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-3 flex justify-between text-xs text-slate-500">
        <span>{present} presentes</span>
        <span>{absent} ausentes</span>
      </div>
    </div>
  );
}
