import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";

import { SubmitButton } from "@/components/submit-button";
import { QualificationBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, formatDocument, formatPhone } from "@/lib/utils";

import { toggleAttendanceAction } from "../../checkin/actions";
import { deleteParticipantAction, regenerateCodeAction } from "../actions";

export default async function ParticipantPage(
  props: PageProps<"/eventos/[id]/participantes/[participantId]">,
) {
  const user = await requireUser();
  const { id, participantId } = await props.params;

  const participant = await prisma.participant.findFirst({
    where: { id: participantId, eventId: id },
    include: {
      attendances: true,
      certificates: true,
      event: { include: { days: { orderBy: { date: "asc" } } } },
    },
  });
  if (!participant) notFound();

  const qrCode = await QRCode.toDataURL(participant.code, { margin: 1, width: 220 });
  const attendanceByDay = new Map(
    participant.attendances.map((attendance) => [attendance.eventDayId, attendance]),
  );
  const base = `/eventos/${id}/participantes`;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <section className="card-pad">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{participant.name}</h2>
              <div className="mt-1">
                <QualificationBadge value={participant.qualification} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`${base}/${participant.id}/editar`} className="btn-secondary btn-sm">
                Editar
              </Link>
              <Link
                href={`/eventos/${id}/etiquetas/imprimir?ids=${participant.id}`}
                className="btn-primary btn-sm"
                target="_blank"
              >
                Imprimir etiqueta
              </Link>
            </div>
          </div>

          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="CPF / Documento" value={formatDocument(participant.document)} />
            <Field label="Código do crachá" value={participant.code} mono />
            <Field label="E-mail" value={participant.email ?? "—"} />
            <Field label="Celular" value={formatPhone(participant.phone) || "—"} />
            <Field label="Instituição / empresa" value={participant.organization ?? "—"} />
            <Field label="Cargo / função" value={participant.position ?? "—"} />
            <Field label="Inscrito em" value={formatDateTime(participant.createdAt)} />
            {user.role === "ADMIN" ? (
              <Field
                label="Certificado"
                value={
                  participant.certificates.length > 0
                    ? `Emitido (${participant.certificates[0].code})`
                    : "Não emitido"
                }
              />
            ) : null}
          </dl>

          {participant.notes ? (
            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500 uppercase">Observações</p>
              <p className="mt-1 text-sm whitespace-pre-wrap text-slate-700">{participant.notes}</p>
            </div>
          ) : null}
        </section>

        <section className="card-pad">
          <h3 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Presença por dia
          </h3>

          <ul className="divide-y divide-slate-100">
            {participant.event.days.map((day) => {
              const attendance = attendanceByDay.get(day.id);
              return (
                <li key={day.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{formatDate(day.date)}</p>
                    <p className="text-xs text-slate-500">
                      {attendance
                        ? `Confirmado às ${formatDateTime(attendance.checkedInAt)} (${
                            attendance.method === "QRCODE" ? "leitura de código" : "manual"
                          })`
                        : "Sem presença registrada"}
                    </p>
                  </div>

                  {attendance ? (
                    user.role === "ADMIN" ? (
                      <form action={toggleAttendanceAction}>
                        <input type="hidden" name="eventId" value={id} />
                        <input type="hidden" name="participantId" value={participant.id} />
                        <input type="hidden" name="eventDayId" value={day.id} />
                        <SubmitButton className="btn-secondary btn-sm" pendingLabel="...">
                          Desfazer
                        </SubmitButton>
                      </form>
                    ) : (
                      <span className="text-xs font-medium text-emerald-700">Presença confirmada</span>
                    )
                  ) : (
                    <form action={toggleAttendanceAction}>
                      <input type="hidden" name="eventId" value={id} />
                      <input type="hidden" name="participantId" value={participant.id} />
                      <input type="hidden" name="eventDayId" value={day.id} />
                      <SubmitButton className="btn-primary btn-sm" pendingLabel="...">
                        Confirmar presença
                      </SubmitButton>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="space-y-6">
        <section className="card-pad text-center">
          <h3 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Código do crachá
          </h3>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCode} alt={`QR Code de ${participant.name}`} className="mx-auto h-44 w-44" />
          <p className="mt-2 font-mono text-sm font-semibold tracking-wider text-slate-700">
            {participant.code}
          </p>

          {user.role === "ADMIN" ? (
            <form action={regenerateCodeAction} className="mt-4">
              <input type="hidden" name="eventId" value={id} />
              <input type="hidden" name="id" value={participant.id} />
              <SubmitButton
                className="btn-secondary btn-sm w-full"
                pendingLabel="Gerando..."
                confirm="Gerar um novo código invalida o crachá já impresso. Continuar?"
              >
                Gerar novo código
              </SubmitButton>
            </form>
          ) : null}
        </section>

        {user.role === "ADMIN" ? (
          <>
            <section className="card-pad space-y-2">
              <h3 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Certificado</h3>
              <a
                href={`/api/eventos/${id}/certificados/${participant.id}`}
                target="_blank"
                className="btn-primary w-full"
                rel="noreferrer"
              >
                Emitir certificado (PDF)
              </a>
              <p className="text-xs text-slate-500">
                A emissão registra um código de validação que pode ser conferido publicamente.
              </p>
            </section>

            <section className="card-pad">
              <h3 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
                Excluir inscrição
              </h3>
              <form action={deleteParticipantAction}>
                <input type="hidden" name="eventId" value={id} />
                <input type="hidden" name="id" value={participant.id} />
                <SubmitButton
                  className="btn-danger w-full"
                  pendingLabel="Excluindo..."
                  confirm={`Excluir ${participant.name} e suas presenças?`}
                >
                  Excluir inscrito
                </SubmitButton>
              </form>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-slate-500 uppercase">{label}</dt>
      <dd className={mono ? "font-mono text-sm text-slate-800" : "text-sm text-slate-800"}>{value}</dd>
    </div>
  );
}
