import Link from "next/link";
import { notFound } from "next/navigation";

import { Alert } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

import { ImportForm } from "./import-form";

export const metadata = { title: "Importar inscritos" };

export default async function ImportParticipantsPage(
  props: PageProps<"/eventos/[id]/participantes/importar">,
) {
  await requireAdmin();
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  const error = typeof searchParams.erro === "string" ? searchParams.erro : "";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Importar inscritos</h2>
        <p className="mt-1 text-sm text-slate-500">Evento: {event.name}</p>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <ImportForm eventId={id} />

      <p className="text-xs text-slate-400">
        O arquivo é processado no seu navegador e enviado ao servidor em pequenos lotes para evitar travamentos em planilhas grandes.
      </p>

      <Link href={`/eventos/${id}/participantes`} className="text-sm text-slate-500 hover:text-slate-700">
        ← Voltar para inscritos
      </Link>
    </div>
  );
}
