"use server";

import ExcelJS from "exceljs";
import { redirect } from "next/navigation";
import { Readable } from "node:stream";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateCode } from "@/lib/utils";

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
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function cellText(value: ExcelJS.CellValue) {
  if (value == null) return "";
  if (typeof value === "object" && "text" in value) return String(value.text ?? "").trim();
  if (typeof value === "object" && "result" in value) return String(value.result ?? "").trim();
  return String(value).trim();
}

export async function importParticipantsAction(formData: FormData) {
  await requireUser();
  const eventId = String(formData.get("eventId") ?? "");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    redirect(`/eventos/${eventId}/participantes/importar?erro=Selecione+uma+planilha`);
  }

  const workbook = new ExcelJS.Workbook();
  const bytes = new Uint8Array(await file.arrayBuffer());
  await workbook.xlsx.read(Readable.from(bytes));
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    redirect(`/eventos/${eventId}/participantes/importar?erro=Planilha+vazia`);
  }

  const headerMap = new Map<number, string>();
  worksheet.getRow(1).eachCell((cell, col) => {
    const mapped = HEADER_ALIASES[normalize(cell.value)];
    if (mapped) headerMap.set(col, mapped);
  });

  if (![...headerMap.values()].includes("name") || ![...headerMap.values()].includes("document")) {
    redirect(
      `/eventos/${eventId}/participantes/importar?erro=${encodeURIComponent(
        "A planilha precisa ter as colunas Nome e Documento.",
      )}`,
    );
  }

  let imported = 0;
  let skipped = 0;
  let invalid = 0;

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const data: Record<string, string> = {};
    for (const [col, key] of headerMap) data[key] = cellText(row.getCell(col).value);

    if (!Object.values(data).some(Boolean)) continue;
    if (!data.name || !data.document) {
      invalid += 1;
      continue;
    }

    try {
      await prisma.participant.create({
        data: {
          eventId,
          code: generateCode(),
          name: data.name,
          document: data.document,
          email: data.email || null,
          phone: data.phone || null,
          qualification: data.qualification || "Participante",
          organization: data.organization || null,
          position: data.position || null,
          notes: data.notes || null,
        },
      });
      imported += 1;
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P2002"
      ) {
        skipped += 1;
      } else {
        throw error;
      }
    }
  }

  redirect(
    `/eventos/${eventId}/participantes/importar?importados=${imported}&duplicados=${skipped}&invalidos=${invalid}`,
  );
}
