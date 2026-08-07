"use server";

import { revalidatePath } from "next/cache";

import { hashPassword, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type OperatorFormState = { error?: string; ok?: string };

export async function createEventOperatorAction(
  _prev: OperatorFormState,
  formData: FormData,
): Promise<OperatorFormState> {
  await requireAdmin();

  const eventId = String(formData.get("eventId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!eventId || !name || !email) return { error: "Informe nome, e-mail e evento." };
  if (password.length < 6) return { error: "A senha deve ter pelo menos 6 caracteres." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== "OPERADOR") {
      return { error: "Já existe um administrador com este e-mail." };
    }

    const access = await prisma.eventAccess.findUnique({
      where: { userId_eventId: { userId: existing.id, eventId } },
    });
    if (access) return { error: "Este operador já está cadastrado neste evento." };

    await prisma.user.update({
      where: { id: existing.id },
      data: { name, active: true, passwordHash: await hashPassword(password) },
    });
    await prisma.eventAccess.create({ data: { userId: existing.id, eventId } });
  } else {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role: "OPERADOR",
        active: true,
        passwordHash: await hashPassword(password),
      },
    });
    await prisma.eventAccess.create({ data: { userId: user.id, eventId } });
  }

  revalidatePath(`/eventos/${eventId}/operadores`);
  revalidatePath("/");
  return { ok: `Operador ${name} cadastrado neste evento.` };
}

export async function removeEventOperatorAction(formData: FormData) {
  await requireAdmin();
  const eventId = String(formData.get("eventId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!eventId || !userId) return;

  await prisma.eventAccess.deleteMany({ where: { eventId, userId } });
  revalidatePath(`/eventos/${eventId}/operadores`);
  revalidatePath("/");
}
