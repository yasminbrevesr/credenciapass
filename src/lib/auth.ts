import "server-only";

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { prisma } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/session-cookie";

const SESSION_DAYS = 7;

export type Role = "ADMIN" | "OPERADOR";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET não configurado (defina uma chave com 32+ caracteres no arquivo .env)",
    );
  }
  return new TextEncoder().encode(secret);
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * A sessão é memoizada apenas no ciclo da request/renderização atual.
 * Layouts e páginas aninhadas reutilizam a mesma validação de JWT e consulta do usuário.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey());
    const user = await prisma.user.findUnique({
      where: { id: String(payload.sub) },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    if (!user || !user.active) return null;
    return { id: user.id, name: user.name, email: user.email, role: user.role as Role };
  } catch {
    return null;
  }
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

const hasEventAccess = cache(async (userId: string, eventId: string) => {
  const access = await prisma.eventAccess.findUnique({
    where: { userId_eventId: { userId, eventId } },
    select: { id: true },
  });
  return Boolean(access);
});

/** Administradores acessam todos os eventos; operadores somente os que foram atribuídos a eles. */
export async function requireEventAccess(eventId: string): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role === "ADMIN") return user;

  if (!(await hasEventAccess(user.id, eventId))) redirect("/");
  return user;
}
