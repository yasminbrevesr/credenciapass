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

import { ReportExportMenu } from "./export-menu";

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
  const reachRate = participants.length > 0 ? Math.round((generalPresent / participants.length) * 100) : 0;
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
    <div className="space-y-4">
      <div className="flex justify-end">
        <ReportExportMenu eventId={id} />
      </div>

      <section
        className="relative overflow-hidden rounded-[28px] border border-brand-300/20 p-5 text-white shadow-2xl shadow-black/20 sm:p-6"
        style={{
          background:
            "radial-gradient(circle at 88% 8%, rgba(216,154,80,.24), transparent 26%), radial-gradient(circle at 10% 92%, rgba(216,154,80,.08), transparent 24%), linear-gradient(135deg, #020202 0%, #080808 58%, #17100a 100%)",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.018)_1px,transparent_1px)] bg-[size:26px_26px] opacity-30" />
        <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-brand-400/10 blur-3xl" />

        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="mb-3 h-1 w-10 rounded-full bg-brand-400 shadow-[0_0_18px_rgba(216,154,80,.7)]" />
              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Visão executiva</h2>
              <p className="mt-1.5 max-w-xl text-sm text-zinc-400">
                Leitura consolidada de alcance, presença e desempenho do evento.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-2.5 pr-4 shadow-inner shadow-white/[0.02] backdrop-blur-xl">
              <div
                className="grid h-16 w-16 shrink-0 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(#d89a50 ${attendanceRate * 3.6}deg, rgba(255,255,255,.10) 0deg)`,
                }}
              >
                <div className="grid h-12 w-12 place-items-center rounded-full bg-black shadow-inner shadow-white/5">
                  <span className="text-base font-bold text-brand-300">{attendanceRate}%</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-300">Presença geral</p>
                <p className="mt-0.5 text-xs text-zinc-400">{totalAttendances} de {possibleAttendances || 0} registros possíveis</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <PrimaryMetric label="Inscritos" value={participants.length} detail="base total do evento" />
            <PrimaryMetric label="Compareceram" value={generalPresent} detail={`${reachRate}% dos inscritos`} />
            <PrimaryMetric label="Check-ins" value={totalAttendances} detail={`${event.days.length} dia(s) monitorado(s)`} />
          </div>

          <div className="mt-4 rounded-[20px] border border-white/10 bg-white/[0.025] p-4 backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-400">Progressão</p>
              <span className="rounded-full border border-brand-300/25 bg-brand-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-300">
                atualização ao vivo
              </span>
            </div>

            <div className="relative mt-4">
              <div className="absolute left-[8%] right-[8%] top-4 hidden h-px bg-white/10 sm:block" />
              <div
                className="absolute left-[8%] top-4 hidden h-px bg-brand-400 transition-[width] duration-700 ease-out sm:block"
                style={{ width: `${Math.max(0, Math.min(attendanceRate, 84))}%` }}
              />

              <div className="relative grid gap-3 sm:grid-cols-3">
                <ProgressPoint step="01" label="Base cadastrada" value="100%" detail={`${participants.length} inscritos`} progress={100} />
                <ProgressPoint step="02" label="Pessoas alcançadas" value={`${reachRate}%`} detail={`${generalPresent} compareceram`} progress={reachRate} />
                <ProgressPoint step="03" label="Presença utilizada" value={`${attendanceRate}%`} detail={`${totalAttendances} check-ins`} progress={attendanceRate} />
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <ExecutiveInsight
              label="Melhor dia"
              value={bestDay ? `${bestDay.percent}%` : "—"}
              detail={bestDay ? formatDate(bestDay.date) : "Sem dados de presença"}
            />
            <ExecutiveInsight
              label="Sem presença"
              value={neverAttended}
              detail={participants.length ? `${Math.round((neverAttended / participants.length) * 100)}% da base ainda não compareceu` : "0% da base"}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <div className="card flex h-[17rem] flex-col overflow-hidden p-4">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-semibold text-slate-900">Presença por dia</h3>
              <p className="text-xs text-slate-500">Comparativo diário de presença e ausência.</p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">{event.days.length} dia(s)</span>
          </div>

          <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="space-y-3">
              {byDay.length ? byDay.map((day) => (
                <div key={day.id} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-semibold text-slate-700">{formatDate(day.date)}</span>
                    <span className="whitespace-nowrap text-slate-500">
                      {day.present} pres. · {day.absent} aus. · <strong className="text-slate-800">{day.percent}%</strong>
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/70">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${day.percent}%` }} />
                  </div>
                </div>
              )) : <p className="text-sm text-slate-500">Nenhum dia cadastrado.</p>}
            </div>
          </div>
        </div>

        <div className="card flex h-[17rem] flex-col overflow-hidden p-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-semibold text-slate-900">Perfil dos inscritos</h3>
            <p className="text-xs text-slate-500">Distribuição da base por qualificação.</p>
          </div>

          <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="space-y-3">
              {byQualification.length ? byQualification.map((row) => (
                <div key={row.qualification} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0"><QualificationBadge value={row.qualification} /></div>
                    <span className="shrink-0 text-xs font-semibold text-slate-700">{row.total} · {row.percent}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/70">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${row.percent}%` }} />
                  </div>
                </div>
              )) : <p className="text-sm text-slate-500">Nenhuma qualificação cadastrada.</p>}
            </div>
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
            <a href={filterHref(effectiveScope, "todos")} className={statusFilter === "todos" ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>Todos ({participants.length})</a>
            <a href={filterHref(effectiveScope, "ausentes")} className={statusFilter === "ausentes" ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>Ausentes ({selectedAbsent})</a>
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

function PrimaryMetric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-zinc-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-white">{value}</p>
        </div>
        <span className="mt-1 h-2 w-2 rounded-full bg-brand-400 shadow-[0_0_14px_rgba(216,154,80,.8)]" />
      </div>
      <p className="mt-1 text-[11px] text-zinc-400">{detail}</p>
    </div>
  );
}

function ProgressPoint({ step, label, value, detail, progress }: { step: string; label: string; value: string; detail: string; progress: number }) {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 sm:border-0 sm:bg-transparent sm:p-2 sm:text-center">
      <div className="mx-auto grid h-8 w-8 place-items-center rounded-full border border-brand-300/40 bg-black text-[10px] font-bold text-brand-300 shadow-[0_0_0_4px_rgba(216,154,80,.07)]">{step}</div>
      <p className="mt-2 text-xs font-semibold text-zinc-200">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-0.5 text-[10px] text-zinc-500">{detail}</p>
      <div className="mx-auto mt-2 h-1 max-w-32 overflow-hidden rounded-full bg-white/10 sm:hidden">
        <div className="h-full rounded-full bg-brand-400" style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }} />
      </div>
    </div>
  );
}

function ExecutiveInsight({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-brand-300/15 bg-brand-400/[0.05] px-4 py-3">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-brand-300/85">{label}</p>
        <p className="mt-0.5 truncate text-[11px] text-zinc-400">{detail}</p>
      </div>
      <p className="shrink-0 text-2xl font-semibold tracking-tight text-white">{value}</p>
    </div>
  );
}
