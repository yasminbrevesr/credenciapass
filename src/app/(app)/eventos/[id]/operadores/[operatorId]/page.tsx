import Link from "next/link";
import { notFound } from "next/navigation";

import { StatCard } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Relatório do operador" };

export default async function EventOperatorReportPage(
  props: PageProps<"/eventos/[id]/operadores/[operatorId]">,
) {
  await requireAdmin();
  const { id, operatorId } = await props.params;
  const searchParams = await props.searchParams;
  const method = searchParams.metodo === "QRCODE" || searchParams.metodo === "MANUAL" ? searchParams.metodo : "";
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";

  const [event, operator, activities] = await Promise.all([
    prisma.event.findUnique({ where: { id }, select: { id: true, name: true } }),
    prisma.user.findFirst({
      where: { id: operatorId, role: "OPERADOR", eventAccesses: { some: { eventId: id } } },
      select: { id: true, name: true, email: true, active: true },
    }),
    prisma.attendance.findMany({
      where: {
        operatorId,
        eventDay: { eventId: id },
        ...(method ? { method } : {}),
        ...(query
          ? {
              OR: [
                { participant: { name: { contains: query, mode: "insensitive" } } },
                { participant: { document: { contains: query, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      orderBy: { checkedInAt: "desc" },
      take: 500,
      include: {
        participant: { select: { name: true, document: true, qualification: true } },
        eventDay: { select: { date: true } },
      },
    }),
  ]);

  if (!event || !operator) notFound();

  const qrCount = activities.filter((item) => item.method === "QRCODE").length;
  const manualCount = activities.filter((item) => item.method !== "QRCODE").length;
  const daysWorked = new Set(activities.map((item) => formatDate(item.eventDay.date))).size;
  const firstActivity = activities.length > 0 ? activities[activities.length - 1] : null;
  const lastActivity = activities[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/eventos/${id}/operadores`} className="text-sm text-slate-500 hover:text-slate-700">
            ← Voltar para operadores
          </Link>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{operator.name}</h2>
          <p className="text-sm text-slate-500">{operator.email} · {operator.active ? "Ativo" : "Inativo"}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Check-ins" value={activities.length} tone="brand" />
        <StatCard label="Por QR Code" value={qrCount} tone="green" />
        <StatCard label="Manuais" value={manualCount} />
        <StatCard label="Dias com atividade" value={daysWorked} />
      </div>

      <section className="card-pad">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Primeiro registro exibido</p>
            <p className="mt-1 text-sm text-slate-800">{firstActivity ? formatDateTime(firstActivity.checkedInAt) : "S/N"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Último registro exibido</p>
            <p className="mt-1 text-sm text-slate-800">{lastActivity ? formatDateTime(lastActivity.checkedInAt) : "S/N"}</p>
          </div>
        </div>
      </section>

      <section className="card-pad">
        <form className="grid gap-3 md:grid-cols-3 md:items-end" action={`/eventos/${id}/operadores/${operatorId}`}>
          <div>
            <label className="label" htmlFor="q">Buscar participante</label>
            <input id="q" name="q" className="input" defaultValue={query} placeholder="Nome ou documento" />
          </div>
          <div>
            <label className="label" htmlFor="metodo">Método</label>
            <select id="metodo" name="metodo" className="input" defaultValue={method}>
              <option value="">Todos</option>
              <option value="QRCODE">QR Code</option>
              <option value="MANUAL">Manual</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">Filtrar</button>
            {(query || method) ? <Link href={`/eventos/${id}/operadores/${operatorId}`} className="btn-secondary">Limpar</Link> : null}
          </div>
        </form>
      </section>

      <section className="card overflow-x-auto">
        <div className="border-b border-slate-200 p-4">
          <h3 className="font-semibold text-slate-900">Histórico de check-ins</h3>
          <p className="mt-1 text-sm text-slate-500">
            Mostra quem foi credenciado pelo operador, em qual dia, método utilizado e horário.
          </p>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Participante</th>
              <th>Documento</th>
              <th>Qualificação</th>
              <th>Dia do evento</th>
              <th>Método</th>
              <th>Horário</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((activity) => (
              <tr key={activity.id}>
                <td className="font-medium text-slate-900">{activity.participant.name}</td>
                <td className="text-slate-600">{activity.participant.document || "S/N"}</td>
                <td className="text-slate-600">{activity.participant.qualification || "S/N"}</td>
                <td className="text-slate-600">{formatDate(activity.eventDay.date)}</td>
                <td>
                  <span className={activity.method === "QRCODE" ? "badge bg-emerald-50 text-emerald-700" : "badge bg-amber-50 text-amber-700"}>
                    {activity.method === "QRCODE" ? "QR Code" : "Manual"}
                  </span>
                </td>
                <td className="whitespace-nowrap text-slate-600">{formatDateTime(activity.checkedInAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {activities.length === 0 ? <p className="p-5 text-sm text-slate-500">Nenhum check-in encontrado para este filtro.</p> : null}
      </section>
    </div>
  );
}
