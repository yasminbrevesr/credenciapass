import Link from "next/link";

import { EmptyState, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dateOnly, formatPeriod } from "@/lib/utils";

export default async function EventsPage(props: PageProps<"/">) {
  await requireUser();

  const params = await props.searchParams;
  const showArchived = params.arquivados === "1";

  const events = await prisma.event.findMany({
    where: { archived: showArchived },
    orderBy: { startDate: "desc" },
    include: {
      _count: { select: { participants: true, days: true } },
    },
  });

  const today = dateOnly(new Date()).getTime();

  return (
    <>
      <PageHeader
        title={showArchived ? "Eventos arquivados" : "Eventos"}
        subtitle="Selecione um evento para credenciar, registrar presença e emitir certificados."
        actions={
          <>
            <Link href={showArchived ? "/" : "/?arquivados=1"} className="btn-secondary">
              {showArchived ? "Ver ativos" : "Ver arquivados"}
            </Link>
            <Link href="/eventos/novo" className="btn-primary">
              Novo evento
            </Link>
          </>
        }
      />

      {events.length === 0 ? (
        <EmptyState
          title={showArchived ? "Nenhum evento arquivado" : "Nenhum evento cadastrado"}
          description={
            showArchived
              ? "Eventos arquivados ficam fora da lista principal, mas continuam acessíveis aqui."
              : "Cadastre o primeiro evento para começar a credenciar participantes."
          }
          action={
            showArchived ? null : (
              <Link href="/eventos/novo" className="btn-primary">
                Criar evento
              </Link>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const running =
              dateOnly(event.startDate).getTime() <= today &&
              dateOnly(event.endDate).getTime() >= today;

            return (
              <Link
                key={event.id}
                href={`/eventos/${event.id}`}
                className="card flex flex-col gap-3 p-5 transition hover:border-brand-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-base font-semibold text-slate-900">{event.name}</h2>
                  {running ? (
                    <span className="badge bg-emerald-50 text-emerald-700">Em andamento</span>
                  ) : null}
                </div>

                <p className="text-sm text-slate-500">{formatPeriod(event.startDate, event.endDate)}</p>
                {event.location ? (
                  <p className="text-sm text-slate-500">{event.location}</p>
                ) : null}

                <div className="mt-auto flex gap-4 border-t border-slate-100 pt-3 text-sm">
                  <span className="text-slate-600">
                    <strong className="text-slate-900">{event._count.participants}</strong> inscritos
                  </span>
                  <span className="text-slate-600">
                    <strong className="text-slate-900">{event._count.days}</strong>{" "}
                    {event._count.days === 1 ? "dia" : "dias"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
