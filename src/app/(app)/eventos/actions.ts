"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dateOnly, eachDay, serializeQualifications } from "@/lib/utils";

export type EventFormState = { error?: string };

type EventInput = {
  name: string;
  description: string | null;
  location: string | null;
  organizer: string | null;
  startDate: Date;
  endDate: Date;
  workloadHours: number | null;
  qualifications: string;
  certificateText: string | null;
  minAttendanceDays: number;
};

function readForm(formData: FormData): EventInput | string {
  const name = String(formData.get("name") ?? "").trim();
  const start = String(formData.get("startDate") ?? "");
  const end = String(formData.get("endDate") ?? "") || start;

  if (!name) return "Informe o nome do evento.";
  if (!start) return "Informe a data de início.";

  const startDate = dateOnly(start);
  const endDate = dateOnly(end);
  if (endDate.getTime() < startDate.getTime()) {
    return "A data de término não pode ser anterior à data de início.";
  }

  const workloadRaw = String(formData.get("workloadHours") ?? "").replace(",", ".");
  const workloadHours = workloadRaw ? Number(workloadRaw) : null;
  if (workloadHours !== null && (Number.isNaN(workloadHours) || workloadHours < 0)) {
    return "Carga horária inválida.";
  }

  const minAttendanceDays = Number(String(formData.get("minAttendanceDays") ?? "0")) || 0;

  const text = (key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    return value ? value : null;
  };

  return {
    name,
    description: text("description"),
    location: text("location"),
    organizer: text("organizer"),
    startDate,
    endDate,
    workloadHours,
    qualifications: serializeQualifications(String(formData.get("qualifications") ?? "")),
    certificateText: text("certificateText"),
    minAttendanceDays: Math.max(0, minAttendanceDays),
  };
}

async function syncEventDays(eventId: string, startDate: Date, endDate: Date) {
  const wanted = eachDay(startDate, endDate);
  const wantedTimes = new Set(wanted.map((day) => day.getTime()));
  const current = await prisma.eventDay.findMany({ where: { eventId } });

  const obsolete = current.filter((day) => !wantedTimes.has(dateOnly(day.date).getTime()));
  if (obsolete.length > 0) {
    await prisma.eventDay.deleteMany({ where: { id: { in: obsolete.map((day) => day.id) } } });
  }

  const currentTimes = new Set(current.map((day) => dateOnly(day.date).getTime()));
  const missing = wanted.filter((day) => !currentTimes.has(day.getTime()));
  if (missing.length > 0) {
    await prisma.eventDay.createMany({
      data: missing.map((date) => ({ eventId, date })),
    });
  }
}

export async function createEventAction(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  await requireAdmin();
  const parsed = readForm(formData);
  if (typeof parsed === "string") return { error: parsed };

  const event = await prisma.event.create({ data: parsed });
  await syncEventDays(event.id, parsed.startDate, parsed.endDate);

  revalidatePath("/");
  redirect(`/eventos/${event.id}`);
}

export async function updateEventAction(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Evento não encontrado." };

  const parsed = readForm(formData);
  if (typeof parsed === "string") return { error: parsed };

  await prisma.event.update({ where: { id }, data: parsed });
  await syncEventDays(id, parsed.startDate, parsed.endDate);

  revalidatePath("/");
  revalidatePath(`/eventos/${id}`);
  redirect(`/eventos/${id}`);
}

export async function toggleArchiveEventAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return;

  await prisma.event.update({ where: { id }, data: { archived: !event.archived } });
  revalidatePath("/");
  revalidatePath(`/eventos/${id}`);
}

export async function deleteEventAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.event.delete({ where: { id } });

  revalidatePath("/");
  redirect("/");
}
