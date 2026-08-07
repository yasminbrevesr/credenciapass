"use server";

import { revalidatePath } from "next/cache";

import { requireEventAccess } from "@/lib/auth";
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

export type RecentCheckIn = {
  id: string;
  checkedInAt: string;
  method: string;
  participant: {
    id: string;
    name: string;
    qualification: string;
    organization: string | null;
  };
  operator: { name: string } | null;
};

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

function revalidateCheckInViews(eventId: string, participantId?: string) {
  revalidatePath(`/eventos/${eventId}/checkin`);
  revalidatePath(`/eventos/${eventId}`);
  revalidatePath(`/eventos/${eventId}/relatorios`);
  if (participantId) revalidatePath(`/eventos/${eventId}/participantes/${participantId}`);
}

export async function getRecentCheckIns(eventId: string, eventDayId: string): Promise<RecentCheckIn[]> {
  await requireEventAccess(eventId);
  const rows = await prisma.attendance.findMany({
    where: { eventDayId, eventDay: { eventId }, participant: { eventId } },
    orderBy: { checkedInAt: "desc" },
    take: 15,
    include: {
      participant: { select: { id: true, name: true, qualification: true, organization: true } },
      operator: { select: { name: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    checkedInAt: row.checkedInAt.toISOString(),
    method: row.method,
    participant: row.participant,
    operator: row.operator,
  }));
}

export async function checkInByCode(input: {
  eventId: string;
  eventDayId: string;
  code: string;
  method?: "QRCODE" | "MANUAL";
}): Promise<CheckInResult> {
  const user = await requireEventAccess(input.eventId);
  const code = input.code.trim();
  if (!code) return { status: "erro", message: "Código vazio." };

  const day = await prisma.eventDay.findFirst({
    where: { id: input.eventDayId, eventId: input.eventId },
    select: { id: true },
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

  try {
    const attendance = await prisma.attendance.create({
      data: {
        participantId: participant.id,
        eventDayId: day.id,
        method: input.method ?? "QRCODE",
        operatorId: user.id,
      },
    });

    revalidateCheckInViews(input.eventId, participant.id);

    return {
      status: "ok",
      message: `Presença confirmada para ${participant.name}.`,
      participant: summary,
      checkedInAt: attendance.checkedInAt.toISOString(),
    };
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;

    const existing = await prisma.attendance.findUnique({
      where: {
        participantId_eventDayId: { participantId: participant.id, eventDayId: day.id },
      },
      select: { checkedInAt: true },
    });

    return {
      status: "duplicado",
      message: `${participant.name} já teve presença registrada hoje.`,
      participant: summary,
      checkedInAt: existing?.checkedInAt.toISOString(),
    };
  }
}

export async function toggleAttendanceAction(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const participantId = String(formData.get("participantId") ?? "");
  const eventDayId = String(formData.get("eventDayId") ?? "");
  if (!eventId || !participantId || !eventDayId) return;

  const user = await requireEventAccess(eventId);

  const [participant, day] = await Promise.all([
    prisma.participant.findFirst({
      where: { id: participantId, eventId },
      select: { id: true },
    }),
    prisma.eventDay.findFirst({
      where: { id: eventDayId, eventId },
      select: { id: true },
    }),
  ]);

  if (!participant || !day) return;

  const existing = await prisma.attendance.findUnique({
    where: { participantId_eventDayId: { participantId: participant.id, eventDayId: day.id } },
  });

  if (existing) {
    if (user.role !== "ADMIN") return;
    await prisma.attendance.delete({ where: { id: existing.id } });
  } else {
    try {
      await prisma.attendance.create({
        data: {
          participantId: participant.id,
          eventDayId: day.id,
          method: "MANUAL",
          operatorId: user.id,
        },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
    }
  }

  revalidateCheckInViews(eventId, participant.id);
}
