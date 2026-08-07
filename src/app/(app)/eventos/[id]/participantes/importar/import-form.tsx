"use client";

import ExcelJS from "exceljs";
import Link from "next/link";
import { useState } from "react";

import { importParticipantsBatchAction, type ImportParticipantRow } from "./actions";

const HEADER_ALIASES: Record<string, keyof ImportParticipantRow> = {
  nome: "name",
  name: "name",
  documento: "document",
  cpf: "document",
  email: "email",
  "e-mail": "email",
  telefone: "phone",
  celular: "phone",
  qualificacao: "qualification",
  categoria: "qualification",
  instituicao: "organization",
  empresa: "organization",
  "instituicao/empresa": "organization",
  "instituicao empresa": "organization",
  organizacao: "organization",
  "organizacao/empresa": "organization",
  cargo: "position",
  funcao: "position",
  "cargo/funcao": "position",
  "cargo funcao": "position",
  observacoes: "notes",
};

const BATCH_SIZE = 200;

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ");
}

function cellText(value: ExcelJS.CellValue) {
  if (value == null) return "";
  if (typeof value === "object" && "text" in value) return String(value.text ?? "").trim();
  if (typeof value === "object" && "result" in value) return String(value.result ?? "").trim();
  return String(value).trim();
}

export function ImportForm({ eventId }: { eventId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);

  async function handleImport() {
    if (!file || busy) return;
    setBusy(true);
    setMessage("");
    setProgress(0);

    try {
      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) throw new Error("Planilha vazia.");

      const headerMap = new Map<number, keyof ImportParticipantRow>();
      worksheet.getRow(1).eachCell((cell, col) => {
        const mapped = HEADER_ALIASES[normalizeHeader(cellText(cell.value))];
        if (mapped) headerMap.set(col, mapped);
      });

      if (![...headerMap.values()].includes("name") || ![...headerMap.values()].includes("document")) {
        throw new Error("A planilha precisa ter as colunas Nome e Documento.");
      }

      const rows: ImportParticipantRow[] = [];
      let invalid = 0;

      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
        const row = worksheet.getRow(rowNumber);
        const data: Partial<ImportParticipantRow> = {};
        for (const [col, key] of headerMap) data[key] = cellText(row.getCell(col).value);

        if (!Object.values(data).some(Boolean)) continue;
        if (!data.name || !data.document) {
          invalid += 1;
          continue;
        }
        rows.push(data as ImportParticipantRow);
      }

      if (rows.length === 0) {
        setMessage(`Nenhum registro válido encontrado. Linhas inválidas: ${invalid}.`);
        return;
      }

      let imported = 0;
      let duplicated = 0;
      for (let index = 0; index < rows.length; index += BATCH_SIZE) {
        const batch = rows.slice(index, index + BATCH_SIZE);
        const result = await importParticipantsBatchAction(eventId, batch);
        imported += result.imported;
        duplicated += result.duplicated;
        setProgress(Math.min(100, Math.round(((index + batch.length) / rows.length) * 100)));
      }

      setMessage(
        `Importação concluída. Importados: ${imported}. Duplicados ignorados: ${duplicated}. Linhas inválidas: ${invalid}.`,
      );
      setProgress(100);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível importar a planilha.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-pad space-y-4">
      <p className="text-sm text-slate-600">
        Envie uma planilha Excel (.xlsx). As colunas obrigatórias são <strong>Nome</strong> e{" "}
        <strong>Documento</strong>. Também são aceitas: E-mail, Telefone, Qualificação, Instituição / empresa,
        Cargo / função e Observações. O código de credenciamento e o QR Code são gerados pelo sistema após a importação.
      </p>

      <a href={`/api/eventos/${eventId}/participantes/modelo`} className="btn-secondary btn-sm">
        Baixar modelo de planilha
      </a>

      <div>
        <label className="label" htmlFor="file">Planilha Excel</label>
        <input
          id="file"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="input"
          disabled={busy}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </div>

      {busy || progress > 0 ? (
        <div>
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>{busy ? "Importando..." : "Importação concluída"}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded bg-slate-200">
            <div className="h-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}

      {message ? (
        <p className={`rounded-lg px-3 py-2 text-sm ${message.startsWith("Importação concluída") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {message}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button type="button" className="btn-primary" onClick={handleImport} disabled={!file || busy}>
          {busy ? "Importando..." : "Importar inscritos"}
        </button>
        <Link href={`/eventos/${eventId}/participantes`} className="btn-secondary">Voltar</Link>
      </div>
    </div>
  );
}
