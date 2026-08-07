import "server-only";

import type { CertificateData } from "@/lib/certificate";
import { prisma } from "@/lib/db";
import { generateCode } from "@/lib/utils";

/**
 * Garante que o participante tem um código de certificado e devolve os dados
 * necessários para gerar o PDF. É obrigatório ter ao menos 1 presença e,
 * quando configurado, cumprir o mínimo de dias exigido pelo evento.
 */
export async function prepareCertificate(
  eventId: string,
  participantId: string,
  issuedById?: string,
): Promise<CertificateData | null> {
  const participant = await prisma.participant.findFirst({
    where: { id: participantId, eventId },
    include: { event: true, attendances: true, certificates: true },
  });
  if (!participant) return null;

  const attendedDays = participant.attendances.length;
  const requiredDays = Math.max(1, participant.event.minAttendanceDays);
  if (attendedDays < requiredDays) return null;

  const certificate =
    participant.certificates[0] ??
    (await prisma.certificate.create({
      data: { participantId: participant.id, code: generateCode("CERT"), issuedById },
    }));

  return {
    participantName: participant.name,
    participantDocument: participant.document,
    qualification: participant.qualification,
    eventName: participant.event.name,
    eventLocation: participant.event.location,
    organizer: participant.event.organizer,
    startDate: participant.event.startDate,
    endDate: participant.event.endDate,
    workloadHours: participant.event.workloadHours,
    attendedDays,
    certificateText: participant.event.certificateText,
    validationCode: certificate.code,
    issuedAt: certificate.issuedAt,
  };
}
