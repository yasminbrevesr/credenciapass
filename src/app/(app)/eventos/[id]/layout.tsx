import Link from "next/link";
import { notFound } from "next/navigation";

import { NavLink } from "@/components/nav-link";
import { requireEventAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPeriod } from "@/lib/utils";

export default async function EventLayout({ children, params }: LayoutProps<"/eventos/[id]">) {
  const { id } = await params;
  const user = await requireEventAccess(id);

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  const base = `/eventos/${event.id}`;
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div className="no-print">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
          ← Todos os eventos
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{event.name}</h1>
          {event.archived ? <span className="badge bg-slate-200 text-slate-700">Arquivado</span> : null}
        </div>
        <p className="text-sm text-slate-500">
          {formatPeriod(event.startDate, event.endDate)}
          {event.location ? ` · ${event.location}` : ""}
        </p>

        <nav className="mt-4 flex flex-wrap gap-1 border-b border-slate-200 pb-2">
          <NavLink href={base} exact>Visão geral</NavLink>
          <NavLink href={`${base}/participantes`}>Inscritos e crachás</NavLink>
          <NavLink href={`${base}/checkin`}>Check-in</NavLink>
          {isAdmin ? <NavLink href={`${base}/certificados`}>Certificados</NavLink> : null}
          {isAdmin ? <NavLink href={`${base}/relatorios`}>Relatórios</NavLink> : null}
          {isAdmin ? <NavLink href={`${base}/editar`}>Configurações</NavLink> : null}
        </nav>
      </div>

      {children}
    </div>
  );
}
