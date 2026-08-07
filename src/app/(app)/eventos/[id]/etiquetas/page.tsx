import { notFound } from "next/navigation";

import { Alert } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LABEL_FORMATS } from "@/lib/labels";
import { formatDocument, parseQualifications } from "@/lib/utils";

import { LabelPicker } from "./label-picker";

export const metadata = { title: "Impressão de etiquetas" };

export default async function LabelsPage(props: PageProps<"/eventos/[id]/etiquetas">) {
  await requireUser();
  const { id } = await props.params;
  const searchParams = await props.searchParams;

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  const qualification =
    typeof searchParams.qualificacao === "string" ? searchParams.qualificacao : "";

  const participants = await prisma.participant.findMany({
    where: { eventId: id, ...(qualification ? { qualification } : {}) },
    orderBy: { name: "asc" },
    select: { id: true, name: true, document: true, qualification: true, organization: true },
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Impressão de etiquetas para crachá</h2>
        <p className="mt-1 text-sm text-slate-500">
          Gere etiquetas com nome e qualificação, escolhendo também QR Code, código de barras ou nenhum código.
        </p>
      </div>

      <Alert tone="info">
        Selecione os inscritos, escolha o tamanho da etiqueta e o tipo de código. Depois clique em{" "}
        <strong>Gerar folha</strong>. A folha abre em uma nova aba pronta para imprimir — use escala 100%.
      </Alert>

      <LabelPicker
        eventId={id}
        formats={LABEL_FORMATS}
        qualifications={parseQualifications(event.qualifications)}
        selectedQualification={qualification}
        participants={participants.map((participant) => ({
          ...participant,
          document: formatDocument(participant.document) || "S/N",
          organization: participant.organization || "S/N",
        }))}
      />
    </div>
  );
}
