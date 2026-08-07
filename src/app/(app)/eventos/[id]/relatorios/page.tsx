import Link from "next/link";
import { notFound } from "next/navigation";

import { QualificationBadge } from "@/components/ui";
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

  const dayList = selectedDay
    ? participants.map((participant) => {
        const attendance = participant.attendances.find(
          (item) => item.eventDayId === selectedDay.id,
        );
        return { participant, attendance };
      })
    : [];
  const selectedPresent = dayList.filter((item) => item.attendance).length;
  const selectedAbsent = dayList.length - selectedPresent;

  return (
    <div className="space-y-6">
      <div className="card-pad no-print flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate-600">
          Exportações em Excel (.xlsx), prontas para enviar ao cliente:
        </p>
        <a href={`/api/eventos/${id}/relatorios/inscritos`} className="btn-secondary btn-sm">
          Inscritos + por qualificação
        </a>
        <a href={`/api/eventos/${id}/relatorios/presenca`} className="btn-secondary btn-sm">
          Presença (geral, por dia e listas)
        </a>
        <button type="button" className="btn-secondary btn-sm" disabled>
          Total de inscritos: {participants.length}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-pad">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Inscritos por qualificação
          </h2>
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
        </section>

        <section className="card-pad">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Presença por dia
          </h2>
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
                  <td className="text-right text-slate-500">{day.absent}</td>
                  <td className="text-right text-slate-500">{day.percent}%</td>
                  <td className="text-right">
                    <Link
                      href={`/eventos/${id}/relatorios?dia=${day.id}#detalhe-dia`}
                      className="text-sm text-brand-600 hover:underline"
                    >
                      Detalhar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {byDay.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum dia configurado para este evento.</p>
          ) : null}
        </section>
      </div>

      <section className="card-pad">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
          Presença geral (participante × dia)
        </h2>

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
                  <td className="text-slate-600">{participant.qualification}</td>
                  {event.days.map((day) => {
                    const present = participant.attendances.some(
                      (attendance) => attendance.eventDayId === day.id,
                    );
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

        {participants.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum inscrito cadastrado.</p>
        ) : null}
      </section>

      {selectedDay ? (
        <section id="detalhe-dia" className="card-pad scroll-mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
                Lista completa — {formatDateLong(selectedDay.date)}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                <strong className="text-emerald-700">{selectedPresent} presentes</strong>
                {" · "}
                <strong className="text-amber-700">{selectedAbsent} ausentes</strong>
                {" · "}
                {dayList.length} inscritos no total
              </p>
            </div>
            <div className="no-print flex gap-2">
              <Link href={`/eventos/${id}/relatorios`} className="btn-secondary btn-sm">Fechar detalhe</Link>
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
                    <td className="text-slate-600">{formatDocument(participant.document)}</td>
                    <td className="text-slate-600">{participant.qualification}</td>
                    <td>
                      {attendance ? (
                        <span className="badge bg-emerald-50 text-emerald-700">Presente</span>
                      ) : (
                        <span className="badge bg-amber-50 text-amber-700">Ausente</span>
                      )}
                    </td>
                    <td className="text-slate-600">
                      {attendance ? formatDateTime(attendance.checkedInAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
