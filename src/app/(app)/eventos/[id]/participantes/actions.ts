"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  formatDocument,
  formatPhone,
  generateCode,
  normalizeEmail,
  titleCase,
} from "@/lib/utils";

export type ParticipantFormState = { error?: string };

function readForm(formData: FormData) {
  const name = titleCase(String(formData.get("name") ?? ""));
  const document = formatDocument(String(formData.get("document") ?? ""));

  if (!name) return "Informe o nome do participante.";
  if (!document) return "Informe o documento de identificação.";

  const text = (key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    return value ? value : null;
  };

  const organization = text("organization");
  const position = text("position");
  const phone = text("phone");

  return {
    name,
    document,
    email: normalizeEmail(text("email")),
    phone: phone ? formatPhone(phone) : null,
    qualification: String(formData.get("qualification") ?? "Participante").trim() || "Participante",
    organization: organization ? titleCase(organization) : null,
    position: position ? titleCase(position) : null,
    notes: text("notes"),
  };
}

function isDuplicateDocument(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

function revalidateParticipantViews(eventId: string) {
  revalidatePath(`/eventos/${eventId}`);
  revalidatePath(`/eventos/${eventId}/participantes`);
  revalidatePath(`/eventos/${eventId}/checkin`);
  revalidatePath(`/eventos/${eventId}/relatorios`);
  revalidatePath(`/eventos/${eventId}/certificados`);
}

export async function createParticipantAction(
  _prev: ParticipantFormState,
  formData: FormData,
): Promise<ParticipantFormState> {
  await requireAdmin();
  const eventId = String(formData.get("eventId") ?? "");
  const parsed = readForm(formData);
  if (typeof parsed === "string") return { error: parsed };

  let created;
  try {
    created = await prisma.participant.create({ data: { ...parsed, eventId, code: generateCode() } });
  } catch (error) {
    if (isDuplicateDocument(error)) return { error: "Já existe um inscrito com este documento neste evento." };
    throw error;
  }

  revalidateParticipantViews(eventId);

  if (formData.get("intent") === "save-and-new") {
    redirect(`/eventos/${eventId}/participantes/novo?ok=${encodeURIComponent(created.name)}`);
  }
  redirect(`/eventos/${eventId}/participantes/${created.id}`);
}

export async function updateParticipantAction(
  _prev: ParticipantFormState,
  formData: FormData,
): Promise<ParticipantFormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const parsed = readForm(formData);
  if (typeof parsed === "string") return { error: parsed };

  try {
    await prisma.participant.update({ where: { id }, data: parsed });
  } catch (error) {
    if (isDuplicateDocument(error)) return { error: "Já existe um inscrito com este documento neste evento." };
    throw error;
  }

  revalidateParticipantViews(eventId);
  revalidatePath(`/eventos/${eventId}/participantes/${id}`);
  redirect(`/eventos/${eventId}/participantes/${id}`);
}

export async function deleteParticipantAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const eventId = String(formData.get("eventId") ?? "");

  await prisma.participant.delete({ where: { id } });

  revalidateParticipantViews(eventId);
  redirect(`/eventos/${eventId}/participantes`);
}

export async function deleteParticipantsBatchAction(eventId: string, participantIds: string[]) {
  await requireAdmin();
  const ids = [...new Set(participantIds.map((id) => String(id).trim()).filter(Boolean))];
  if (!eventId || ids.length === 0) return { deleted: 0 };

  const result = await prisma.participant.deleteMany({
    where: {
      eventId,
      id: { in: ids },
    },
  });

  revalidateParticipantViews(eventId);
  return { deleted: result.count };
}

export async function deleteAllParticipantsAction(eventId: string) {
  await requireAdmin();
  if (!eventId) return { deleted: 0 };

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) throw new Error("Evento não encontrado.");

  const result = await prisma.participant.deleteMany({ where: { eventId } });
  revalidateParticipantViews(eventId);
  return { deleted: result.count };
}

export async function regenerateCodeAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const eventId = String(formData.get("eventId") ?? "");

  await prisma.participant.update({ where: { id }, data: { code: generateCode() } });
  revalidatePath(`/eventos/${eventId}/participantes/${id}`);
}
