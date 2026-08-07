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
import { classNames, formatDate, formatDateLong, formatDateTime, formatDocument } from "@/lib/utils";

export const metadata = { title: "Relatórios" };

export default async function ReportsPage(props: PageProps<"/eventos/[id]/relatorios">) {
  await requireAdmin();
  const { id } = await props.params;
  const searchParams = await props.searchParams;

  const event = await loadEventForReports(id);
  if (!event) notFound();

  const participants = await loadParticipants(id);
  const byQualification = summarizeByQualification(event, participants);
  const byDay = summarizeByDay(event.days, participants);

  const selectedDayId = typeof searchParams.dia === "string" ? searchParams.dia : "";
  const selectedDay = event.days.find((day) => day.id === selectedDayId);
  const statusFilter =
    searchParams.situacao === "presentes" || searchParams.situacao === "ausentes"
      ? searchParams.situacao
      : "todos";

  const fullDayList = selectedDay
    ? participants.map((participant) => {
        const attendance = participant.attendances.find((item) => item.eventDayId === selectedDay.id);
        return { participant, attendance };
      })
    : [];

  const dayList = fullDayList.filter((item) => {
    if (statusFilter === "presentes") return Boolean(item.attendance);
    if (statusFilter === "ausentes") return !item.attendance;
    return true;
  });

  const selectedPresent = fullDayList.filter((item) => item.attendance).length;
  const selectedAbsent = fullDayList.length - selectedPresent;
  const totalPossibleAttendances = participants.length * event.days.length;
  const totalAttendances = participants.reduce((sum, participant) => sum + participant.attendances.length, 0);
  const generalPercent = totalPossibleAttendances > 0 ? Math.round((totalAttendances / totalPossibleAttendances) * 100) : 0;

  const detailParams = (status: string) => {
    const params = new URLSearchParams();
    if (selectedDay) params.set("dia", selectedDay.id);
    if (status !== "todos") params.set("situacao", status);
    return `/eventos/${id}/relatorios?${params.toString()}#detalhe-dia`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Central de relatórios</h2>
        <p className="mt-1 text-sm text-slate-500">
          Consulte inscritos por qualificação e acompanhe presença diária e geral em um só lugar.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Inscritos" value={participants.length} tone="brand" />
        <StatCard label="Dias do evento" value={event.days.length} />
        <StatCard label="Presenças registradas" value={totalAttendances} tone="green" />
        <StatCard label="Índice geral" value={`${generalPercent}%`} />
      </div>

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
            <p className="mt-1 text-sm text-slate-500">Presentes, ausentes e percentual de comparecimento.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Dia</th>
                  <th className="text-right">Presentes</th>
                  <th className="text-right">Ausentes</th>
                  <th className="text-right">%</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {byDay.map((day) => (
                  <tr key={day.id}>
                    <td className="text-slate-700">{formatDate(day.date)}</td>
                    <td className="text-right font-medium text-emerald-700">{day.present}</td>
                    <td className="text-right font-medium text-amber-700">{day.absent}</td>
                    <td className="text-right text-slate-500">{day.percent}%</td>
                    <td className="text-right">
                      <Link href={`/eventos/${id}/relatorios?dia=${day.id}#detalhe-dia`} className="btn-secondary btn-sm">
                        Detalhar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900">Presença geral</h3>
          <p className="mt-1 text-sm text-slate-500">Visão participante × dia. Verde indica presença e cinza indica ausência.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Qualificação</th>
                {event.days.map((day) => (
                  <th key={day.id} className="text-center">{formatDate(day.date)}</th>
                ))}
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((participant) => (
                <tr key={participant.id}>
                  <td className="font-medium text-slate-900">{participant.name}</td>
                  <td className="text-slate-600">{participant.qualification || "S/N"}</td>
                  {event.days.map((day) => {
                    const present = participant.attendances.some((attendance) => attendance.eventDayId === day.id);
                    return (
                      <td key={day.id} className="text-center">
                        <span
                          className={classNames(
                            "inline-block h-2.5 w-2.5 rounded-full",
                            present ? "bg-emerald-500" : "bg-slate-200",
                          )}
                          title={present ? "Presente" : "Ausente"}
                        />
                      </td>
                    );
                  })}
                  <td className="text-right text-slate-700">{participant.attendances.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedDay ? (
        <section id="detalhe-dia" className="card scroll-mt-6 overflow-hidden">
          <div className="border-b border-slate-200 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900">Lista de presença — {formatDateLong(selectedDay.date)}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedPresent} presentes · {selectedAbsent} ausentes · {fullDayList.length} inscritos
                </p>
              </div>
              <Link href={`/eventos/${id}/relatorios`} className="btn-secondary btn-sm no-print">Fechar detalhe</Link>
            </div>

            <div className="no-print mt-4 flex flex-wrap gap-2">
              <Link href={detailParams("todos")} className={statusFilter === "todos" ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>
                Todos ({fullDayList.length})
              </Link>
              <Link href={detailParams("presentes")} className={statusFilter === "presentes" ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>
                Presentes ({selectedPresent})
              </Link>
              <Link href={detailParams("ausentes")} className={statusFilter === "ausentes" ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>
                Ausentes ({selectedAbsent})
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Documento</th>
                  <th>Qualificação</th>
                  <th>Situação</th>
                  <th>Check-in</th>
                </tr>
              </thead>
              <tbody>
                {dayList.map(({ participant, attendance }) => (
                  <tr key={participant.id}>
                    <td className="font-medium text-slate-900">{participant.name}</td>
                    <td className="text-slate-600">{formatDocument(participant.document) || "S/N"}</td>
                    <td className="text-slate-600">{participant.qualification || "S/N"}</td>
                    <td>
                      {attendance ? (
                        <span className="badge bg-emerald-50 text-emerald-700">Presente</span>
                      ) : (
                        <span className="badge bg-amber-50 text-amber-700">Ausente</span>
                      )}
                    </td>
                    <td className="text-slate-600">{attendance ? formatDateTime(attendance.checkedInAt) : "S/N"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {dayList.length === 0 ? <p className="p-5 text-sm text-slate-500">Nenhum inscrito neste filtro.</p> : null}
        </section>
      ) : null}
    </div>
  );
}
