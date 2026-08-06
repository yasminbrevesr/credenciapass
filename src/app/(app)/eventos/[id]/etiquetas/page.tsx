import { notFound } from "next/navigation";

import { Alert } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LABEL_FORMATS } from "@/lib/labels";
import { formatDocument, parseQualifications } from "@/lib/utils";

import { LabelPicker } from "./label-picker";

export const metadata = { title: "Etiquetas" };

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
      <Alert tone="info">
        Selecione os inscritos, escolha o formato e clique em <strong>Gerar folha</strong>. A folha abre
        em uma nova aba pronta para imprimir (Ctrl+P) — confira em &ldquo;Margens: nenhuma&rdquo; e
        escala 100%.
      </Alert>

      <LabelPicker
        eventId={id}
        formats={LABEL_FORMATS}
        qualifications={parseQualifications(event.qualifications)}
        selectedQualification={qualification}
        participants={participants.map((participant) => ({
          ...participant,
          document: formatDocument(participant.document),
        }))}
      />
    </div>
  );
}
