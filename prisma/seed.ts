/**
 * Popula o banco com o usuário administrador inicial e, opcionalmente, um
 * evento de demonstração (`npx tsx prisma/seed.ts --demo`).
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Defina DIRECT_URL ou DATABASE_URL no arquivo .env.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@credenciapass.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "credencia123";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateCode(prefix = "CP") {
  let body = "";
  for (let i = 0; i < 8; i += 1) {
    body += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `${prefix}-${body}`;
}

function dateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: "Administrador",
      role: "ADMIN",
      active: true,
      passwordHash,
    },
    create: {
      name: "Administrador",
      email: ADMIN_EMAIL,
      role: "ADMIN",
      active: true,
      passwordHash,
    },
  });
  console.log(`Usuário administrador: ${admin.email}`);

  if (!process.argv.includes("--demo")) return;

  const existing = await prisma.event.findFirst({ where: { name: "Congresso de Exemplo 2026" } });
  if (existing) {
    console.log("Evento de demonstração já existe.");
    return;
  }

  const event = await prisma.event.create({
    data: {
      name: "Congresso de Exemplo 2026",
      description: "Evento de demonstração criado pelo seed.",
      location: "Centro de Convenções — São Paulo/SP",
      organizer: "BREVES Tecnologia",
      startDate: dateOnly("2026-09-10"),
      endDate: dateOnly("2026-09-12"),
      workloadHours: 16,
      minAttendanceDays: 2,
      qualifications: JSON.stringify(["Participante", "Professor", "Colaborador", "Palestrante"]),
      days: {
        create: [
          { date: dateOnly("2026-09-10") },
          { date: dateOnly("2026-09-11") },
          { date: dateOnly("2026-09-12") },
        ],
      },
    },
    include: { days: true },
  });

  const people = [
    ["Ana Beatriz Souza", "123.456.789-00", "Participante", "Universidade Federal"],
    ["Carlos Eduardo Lima", "987.654.321-00", "Professor", "Instituto Tecnológico"],
    ["Daniela Ribeiro", "111.222.333-44", "Colaborador", "BREVES Tecnologia"],
    ["Eduardo Nakamura", "555.666.777-88", "Palestrante", "Consultoria Nakamura"],
    ["Fernanda Alves", "222.333.444-55", "Participante", "Prefeitura Municipal"],
  ] as const;

  for (const [name, document, qualification, organization] of people) {
    const participant = await prisma.participant.create({
      data: {
        eventId: event.id,
        code: generateCode(),
        name,
        document,
        qualification,
        organization,
        email: `${name.split(" ")[0].toLowerCase()}@exemplo.com`,
        phone: "(11) 90000-0000",
      },
    });

    if (name !== "Fernanda Alves") {
      await prisma.attendance.createMany({
        data: event.days.slice(0, 2).map((day) => ({
          participantId: participant.id,
          eventDayId: day.id,
          method: "MANUAL",
          operatorId: admin.id,
        })),
      });
    }
  }

  console.log(`Evento de demonstração criado: ${event.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
