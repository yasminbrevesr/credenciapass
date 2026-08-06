"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateCode } from "@/lib/utils";

export type ParticipantFormState = { error?: string };

function readForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const document = String(formData.get("document") ?? "").trim();

  if (!name) return "Informe o nome do participante.";
  if (!document) return "Informe o documento de identificação.";

  const text = (key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    return value ? value : null;
  };

  return {
    name,
    document,
    email: text("email"),
    phone: text("phone"),
    qualification: String(formData.get("qualification") ?? "Participante").trim() || "Participante",
    organization: text("organization"),
    position: text("position"),
    notes: text("notes"),
  };
}

/** Prisma sinaliza documento repetido no mesmo evento com o código P2002. */
function isDuplicateDocument(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export async function createParticipantAction(
  _prev: ParticipantFormState,
  formData: FormData,
): Promise<ParticipantFormState> {
  await requireUser();
  const eventId = String(formData.get("eventId") ?? "");
  const parsed = readForm(formData);
  if (typeof parsed === "string") return { error: parsed };

  let created;
  try {
    created = await prisma.participant.create({
      data: { ...parsed, eventId, code: generateCode() },
    });
  } catch (error) {
    if (isDuplicateDocument(error)) {
      return { error: "Já existe um inscrito com este documento neste evento." };
    }
    throw error;
  }

  revalidatePath(`/eventos/${eventId}/participantes`);
  revalidatePath(`/eventos/${eventId}`);

  // "Salvar e cadastrar outro" volta para o formulário vazio.
  if (formData.get("intent") === "save-and-new") {
    redirect(`/eventos/${eventId}/participantes/novo?ok=${encodeURIComponent(created.name)}`);
  }
  redirect(`/eventos/${eventId}/participantes/${created.id}`);
}

export async function updateParticipantAction(
  _prev: ParticipantFormState,
  formData: FormData,
): Promise<ParticipantFormState> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const parsed = readForm(formData);
  if (typeof parsed === "string") return { error: parsed };

  try {
    await prisma.participant.update({ where: { id }, data: parsed });
  } catch (error) {
    if (isDuplicateDocument(error)) {
      return { error: "Já existe um inscrito com este documento neste evento." };
    }
    throw error;
  }

  revalidatePath(`/eventos/${eventId}/participantes`);
  revalidatePath(`/eventos/${eventId}/participantes/${id}`);
  redirect(`/eventos/${eventId}/participantes/${id}`);
}

export async function deleteParticipantAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const eventId = String(formData.get("eventId") ?? "");

  await prisma.participant.delete({ where: { id } });

  revalidatePath(`/eventos/${eventId}/participantes`);
  revalidatePath(`/eventos/${eventId}`);
  redirect(`/eventos/${eventId}/participantes`);
}

/** Gera um novo código de crachá (usado quando o crachá é perdido/reimpresso). */
export async function regenerateCodeAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const eventId = String(formData.get("eventId") ?? "");

  await prisma.participant.update({ where: { id }, data: { code: generateCode() } });

  revalidatePath(`/eventos/${eventId}/participantes/${id}`);
}
