"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type CheckInResult = {
  status: "ok" | "duplicado" | "nao-encontrado" | "erro";
  message: string;
  participant?: {
    id: string;
    name: string;
    qualification: string;
    document: string;
    organization: string | null;
  };
  checkedInAt?: string;
};

/**
 * Confirma a presença a partir do código do crachá (QR Code, código de barras
 * ou digitado). Também aceita o documento do participante como alternativa.
 */
export async function checkInByCode(input: {
  eventId: string;
  eventDayId: string;
  code: string;
  method?: "QRCODE" | "MANUAL";
}): Promise<CheckInResult> {
  const user = await requireUser();
  const code = input.code.trim();
  if (!code) return { status: "erro", message: "Código vazio." };

  const day = await prisma.eventDay.findFirst({
    where: { id: input.eventDayId, eventId: input.eventId },
  });
  if (!day) return { status: "erro", message: "Dia do evento inválido." };

  const participant = await prisma.participant.findFirst({
    where: {
      eventId: input.eventId,
      OR: [{ code }, { code: code.toUpperCase() }, { document: code }],
    },
  });

  if (!participant) {
    return { status: "nao-encontrado", message: `Nenhum inscrito com o código "${code}".` };
  }

  const summary = {
    id: participant.id,
    name: participant.name,
    qualification: participant.qualification,
    document: participant.document,
    organization: participant.organization,
  };

  const existing = await prisma.attendance.findUnique({
    where: {
      participantId_eventDayId: { participantId: participant.id, eventDayId: day.id },
    },
  });

  if (existing) {
    return {
      status: "duplicado",
      message: `${participant.name} já teve presença registrada hoje.`,
      participant: summary,
      checkedInAt: existing.checkedInAt.toISOString(),
    };
  }

  const attendance = await prisma.attendance.create({
    data: {
      participantId: participant.id,
      eventDayId: day.id,
      method: input.method ?? "QRCODE",
      operatorId: user.id,
    },
  });

  revalidatePath(`/eventos/${input.eventId}/checkin`);
  revalidatePath(`/eventos/${input.eventId}`);

  return {
    status: "ok",
    message: `Presença confirmada para ${participant.name}.`,
    participant: summary,
    checkedInAt: attendance.checkedInAt.toISOString(),
  };
}

/** Marca/desmarca presença manualmente (usado nas listas e na ficha do inscrito). */
export async function toggleAttendanceAction(formData: FormData) {
  const user = await requireUser();
  const eventId = String(formData.get("eventId") ?? "");
  const participantId = String(formData.get("participantId") ?? "");
  const eventDayId = String(formData.get("eventDayId") ?? "");
  if (!eventId || !participantId || !eventDayId) return;

  const existing = await prisma.attendance.findUnique({
    where: { participantId_eventDayId: { participantId, eventDayId } },
  });

  if (existing) {
    await prisma.attendance.delete({ where: { id: existing.id } });
  } else {
    await prisma.attendance.create({
      data: { participantId, eventDayId, method: "MANUAL", operatorId: user.id },
    });
  }

  revalidatePath(`/eventos/${eventId}/checkin`);
  revalidatePath(`/eventos/${eventId}/participantes/${participantId}`);
  revalidatePath(`/eventos/${eventId}`);
}
