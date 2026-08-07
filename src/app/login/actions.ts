"use server";

import { redirect } from "next/navigation";

import { createSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type LoginState = { error?: string };

function isSafeInternalPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") && !value.includes("\\");
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "") || "/";

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "E-mail ou senha inválidos." };
  }

  await createSession({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as "ADMIN" | "OPERADOR",
  });

  redirect(isSafeInternalPath(redirectTo) ? redirectTo : "/");
}
