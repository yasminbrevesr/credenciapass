"use server";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDocument, formatPhone, generateCode, normalizeEmail, titleCase } from "@/lib/utils";

export type ImportParticipantRow = {
  name: string;
  document: string;
  email?: string;
  phone?: string;
  qualification?: string;
  organization?: string;
  position?: string;
  notes?: string;
};

export type ImportBatchResult = {
  imported: number;
  duplicated: number;
};

const MAX_BATCH_SIZE = 250;

export async function importParticipantsBatchAction(
  eventId: string,
  rows: ImportParticipantRow[],
): Promise<ImportBatchResult> {
  await requireAdmin();

  if (!eventId || !Array.isArray(rows) || rows.length === 0) {
    return { imported: 0, duplicated: 0 };
  }
  if (rows.length > MAX_BATCH_SIZE) {
    throw new Error(`Lote muito grande. O máximo é ${MAX_BATCH_SIZE} registros.`);
  }

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) throw new Error("Evento não encontrado.");

  const validRows = rows
    .map((row) => {
      const name = titleCase(String(row.name ?? "").trim());
      const document = formatDocument(String(row.document ?? "").trim());
      if (!name || !document) return null;

      const phone = row.phone ? formatPhone(row.phone) : null;
      return {
        eventId,
        code: generateCode(),
        name,
        document,
        email: normalizeEmail(row.email),
        phone: phone || null,
        qualification: row.qualification?.trim() || "Participante",
        organization: row.organization ? titleCase(row.organization) : null,
        position: row.position ? titleCase(row.position) : null,
        notes: row.notes?.trim() || null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (validRows.length === 0) return { imported: 0, duplicated: 0 };

  const result = await prisma.participant.createMany({
    data: validRows,
    skipDuplicates: true,
  });

  return {
    imported: result.count,
    duplicated: validRows.length - result.count,
  };
}
