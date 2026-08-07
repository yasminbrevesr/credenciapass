import Link from "next/link";
import { notFound } from "next/navigation";

import { StatCard } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

import { removeEventOperatorAction } from "./actions";
import { EventOperatorForm } from "./operator-form";

export const metadata = { title: "Operadores" };

export default async function EventOperatorsPage(props: PageProps<"/eventos/[id]/operadores">) {
  await requireAdmin();
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";

  const event = await prisma.event.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!event) notFound();

  const accesses = await prisma.eventAccess.findMany({
    where: {
      eventId: id,
      user: {
        role: "OPERADOR",
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    },
    orderBy: { user: { name: "asc" } },
    include: {
      user: {
        include: {
          checkins: {
            where: { eventDay: { eventId: id } },
            orderBy: { checkedInAt: "desc" },
            take: 1,
          },
          _count: {
            select: {
              checkins: {
                where: { eventDay: { eventId: id } },
              },
            },
          },
        },
      },
    },
  });

  const totalCheckins = accesses.reduce((sum, access) => sum + access.user._count.checkins, 0);
  const activeOperators = accesses.filter((access) => access.user.active).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Operadores cadastrados" value={accesses.length} tone="brand" />
        <StatCard label="Operadores ativos" value={activeOperators} tone="green" />
        <StatCard label="Check-ins realizados" value={totalCheckins} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <form className="card-pad flex flex-wrap items-end gap-3" action={`/eventos/${id}/operadores`}>
            <div className="min-w-64 flex-1">
              <label className="label" htmlFor="q">Buscar operador</label>
              <input id="q" name="q" className="input" defaultValue={query} placeholder="Nome ou e-mail" />
            </div>
            <button type="submit" className="btn-primary">Buscar</button>
            {query ? <Link href={`/eventos/${id}/operadores`} className="btn-secondary">Limpar</Link> : null}
          </form>

          <section className="card overflow-hidden">
            <div className="border-b border-slate-200 p-4">
              <h2 className="font-semibold text-slate-900">Equipe de operação</h2>
              <p className="mt-1 text-sm text-slate-500">
                Pessoas com acesso ao check-in deste evento. Acompanhe volume de registros e a última atividade.
              </p>
            </div>

            {accesses.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">Nenhum operador encontrado neste evento.</p>
            ) : (
              <div className="grid gap-3 p-4 md:grid-cols-2">
                {accesses.map((access) => {
                  const operator = access.user;
                  const lastCheckin = operator.checkins[0];
                  return (
                    <article key={access.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{operator.name}</p>
                          <p className="truncate text-sm text-slate-500">{operator.email}</p>
                        </div>
                        <span className={operator.active ? "badge bg-emerald-50 text-emerald-700" : "badge bg-slate-100 text-slate-600"}>
                          {operator.active ? "Ativo" : "Inativo"}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">Check-ins</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">{operator._count.checkins}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">Última atividade</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {lastCheckin ? formatDateTime(lastCheckin.checkedInAt) : "S/N"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link href={`/eventos/${id}/operadores/${operator.id}`} className="btn-primary btn-sm">
                          Ver relatório
                        </Link>
                        <form action={removeEventOperatorAction}>
                          <input type="hidden" name="eventId" value={id} />
                          <input type="hidden" name="userId" value={operator.id} />
                          <button type="submit" className="btn-secondary btn-sm">Remover do evento</button>
                        </form>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <EventOperatorForm eventId={event.id} />
      </div>
    </div>
  );
}
