"use server";

import { revalidatePath } from "next/cache";

import { hashPassword, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type UserFormState = { error?: string; ok?: string };

function selectedEventIds(formData: FormData) {
  return formData.getAll("eventIds").map(String).filter(Boolean);
}

async function syncEventAccess(userId: string, role: string, eventIds: string[]) {
  await prisma.eventAccess.deleteMany({ where: { userId } });
  if (role !== "OPERADOR" || eventIds.length === 0) return;

  await prisma.eventAccess.createMany({
    data: eventIds.map((eventId) => ({ userId, eventId })),
    skipDuplicates: true,
  });
}

export async function createUserAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "OPERADOR") === "ADMIN" ? "ADMIN" : "OPERADOR";
  const eventIds = selectedEventIds(formData);

  if (!name || !email) return { error: "Informe nome e e-mail." };
  if (password.length < 6) return { error: "A senha deve ter pelo menos 6 caracteres." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Já existe um usuário com este e-mail." };

  const user = await prisma.user.create({
    data: { name, email, role, passwordHash: await hashPassword(password) },
  });
  await syncEventAccess(user.id, role, eventIds);

  revalidatePath("/usuarios");
  revalidatePath("/");
  return { ok: `Usuário ${name} criado.` };
}

export async function updateUserAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const admin = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "OPERADOR") === "ADMIN" ? "ADMIN" : "OPERADOR";
  const active = formData.get("active") === "on";
  const password = String(formData.get("password") ?? "");
  const eventIds = selectedEventIds(formData);

  if (!id || !name) return { error: "Dados incompletos." };
  if (password && password.length < 6) {
    return { error: "A nova senha deve ter pelo menos 6 caracteres." };
  }
  if (id === admin.id && (!active || role !== "ADMIN")) {
    return { error: "Você não pode remover o próprio acesso de administrador." };
  }

  await prisma.user.update({
    where: { id },
    data: {
      name,
      role,
      active,
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
    },
  });
  await syncEventAccess(id, role, eventIds);

  revalidatePath("/usuarios");
  revalidatePath("/");
  return { ok: "Usuário atualizado." };
}

export async function deleteUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id || id === admin.id) return;

  await prisma.user.delete({ where: { id } });
  revalidatePath("/usuarios");
  revalidatePath("/");
}
