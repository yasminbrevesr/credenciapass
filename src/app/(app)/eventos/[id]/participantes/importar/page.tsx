import Link from "next/link";
import { notFound } from "next/navigation";

import { Alert } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

import { importParticipantsAction } from "./actions";

export const metadata = { title: "Importar inscritos" };

export default async function ImportParticipantsPage(
  props: PageProps<"/eventos/[id]/participantes/importar">,
) {
  await requireUser();
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  const imported = Number(searchParams.importados ?? 0);
  const duplicated = Number(searchParams.duplicados ?? 0);
  const invalid = Number(searchParams.invalidos ?? 0);
  const error = typeof searchParams.erro === "string" ? searchParams.erro : "";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Importar inscritos</h2>
        <p className="mt-1 text-sm text-slate-500">Evento: {event.name}</p>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {imported || duplicated || invalid ? (
        <Alert tone="info">
          Importados: <strong>{imported}</strong>. Duplicados ignorados: <strong>{duplicated}</strong>.
          Linhas inválidas: <strong>{invalid}</strong>.
        </Alert>
      ) : null}

      <div className="card-pad space-y-4">
        <p className="text-sm text-slate-600">
          Envie uma planilha Excel (.xlsx). As colunas obrigatórias são <strong>Nome</strong> e{" "}
          <strong>Documento</strong>. Também são aceitas: E-mail, Telefone, Qualificação, Instituição,
          Cargo e Observações.
        </p>

        <a href={`/api/eventos/${id}/participantes/modelo`} className="btn-secondary btn-sm">
          Baixar modelo de planilha
        </a>

        <form action={importParticipantsAction} className="space-y-4">
          <input type="hidden" name="eventId" value={id} />
          <div>
            <label className="label" htmlFor="file">
              Planilha Excel
            </label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              required
              className="input"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">
              Importar inscritos
            </button>
            <Link href={`/eventos/${id}/participantes`} className="btn-secondary">
              Voltar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
