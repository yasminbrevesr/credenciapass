import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseQualifications } from "@/lib/utils";

import { ParticipantForm } from "../../participant-form";

export const metadata = { title: "Editar inscrito" };

export default async function EditParticipantPage(
  props: PageProps<"/eventos/[id]/participantes/[participantId]/editar">,
) {
  await requireUser();
  const { id, participantId } = await props.params;

  const participant = await prisma.participant.findFirst({
    where: { id: participantId, eventId: id },
    include: { event: true },
  });
  if (!participant) notFound();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Editar inscrito</h2>

      <ParticipantForm
        eventId={id}
        qualifications={parseQualifications(participant.event.qualifications)}
        cancelHref={`/eventos/${id}/participantes/${participant.id}`}
        values={{
          id: participant.id,
          name: participant.name,
          document: participant.document,
          email: participant.email ?? "",
          phone: participant.phone ?? "",
          qualification: participant.qualification,
          organization: participant.organization ?? "",
          position: participant.position ?? "",
          notes: participant.notes ?? "",
        }}
      />
    </div>
  );
}
