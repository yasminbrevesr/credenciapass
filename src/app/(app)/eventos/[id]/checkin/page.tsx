import Link from "next/link";
import { notFound } from "next/navigation";

import { SubmitButton } from "@/components/submit-button";
import { Alert, QualificationBadge, StatCard } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { classNames, dateOnly, formatDate, formatDateLong, formatDateTime, formatDocument } from "@/lib/utils";

import { toggleAttendanceAction } from "./actions";
import { CheckinStation } from "./checkin-station";

export const metadata = { title: "Check-in" };

export default async function CheckinPage(props: PageProps<"/eventos/[id]/checkin">) {
  await requireUser();
  const { id } = await props.params;
  const searchParams = await props.searchParams;

  const event = await prisma.event.findUnique({
    where: { id },
    include: { days: { orderBy: { date: "asc" } }, _count: { select: { participants: true } } },
  });
  if (!event) notFound();

  if (event.days.length === 0) {
    return (
      <Alert tone="warn">
        Este evento não tem dias configurados.{" "}
        <Link href={`/eventos/${id}/editar`} className="underline">
          Ajuste o período do evento
        </Link>{" "}
        para liberar o check-in.
      </Alert>
    );
  }

  const todayTime = dateOnly(new Date()).getTime();
  const requestedDay =
    typeof searchParams.dia === "string"
      ? event.days.find((day) => day.id === searchParams.dia)
      : undefined;
  const selectedDay =
    requestedDay ??
    event.days.find((day) => dateOnly(day.date).getTime() === todayTime) ??
    event.days[0];

  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";

  const [attendanceCount, matches, recent] = await Promise.all([
    prisma.attendance.count({ where: { eventDayId: selectedDay.id } }),
    query
      ? prisma.participant.findMany({
          where: {
            eventId: id,
            OR: [
              { name: { contains: query } },
              { document: { contains: query } },
              { code: { contains: query } },
              { email: { contains: query } },
            ],
          },
          orderBy: { name: "asc" },
          take: 25,
          include: { attendances: { where: { eventDayId: selectedDay.id } } },
        })
      : Promise.resolve([]),
    prisma.attendance.findMany({
      where: { eventDayId: selectedDay.id },
      orderBy: { checkedInAt: "desc" },
      take: 10,
      include: { participant: true },
    }),
  ]);

  const base = `/eventos/${id}/checkin`;
  const pending = event._count.participants - attendanceCount;

  return (
    <div className="space-y-6">
      <div className="card-pad no-print">
        <p className="label">Dia do evento</p>
        <div className="flex flex-wrap gap-2">
          {event.days.map((day) => {
            const active = day.id === selectedDay.id;
            const isToday = dateOnly(day.date).getTime() === todayTime;
            return (
              <Link
                key={day.id}
                href={`${base}?dia=${day.id}`}
                className={classNames(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                  active
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                )}
              >
                {formatDate(day.date)}
                {isToday ? (
                  <span className={classNames("ml-1 text-xs", active ? "text-brand-100" : "text-emerald-600")}>
                    hoje
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Presentes" value={attendanceCount} tone="green" hint={formatDateLong(selectedDay.date)} />
        <StatCard label="Faltantes" value={pending < 0 ? 0 : pending} tone="amber" />
        <StatCard label="Inscritos" value={event._count.participants} />
      </div>

      <CheckinStation
        eventId={id}
        eventDayId={selectedDay.id}
        dayLabel={formatDateLong(selectedDay.date)}
      />

      <section className="card-pad">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
          Check-in manual (sem crachá)
        </h2>

        <form className="flex flex-wrap items-end gap-3" action={base}>
          <input type="hidden" name="dia" value={selectedDay.id} />
          <div className="min-w-56 flex-1">
            <label className="label" htmlFor="q">
              Buscar inscrito
            </label>
            <input
              id="q"
              name="q"
              className="input"
              defaultValue={query}
              placeholder="Nome, documento ou e-mail"
            />
          </div>
          <button type="submit" className="btn-primary">
            Buscar
          </button>
          {query ? (
            <Link href={`${base}?dia=${selectedDay.id}`} className="btn-secondary">
              Limpar
            </Link>
          ) : null}
        </form>

        {query ? (
          matches.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Nenhum inscrito encontrado para “{query}”.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Documento</th>
                    <th>Qualificação</th>
                    <th>Situação</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((participant) => {
                    const attendance = participant.attendances[0];
                    return (
                      <tr key={participant.id}>
                        <td className="font-medium text-slate-900">{participant.name}</td>
                        <td className="text-slate-600">{formatDocument(participant.document)}</td>
                        <td>
                          <QualificationBadge value={participant.qualification} />
                        </td>
                        <td className="text-slate-600">
                          {attendance ? `Presente (${formatDateTime(attendance.checkedInAt)})` : "Ausente"}
                        </td>
                        <td className="text-right">
                          <form action={toggleAttendanceAction}>
                            <input type="hidden" name="eventId" value={id} />
                            <input type="hidden" name="participantId" value={participant.id} />
                            <input type="hidden" name="eventDayId" value={selectedDay.id} />
                            <SubmitButton
                              className={attendance ? "btn-secondary btn-sm" : "btn-primary btn-sm"}
                              pendingLabel="..."
                            >
                              {attendance ? "Desfazer" : "Confirmar"}
                            </SubmitButton>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Use a busca para confirmar a presença de quem chegou sem o crachá.
          </p>
        )}
      </section>

      <section className="card-pad">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Presenças registradas hoje
          </h2>
          <Link href={`/eventos/${id}/relatorios?dia=${selectedDay.id}`} className="text-sm text-brand-600 hover:underline">
            Ver relatório completo
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma presença registrada neste dia.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((attendance) => (
              <li key={attendance.id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <p className="text-sm font-medium text-slate-800">{attendance.participant.name}</p>
                  <p className="text-xs text-slate-500">{attendance.participant.qualification}</p>
                </div>
                <span className="text-xs text-slate-500">{formatDateTime(attendance.checkedInAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
