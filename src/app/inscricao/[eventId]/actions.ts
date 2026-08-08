"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import {
  formatDocument,
  formatPhone,
  generateCode,
  normalizeEmail,
  parseQualifications,
  titleCase,
} from "@/lib/utils";

export type PublicRegistrationState = { error?: string };

function isDuplicateDocument(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

/**
 * Cadastro público de participante. Esta ação não cria sessão e não concede
 * qualquer acesso às áreas internas do sistema.
 */
export async function publicRegistrationAction(
  _prev: PublicRegistrationState,
  formData: FormData,
): Promise<PublicRegistrationState> {
  const eventId = String(formData.get("eventId") ?? "").trim();
  if (!eventId) return { error: "Evento inválido." };

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, archived: true, qualifications: true },
  });

  if (!event || event.archived) {
    return { error: "As inscrições para este evento não estão disponíveis." };
  }

  // Campo invisível para reduzir envios automatizados simples.
  if (String(formData.get("website") ?? "").trim()) {
    redirect(`/inscricao/${eventId}?ok=1`);
  }

  const name = titleCase(String(formData.get("name") ?? ""));
  const document = formatDocument(String(formData.get("document") ?? ""));
  const emailRaw = String(formData.get("email") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();

  if (!name) return { error: "Informe seu nome completo." };
  if (!document) return { error: "Informe seu CPF." };
  if (!emailRaw) return { error: "Informe seu e-mail." };
  if (!phoneRaw) return { error: "Informe seu celular." };

  const allowedQualifications = parseQualifications(event.qualifications);
  const requestedQualification = String(formData.get("qualification") ?? "").trim();
  const qualification = allowedQualifications.includes(requestedQualification)
    ? requestedQualification
    : allowedQualifications[0] ?? "Participante";

  const organizationRaw = String(formData.get("organization") ?? "").trim();
  const positionRaw = String(formData.get("position") ?? "").trim();

  try {
    await prisma.participant.create({
      data: {
        eventId,
        code: generateCode(),
        name,
        document,
        email: normalizeEmail(emailRaw),
        phone: formatPhone(phoneRaw),
        qualification,
        organization: organizationRaw ? titleCase(organizationRaw) : null,
        position: positionRaw ? titleCase(positionRaw) : null,
      },
    });
  } catch (error) {
    if (isDuplicateDocument(error)) {
      return { error: "Já existe uma inscrição com este CPF neste evento." };
    }
    throw error;
  }

  revalidatePath(`/eventos/${eventId}`);
  revalidatePath(`/eventos/${eventId}/participantes`);
  revalidatePath(`/eventos/${eventId}/checkin`);
  revalidatePath(`/eventos/${eventId}/relatorios`);

  redirect(`/inscricao/${eventId}?ok=1`);
}
