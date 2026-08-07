import Link from "next/link";
import { notFound } from "next/navigation";

import { Alert } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, parseQualifications } from "@/lib/utils";

import { DownloadEligibleCertificates } from "./download-eligible";

export const metadata = { title: "Certificados" };

export default async function CertificatesPage(props: PageProps<"/eventos/[id]/certificados">) {
  await requireAdmin();
  const { id } = await props.params;
  const searchParams = await props.searchParams;

  const event = await prisma.event.findUnique({
    where: { id },
    include: { _count: { select: { days: true } } },
  });
  if (!event) notFound();

  const qualification = typeof searchParams.qualificacao === "string" ? searchParams.qualificacao : "";
  const requiredDays = Math.max(1, event.minAttendanceDays);

  const participants = await prisma.participant.findMany({
    where: { eventId: id, ...(qualification ? { qualification } : {}) },
    orderBy: { name: "asc" },
    include: {
      certificates: true,
      _count: { select: { attendances: true } },
    },
  });

  return (
    <div className="space-y-4">
      <Alert tone="info">
        Certificados só podem ser emitidos para participantes com presença registrada. Este evento exige pelo menos{" "}
        <strong>{requiredDays} {requiredDays === 1 ? "dia" : "dias"}</strong> de presença. O texto do certificado é configurado em{" "}
        <Link href={`/eventos/${id}/editar`} className="underline">Configurações</Link>.
      </Alert>

      <div className="card-pad">
        <form className="flex flex-wrap items-end gap-3" action={`/eventos/${id}/certificados`}>
          <div className="w-56">
            <label className="label" htmlFor="qualificacao">Qualificação</label>
            <select id="qualificacao" name="qualificacao" className="input" defaultValue={qualification}>
              <option value="">Todas</option>
              {parseQualifications(event.qualifications).map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-secondary">Filtrar</button>
        </form>
      </div>

      <DownloadEligibleCertificates
        eventId={id}
        participants={participants.map((participant) => {
          const eligible = participant._count.attendances >= requiredDays;
          const certificate = participant.certificates[0];
          return {
            id: participant.id,
            name: participant.name,
            qualification: participant.qualification || "S/N",
            attendanceLabel: `${participant._count.attendances} de ${event._count.days}`,
            statusLabel: eligible
              ? certificate
                ? `Emitido em ${formatDate(certificate.issuedAt)}`
                : "Elegível"
              : "Ausente / presença insuficiente",
            eligible,
            downloadLabel: certificate ? "Baixar novamente" : "Baixar certificado",
          };
        })}
      />

      {participants.length === 0 ? <p className="text-sm text-slate-500">Nenhum inscrito nesta seleção.</p> : null}
    </div>
  );
}
