import Link from "next/link";
import { notFound } from "next/navigation";

import { SubmitButton } from "@/components/submit-button";
import { Alert, QualificationBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dateOnly, formatDateTime, formatDocument } from "@/lib/utils";

import { toggleAttendanceAction } from "./actions";
import { CheckinStation } from "./checkin-station";

export const metadata = { title: "Check-in" };

export default async function CheckinPage(props: PageProps<"/eventos/[id]/checkin">) {
  const user = await requireUser();
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
        {user.role === "ADMIN" ? (
          <>
            <Link href={`/eventos/${id}/editar`} className="underline">Ajuste o período do evento</Link>{" "}
            para liberar o check-in.
          </>
        ) : (
          "Peça a um administrador para configurar o período do evento."
        )}
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
  const status = searchParams.situacao === "presentes" || searchParams.situacao === "ausentes"
    ? searchParams.situacao
    : "todos";

  const participantWhere = {
    eventId: id,
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { document: { contains: query, mode: "insensitive" as const } },
            { code: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(status === "presentes" ? { attendances: { some: { eventDayId: selectedDay.id } } } : {}),
    ...(status === "ausentes" ? { attendances: { none: { eventDayId: selectedDay.id } } } : {}),
  };

  const [matches, recent] = await Promise.all([
    prisma.participant.findMany({
      where: participantWhere,
      orderBy: { name: "asc" },
      take: 200,
      include: { attendances: { where: { eventDayId: selectedDay.id } } },
    }),
    prisma.attendance.findMany({
      where: { eventDayId: selectedDay.id },
      orderBy: { checkedInAt: "desc" },
      take: 10,
      include: { participant: true },
    }),
  ]);

  const base = `/eventos/${id}/checkin`;

  return (
    <div className="space-y-6">
      <CheckinStation eventId={id} eventDayId={selectedDay.id} />

      <section className="card-pad">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
          Check-in manual (sem crachá)
        </h2>

        <form className="grid gap-3 md:grid-cols-[1fr_200px_auto_auto] md:items-end" action={base}>
          <input type="hidden" name="dia" value={selectedDay.id} />
          <div>
            <label className="label" htmlFor="q">Buscar inscrito</label>
            <input id="q" name="q" className="input" defaultValue={query} placeholder="Digite parte do nome, CPF ou e-mail" />
          </div>
          <div>
            <label className="label" htmlFor="situacao">Situação</label>
            <select id="situacao" name="situacao" className="input" defaultValue={status}>
              <option value="todos">Todos</option>
              <option value="presentes">Presentes</option>
              <option value="ausentes">Ausentes</option>
            </select>
          </div>
          <button type="submit" className="btn-primary">Filtrar</button>
          {(query || status !== "todos") ? <Link href={`${base}?dia=${selectedDay.id}`} className="btn-secondary">Limpar</Link> : null}
        </form>

        <div className="mt-4 max-h-[30rem] overflow-auto rounded-lg border border-slate-200">
          <table className="table">
            <thead><tr><th>Nome</th><th>CPF / Documento</th><th>Qualificação</th><th>Situação</th><th></th></tr></thead>
            <tbody>
              {matches.map((participant) => {
                const attendance = participant.attendances[0];
                return (
                  <tr key={participant.id}>
                    <td className="font-medium text-slate-900">{participant.name}</td>
                    <td className="text-slate-600">{formatDocument(participant.document)}</td>
                    <td><QualificationBadge value={participant.qualification} /></td>
                    <td className="text-slate-600">{attendance ? `Presente (${formatDateTime(attendance.checkedInAt)})` : "Ausente"}</td>
                    <td className="text-right">
                      {attendance ? (
                        user.role === "ADMIN" ? (
                          <form action={toggleAttendanceAction}>
                            <input type="hidden" name="eventId" value={id} />
                            <input type="hidden" name="participantId" value={participant.id} />
                            <input type="hidden" name="eventDayId" value={selectedDay.id} />
                            <SubmitButton className="btn-secondary btn-sm" pendingLabel="...">Desfazer</SubmitButton>
                          </form>
                        ) : <span className="text-xs font-medium text-emerald-700">Confirmado</span>
                      ) : (
                        <form action={toggleAttendanceAction}>
                          <input type="hidden" name="eventId" value={id} />
                          <input type="hidden" name="participantId" value={participant.id} />
                          <input type="hidden" name="eventDayId" value={selectedDay.id} />
                          <SubmitButton className="btn-primary btn-sm" pendingLabel="...">Confirmar</SubmitButton>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {matches.length === 0 ? <p className="p-4 text-sm text-slate-500">Nenhum inscrito encontrado.</p> : null}
        </div>
        {!query && status === "todos" && event._count.participants > 200 ? (
          <p className="mt-2 text-xs text-slate-500">Exibindo os primeiros 200 inscritos. Use a busca ou o filtro para localizar os demais.</p>
        ) : null}
      </section>

      <section className="card-pad">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Presenças registradas hoje</h2>
          {user.role === "ADMIN" ? (
            <Link href={`/eventos/${id}/relatorios?dia=${selectedDay.id}#detalhe-dia`} className="text-sm text-brand-600 hover:underline">Ver relatório completo</Link>
          ) : null}
        </div>

        {recent.length === 0 ? <p className="text-sm text-slate-500">Nenhuma presença registrada neste dia.</p> : (
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
