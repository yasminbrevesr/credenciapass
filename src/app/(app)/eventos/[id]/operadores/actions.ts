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

  const passwordHash = await hashPassword(password);

  const result = await prisma.$transaction(async (tx) => {
    const event = await tx.event.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!event) return { error: "Evento não encontrado." } as const;

    const existing = await tx.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.role !== "OPERADOR") {
        return { error: "Já existe um administrador com este e-mail." } as const;
      }

      const access = await tx.eventAccess.findUnique({
        where: { userId_eventId: { userId: existing.id, eventId } },
        select: { id: true },
      });
      if (access) return { error: "Este operador já está cadastrado neste evento." } as const;

      await tx.user.update({
        where: { id: existing.id },
        data: { name, active: true, passwordHash },
      });
      await tx.eventAccess.create({ data: { userId: existing.id, eventId } });
      return { ok: true } as const;
    }

    const user = await tx.user.create({
      data: {
        name,
        email,
        role: "OPERADOR",
        active: true,
        passwordHash,
      },
    });
    await tx.eventAccess.create({ data: { userId: user.id, eventId } });
    return { ok: true } as const;
  });

  if ("error" in result) return { error: result.error };

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
