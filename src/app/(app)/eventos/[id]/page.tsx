import Link from "next/link";
import { notFound } from "next/navigation";

import { StatCard } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dateOnly, formatDate, formatDateLong, parseQualifications } from "@/lib/utils";

export default async function EventOverviewPage(props: PageProps<"/eventos/[id]">) {
  await requireUser();
  const { id } = await props.params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      days: { orderBy: { date: "asc" }, include: { _count: { select: { attendances: true } } } },
      participants: { select: { qualification: true } },
      _count: { select: { participants: true } },
    },
  });
  if (!event) notFound();

  const totalParticipants = event._count.participants;
  const todayTime = dateOnly(new Date()).getTime();
  const todayDay = event.days.find((day) => dateOnly(day.date).getTime() === todayTime);
  const totalCheckins = event.days.reduce((sum, day) => sum + day._count.attendances, 0);

  const byQualification = new Map<string, number>();
  for (const qualification of parseQualifications(event.qualifications)) {
    byQualification.set(qualification, 0);
  }
  for (const participant of event.participants) {
    byQualification.set(
      participant.qualification,
      (byQualification.get(participant.qualification) ?? 0) + 1,
    );
  }

  const base = `/eventos/${event.id}`;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Inscritos" value={totalParticipants} tone="brand" />
        <StatCard
          label="Presenças hoje"
          value={todayDay ? todayDay._count.attendances : "—"}
          hint={todayDay ? formatDateLong(todayDay.date) : "Hoje não é dia de evento"}
          tone="green"
        />
        <StatCard label="Presenças no total" value={totalCheckins} />
        <StatCard label="Dias de evento" value={event.days.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card-pad lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Presença por dia
          </h2>

          {event.days.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum dia configurado.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {event.days.map((day) => {
                const percent =
                  totalParticipants > 0
                    ? Math.round((day._count.attendances / totalParticipants) * 100)
                    : 0;
                const isToday = dateOnly(day.date).getTime() === todayTime;

                return (
                  <li key={day.id} className="flex items-center gap-4 py-2.5">
                    <div className="w-32 shrink-0">
                      <p className="text-sm font-medium text-slate-800">{formatDate(day.date)}</p>
                      {isToday ? <p className="text-xs text-emerald-600">hoje</p> : null}
                    </div>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${percent}%` }} />
                    </div>
                    <div className="w-24 text-right text-sm text-slate-600">
                      {day._count.attendances} ({percent}%)
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card-pad">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Inscritos por qualificação
          </h2>

          <ul className="space-y-2">
            {[...byQualification.entries()].map(([qualification, count]) => (
              <li key={qualification} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{qualification}</span>
                <span className="font-semibold text-slate-900">{count}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-col gap-2">
            <Link href={`${base}/participantes/novo`} className="btn-primary">
              Inscrever participante
            </Link>
            <Link href={`${base}/checkin`} className="btn-secondary">
              Abrir check-in
            </Link>
          </div>
        </section>
      </div>

      {event.description ? (
        <section className="card-pad">
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">Descrição</h2>
          <p className="text-sm whitespace-pre-wrap text-slate-700">{event.description}</p>
        </section>
      ) : null}
    </div>
  );
}
