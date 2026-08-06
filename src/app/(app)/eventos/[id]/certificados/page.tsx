import Link from "next/link";
import { notFound } from "next/navigation";

import { Alert, QualificationBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, parseQualifications } from "@/lib/utils";

import { sendCertificateEmailAction } from "./actions";

export const metadata = { title: "Certificados" };

export default async function CertificatesPage(props: PageProps<"/eventos/[id]/certificados">) {
  await requireUser();
  const { id } = await props.params;
  const searchParams = await props.searchParams;

  const event = await prisma.event.findUnique({
    where: { id },
    include: { _count: { select: { days: true } } },
  });
  if (!event) notFound();

  const qualification =
    typeof searchParams.qualificacao === "string" ? searchParams.qualificacao : "";
  const success = typeof searchParams.ok === "string" ? searchParams.ok : "";
  const error = typeof searchParams.erro === "string" ? searchParams.erro : "";

  const participants = await prisma.participant.findMany({
    where: { eventId: id, ...(qualification ? { qualification } : {}) },
    orderBy: { name: "asc" },
    include: {
      certificates: {
        include: {
          emails: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
      _count: { select: { attendances: true } },
    },
  });

  const eligible = participants.filter(
    (participant) =>
      event.minAttendanceDays === 0 || participant._count.attendances >= event.minAttendanceDays,
  );

  const batchParams = new URLSearchParams();
  if (qualification) batchParams.set("qualificacao", qualification);
  const batchHref = `/api/eventos/${id}/certificados${batchParams.toString() ? `?${batchParams}` : ""}`;

  return (
    <div className="space-y-4">
      {success ? <Alert tone="success">{success}</Alert> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <Alert tone="info">
        {event.minAttendanceDays > 0
          ? `Este evento exige presença em pelo menos ${event.minAttendanceDays} ${
              event.minAttendanceDays === 1 ? "dia" : "dias"
            } para emitir o certificado.`
          : "Todos os inscritos podem receber certificado (nenhuma presença mínima exigida)."}{" "}
        O texto do certificado é configurado em{" "}
        <Link href={`/eventos/${id}/editar`} className="underline">
          Configurações
        </Link>
        .
      </Alert>

      <div className="card-pad flex flex-wrap items-end gap-3">
        <form className="flex flex-wrap items-end gap-3" action={`/eventos/${id}/certificados`}>
          <div className="w-56">
            <label className="label" htmlFor="qualificacao">
              Qualificação
            </label>
            <select id="qualificacao" name="qualificacao" className="input" defaultValue={qualification}>
              <option value="">Todas</option>
              {parseQualifications(event.qualifications).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-secondary">
            Filtrar
          </button>
        </form>

        <a href={batchHref} target="_blank" rel="noreferrer" className="btn-primary ml-auto">
          Gerar PDF de todos os elegíveis ({eligible.length})
        </a>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Qualificação</th>
              <th>Presenças</th>
              <th>Situação</th>
              <th>Último e-mail</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {participants.map((participant) => {
              const certificate = participant.certificates[0];
              const lastEmail = certificate?.emails[0];
              const ok =
                event.minAttendanceDays === 0 ||
                participant._count.attendances >= event.minAttendanceDays;

              return (
                <tr key={participant.id}>
                  <td>
                    <Link
                      href={`/eventos/${id}/participantes/${participant.id}`}
                      className="font-medium text-slate-900 hover:text-brand-600"
                    >
                      {participant.name}
                    </Link>
                    {participant.email ? (
                      <p className="text-xs text-slate-500">{participant.email}</p>
                    ) : null}
                  </td>
                  <td>
                    <QualificationBadge value={participant.qualification} />
                  </td>
                  <td className="text-slate-600">
                    {participant._count.attendances} de {event._count.days}
                  </td>
                  <td className="text-slate-600">
                    {certificate ? (
                      <span className="text-xs">
                        Emitido em {formatDate(certificate.issuedAt)}
                        <br />
                        <code className="text-slate-500">{certificate.code}</code>
                      </span>
                    ) : ok ? (
                      <span className="badge bg-emerald-50 text-emerald-700">Elegível</span>
                    ) : (
                      <span className="badge bg-amber-50 text-amber-700">Presença insuficiente</span>
                    )}
                  </td>
                  <td className="text-xs text-slate-600">
                    {lastEmail ? (
                      <>
                        <span
                          className={
                            lastEmail.status === "SENT"
                              ? "text-emerald-700"
                              : lastEmail.status === "FAILED"
                                ? "text-red-700"
                                : "text-amber-700"
                          }
                        >
                          {lastEmail.status === "SENT"
                            ? "Enviado"
                            : lastEmail.status === "FAILED"
                              ? "Falhou"
                              : "Pendente"}
                        </span>
                        <br />
                        {lastEmail.sentAt ? formatDate(lastEmail.sentAt) : lastEmail.recipient}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <div className="flex justify-end gap-2">
                      {ok ? (
                        <a
                          href={`/api/eventos/${id}/certificados/${participant.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary btn-sm"
                        >
                          {certificate ? "Baixar" : "Emitir PDF"}
                        </a>
                      ) : null}
                      {ok && participant.email ? (
                        <form action={sendCertificateEmailAction}>
                          <input type="hidden" name="eventId" value={id} />
                          <input type="hidden" name="participantId" value={participant.id} />
                          <button type="submit" className="btn-primary btn-sm">
                            Enviar por e-mail
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {participants.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum inscrito nesta seleção.</p>
      ) : null}
    </div>
  );
}
