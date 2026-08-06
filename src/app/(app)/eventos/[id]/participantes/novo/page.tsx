import { notFound } from "next/navigation";

import { Alert } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseQualifications } from "@/lib/utils";

import { ParticipantForm } from "../participant-form";

export const metadata = { title: "Novo inscrito" };

export default async function NewParticipantPage(
  props: PageProps<"/eventos/[id]/participantes/novo">,
) {
  await requireUser();
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const saved = typeof searchParams.ok === "string" ? searchParams.ok : "";

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  const qualifications = parseQualifications(event.qualifications);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Inscrever participante</h2>

      {saved ? <Alert tone="info">{saved} foi inscrito(a) com sucesso.</Alert> : null}

      <ParticipantForm
        eventId={event.id}
        qualifications={qualifications}
        cancelHref={`/eventos/${event.id}/participantes`}
        values={{
          name: "",
          document: "",
          email: "",
          phone: "",
          qualification: qualifications[0] ?? "Participante",
          organization: "",
          position: "",
          notes: "",
        }}
      />
    </div>
  );
}
