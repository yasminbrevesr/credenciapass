import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState, QualificationBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDocument, formatPhone, parseQualifications } from "@/lib/utils";

const PAGE_SIZE = 50;

export const metadata = { title: "Inscritos e crachás" };

export default async function ParticipantsPage(props: PageProps<"/eventos/[id]/participantes">) {
  const user = await requireUser();
  const { id } = await props.params;
  const searchParams = await props.searchParams;

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const qualification = typeof searchParams.qualificacao === "string" ? searchParams.qualificacao : "";
  const page = Math.max(1, Number(searchParams.pagina ?? 1) || 1);

  const where = {
    eventId: id,
    ...(qualification ? { qualification } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { document: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
            { code: { contains: query, mode: "insensitive" as const } },
            { organization: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, participants] = await Promise.all([
    prisma.participant.count({ where }),
    prisma.participant.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { attendances: true } } },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const base = `/eventos/${id}/participantes`;
  const linkFor = (targetPage: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (qualification) params.set("qualificacao", qualification);
    if (targetPage > 1) params.set("pagina", String(targetPage));
    const suffix = params.toString();
    return suffix ? `${base}?${suffix}` : base;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            {total} {total === 1 ? "inscrito" : "inscritos"}
            {query || qualification ? " encontrados" : ""}
          </p>
          <p className="text-xs text-slate-400">Consulte inscritos e gere etiquetas para os crachás no mesmo fluxo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/eventos/${id}/etiquetas`} className="btn-primary btn-sm">
            Imprimir etiquetas
          </Link>
          {user.role === "ADMIN" ? (
            <>
              <a href={`/api/eventos/${id}/relatorios/inscritos`} className="btn-secondary btn-sm">
                Exportar Excel
              </a>
              <Link href={`/eventos/${id}/participantes/importar`} className="btn-secondary btn-sm">
                Importar planilha
              </Link>
              <Link href={`/eventos/${id}/participantes/novo`} className="btn-primary btn-sm">
                Inscrever participante
              </Link>
            </>
          ) : null}
        </div>
      </div>

      <form className="card-pad flex flex-wrap items-end gap-3" action={base}>
        <div className="min-w-56 flex-1">
          <label className="label" htmlFor="q">Buscar</label>
          <input
            id="q"
            name="q"
            className="input"
            defaultValue={query}
            placeholder="Nome, documento, e-mail, código do crachá..."
          />
        </div>
        <div className="w-56">
          <label className="label" htmlFor="qualificacao">Qualificação</label>
          <select id="qualificacao" name="qualificacao" className="input" defaultValue={qualification}>
            <option value="">Todas</option>
            {parseQualifications(event.qualifications).map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary">Filtrar</button>
        {query || qualification ? <Link href={base} className="btn-secondary">Limpar</Link> : null}
      </form>

      {participants.length === 0 ? (
        <EmptyState
          title="Nenhum inscrito encontrado"
          description={query || qualification ? "Ajuste os filtros para ver outros inscritos." : "Nenhum inscrito foi cadastrado neste evento."}
          action={
            user.role === "ADMIN" ? (
              <Link href={`/eventos/${id}/participantes/novo`} className="btn-primary">Inscrever participante</Link>
            ) : null
          }
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Documento</th>
                <th>Qualificação</th>
                <th>Contato</th>
                <th>Presenças</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {participants.map((participant) => (
                <tr key={participant.id}>
                  <td>
                    <Link href={`${base}/${participant.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                      {participant.name}
                    </Link>
                    <p className="text-xs text-slate-500">{participant.organization || "S/N"}</p>
                  </td>
                  <td className="text-slate-600">{formatDocument(participant.document) || "S/N"}</td>
                  <td><QualificationBadge value={participant.qualification || "S/N"} /></td>
                  <td className="text-slate-600">
                    <p>{participant.email || "S/N"}</p>
                    <p className="text-xs text-slate-500">{formatPhone(participant.phone) || "S/N"}</p>
                  </td>
                  <td className="text-slate-600">{participant._count.attendances}</td>
                  <td className="text-right whitespace-nowrap">
                    <Link href={`${base}/${participant.id}`} className="btn-secondary btn-sm">Abrir</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Página {page} de {pages}</span>
          <div className="flex gap-2">
            {page > 1 ? <Link href={linkFor(page - 1)} className="btn-secondary btn-sm">Anterior</Link> : null}
            {page < pages ? <Link href={linkFor(page + 1)} className="btn-secondary btn-sm">Próxima</Link> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
