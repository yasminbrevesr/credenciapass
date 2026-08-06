import { notFound } from "next/navigation";
import QRCode from "qrcode";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCodeType, getLabelFormat } from "@/lib/labels";

import { LabelSheet } from "./label-sheet";

export const metadata = { title: "Etiquetas para impressão" };

export default async function PrintLabelsPage(
  props: PageProps<"/eventos/[id]/etiquetas/imprimir">,
) {
  await requireUser();
  const { id } = await props.params;
  const searchParams = await props.searchParams;

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  const format = getLabelFormat(
    typeof searchParams.formato === "string" ? searchParams.formato : null,
  );
  const codeType = getCodeType(typeof searchParams.codigo === "string" ? searchParams.codigo : null);

  const ids =
    typeof searchParams.ids === "string" ? searchParams.ids.split(",").filter(Boolean) : [];
  const qualification =
    typeof searchParams.qualificacao === "string" ? searchParams.qualificacao : "";

  const participants = await prisma.participant.findMany({
    where: {
      eventId: id,
      ...(ids.length > 0 ? { id: { in: ids } } : {}),
      ...(qualification ? { qualification } : {}),
    },
    orderBy: { name: "asc" },
  });

  if (participants.length === 0) notFound();

  const labels = await Promise.all(
    participants.map(async (participant) => ({
      id: participant.id,
      name: participant.name,
      qualification: participant.qualification,
      organization: participant.organization,
      code: participant.code,
      qrCode:
        codeType === "qrcode"
          ? await QRCode.toDataURL(participant.code, { margin: 0, width: 240 })
          : null,
    })),
  );

  return (
    <LabelSheet eventName={event.name} format={format} codeType={codeType} labels={labels} />
  );
}
