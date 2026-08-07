import "server-only";

import type { CertificateData } from "@/lib/certificate";
import { prisma } from "@/lib/db";
import { generateCode } from "@/lib/utils";

type CertificateParticipant = {
  id: string;
  name: string;
  document: string;
  qualification: string;
  attendanceCount: number;
};

function toCertificateData(
  participant: CertificateParticipant,
  event: {
    name: string;
    location: string | null;
    organizer: string | null;
    startDate: Date;
    endDate: Date;
    workloadHours: number | null;
    certificateText: string | null;
  },
  certificate: { code: string; issuedAt: Date },
): CertificateData {
  return {
    participantName: participant.name,
    participantDocument: participant.document,
    qualification: participant.qualification,
    eventName: event.name,
    eventLocation: event.location,
    organizer: event.organizer,
    startDate: event.startDate,
    endDate: event.endDate,
    workloadHours: event.workloadHours,
    attendedDays: participant.attendanceCount,
    certificateText: event.certificateText,
    validationCode: certificate.code,
    issuedAt: certificate.issuedAt,
  };
}

/**
 * Prepara certificados em lote com quantidade constante de consultas ao banco.
 * A elegibilidade continua exigindo pelo menos 1 presença ou o mínimo configurado no evento.
 */
export async function prepareCertificates(
  eventId: string,
  participantIds: string[],
  issuedById?: string,
): Promise<CertificateData[]> {
  const ids = [...new Set(participantIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return [];

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      name: true,
      location: true,
      organizer: true,
      startDate: true,
      endDate: true,
      workloadHours: true,
      certificateText: true,
      minAttendanceDays: true,
    },
  });
  if (!event) return [];

  const participants = await prisma.participant.findMany({
    where: { eventId, id: { in: ids } },
    select: {
      id: true,
      name: true,
      document: true,
      qualification: true,
      _count: { select: { attendances: true } },
    },
  });

  const requiredDays = Math.max(1, event.minAttendanceDays);
  const eligible = participants
    .map((participant) => ({
      id: participant.id,
      name: participant.name,
      document: participant.document,
      qualification: participant.qualification,
      attendanceCount: participant._count.attendances,
    }))
    .filter((participant) => participant.attendanceCount >= requiredDays);

  if (eligible.length === 0) return [];

  const eligibleIds = eligible.map((participant) => participant.id);
  const existingCertificates = await prisma.certificate.findMany({
    where: { participantId: { in: eligibleIds } },
    select: { participantId: true, code: true, issuedAt: true },
  });
  const existingIds = new Set(existingCertificates.map((certificate) => certificate.participantId));
  const missingIds = eligibleIds.filter((participantId) => !existingIds.has(participantId));

  if (missingIds.length > 0) {
    await prisma.certificate.createMany({
      data: missingIds.map((participantId) => ({
        participantId,
        code: generateCode("CERT"),
        ...(issuedById ? { issuedById } : {}),
      })),
      skipDuplicates: true,
    });
  }

  const certificates = missingIds.length > 0
    ? await prisma.certificate.findMany({
        where: { participantId: { in: eligibleIds } },
        select: { participantId: true, code: true, issuedAt: true },
      })
    : existingCertificates;

  const certificateByParticipant = new Map(
    certificates.map((certificate) => [certificate.participantId, certificate]),
  );
  const participantById = new Map(eligible.map((participant) => [participant.id, participant]));

  return ids.flatMap((participantId) => {
    const participant = participantById.get(participantId);
    const certificate = certificateByParticipant.get(participantId);
    if (!participant || !certificate) return [];
    return [toCertificateData(participant, event, certificate)];
  });
}

/** Prepara um certificado individual reutilizando a mesma lógica do fluxo em lote. */
export async function prepareCertificate(
  eventId: string,
  participantId: string,
  issuedById?: string,
): Promise<CertificateData | null> {
  const [certificate] = await prepareCertificates(eventId, [participantId], issuedById);
  return certificate ?? null;
}
