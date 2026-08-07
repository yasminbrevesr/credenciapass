import Link from "next/link";

import { PageHeader, StatCard } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Movimentações" };

export default async function MovementsPage(props: PageProps<"/movimentacoes">) {
  await requireAdmin();
  const searchParams = await props.searchParams;
  const operatorId = typeof searchParams.operador === "string" ? searchParams.operador : "";
  const eventId = typeof searchParams.evento === "string" ? searchParams.evento : "";
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";

  const [operators, events, activities] = await Promise.all([
    prisma.user.findMany({
      where: { role: "OPERADOR" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, active: true, _count: { select: { checkins: true } } },
    }),
    prisma.event.findMany({ orderBy: { startDate: "desc" }, select: { id: true, name: true } }),
    prisma.attendance.findMany({
      where: {
        operatorId: { not: null },
        ...(operatorId ? { operatorId } : {}),
        ...(eventId ? { eventDay: { eventId } } : {}),
        ...(query
          ? {
              OR: [
                { participant: { name: { contains: query, mode: "insensitive" as const } } },
                { operator: { name: { contains: query, mode: "insensitive" as const } } },
                { eventDay: { event: { name: { contains: query, mode: "insensitive" as const } } } },
              ],
            }
          : {}),
      },
      orderBy: { checkedInAt: "desc" },
      take: 300,
      include: {
        operator: { select: { id: true, name: true } },
        participant: { select: { name: true, qualification: true } },
        eventDay: { include: { event: { select: { id: true, name: true } } } },
      },
    }),
  ]);

  const selectedOperator = operators.find((operator) => operator.id === operatorId);
  const qrCount = activities.filter((activity) => activity.method === "QRCODE").length;
  const manualCount = activities.filter((activity) => activity.method !== "QRCODE").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Movimentações dos operadores"
        subtitle="Acompanhe quem realizou cada check-in, em qual evento, por qual método e em qual horário."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Movimentações exibidas" value={activities.length} tone="brand" />
        <StatCard label="Leituras por QR Code" value={qrCount} tone="green" />
        <StatCard label="Check-ins manuais" value={manualCount} />
      </div>

      <section className="card-pad">
        <form className="grid gap-3 md:grid-cols-4 md:items-end" action="/movimentacoes">
          <div>
            <label className="label" htmlFor="operador">Operador</label>
            <select id="operador" name="operador" className="input" defaultValue={operatorId}>
              <option value="">Todos</option>
              {operators.map((operator) => (
                <option key={operator.id} value={operator.id}>{operator.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="evento">Evento</label>
            <select id="evento" name="evento" className="input" defaultValue={eventId}>
              <option value="">Todos</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>{event.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="q">Buscar</label>
            <input id="q" name="q" className="input" defaultValue={query} placeholder="Operador, pessoa ou evento" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">Filtrar</button>
            {(operatorId || eventId || query) ? <Link href="/movimentacoes" className="btn-secondary">Limpar</Link> : null}
          </div>
        </form>
      </section>

      <section className="card-pad">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Operadores</h2>
            <p className="mt-1 text-sm text-slate-500">Clique em detalhar para ver somente os check-ins daquele operador.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {operators.map((operator) => (
            <div key={operator.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{operator.name}</p>
                  <p className="truncate text-sm text-slate-500">{operator.email}</p>
                </div>
                <span className={operator.active ? "badge bg-emerald-50 text-emerald-700" : "badge bg-slate-100 text-slate-600"}>
                  {operator.active ? "Ativo" : "Inativo"}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                <strong className="text-slate-900">{operator._count.checkins}</strong> check-ins no total
              </p>
              <Link href={`/movimentacoes?operador=${operator.id}`} className="btn-secondary btn-sm mt-3">
                Detalhar movimentações
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="card overflow-x-auto">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-semibold text-slate-900">
            {selectedOperator ? `Check-ins de ${selectedOperator.name}` : "Histórico de check-ins"}
          </h2>
          <p className="text-sm text-slate-500">Até 300 movimentações mais recentes conforme os filtros.</p>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Operador</th>
              <th>Pessoa</th>
              <th>Qualificação</th>
              <th>Evento</th>
              <th>Método</th>
              <th>Horário</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((activity) => (
              <tr key={activity.id}>
                <td className="font-medium text-slate-900">
                  {activity.operator ? (
                    <Link href={`/movimentacoes?operador=${activity.operator.id}`} className="hover:text-brand-600 hover:underline">
                      {activity.operator.name}
                    </Link>
                  ) : "S/N"}
                </td>
                <td className="text-slate-800">{activity.participant.name}</td>
                <td className="text-slate-600">{activity.participant.qualification}</td>
                <td className="text-slate-600">{activity.eventDay.event.name}</td>
                <td className="text-slate-600">{activity.method === "QRCODE" ? "QR Code" : "Manual"}</td>
                <td className="whitespace-nowrap text-slate-600">{formatDateTime(activity.checkedInAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {activities.length === 0 ? <p className="p-5 text-sm text-slate-500">Nenhuma movimentação encontrada.</p> : null}
      </section>
    </div>
  );
}
