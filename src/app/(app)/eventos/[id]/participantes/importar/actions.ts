"use server";

import ExcelJS from "exceljs";
import { redirect } from "next/navigation";
import { Readable } from "node:stream";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDocument, formatPhone, generateCode, normalizeEmail, titleCase } from "@/lib/utils";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 10000;
const BATCH_SIZE = 300;

const HEADER_ALIASES: Record<string, string> = {
  nome: "name",
  name: "name",
  documento: "document",
  cpf: "document",
  email: "email",
  "e-mail": "email",
  telefone: "phone",
  celular: "phone",
  qualificacao: "qualification",
  "qualificação": "qualification",
  categoria: "qualification",
  instituicao: "organization",
  "instituição": "organization",
  organizacao: "organization",
  "organização": "organization",
  cargo: "position",
  observacoes: "notes",
  "observações": "notes",
};

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function cellText(value: ExcelJS.CellValue) {
  if (value == null) return "";
  if (typeof value === "object" && "text" in value) return String(value.text ?? "").trim();
  if (typeof value === "object" && "result" in value) return String(value.result ?? "").trim();
  return String(value).trim();
}

function redirectError(eventId: string, message: string): never {
  redirect(`/eventos/${eventId}/participantes/importar?erro=${encodeURIComponent(message)}`);
}

export async function importParticipantsAction(formData: FormData) {
  await requireAdmin();
  const eventId = String(formData.get("eventId") ?? "");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    redirectError(eventId, "Selecione uma planilha.");
  }
  if (file.size > MAX_FILE_BYTES) {
    redirectError(eventId, "A planilha é muito grande. O limite é 10 MB.");
  }

  const workbook = new ExcelJS.Workbook();
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await workbook.xlsx.read(Readable.from([fileBuffer]));
  const worksheet = workbook.worksheets[0];
  if (!worksheet) redirectError(eventId, "Planilha vazia.");
  if (worksheet.rowCount > MAX_ROWS + 1) {
    redirectError(eventId, `A planilha pode ter no máximo ${MAX_ROWS.toLocaleString("pt-BR")} inscritos por importação.`);
  }

  const headerMap = new Map<number, string>();
  worksheet.getRow(1).eachCell((cell, col) => {
    const mapped = HEADER_ALIASES[normalize(cell.value)];
    if (mapped) headerMap.set(col, mapped);
  });

  if (![...headerMap.values()].includes("name") || ![...headerMap.values()].includes("document")) {
    redirectError(eventId, "A planilha precisa ter as colunas Nome e Documento.");
  }

  let skipped = 0;
  let invalid = 0;

  const parsedRows: Array<{
    eventId: string;
    code: string;
    name: string;
    document: string;
    email: string | null;
    phone: string | null;
    qualification: string;
    organization: string | null;
    position: string | null;
    notes: string | null;
  }> = [];

  const seenDocuments = new Set<string>();

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const data: Record<string, string> = {};
    for (const [col, key] of headerMap) data[key] = cellText(row.getCell(col).value);

    if (!Object.values(data).some(Boolean)) continue;
    if (!data.name || !data.document) {
      invalid += 1;
      continue;
    }

    const document = formatDocument(data.document);
    if (!document) {
      invalid += 1;
      continue;
    }
    if (seenDocuments.has(document)) {
      skipped += 1;
      continue;
    }
    seenDocuments.add(document);

    const phone = data.phone ? formatPhone(data.phone) : null;
    parsedRows.push({
      eventId,
      code: generateCode(),
      name: titleCase(data.name),
      document,
      email: normalizeEmail(data.email),
      phone: phone || null,
      qualification: data.qualification?.trim() || "Participante",
      organization: data.organization ? titleCase(data.organization) : null,
      position: data.position ? titleCase(data.position) : null,
      notes: data.notes?.trim() || null,
    });
  }

  if (parsedRows.length === 0) {
    redirect(`/eventos/${eventId}/participantes/importar?importados=0&duplicados=${skipped}&invalidos=${invalid}`);
  }

  const existing = await prisma.participant.findMany({
    where: {
      eventId,
      document: { in: parsedRows.map((row) => row.document) },
    },
    select: { document: true },
  });
  const existingDocuments = new Set(existing.map((participant) => participant.document));
  const newRows = parsedRows.filter((row) => {
    if (existingDocuments.has(row.document)) {
      skipped += 1;
      return false;
    }
    return true;
  });

  let imported = 0;
  for (let index = 0; index < newRows.length; index += BATCH_SIZE) {
    const batch = newRows.slice(index, index + BATCH_SIZE);
    const result = await prisma.participant.createMany({
      data: batch,
      skipDuplicates: true,
    });
    imported += result.count;
    skipped += batch.length - result.count;
  }

  redirect(`/eventos/${eventId}/participantes/importar?importados=${imported}&duplicados=${skipped}&invalidos=${invalid}`);
}
