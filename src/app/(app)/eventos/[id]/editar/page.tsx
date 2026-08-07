import { notFound } from "next/navigation";

import { SubmitButton } from "@/components/submit-button";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseQualifications, toInputDate } from "@/lib/utils";

import { deleteEventAction, toggleArchiveEventAction } from "../../actions";
import { EventForm } from "../../event-form";

export const metadata = { title: "Editar evento" };

export default async function EditEventPage(props: PageProps<"/eventos/[id]/editar">) {
  await requireAdmin();
  const { id } = await props.params;

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  return (
    <>
      <PageHeader title="Editar evento" subtitle={event.name} />

      <EventForm
        cancelHref={`/eventos/${event.id}`}
        values={{
          id: event.id,
          name: event.name,
          description: event.description ?? "",
          location: event.location ?? "",
          organizer: event.organizer ?? "",
          startDate: toInputDate(event.startDate),
          endDate: toInputDate(event.endDate),
          workloadHours: event.workloadHours != null ? String(event.workloadHours) : "",
          qualifications: parseQualifications(event.qualifications).join("\n"),
          certificateText: event.certificateText ?? "",
          minAttendanceDays: event.minAttendanceDays,
        }}
      />

      <section className="card-pad mt-8">
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Outras ações</h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <form action={toggleArchiveEventAction}>
            <input type="hidden" name="id" value={event.id} />
            <SubmitButton className="btn-secondary" pendingLabel="Aguarde...">
              {event.archived ? "Desarquivar evento" : "Arquivar evento"}
            </SubmitButton>
          </form>

          <form action={deleteEventAction}>
            <input type="hidden" name="id" value={event.id} />
            <SubmitButton
              className="btn-danger"
              pendingLabel="Excluindo..."
              confirm={`Excluir "${event.name}" e TODOS os inscritos, presenças e certificados? Esta ação não pode ser desfeita.`}
            >
              Excluir evento
            </SubmitButton>
          </form>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Arquivar mantém os dados e tira o evento da lista principal. Excluir apaga tudo em definitivo.
        </p>
      </section>
    </>
  );
}
