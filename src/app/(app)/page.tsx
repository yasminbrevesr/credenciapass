import Link from "next/link";

import { EmptyState, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dateOnly, formatPeriod } from "@/lib/utils";

export default async function EventsPage(props: PageProps<"/">) {
  const user = await requireUser();

  const params = await props.searchParams;
  const showArchived = params.arquivados === "1";
  const query = typeof params.q === "string" ? params.q.trim() : "";

  const where = {
    archived: showArchived,
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { location: { contains: query, mode: "insensitive" as const } },
            { organizer: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(user.role === "OPERADOR" ? { accesses: { some: { userId: user.id } } } : {}),
  };

  const events = await prisma.event.findMany({
    where,
    orderBy: { startDate: "desc" },
    include: { _count: { select: { participants: true, days: true } } },
  });

  const today = dateOnly(new Date()).getTime();
  const archivedHref = showArchived ? "/" : "/?arquivados=1";

  return (
    <>
      <PageHeader
        title={showArchived ? "Eventos arquivados" : "Eventos"}
        subtitle={
          user.role === "ADMIN"
            ? "Selecione um evento para credenciar, registrar presença e emitir certificados."
            : "Aqui aparecem somente os eventos atribuídos ao seu usuário."
        }
        actions={
          <>
            <Link href={archivedHref} className="btn-secondary">
              {showArchived ? "Ver ativos" : "Ver arquivados"}
            </Link>
            {user.role === "ADMIN" ? <Link href="/eventos/novo" className="btn-primary">Novo evento</Link> : null}
          </>
        }
      />

      <form className="card-pad mb-5 flex flex-wrap items-end gap-3" action="/">
        {showArchived ? <input type="hidden" name="arquivados" value="1" /> : null}
        <div className="min-w-64 flex-1">
          <label className="label" htmlFor="q">Buscar evento</label>
          <input
            id="q"
            name="q"
            className="input"
            defaultValue={query}
            placeholder="Nome do evento, local ou organizador"
          />
        </div>
        <button type="submit" className="btn-primary">Buscar</button>
        {query ? <Link href={showArchived ? "/?arquivados=1" : "/"} className="btn-secondary">Limpar</Link> : null}
      </form>

      {events.length === 0 ? (
        <EmptyState
          title={query ? "Nenhum evento encontrado" : showArchived ? "Nenhum evento arquivado" : "Nenhum evento disponível"}
          description={
            query
              ? "Tente outro termo de busca."
              : user.role === "OPERADOR"
                ? "Nenhum evento foi atribuído ao seu usuário."
                : showArchived
                  ? "Eventos arquivados ficam fora da lista principal, mas continuam acessíveis aqui."
                  : "Nenhum evento está disponível no momento."
          }
          action={
            query || showArchived || user.role !== "ADMIN" ? null : (
              <Link href="/eventos/novo" className="btn-primary">Criar evento</Link>
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
                  {running ? <span className="badge bg-emerald-50 text-emerald-700">Em andamento</span> : null}
                </div>

                <p className="text-sm text-slate-500">{formatPeriod(event.startDate, event.endDate)}</p>
                <p className="text-sm text-slate-500">{event.location || "S/N"}</p>

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
